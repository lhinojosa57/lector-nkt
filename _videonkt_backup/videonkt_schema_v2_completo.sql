-- ============================================================================
-- VIDEONKT - SCHEMA COMPLETO V2
-- Base de datos para plataforma multi-materia con catálogo NEM oficial
-- ============================================================================

-- ============================================================================
-- EXTENSIONES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLAS PRINCIPALES
-- ============================================================================

-- Profiles: Usuarios del sistema (docentes y estudiantes)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('teacher', 'student')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers: Emails autorizados como docentes
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups: Grupos de estudiantes por materia
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL, -- Materia: Matemáticas, Historia, etc.
    grade TEXT, -- Grado: 1°, 2°, 3°
    school_year TEXT,
    invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Members: Relación estudiante-grupo
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, student_id)
);

-- ============================================================================
-- TABLAS NEM (NUEVA ESCUELA MEXICANA)
-- ============================================================================

-- Campos Formativos (4 principales)
CREATE TABLE nem_campos_formativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL, -- LEN, SAB, ETI, HUM
    nombre TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contenidos NEM por materia
CREATE TABLE nem_contenidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campo_formativo_id UUID REFERENCES nem_campos_formativos(id) ON DELETE CASCADE NOT NULL,
    materia TEXT NOT NULL, -- Matemáticas, Historia, Español, etc.
    codigo TEXT NOT NULL, -- S.M.C1, E.H.C2, etc.
    nombre TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(codigo)
);

-- Aprendizajes esperados por grado
CREATE TABLE nem_aprendizajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenido_id UUID REFERENCES nem_contenidos(id) ON DELETE CASCADE NOT NULL,
    grado TEXT NOT NULL, -- 1, 2, 3
    codigo_completo TEXT NOT NULL, -- S.M.C1.G1
    descripcion TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(codigo_completo)
);

-- ============================================================================
-- TABLAS DE ACTIVIDADES
-- ============================================================================

-- Video Assignments: Actividades de video con preguntas
CREATE TABLE video_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    
    -- NEM: Campo formativo y aprendizaje esperado
    campo_formativo_id UUID REFERENCES nem_campos_formativos(id),
    aprendizaje_id UUID REFERENCES nem_aprendizajes(id),
    
    video_url TEXT NOT NULL,
    video_duration_seconds INTEGER,
    due_date TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions: Preguntas interactivas en el video
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES video_assignments(id) ON DELETE CASCADE NOT NULL,
    timestamp_seconds INTEGER NOT NULL,
    question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'open')) NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB, -- Para multiple_choice: [{"id": "a", "text": "..."}, ...]
    correct_answer TEXT, -- Para multiple_choice/true_false
    points INTEGER DEFAULT 10,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Sessions: Sesiones de reproducción por estudiante
CREATE TABLE student_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES video_assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    score NUMERIC(5,2) DEFAULT 0, -- Calificación 0-100
    max_video_position INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    UNIQUE(assignment_id, student_id)
);

-- Student Answers: Respuestas de los estudiantes
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES student_sessions(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    answer_text TEXT,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Asignar rol automáticamente según tabla teachers
CREATE OR REPLACE FUNCTION public.set_role_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.teachers WHERE email = NEW.email) THEN
        NEW.role := 'teacher';
    ELSE
        NEW.role := 'student';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profile_update
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_role_on_profile_update();

-- Trigger: Recalcular score automáticamente
CREATE OR REPLACE FUNCTION public.recalculate_session_score()
RETURNS TRIGGER AS $$
DECLARE
    total_points INTEGER;
    earned_points INTEGER;
    new_score NUMERIC;
BEGIN
    -- Calcular puntos totales de la actividad
    SELECT COALESCE(SUM(points), 0) INTO total_points
    FROM questions
    WHERE assignment_id = (SELECT assignment_id FROM student_sessions WHERE id = NEW.session_id);
    
    -- Calcular puntos obtenidos por el estudiante
    SELECT COALESCE(SUM(points_earned), 0) INTO earned_points
    FROM student_answers
    WHERE session_id = NEW.session_id;
    
    -- Calcular score 0-100
    IF total_points > 0 THEN
        new_score := (earned_points::NUMERIC / total_points::NUMERIC) * 100;
    ELSE
        new_score := 0;
    END IF;
    
    -- Actualizar sesión
    UPDATE student_sessions
    SET score = new_score
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_answer_upsert
    AFTER INSERT OR UPDATE ON student_answers
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_session_score();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE nem_campos_formativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nem_contenidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nem_aprendizajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Policies: Profiles
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Policies: Teachers
CREATE POLICY "Teachers table viewable by authenticated" ON teachers FOR SELECT TO authenticated USING (true);

-- Policies: Groups
CREATE POLICY "Teachers can view own groups" ON groups FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can create groups" ON groups FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can update own groups" ON groups FOR UPDATE TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can delete own groups" ON groups FOR DELETE TO authenticated USING (teacher_id = auth.uid());

-- Policies: Group Members
CREATE POLICY "Group members viewable by teacher or member" ON group_members FOR SELECT TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM groups WHERE id = group_id AND teacher_id = auth.uid())
        OR student_id = auth.uid()
    );
CREATE POLICY "Students can join groups" ON group_members FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can leave groups" ON group_members FOR DELETE TO authenticated USING (student_id = auth.uid());

-- Policies: NEM (públicas para lectura)
CREATE POLICY "NEM campos formativos viewable by all" ON nem_campos_formativos FOR SELECT TO authenticated USING (true);
CREATE POLICY "NEM contenidos viewable by all" ON nem_contenidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "NEM aprendizajes viewable by all" ON nem_aprendizajes FOR SELECT TO authenticated USING (true);

-- Policies: Video Assignments
CREATE POLICY "Teachers can view own assignments" ON video_assignments FOR SELECT TO authenticated 
    USING (teacher_id = auth.uid());
CREATE POLICY "Students can view assignments of their groups" ON video_assignments FOR SELECT TO authenticated
    USING (
        is_published = true 
        AND EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = video_assignments.group_id 
            AND student_id = auth.uid()
        )
    );
CREATE POLICY "Teachers can create assignments" ON video_assignments FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can update own assignments" ON video_assignments FOR UPDATE TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can delete own assignments" ON video_assignments FOR DELETE TO authenticated USING (teacher_id = auth.uid());

-- Policies: Questions
CREATE POLICY "Questions viewable by assignment teacher or students" ON questions FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM video_assignments WHERE id = assignment_id AND teacher_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM video_assignments va
            JOIN group_members gm ON gm.group_id = va.group_id
            WHERE va.id = assignment_id AND gm.student_id = auth.uid()
        )
    );
CREATE POLICY "Teachers can manage questions" ON questions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM video_assignments WHERE id = assignment_id AND teacher_id = auth.uid()));

-- Policies: Student Sessions
CREATE POLICY "Students can view own sessions" ON student_sessions FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers can view sessions of their assignments" ON student_sessions FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM video_assignments WHERE id = assignment_id AND teacher_id = auth.uid()));
CREATE POLICY "Students can create own sessions" ON student_sessions FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own sessions" ON student_sessions FOR UPDATE TO authenticated USING (student_id = auth.uid());

-- Policies: Student Answers
CREATE POLICY "Students can view own answers" ON student_answers FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers can view answers of their assignments" ON student_answers FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM student_sessions ss
            JOIN video_assignments va ON va.id = ss.assignment_id
            WHERE ss.id = session_id AND va.teacher_id = auth.uid()
        )
    );
CREATE POLICY "Students can create own answers" ON student_answers FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own answers" ON student_answers FOR UPDATE TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Teachers can update answers for grading" ON student_answers FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM student_sessions ss
            JOIN video_assignments va ON va.id = ss.assignment_id
            WHERE ss.id = session_id AND va.teacher_id = auth.uid()
        )
    );

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX idx_groups_teacher ON groups(teacher_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_student ON group_members(student_id);
CREATE INDEX idx_nem_contenidos_campo ON nem_contenidos(campo_formativo_id);
CREATE INDEX idx_nem_contenidos_materia ON nem_contenidos(materia);
CREATE INDEX idx_nem_aprendizajes_contenido ON nem_aprendizajes(contenido_id);
CREATE INDEX idx_video_assignments_teacher ON video_assignments(teacher_id);
CREATE INDEX idx_video_assignments_group ON video_assignments(group_id);
CREATE INDEX idx_questions_assignment ON questions(assignment_id);
CREATE INDEX idx_student_sessions_assignment ON student_sessions(assignment_id);
CREATE INDEX idx_student_sessions_student ON student_sessions(student_id);
CREATE INDEX idx_student_answers_session ON student_answers(session_id);
CREATE INDEX idx_student_answers_student ON student_answers(student_id);

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
