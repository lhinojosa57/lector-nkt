-- Agrega el modo "guided" (Lectura guiada) a asignaciones e intentos.
alter table public.lec_assignments drop constraint if exists lec_assignments_mode_check;
alter table public.lec_assignments add constraint lec_assignments_mode_check
  check (mode in ('aloud', 'silent', 'comprehension', 'guided'));

alter table public.lec_attempts drop constraint if exists lec_attempts_mode_check;
alter table public.lec_attempts add constraint lec_attempts_mode_check
  check (mode in ('aloud', 'silent', 'comprehension', 'guided'));

-- Verificación: debe listar las 2 restricciones con 'guided'.
select conrelid::regclass as tabla, pg_get_constraintdef(oid) as regla
from pg_constraint
where conname in ('lec_assignments_mode_check', 'lec_attempts_mode_check');
