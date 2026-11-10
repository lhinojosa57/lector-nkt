-- =====================================================================
-- LectorNKT · Subida automática de nivel (regla compuesta)
-- Diseño: docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md (6.3 y 6.8)
--
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Es SOLO ADITIVA: agrega la columna seen_at a lec_level_changes, crea tres
-- funciones y un candado contra trampas en lec_attempts. Se puede correr dos veces sin daño.
--
-- Regla (por idioma), solo para quien ya hizo su diagnóstico (no provisional):
--   1. Comprensión: últimas 5 lecturas distintas en su nivel actual (primer intento de cada una, sin
--      diagnósticos, con preguntas, después de su último cambio de nivel):
--      al menos 4 con 75% o más y promedio de 80% o más. El porcentaje se
--      recalcula aquí desde lec_answers.
--   2. Precisión: de esos 5, los de voz alta ya revisados con 95% o más.
--   3. Cumplimiento: de sus asignaciones cerradas en ese idioma, al menos 80%
--      completadas y máximo 1 sin hacer. Sin asignaciones cerradas, se cumple.
-- Máximo Nivel 5. El nivel nunca baja automáticamente.
-- =====================================================================

alter table public.lec_level_changes add column if not exists seen_at timestamptz;

-- ---------- Avance hacia el siguiente nivel ----------
create or replace function public.lec_level_progress(p_student uuid, p_language text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_level int;
  v_prov boolean;
  v_since timestamptz;
  v_today date := (now() at time zone 'America/Mexico_City')::date;
  c_considered int;
  c_greens int;
  c_avg numeric;
  c_ok boolean;
  a_reviewed int;
  a_all_ok boolean;
  k_counted int;
  k_completed int;
  k_pct numeric;
  k_ok boolean;
begin
  if p_student is distinct from auth.uid() and not public.lec_is_teacher() then
    raise exception 'No autorizado';
  end if;

  select sl.level, sl.is_provisional, sl.updated_at
    into v_level, v_prov, v_since
  from lec_student_levels sl
  where sl.student_id = p_student and sl.language = p_language;
  if not found then
    v_level := 2; v_prov := true; v_since := '-infinity';
  end if;

  -- 1 y 2. Últimas 5 lecturas DISTINTAS en su nivel. De cada lectura cuenta solo
  -- su primer intento: releer el mismo texto (ya con las respuestas vistas) no suma.
  with firsts as (
    select distinct on (v.reading_id) a.id, a.mode, a.version_id, a.completed_at
    from lec_attempts a
    join lec_versions v on v.id = a.version_id
    join lec_readings r on r.id = v.reading_id
    where a.student_id = p_student
      and a.completed_at is not null
      and not a.is_diagnostic
      and v.level = v_level
      and r.language = p_language
      and a.completed_at > v_since
      and exists (select 1 from lec_questions q where q.version_id = a.version_id)
    order by v.reading_id, a.completed_at asc
  ),
  last5 as (
    select fi.id, fi.mode,
           100.0 * (select count(*) from lec_answers ans where ans.attempt_id = fi.id and ans.is_correct)
                 / nullif((select count(*) from lec_questions q where q.version_id = fi.version_id), 0) as pct
    from firsts fi
    order by fi.completed_at desc
    limit 5
  )
  select count(*),
         count(*) filter (where l.pct >= 75),
         round(avg(l.pct), 1),
         count(*) filter (where l.mode = 'aloud' and f.attempt_id is not null),
         coalesce(bool_and(f.accuracy_pct >= 95) filter (where l.mode = 'aloud' and f.attempt_id is not null), true)
    into c_considered, c_greens, c_avg, a_reviewed, a_all_ok
  from last5 l
  left join lec_fluency_reviews f on f.attempt_id = l.id;

  c_ok := c_considered = 5 and c_greens >= 4 and coalesce(c_avg, 0) >= 80;

  -- 3. Cumplimiento: asignaciones cerradas del idioma donde era destino.
  with closed as (
    select asg.id,
           exists (select 1 from lec_attempts at2
                   join lec_versions v2 on v2.id = at2.version_id and v2.reading_id = asg.reading_id
                   where at2.assignment_id = asg.id and at2.student_id = p_student
                     and at2.completed_at is not null and not at2.is_diagnostic) as done
    from lec_assignments asg
    join lec_readings r on r.id = asg.reading_id
    where r.language = p_language
      and (asg.archived
           or coalesce(asg.due_date, (asg.created_at at time zone 'America/Mexico_City')::date + 7) < v_today)
      and exists (
        select 1 from lec_assignment_targets t
        where t.assignment_id = asg.id
          and (t.student_id = p_student
               or (t.group_id is not null
                   and exists (select 1 from reading_group_members m
                               where m.group_id = t.group_id and m.student_id = p_student)
                   and coalesce((select (j.joined_at at time zone 'America/Mexico_City')::date
                                 from lec_group_joins j
                                 where j.group_id = t.group_id and j.student_id = p_student), '1970-01-01'::date)
                       <= (asg.created_at at time zone 'America/Mexico_City')::date))
      )
  )
  select count(*), count(*) filter (where done)
    into k_counted, k_completed
  from closed;

  k_pct := case when k_counted > 0 then round(100.0 * k_completed / k_counted, 1) end;
  k_ok := k_counted = 0 or (k_completed::numeric / k_counted >= 0.8 and k_counted - k_completed <= 1);

  return jsonb_build_object(
    'level', v_level,
    'provisional', v_prov,
    'max', v_level >= 5,
    'comprehension', jsonb_build_object(
      'considered', c_considered, 'greens', c_greens, 'avg', c_avg,
      'needGreens', 4, 'needCount', 5, 'ok', c_ok),
    'accuracy', jsonb_build_object('reviewed', a_reviewed, 'ok', a_all_ok),
    'compliance', jsonb_build_object(
      'counted', k_counted, 'completed', k_completed,
      'overduePending', k_counted - k_completed, 'pct', k_pct, 'ok', k_ok),
    'eligible', not v_prov and v_level < 5 and c_ok and a_all_ok and k_ok
  );
end;
$$;
revoke execute on function public.lec_level_progress(uuid, text) from public, anon;
grant execute on function public.lec_level_progress(uuid, text) to authenticated;

-- ---------- Subir de nivel si se cumple la regla ----------
-- Devuelve el nivel nuevo, o null si no hubo subida.
create or replace function public.lec_try_level_up(p_student uuid, p_language text)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_level int;
  v_progress jsonb;
begin
  if p_student is distinct from auth.uid() and not public.lec_is_teacher() then
    raise exception 'No autorizado';
  end if;

  -- Bloquea la fila: dos llamadas casi simultáneas no suben dos veces.
  select level into v_level
  from lec_student_levels
  where student_id = p_student and language = p_language
  for update;
  if not found then return null; end if;  -- sin fila = provisional

  v_progress := public.lec_level_progress(p_student, p_language);
  if not coalesce((v_progress->>'eligible')::boolean, false) then return null; end if;

  update lec_student_levels
     set level = v_level + 1, is_provisional = false, updated_by = null, updated_at = now()
   where student_id = p_student and language = p_language;

  insert into lec_level_changes (student_id, language, from_level, to_level, changed_by, reason)
  values (p_student, p_language, v_level, v_level + 1, null, 'auto');

  return v_level + 1;
end;
$$;
revoke execute on function public.lec_try_level_up(uuid, text) from public, anon;
grant execute on function public.lec_try_level_up(uuid, text) to authenticated;

-- ---------- El estudiante ya vio su felicitación ----------
create or replace function public.lec_mark_level_seen(p_change_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update lec_level_changes
     set seen_at = now()
   where id = p_change_id and student_id = auth.uid() and seen_at is null;
$$;
revoke execute on function public.lec_mark_level_seen(uuid) from public, anon;
grant execute on function public.lec_mark_level_seen(uuid) to authenticated;

-- ---------- Candado: el estudiante no puede alterar sus intentos ----------
-- La política de actualización de lec_attempts permite al estudiante editar su
-- propio intento (la app guarda ahí el audio, los tiempos y la reflexión). Este
-- candado evita trampas desde el navegador: no se puede cambiar de lectura, de
-- modo ni de asignación, y un intento terminado ya no cambia su resultado.
create or replace function public.lec_attempts_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.lec_is_teacher() then
    return new;
  end if;
  if new.student_id    is distinct from old.student_id
  or new.version_id    is distinct from old.version_id
  or new.assignment_id is distinct from old.assignment_id
  or new.mode          is distinct from old.mode
  or new.is_diagnostic is distinct from old.is_diagnostic
  or new.started_at    is distinct from old.started_at then
    raise exception 'No se puede cambiar la lectura, el modo ni la asignación de un intento';
  end if;
  if old.completed_at is not null
  and (new.completed_at      is distinct from old.completed_at
    or new.comprehension_pct is distinct from old.comprehension_pct
    or new.reading_seconds   is distinct from old.reading_seconds
    or new.audio_seconds     is distinct from old.audio_seconds) then
    raise exception 'Este intento ya se terminó';
  end if;
  return new;
end;
$$;

drop trigger if exists lec_attempts_guard on public.lec_attempts;
create trigger lec_attempts_guard
  before update on public.lec_attempts
  for each row execute function public.lec_attempts_guard();

-- ---------- Verificación ----------
-- Esperado: seen_at = 1; funciones = 4; candado = 1
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'lec_level_changes' and column_name = 'seen_at') as seen_at,
  (select count(*) from pg_proc
     where proname in ('lec_level_progress', 'lec_try_level_up', 'lec_mark_level_seen', 'lec_attempts_guard')) as funciones,
  (select count(*) from pg_trigger where tgname = 'lec_attempts_guard') as candado;


-- =====================================================================
-- PRUEBA DE LA REGLA (opcional). Copia desde "do $$" hasta el último "$$;",
-- pégalo en una consulta nueva y córrelo.
--
-- Va a salir un ERROR a propósito: así se deshace todo y no cambia nada real.
-- Lee el mensaje del error. Debe decir:
--   RESULTADO releer=1 a=null b=3 c=null nivel_final=3 cambios_auto=1
--
-- Qué prueba (con 5 lecturas de mentira, en borrador, creadas solo aquí):
--   releer: leer 5 veces el mismo texto cuenta como 1 lectura
--   a: con nivel provisional no sube aunque cumpla todo
--   b: ya con diagnóstico, sube de 2 a 3
--   c: una segunda llamada ya no sube
-- =====================================================================
/*
do $$
declare
  v_teacher uuid := (select id from public.profiles where role = 'teacher' order by email limit 1);
  v_student uuid := (select id from public.profiles where email = 'estudiante_prueba@nikolatesla.edu.mx');
  v_versions uuid[] := '{}';
  v_reading uuid;
  v_version uuid;
  v_attempt uuid;
  r_releer int; r_a int; r_b int; r_c int; r_nivel int; r_auto int;
  i int;
begin
  if v_student is null then raise exception 'No existe estudiante_prueba@nikolatesla.edu.mx'; end if;

  -- Actuar como docente para las funciones.
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);

  -- 5 lecturas de prueba (borrador), nivel 2, español, con 1 pregunta cada una.
  for i in 1..5 loop
    insert into public.lec_readings (title, language, subject, status)
    values ('PRUEBA subida de nivel ' || i, 'es', 'Otra', 'draft')
    returning id into v_reading;
    insert into public.lec_versions (reading_id, level, body, word_count)
    values (v_reading, 2, 'Texto de prueba.', 3)
    returning id into v_version;
    insert into public.lec_questions (version_id, skill, text, options, correct_option)
    values (v_version, 'literal', '¿Pregunta?', '[{"id":"a","text":"Sí"},{"id":"b","text":"No"}]', 'a');
    v_versions := v_versions || v_version;
  end loop;

  -- Aislar el cumplimiento: sin asignaciones ni grupos.
  delete from public.lec_assignment_targets where student_id = v_student;
  delete from public.reading_group_members where student_id = v_student;

  -- Nivel 2 provisional, desde ayer.
  insert into public.lec_student_levels (student_id, language, level, is_provisional, updated_at)
  values (v_student, 'es', 2, true, now() - interval '1 day')
  on conflict (student_id, language) do update
    set level = 2, is_provisional = true, updated_at = now() - interval '1 day';

  -- Releer: 5 veces la lectura 1, todo correcto.
  for i in 1..5 loop
    insert into public.lec_attempts (student_id, version_id, mode, is_diagnostic, started_at, completed_at)
    values (v_student, v_versions[1], 'silent', false, now() - interval '3 hours', now() - interval '2 hours' + i * interval '1 minute')
    returning id into v_attempt;
    insert into public.lec_answers (attempt_id, question_id, selected_option, is_correct)
    select v_attempt, q.id, 'a', true from public.lec_questions q where q.version_id = v_versions[1];
  end loop;
  r_releer := (public.lec_level_progress(v_student, 'es') -> 'comprehension' ->> 'considered')::int;

  -- Las lecturas 2 a 5, una vez cada una, todo correcto.
  for i in 2..5 loop
    insert into public.lec_attempts (student_id, version_id, mode, is_diagnostic, started_at, completed_at)
    values (v_student, v_versions[i], 'silent', false, now() - interval '2 hours', now() - interval '1 hour' + i * interval '1 minute')
    returning id into v_attempt;
    insert into public.lec_answers (attempt_id, question_id, selected_option, is_correct)
    select v_attempt, q.id, 'a', true from public.lec_questions q where q.version_id = v_versions[i];
  end loop;

  r_a := public.lec_try_level_up(v_student, 'es');

  update public.lec_student_levels set is_provisional = false
   where student_id = v_student and language = 'es';
  r_b := public.lec_try_level_up(v_student, 'es');
  r_c := public.lec_try_level_up(v_student, 'es');

  r_nivel := (select level from public.lec_student_levels where student_id = v_student and language = 'es');
  r_auto := (select count(*) from public.lec_level_changes
             where student_id = v_student and reason = 'auto' and created_at = now());

  raise exception 'RESULTADO releer=% a=% b=% c=% nivel_final=% cambios_auto=%',
    r_releer, coalesce(r_a::text, 'null'), coalesce(r_b::text, 'null'), coalesce(r_c::text, 'null'), r_nivel, r_auto;
end $$;
*/
