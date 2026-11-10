-- =====================================================================
-- LectorNKT · Subida automática de nivel (regla compuesta)
-- Diseño: docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md (6.3 y 6.8)
--
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Es SOLO ADITIVA: agrega la columna seen_at a lec_level_changes y crea tres
-- funciones. Se puede correr dos veces sin daño.
--
-- Regla (por idioma), solo para quien ya hizo su diagnóstico (no provisional):
--   1. Comprensión: últimos 5 intentos completados en su nivel actual (sin
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

  -- 1 y 2. Últimos 5 intentos en su nivel.
  with last5 as (
    select a.id, a.mode,
           100.0 * (select count(*) from lec_answers ans where ans.attempt_id = a.id and ans.is_correct)
                 / nullif((select count(*) from lec_questions q where q.version_id = a.version_id), 0) as pct
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
    order by a.completed_at desc
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
                   where at2.assignment_id = asg.id and at2.student_id = p_student
                     and at2.completed_at is not null) as done
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

-- ---------- Verificación ----------
-- Esperado: seen_at = 1; funciones = 3
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'lec_level_changes' and column_name = 'seen_at') as seen_at,
  (select count(*) from pg_proc
     where proname in ('lec_level_progress', 'lec_try_level_up', 'lec_mark_level_seen')) as funciones;


-- =====================================================================
-- PRUEBA DE LA REGLA (opcional). Copia desde "begin;" hasta "rollback;",
-- pégalo en una consulta nueva y córrelo. Todo se deshace al final: no
-- cambia nada real.
-- Esperado: a = null, b = 3, c = null, nivel_final = 3, cambios_auto = 1
-- =====================================================================
/*
begin;

create temp table t_res (paso text, valor int) on commit drop;

do $$
declare
  v_teacher uuid := (select id from public.profiles where role = 'teacher' order by email limit 1);
  v_student uuid := (select id from public.profiles where email = 'estudiante_prueba@nikolatesla.edu.mx');
  v_version uuid;
  v_attempt uuid;
  i int;
begin
  -- Actuar como docente para las funciones.
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);

  -- La versión de nivel 2 en español (publicada) con más preguntas.
  select v.id into v_version
  from public.lec_versions v
  join public.lec_readings r on r.id = v.reading_id
  where v.level = 2 and r.language = 'es' and r.status = 'published'
  order by (select count(*) from public.lec_questions q where q.version_id = v.id) desc
  limit 1;

  -- Aislar el cumplimiento: sin asignaciones ni grupos (se deshace al final).
  delete from public.lec_assignment_targets where student_id = v_student;
  delete from public.reading_group_members where student_id = v_student;

  -- Nivel 2 provisional, desde ayer.
  insert into public.lec_student_levels (student_id, language, level, is_provisional, updated_at)
  values (v_student, 'es', 2, true, now() - interval '1 day')
  on conflict (student_id, language) do update
    set level = 2, is_provisional = true, updated_at = now() - interval '1 day';

  -- 5 intentos con todo correcto, hace unas horas.
  for i in 1..5 loop
    insert into public.lec_attempts (student_id, version_id, mode, is_diagnostic, started_at, completed_at)
    values (v_student, v_version, 'silent', false, now() - interval '3 hours', now() - interval '2 hours' + i * interval '1 minute')
    returning id into v_attempt;
    insert into public.lec_answers (attempt_id, question_id, selected_option, is_correct)
    select v_attempt, q.id, coalesce(q.correct_option, 'a'), true
    from public.lec_questions q where q.version_id = v_version;
  end loop;

  -- (a) provisional: no sube
  insert into t_res values ('a', public.lec_try_level_up(v_student, 'es'));

  -- (b) ya con diagnóstico: sube a 3
  update public.lec_student_levels set is_provisional = false
   where student_id = v_student and language = 'es';
  insert into t_res values ('b', public.lec_try_level_up(v_student, 'es'));

  -- (c) segunda llamada: ya no sube
  insert into t_res values ('c', public.lec_try_level_up(v_student, 'es'));

  insert into t_res values ('nivel_final',
    (select level from public.lec_student_levels where student_id = v_student and language = 'es'));
  insert into t_res values ('cambios_auto',
    (select count(*) from public.lec_level_changes where student_id = v_student and reason = 'auto' and created_at = now()));
end $$;

select * from t_res;

rollback;
*/
