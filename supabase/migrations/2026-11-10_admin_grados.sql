-- =====================================================================
-- LectorNKT · Cuenta administradora (sistemas@nikolatesla.edu.mx)
--
-- Solo esta cuenta puede: asignar grados, dar de baja o reactivar, borrar
-- estudiantes y pasar de grado. Las demás docentes siguen VIENDO todo.
-- "Pasar de grado" además solo funciona en el último mes y medio del ciclo,
-- y se puede deshacer mientras el ciclo nuevo no se use.
--
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Se puede correr dos veces sin daño.
-- =====================================================================

-- ---------- ¿Es la cuenta administradora? ----------
create or replace function public.lec_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
      and lower(email) = 'sistemas@nikolatesla.edu.mx'
  );
$$;
revoke execute on function public.lec_is_admin() from public, anon;
grant execute on function public.lec_is_admin() to authenticated;

-- ---------- Grados y bajas: docentes leen, solo la cuenta de sistemas escribe ----------
drop policy if exists "docentes todo" on public.lec_enrollments;
drop policy if exists "docentes leen inscripciones" on public.lec_enrollments;
create policy "docentes leen inscripciones" on public.lec_enrollments
  for select to authenticated using (public.lec_is_teacher());
drop policy if exists "admin escribe inscripciones" on public.lec_enrollments;
create policy "admin escribe inscripciones" on public.lec_enrollments
  for all to authenticated using (public.lec_is_admin()) with check (public.lec_is_admin());

-- ---------- Pasar de grado (solo admin y solo al final del ciclo) ----------
create or replace function public.lec_promote_cycle(p_from text, p_to text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare n int; m int;
begin
  if not public.lec_is_admin() then raise exception 'Solo la cuenta de sistemas puede pasar de grado'; end if;
  -- Solo en el último mes y medio del ciclo (46 días antes de que termine).
  if current_date < (select ends_on - 46 from public.lec_cycles where cycle = p_from) then
    raise exception 'Pasar de grado se habilita 46 días antes de que termine el ciclo %', p_from;
  end if;

  insert into public.lec_cycles (cycle, starts_on, ends_on, is_current, terms)
  select p_to, (starts_on + interval '1 year')::date, (ends_on + interval '1 year')::date, false, '[]'::jsonb
  from public.lec_cycles where cycle = p_from
  on conflict (cycle) do nothing;

  if not exists (select 1 from public.lec_cycles where cycle = p_to) then
    raise exception 'No existe el ciclo %', p_from;
  end if;

  insert into public.lec_enrollments (student_id, cycle, grade, status, status_date, updated_by)
  select e.student_id, p_to,
         case when e.grade in (1, 2) then e.grade + 1 else null end,
         case when e.grade = 3 then 'egresado' else 'activo' end,
         null,
         auth.uid()
  from public.lec_enrollments e
  where e.cycle = p_from and e.status = 'activo'
  on conflict (student_id, cycle) do nothing;
  get diagnostics n = row_count;

  update public.lec_enrollments t
     set status = 'baja', status_date = f.status_date, updated_by = auth.uid(), updated_at = now()
    from public.lec_enrollments f
   where f.cycle = p_from and f.status = 'baja'
     and t.cycle = p_to and t.student_id = f.student_id and t.status = 'activo';
  get diagnostics m = row_count;

  return jsonb_build_object('creados', n, 'bajas_sincronizadas', m);
end;
$$;

-- ---------- Borrar a un estudiante de LectorNKT (solo admin) ----------
create or replace function public.lec_purge_student(p_student uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  n int;
begin
  if not public.lec_is_admin() then raise exception 'Solo la cuenta de sistemas puede borrar estudiantes'; end if;

  delete from public.lec_attempts where student_id = p_student;           -- en cascada: lec_answers, lec_fluency_reviews
  get diagnostics n = row_count; result := result || jsonb_build_object('lec_attempts', n);
  delete from public.lec_student_levels where student_id = p_student;
  get diagnostics n = row_count; result := result || jsonb_build_object('lec_student_levels', n);
  delete from public.lec_level_changes where student_id = p_student;
  get diagnostics n = row_count; result := result || jsonb_build_object('lec_level_changes', n);
  delete from public.lec_consents where student_id = p_student;
  get diagnostics n = row_count; result := result || jsonb_build_object('lec_consents', n);
  delete from public.lec_accommodations where student_id = p_student;
  get diagnostics n = row_count; result := result || jsonb_build_object('lec_accommodations', n);
  delete from public.lec_enrollments where student_id = p_student;
  get diagnostics n = row_count; result := result || jsonb_build_object('lec_enrollments', n);
  delete from public.lec_group_joins where student_id = p_student;
  get diagnostics n = row_count; result := result || jsonb_build_object('lec_group_joins', n);
  delete from public.lec_assignment_targets where student_id = p_student;
  get diagnostics n = row_count; result := result || jsonb_build_object('lec_assignment_targets', n);

  return result;
end;
$$;

-- ---------- Deshacer "Pasar de grado" ----------
-- Borra el ciclo siguiente y su copia de grados, solo si no es el actual y
-- nadie ha creado asignaciones dentro de sus fechas.
create or replace function public.lec_undo_promote(p_cycle text)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  c record;
  n int;
begin
  if not public.lec_is_admin() then raise exception 'Solo la cuenta de sistemas puede deshacer'; end if;
  select * into c from public.lec_cycles where cycle = p_cycle;
  if not found then raise exception 'No existe el ciclo %', p_cycle; end if;
  if c.is_current then raise exception 'El ciclo % ya es el actual; no se puede deshacer', p_cycle; end if;
  if exists (
    select 1 from public.lec_assignments a
    where (a.created_at at time zone 'America/Mexico_City')::date between c.starts_on and c.ends_on
  ) then
    raise exception 'Ya hay asignaciones en el ciclo %; no se puede deshacer', p_cycle;
  end if;
  select count(*) into n from public.lec_enrollments where cycle = p_cycle;
  delete from public.lec_cycles where cycle = p_cycle;  -- en cascada: lec_enrollments de ese ciclo
  return n;
end;
$$;
revoke execute on function public.lec_undo_promote(text) from public, anon;
grant execute on function public.lec_undo_promote(text) to authenticated;

-- ---------- Verificación ----------
-- Esperado: admin_existe = 1; politicas = 2; funciones = 4
select
  (select count(*) from public.profiles where lower(email) = 'sistemas@nikolatesla.edu.mx' and role = 'teacher') as admin_existe,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'lec_enrollments'
     and policyname in ('docentes leen inscripciones', 'admin escribe inscripciones')) as politicas,
  (select count(*) from pg_proc where proname in ('lec_is_admin', 'lec_promote_cycle', 'lec_purge_student', 'lec_undo_promote')) as funciones;
