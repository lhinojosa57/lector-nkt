-- =====================================================================
-- LectorNKT 2.0 · Fase 1 · Tablas lec_* (biblioteca, asignaciones,
-- intentos, revisión de fluidez, niveles, consentimientos)
--
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Es SOLO ADITIVA: crea tablas nuevas con prefijo lec_ y copia los
-- textos existentes. No modifica ni borra tablas de VideoNKT, EvalNKT
-- ni las tablas reading_* actuales. Se puede correr dos veces sin daño.
-- =====================================================================

-- ---------- Ayudante: ¿el usuario actual es docente? ----------
create or replace function public.lec_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

-- ---------- Lecturas ----------
create table if not exists public.lec_readings (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  language    text not null default 'es' check (language in ('es', 'en')),
  subject     text not null,
  topic       text,
  text_type   text,
  source      text,
  created_by  uuid references public.profiles(id) on delete set null,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.lec_versions (
  id              uuid primary key default gen_random_uuid(),
  reading_id      uuid not null references public.lec_readings(id) on delete cascade,
  level           int  not null check (level between 1 and 5),
  body            text not null,
  word_count      int  not null default 0,
  readability     numeric,
  vocabulary      jsonb not null default '[]'::jsonb,
  curiosity_fact  text,
  created_at      timestamptz not null default now(),
  unique (reading_id, level)
);

create table if not exists public.lec_questions (
  id              uuid primary key default gen_random_uuid(),
  version_id      uuid not null references public.lec_versions(id) on delete cascade,
  skill           text not null check (skill in ('literal', 'inferencial', 'vocabulario', 'estructura', 'idea_principal', 'critica')),
  text            text not null,
  options         jsonb not null default '[]'::jsonb,   -- [{ "id": "a", "text": "..." }]
  correct_option  text not null,
  explanation     text,
  position        int  not null default 0
);

-- ---------- Asignaciones ----------
create table if not exists public.lec_assignments (
  id           uuid primary key default gen_random_uuid(),
  reading_id   uuid not null references public.lec_readings(id) on delete cascade,
  mode         text not null check (mode in ('aloud', 'silent', 'comprehension')),
  fixed_level  int check (fixed_level between 1 and 5),
  due_date     date,
  created_by   uuid references public.profiles(id) on delete set null,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.lec_assignment_targets (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.lec_assignments(id) on delete cascade,
  group_id       uuid references public.reading_groups(id) on delete cascade,
  student_id     uuid references public.profiles(id) on delete cascade,
  check ((group_id is null) <> (student_id is null))
);

-- ---------- Intentos y respuestas ----------
create table if not exists public.lec_attempts (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.profiles(id) on delete cascade,
  version_id         uuid not null references public.lec_versions(id) on delete cascade,
  assignment_id      uuid references public.lec_assignments(id) on delete set null,
  mode               text not null check (mode in ('aloud', 'silent', 'comprehension')),
  is_diagnostic      boolean not null default false,
  drive_file_id      text,
  audio_seconds      numeric,
  reading_seconds    numeric,
  comprehension_pct  numeric,
  reflection         text,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz
);

create table if not exists public.lec_answers (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.lec_attempts(id) on delete cascade,
  question_id      uuid not null references public.lec_questions(id) on delete cascade,
  selected_option  text not null,
  is_correct       boolean not null,
  answered_at      timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ---------- Revisión de fluidez (Fase 3; se crea ya para no migrar dos veces) ----------
create table if not exists public.lec_fluency_reviews (
  attempt_id       uuid primary key references public.lec_attempts(id) on delete cascade,
  reviewer_id      uuid references public.profiles(id) on delete set null,
  words_read       int not null,
  error_positions  jsonb not null default '[]'::jsonb,
  wcpm             numeric not null,
  accuracy_pct     numeric not null,
  expression       int check (expression between 1 and 4),
  comment          text,
  reviewed_at      timestamptz not null default now()
);

-- ---------- Nivel del estudiante por idioma ----------
create table if not exists public.lec_student_levels (
  student_id      uuid not null references public.profiles(id) on delete cascade,
  language        text not null check (language in ('es', 'en')),
  level           int  not null check (level between 1 and 5),
  is_provisional  boolean not null default true,
  updated_by      uuid references public.profiles(id) on delete set null,
  updated_at      timestamptz not null default now(),
  primary key (student_id, language)
);

create table if not exists public.lec_level_changes (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  language    text not null check (language in ('es', 'en')),
  from_level  int,
  to_level    int not null,
  changed_by  uuid references public.profiles(id) on delete set null,
  reason      text,
  created_at  timestamptz not null default now()
);

-- ---------- Consentimiento de la familia ----------
create table if not exists public.lec_consents (
  student_id               uuid primary key references public.profiles(id) on delete cascade,
  guardian_name            text not null,
  relationship             text not null,
  accepts_google_services  boolean not null,
  accepts_voice_recording  boolean not null,
  consent_version          text not null default '2026-27-v1',
  accepted_at              timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists lec_versions_reading_idx  on public.lec_versions(reading_id);
create index if not exists lec_questions_version_idx on public.lec_questions(version_id);
create index if not exists lec_targets_assign_idx    on public.lec_assignment_targets(assignment_id);
create index if not exists lec_targets_group_idx     on public.lec_assignment_targets(group_id);
create index if not exists lec_targets_student_idx   on public.lec_assignment_targets(student_id);
create index if not exists lec_attempts_student_idx  on public.lec_attempts(student_id);
create index if not exists lec_attempts_assign_idx   on public.lec_attempts(assignment_id);
create index if not exists lec_answers_attempt_idx   on public.lec_answers(attempt_id);

-- =====================================================================
-- Seguridad (RLS)
-- =====================================================================
alter table public.lec_readings           enable row level security;
alter table public.lec_versions           enable row level security;
alter table public.lec_questions          enable row level security;
alter table public.lec_assignments        enable row level security;
alter table public.lec_assignment_targets enable row level security;
alter table public.lec_attempts           enable row level security;
alter table public.lec_answers            enable row level security;
alter table public.lec_fluency_reviews    enable row level security;
alter table public.lec_student_levels     enable row level security;
alter table public.lec_level_changes      enable row level security;
alter table public.lec_consents           enable row level security;

-- Docentes: acceso completo a todas las tablas lec_*
do $$
declare t text;
begin
  foreach t in array array[
    'lec_readings','lec_versions','lec_questions','lec_assignments',
    'lec_assignment_targets','lec_attempts','lec_answers',
    'lec_fluency_reviews','lec_student_levels','lec_level_changes','lec_consents'
  ] loop
    execute format('drop policy if exists "docentes todo" on public.%I', t);
    execute format(
      'create policy "docentes todo" on public.%I for all to authenticated using (public.lec_is_teacher()) with check (public.lec_is_teacher())', t);
  end loop;
end $$;

-- Estudiantes: ven lecturas y versiones publicadas
drop policy if exists "estudiantes leen publicadas" on public.lec_readings;
create policy "estudiantes leen publicadas" on public.lec_readings
  for select to authenticated using (status = 'published');

drop policy if exists "estudiantes leen versiones publicadas" on public.lec_versions;
create policy "estudiantes leen versiones publicadas" on public.lec_versions
  for select to authenticated using (
    exists (select 1 from public.lec_readings r where r.id = reading_id and r.status = 'published')
  );

-- Estudiantes NO leen lec_questions directamente (ahí está la respuesta correcta).
-- Usan la vista lec_questions_public y la función lec_answer().

-- Estudiantes: ven las asignaciones dirigidas a ellos o a sus grupos
drop policy if exists "estudiantes ven sus asignaciones" on public.lec_assignment_targets;
create policy "estudiantes ven sus asignaciones" on public.lec_assignment_targets
  for select to authenticated using (
    student_id = auth.uid()
    or group_id in (select m.group_id from public.reading_group_members m where m.student_id = auth.uid())
  );

drop policy if exists "estudiantes ven sus asignaciones" on public.lec_assignments;
create policy "estudiantes ven sus asignaciones" on public.lec_assignments
  for select to authenticated using (
    exists (
      select 1 from public.lec_assignment_targets t
      where t.assignment_id = lec_assignments.id
        and (t.student_id = auth.uid()
             or t.group_id in (select m.group_id from public.reading_group_members m where m.student_id = auth.uid()))
    )
  );

-- Estudiantes: sus propios intentos
drop policy if exists "estudiantes sus intentos" on public.lec_attempts;
create policy "estudiantes sus intentos" on public.lec_attempts
  for select to authenticated using (student_id = auth.uid());
drop policy if exists "estudiantes crean intentos" on public.lec_attempts;
create policy "estudiantes crean intentos" on public.lec_attempts
  for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "estudiantes actualizan intentos" on public.lec_attempts;
create policy "estudiantes actualizan intentos" on public.lec_attempts
  for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Estudiantes: leen sus respuestas, revisiones, niveles y consentimiento
drop policy if exists "estudiantes sus respuestas" on public.lec_answers;
create policy "estudiantes sus respuestas" on public.lec_answers
  for select to authenticated using (
    exists (select 1 from public.lec_attempts a where a.id = attempt_id and a.student_id = auth.uid())
  );

drop policy if exists "estudiantes sus revisiones" on public.lec_fluency_reviews;
create policy "estudiantes sus revisiones" on public.lec_fluency_reviews
  for select to authenticated using (
    exists (select 1 from public.lec_attempts a where a.id = attempt_id and a.student_id = auth.uid())
  );

drop policy if exists "estudiantes su nivel" on public.lec_student_levels;
create policy "estudiantes su nivel" on public.lec_student_levels
  for select to authenticated using (student_id = auth.uid());

drop policy if exists "estudiantes sus cambios de nivel" on public.lec_level_changes;
create policy "estudiantes sus cambios de nivel" on public.lec_level_changes
  for select to authenticated using (student_id = auth.uid());

drop policy if exists "estudiantes su consentimiento" on public.lec_consents;
create policy "estudiantes su consentimiento" on public.lec_consents
  for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ---------- Preguntas sin la respuesta correcta (para estudiantes) ----------
create or replace view public.lec_questions_public as
  select q.id, q.version_id, q.skill, q.text, q.options, q.position
  from public.lec_questions q
  join public.lec_versions v on v.id = q.version_id
  join public.lec_readings r on r.id = v.reading_id
  where r.status = 'published' or public.lec_is_teacher();

grant select on public.lec_questions_public to authenticated;

-- ---------- Responder una pregunta (califica en el servidor) ----------
create or replace function public.lec_answer(p_attempt_id uuid, p_question_id uuid, p_selected text)
returns table (is_correct boolean, correct_option text, explanation text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correct text;
  v_expl text;
begin
  if not exists (
    select 1 from lec_attempts a
    where a.id = p_attempt_id and a.student_id = auth.uid() and a.completed_at is null
  ) then
    raise exception 'Intento no válido';
  end if;

  select q.correct_option, q.explanation into v_correct, v_expl
  from lec_questions q
  join lec_attempts a on a.version_id = q.version_id
  where q.id = p_question_id and a.id = p_attempt_id;

  if v_correct is null then
    raise exception 'La pregunta no pertenece a esta lectura';
  end if;

  insert into lec_answers (attempt_id, question_id, selected_option, is_correct)
  values (p_attempt_id, p_question_id, p_selected, p_selected = v_correct)
  on conflict (attempt_id, question_id) do nothing;

  return query
    select a.is_correct, v_correct, v_expl
    from lec_answers a
    where a.attempt_id = p_attempt_id and a.question_id = p_question_id;
end;
$$;

grant execute on function public.lec_answer(uuid, uuid, text) to authenticated;

-- =====================================================================
-- Copiar los textos actuales (reading_texts) a la biblioteca nueva.
-- Cada texto se vuelve una lectura con una versión de nivel 2.
-- El id de la versión = id del texto viejo, para poder ligar sus preguntas.
-- El texto del diagnóstico queda en borrador (se reemplazará por el escalonado).
-- =====================================================================
insert into public.lec_readings (id, title, language, subject, topic, text_type, source, status)
select
  gen_random_uuid(),
  t.title,
  'es',
  'Español',
  case when t.id = '98c0dbf4-7911-4025-a3bc-31ba4e83e9c0' then 'Diagnóstico (versión abril 2026)'
       else 'Días Internacionales' end,
  'expositivo',
  'reading_texts:' || t.id::text,
  case when t.id = '98c0dbf4-7911-4025-a3bc-31ba4e83e9c0' then 'draft' else 'published' end
from public.reading_texts t
where not exists (
  select 1 from public.lec_readings r where r.source = 'reading_texts:' || t.id::text
);

insert into public.lec_versions (id, reading_id, level, body, word_count, vocabulary, curiosity_fact)
select
  t.id,
  r.id,
  2,
  t.body,
  coalesce(t.word_count, 0),
  case
    when t.vocabulary is null then '[]'::jsonb
    when jsonb_typeof(to_jsonb(t.vocabulary)) = 'string' then (to_jsonb(t.vocabulary) #>> '{}')::jsonb
    else to_jsonb(t.vocabulary)
  end,
  t.curiosity_fact
from public.reading_texts t
join public.lec_readings r on r.source = 'reading_texts:' || t.id::text
where not exists (select 1 from public.lec_versions v where v.id = t.id);

insert into public.lec_questions (id, version_id, skill, text, options, correct_option, explanation, position)
select
  q.id,
  q.text_id,
  case when q.question_level::text in ('literal', 'inferencial', 'vocabulario', 'estructura', 'idea_principal', 'critica')
       then q.question_level::text else 'literal' end,
  q.question_text,
  case
    when q.options is null then '[]'::jsonb
    when jsonb_typeof(to_jsonb(q.options)) = 'string' then (to_jsonb(q.options) #>> '{}')::jsonb
    else to_jsonb(q.options)
  end,
  q.correct_answer,
  q.explanation,
  coalesce(q.order_index, 0)
from public.reading_questions q
where exists (select 1 from public.lec_versions v where v.id = q.text_id)
  and not exists (select 1 from public.lec_questions x where x.id = q.id);

-- ---------- Verificación: debe mostrar cuántas filas se copiaron ----------
select
  (select count(*) from public.lec_readings)  as lecturas,
  (select count(*) from public.lec_versions)  as versiones,
  (select count(*) from public.lec_questions) as preguntas,
  (select count(*) from public.reading_texts) as textos_viejos,
  (select count(*) from public.reading_questions) as preguntas_viejas;
