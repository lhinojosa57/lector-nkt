-- =====================================================================
-- LectorNKT · Fundamentos: ciclos escolares, grado/estado por ciclo,
-- fecha de unión a grupos, "Pasar de grado" y borrado definitivo.
-- Diseño: docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md (6.6, 6.8)
--
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Es SOLO ADITIVA: crea tablas lec_* nuevas. No modifica ni borra filas de
-- profiles, reading_groups ni reading_group_members (solo las lee).
-- Se puede correr dos veces sin daño.
-- =====================================================================

-- ---------- Ciclos escolares ----------
create table if not exists public.lec_cycles (
  cycle       text primary key,               -- '2026-2027'
  starts_on   date not null,
  ends_on     date not null,
  is_current  boolean not null default false,
  terms       jsonb not null default '[]'::jsonb  -- [{ "name": "T1", "starts_on": "...", "ends_on": "..." }]
);
create unique index if not exists lec_cycles_one_current on public.lec_cycles (is_current) where is_current;

-- Fechas provisionales: se ajustan después con el calendario de Aprende NKT Virtual.
insert into public.lec_cycles (cycle, starts_on, ends_on, is_current)
values ('2026-2027', '2026-08-01', '2027-07-31', true)
on conflict (cycle) do nothing;

-- ---------- Grado y estado de cada estudiante por ciclo ----------
create table if not exists public.lec_enrollments (
  student_id   uuid not null references public.profiles(id) on delete cascade,
  cycle        text not null references public.lec_cycles(cycle) on delete cascade,
  grade        int check (grade between 1 and 3),   -- 1° = 7°, 2° = 8°, 3° = 9°
  status       text not null default 'activo' check (status in ('activo', 'baja', 'egresado')),
  status_date  date,
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (student_id, cycle)
);

-- ---------- Fecha en que cada estudiante se unió a cada grupo ----------
create table if not exists public.lec_group_joins (
  student_id  uuid not null references public.profiles(id) on delete cascade,
  group_id    uuid not null references public.reading_groups(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (student_id, group_id)
);

-- Miembros actuales: se toma la fecha de creación del grupo.
insert into public.lec_group_joins (student_id, group_id, joined_at)
select m.student_id, m.group_id, g.created_at
from public.reading_group_members m
join public.reading_groups g on g.id = m.group_id
on conflict do nothing;

-- ---------- RLS ----------
alter table public.lec_cycles      enable row level security;
alter table public.lec_enrollments enable row level security;
alter table public.lec_group_joins enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lec_cycles', 'lec_enrollments', 'lec_group_joins'] loop
    execute format('drop policy if exists "docentes todo" on public.%I', t);
    execute format(
      'create policy "docentes todo" on public.%I for all to authenticated using (public.lec_is_teacher()) with check (public.lec_is_teacher())', t);
  end loop;
end $$;

drop policy if exists "todos leen ciclos" on public.lec_cycles;
create policy "todos leen ciclos" on public.lec_cycles
  for select to authenticated using (true);

drop policy if exists "estudiantes su inscripcion" on public.lec_enrollments;
create policy "estudiantes su inscripcion" on public.lec_enrollments
  for select to authenticated using (student_id = auth.uid());

drop policy if exists "estudiantes sus uniones" on public.lec_group_joins;
create policy "estudiantes sus uniones" on public.lec_group_joins
  for select to authenticated using (student_id = auth.uid());
drop policy if exists "estudiantes registran su union" on public.lec_group_joins;
create policy "estudiantes registran su union" on public.lec_group_joins
  for insert to authenticated with check (
    student_id = auth.uid()
    and joined_at between now() - interval '5 minutes' and now() + interval '1 minute'  -- no se puede inventar la fecha
  );

-- ---------- Funciones ----------
create or replace function public.lec_current_cycle()
returns text
language sql stable security definer set search_path = public
as $$
  select cycle from public.lec_cycles where is_current limit 1;
$$;

-- ¿Está dado de baja en el ciclo actual? Sin fila = no.
-- Solo responde sobre uno mismo (o a docentes): no revela el estado de otros estudiantes.
create or replace function public.lec_is_dropped(p_student uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (p_student = auth.uid() or public.lec_is_teacher())
     and exists (
       select 1 from public.lec_enrollments e
       where e.student_id = p_student
         and e.cycle = public.lec_current_cycle()
         and e.status = 'baja'
     );
$$;
revoke execute on function public.lec_is_dropped(uuid) from public, anon;
grant execute on function public.lec_is_dropped(uuid) to authenticated;

-- Prepara el ciclo siguiente: 1°→2°, 2°→3°, 3°→egresado. Las bajas no pasan.
-- No pisa filas que ya existan en el ciclo destino, salvo para sincronizar bajas:
-- quien se dio de baja en p_from después de una primera corrida queda de baja en p_to.
-- Devuelve { "creados": n, "bajas_sincronizadas": m }.
drop function if exists public.lec_promote_cycle(text, text);
create or replace function public.lec_promote_cycle(p_from text, p_to text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare n int; m int;
begin
  if not public.lec_is_teacher() then raise exception 'Solo docentes'; end if;

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

-- Borrado definitivo SOLO de los datos de LectorNKT de un estudiante.
-- No toca profiles, reading_group_members ni datos de EvalNKT/VideoNKT.
create or replace function public.lec_purge_student(p_student uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  n int;
begin
  if not public.lec_is_teacher() then raise exception 'Solo docentes'; end if;

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

-- Los estudiantes dados de baja ya no pueden crear intentos.
drop policy if exists "estudiantes crean intentos" on public.lec_attempts;
create policy "estudiantes crean intentos" on public.lec_attempts
  for insert to authenticated
  with check (student_id = auth.uid() and not public.lec_is_dropped(auth.uid()));

-- ---------- Verificación ----------
-- Esperado: tablas = 3; ciclos_actuales = 1; uniones = miembros; bajas = 0
select
  (select count(*) from information_schema.tables where table_schema = 'public'
     and table_name in ('lec_cycles', 'lec_enrollments', 'lec_group_joins')) as tablas,
  (select count(*) from public.lec_cycles where is_current) as ciclos_actuales,
  (select count(*) from public.lec_group_joins) as uniones,
  (select count(*) from public.reading_group_members) as miembros,
  (select count(*) from public.lec_enrollments where status = 'baja') as bajas;
