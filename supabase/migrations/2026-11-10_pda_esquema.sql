-- =====================================================================
-- LectorNKT · PDA — ESQUEMA (catálogo, etiquetas por lectura y configuración)
-- Diseño: docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md (6.7)
--
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Córrela ANTES de 2026-11-10_pda_datos.sql. Es SOLO ADITIVA y se puede
-- correr dos veces sin daño. Los estudiantes no pueden ver nada de esto.
-- =====================================================================

-- ---------- Catálogo oficial de PDA (Fase 6) ----------
-- "code" NO es único: hay códigos repetidos con texto distinto en el DOF.
-- grade null = aplica a los tres grados.
create table if not exists public.lec_pda (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,
  campo           text not null,
  disciplina      text not null,
  contenido_code  text not null,
  contenido_text  text,
  grade           int check (grade between 1 and 3),
  text            text not null,
  position        int not null
);
create unique index if not exists lec_pda_uniq on public.lec_pda (code, coalesce(grade, 0), md5(text));

-- ---------- PDA que trabaja cada lectura ----------
create table if not exists public.lec_reading_pdas (
  reading_id  uuid not null references public.lec_readings(id) on delete cascade,
  pda_id      uuid not null references public.lec_pda(id) on delete cascade,
  added_by    uuid references public.profiles(id) on delete set null,
  added_at    timestamptz not null default now(),
  primary key (reading_id, pda_id)
);
create index if not exists lec_reading_pdas_pda_idx on public.lec_reading_pdas (pda_id);

-- ---------- Configuración (una sola fila): encabezado del Concentrado ----------
create table if not exists public.lec_settings (
  id           boolean primary key default true check (id),
  school_name  text,
  cct          text,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles(id) on delete set null
);
insert into public.lec_settings (id) values (true) on conflict do nothing;

-- ---------- Seguridad: solo docentes ----------
alter table public.lec_pda          enable row level security;
alter table public.lec_reading_pdas enable row level security;
alter table public.lec_settings     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['lec_pda', 'lec_reading_pdas', 'lec_settings'] loop
    execute format('drop policy if exists "docentes todo" on public.%I', t);
    execute format(
      'create policy "docentes todo" on public.%I for all to authenticated using (public.lec_is_teacher()) with check (public.lec_is_teacher())', t);
  end loop;
end $$;

-- ---------- Verificación ----------
-- Esperado: tablas = 3; politicas = 3; settings = 1
select
  (select count(*) from information_schema.tables where table_schema = 'public'
     and table_name in ('lec_pda', 'lec_reading_pdas', 'lec_settings')) as tablas,
  (select count(*) from pg_policies where schemaname = 'public'
     and tablename in ('lec_pda', 'lec_reading_pdas', 'lec_settings') and policyname = 'docentes todo') as politicas,
  (select count(*) from public.lec_settings) as settings;
