-- =====================================================================
-- LectorNKT · Portadas de lecturas
-- Diseño: docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md (6.1)
--
-- Cómo aplicarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Es SOLO ADITIVA: agrega la columna cover_path a lec_readings y crea el
-- bucket público "lec-covers" (solo docentes suben, cambian o borran).
-- Se puede correr dos veces sin daño.
-- =====================================================================

alter table public.lec_readings add column if not exists cover_path text;

-- Bucket público: las portadas no son datos sensibles. La app sube WebP de 600×900.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lec-covers', 'lec-covers', true, 1048576, '{image/webp}')
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lec covers docentes insert" on storage.objects;
create policy "lec covers docentes insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lec-covers' and public.lec_is_teacher());

drop policy if exists "lec covers docentes update" on storage.objects;
create policy "lec covers docentes update" on storage.objects
  for update to authenticated
  using (bucket_id = 'lec-covers' and public.lec_is_teacher())
  with check (bucket_id = 'lec-covers' and public.lec_is_teacher());

drop policy if exists "lec covers docentes delete" on storage.objects;
create policy "lec covers docentes delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lec-covers' and public.lec_is_teacher());

-- ---------- Verificación ----------
-- Esperado: columna = 1; bucket_publico = true; politicas = 3
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'lec_readings' and column_name = 'cover_path') as columna,
  (select public from storage.buckets where id = 'lec-covers') as bucket_publico,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname like 'lec covers docentes%') as politicas;
