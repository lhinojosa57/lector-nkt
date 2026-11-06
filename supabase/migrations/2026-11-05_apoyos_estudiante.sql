-- Apoyos por estudiante (ajustes razonables) que activa el docente.
-- tts = la app puede leerle en voz alta el texto, las palabras clave y las preguntas
--       (nunca en los modos Voz alta y Lectura guiada).
create table if not exists public.lec_accommodations (
  student_id  uuid primary key references public.profiles(id) on delete cascade,
  tts         boolean not null default false,
  note        text,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

alter table public.lec_accommodations enable row level security;

drop policy if exists "docentes todo" on public.lec_accommodations;
create policy "docentes todo" on public.lec_accommodations
  for all to authenticated using (public.lec_is_teacher()) with check (public.lec_is_teacher());

drop policy if exists "estudiantes sus apoyos" on public.lec_accommodations;
create policy "estudiantes sus apoyos" on public.lec_accommodations
  for select to authenticated using (student_id = auth.uid());

-- Verificación
select count(*) as politicas from pg_policies where tablename = 'lec_accommodations';
