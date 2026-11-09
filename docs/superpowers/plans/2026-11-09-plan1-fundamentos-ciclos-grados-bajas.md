# Plan 1 · Fundamentos: ciclos, grados, bajas y destinatarios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada estudiante tenga un grado fijo por ciclo escolar y un estado (activo, baja o egresado) que el equipo docente administra desde la pestaña Estudiantes. Además, que la app aplique las reglas comunes de destinatarios y cierre de asignaciones, base de todos los planes siguientes.

**Architecture:**
- Nuevas tablas `lec_cycles`, `lec_enrollments` y `lec_group_joins`, más funciones SQL `security definer` para las operaciones masivas (pasar de grado, borrado definitivo). Todo en un archivo SQL idempotente que corre Larisa.
- La lógica pura (interpretar listas pegadas, reglas de cierre y destinatarios) vive en `src/lib/` con pruebas en Vitest.
- La pestaña Estudiantes se reescribe sobre esas piezas.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Tailwind 3, Supabase (Postgres + RLS) y Vitest (nuevo, solo para lógica pura).

**Spec:** `docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md`, secciones 6.6 y 6.8 (y restricciones de la 3).

**Planes siguientes** (cada uno se escribe al terminar el anterior):
- 2: portadas (6.1).
- 3: estantes del estudiante y subida de nivel (6.2, 6.3).
- 4: estantes del docente y "cómo les fue" (6.4, 6.5).
- 5: PDA, panel y concentrado de avance (6.7).

## Global Constraints

- Supabase compartido con VideoNKT y EvalNKT. Las tablas nuevas llevan prefijo `lec_`. **Nunca** se borran ni modifican filas de `profiles`, `reading_groups` ni `reading_group_members`, y no se les agregan triggers.
- El SQL va en `supabase/migrations/2026-11-09_ciclos_inscripciones.sql`. Debe ser idempotente (`if not exists`, `create or replace`, `drop policy if exists`) y terminar con consultas de verificación. Lo corre Larisa en el SQL Editor; nadie más lo ejecuta.
- RLS con el patrón existente: `public.lec_is_teacher()` para docentes ("docentes todo") y `student_id = auth.uid()` para estudiantes.
- Grados: `1`, `2` y `3` (1° = 7°, 2° = 8°, 3° = 9°). En pantalla se muestran como "1°", "2°" y "3°".
- Estados: `'activo' | 'baja' | 'egresado'`. **Si un estudiante no tiene fila de inscripción, se considera `activo` sin grado.**
- Ciclo actual: `'2026-2027'`.
- Una asignación sin `due_date` tiene fecha límite implícita **7 días después** de `created_at`.
- Copy en español mexicano, sin "Bienvenido/a" ni diagonales de género. Accesibilidad como en las pantallas del estudiante: foco visible, `aria-*` y contraste AA.
- Rama nueva `fase-4-fundamentos`, creada desde `fase-3`. Preview en `https://lector-nkt-git-fase-4-fundamentos-sistemas-9143s-projects.vercel.app`. A `main` solo se une con el OK de Larisa.
- Las fechas "del día" se calculan en hora de México (`America/Mexico_City`), no en UTC.

## Review Focus

1. **Lista pegada desde Excel o Classroom:** tabulaciones, fila de encabezado, mayúsculas en correos, "7°", "1º", "Primero" y "tercero" deben interpretarse bien. Los correos que no existen se reportan, sin fallar en silencio. (Pruebas en la Tarea 1.)
2. **Estudiante que sale y vuelve a entrar a un grupo con el código:** su `joined_at` original **no** se reinicia. (Tarea 4, paso de upsert con `ignoreDuplicates`.)
3. **Estudiante sin fila de inscripción:** entra normalmente y nunca ve la pantalla de "cuenta no activa". (Pruebas en la Tarea 2 y verificación en la Tarea 4.)
4. **"Pasar de grado" ejecutado dos veces:** no duplica filas, no pisa correcciones manuales del ciclo nuevo y no promueve a los dados de baja. (Verificación SQL en la Tarea 3.)
5. **Asignación creada a las 11 p.m. hora de México:** su fecha (y la fecha límite implícita de 7 días) se calcula con el día local, no con el de UTC. (Pruebas en la Tarea 2.)

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/roster.ts` (nuevo) | Lógica pura: `parseGrade`, `parseRosterPaste`, `formatGrade`, tipos `Grade` y `EnrollmentStatus`. |
| `src/lib/roster.test.ts` (nuevo) | Pruebas de `roster.ts`. |
| `src/lib/assignmentRules.ts` (nuevo) | Lógica pura: `localDate`, `effectiveDueDate`, `isClosed`, `isTarget`. La usan los planes 3, 4 y 5. |
| `src/lib/assignmentRules.test.ts` (nuevo) | Pruebas de `assignmentRules.ts`. |
| `supabase/migrations/2026-11-09_ciclos_inscripciones.sql` (nuevo) | Tablas, RLS, respaldo de uniones, funciones `lec_promote_cycle` y `lec_purge_student`, y verificación. |
| `src/lib/rosterApi.ts` (nuevo) | Llamadas a Supabase para ciclos, inscripciones, uniones a grupo, purga y promoción. |
| `src/lib/useEnrollmentStatus.ts` (nuevo) | Hook del estudiante: su estado en el ciclo actual. |
| `src/pages/teacher/Students.tsx` (nuevo) | Pestaña Estudiantes nueva. Reemplaza a `TeacherDashboard.tsx` en la ruta `/teacher`. |
| `src/components/PasteListModal.tsx` (nuevo) | Diálogo "Pegar lista" (grados o bajas). |
| `src/App.tsx` (modificar) | Ruta `/teacher` → `Students` y bloqueo de estudiantes de baja. |
| `src/pages/student/StudentDashboard.tsx` (modificar) | Registrar `lec_group_joins` al unirse a un grupo. |
| `src/pages/teacher/Assignments.tsx` (modificar) | Contar destinatarios con `isTarget` (sin bajas ni quienes llegaron tarde). |
| `package.json` (modificar) | `vitest` y script `test`. |

`TeacherDashboard.tsx` muestra datos del LectorNKT viejo, con el WPM que no se mide en realidad (hallazgo del 2026-11-04). Queda sin ruta y se borra en la Tarea 5.

---

### Task 1: Vitest e interpretación de listas pegadas

**Files:**
- Modify: `package.json`
- Create: `src/lib/roster.ts`
- Test: `src/lib/roster.test.ts`

**Interfaces:**
- Produces:
  - `type Grade = 1 | 2 | 3`
  - `type EnrollmentStatus = 'activo' | 'baja' | 'egresado'`
  - `parseGrade(raw: string): Grade | null`
  - `formatGrade(g: Grade | null): string`, que devuelve `'1°'`, `'2°'`, `'3°'` o `'—'`.
  - `parseRosterPaste(text: string): { rows: { email: string; grade: Grade | null }[]; invalid: { line: number; text: string }[] }`

- [ ] **Step 1: Crear la rama e instalar Vitest**

```bash
git checkout fase-3 && git pull && git checkout -b fase-4-fundamentos
npm i -D vitest
```

Agregar en `package.json`, dentro de `"scripts"`, la línea `"test": "vitest run"`. Si npm avisa de un conflicto de `peerDependencies` con Vite 8, instalar la versión más reciente de Vitest que declare compatibilidad con Vite 8 (`npm view vitest peerDependencies`).

Vitest debe resolver el alias `@`: `vite.config.ts` ya lo define, así que Vitest lo hereda. No se necesita un `vitest.config.ts` aparte.

- [ ] **Step 2: Escribir las pruebas que fallan**

```ts
// src/lib/roster.test.ts
import { describe, it, expect } from 'vitest'
import { parseGrade, parseRosterPaste, formatGrade } from './roster'

describe('parseGrade', () => {
  it.each([
    ['1', 1], ['2', 2], ['3', 3], ['7', 1], ['8', 2], ['9', 3],
    ['1°', 1], ['7°', 1], ['2º', 2], ['9o', 3],
    ['Primero', 1], ['segundo', 2], ['TERCERO', 3],
    ['séptimo', 1], ['octavo', 2], ['noveno', 3],
    [' 2 ', 2], ['Primer grado', 1], ['Segundo grado', 2],
  ])('%s → %s', (raw, expected) => expect(parseGrade(raw)).toBe(expected))

  it.each(['', '4', '10', 'quinto', 'abc'])('%s → null', raw => expect(parseGrade(raw)).toBeNull())
})

describe('formatGrade', () => {
  it('muestra grado o guion', () => {
    expect(formatGrade(1)).toBe('1°')
    expect(formatGrade(null)).toBe('—')
  })
})

describe('parseRosterPaste', () => {
  it('acepta tabulaciones de Excel, encabezado y mayúsculas', () => {
    const r = parseRosterPaste('Correo\tGrado\nAna.Lopez@NikolaTesla.edu.mx\t7°\nbeto@nikolatesla.edu.mx\t2\n')
    expect(r.rows).toEqual([
      { email: 'ana.lopez@nikolatesla.edu.mx', grade: 1 },
      { email: 'beto@nikolatesla.edu.mx', grade: 2 },
    ])
    expect(r.invalid).toEqual([])
  })

  it('acepta comas, punto y coma y correos solos (lista de bajas)', () => {
    const r = parseRosterPaste('a@nikolatesla.edu.mx, tercero\nb@nikolatesla.edu.mx;1\nc@nikolatesla.edu.mx')
    expect(r.rows).toEqual([
      { email: 'a@nikolatesla.edu.mx', grade: 3 },
      { email: 'b@nikolatesla.edu.mx', grade: 1 },
      { email: 'c@nikolatesla.edu.mx', grade: null },
    ])
  })

  it('reporta líneas sin correo o con grado ilegible, con su número de línea', () => {
    const r = parseRosterPaste('a@nikolatesla.edu.mx\t1\nJuan Pérez\t2\nb@nikolatesla.edu.mx\tquinto')
    expect(r.rows).toEqual([{ email: 'a@nikolatesla.edu.mx', grade: 1 }])
    expect(r.invalid).toEqual([
      { line: 2, text: 'Juan Pérez\t2' },
      { line: 3, text: 'b@nikolatesla.edu.mx\tquinto' },
    ])
  })

  it('ignora líneas vacías y quita correos repetidos (gana la última)', () => {
    const r = parseRosterPaste('\na@nikolatesla.edu.mx\t1\n\nA@nikolatesla.edu.mx\t2\n')
    expect(r.rows).toEqual([{ email: 'a@nikolatesla.edu.mx', grade: 2 }])
  })
})
```

- [ ] **Step 3: Correr las pruebas y confirmar que fallan**

Run: `npm test -- src/lib/roster.test.ts`
Expected: FAIL, porque no existe `./roster`.

- [ ] **Step 4: Implementar `src/lib/roster.ts`**

Reglas:
- Una línea es encabezado (se ignora sin reportarla) si es la primera y no contiene `@`.
- El separador es el primer `\t`, `,` o `;`.
- El correo se recorta y se pasa a minúsculas, y debe contener `@`.
- Si la segunda columna está vacía, el grado es `null` y la línea es válida.
- Si la segunda columna trae texto que `parseGrade` no entiende, la línea es inválida.
- Para `parseGrade`:
  - Se normaliza a minúsculas sin acentos (`normalize('NFD')`).
  - Se quitan `°`, `º`, una `o` final pegada a un dígito y la palabra `grado`.
  - Se aceptan los dígitos 1-3 y 7-9, y las palabras `primero`/`primer`, `segundo`, `tercero`/`tercer`, `septimo`, `octavo` y `noveno`.

- [ ] **Step 5: Correr las pruebas y confirmar que pasan**

Run: `npm test -- src/lib/roster.test.ts`
Expected: PASS (todas).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/roster.ts src/lib/roster.test.ts
git commit -m "Grados: interpretar listas pegadas (correo, grado) con Vitest"
```

---

### Task 2: Reglas comunes de asignaciones (cierre y destinatarios)

**Files:**
- Create: `src/lib/assignmentRules.ts`
- Test: `src/lib/assignmentRules.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `localDate(ts: string | Date): string`: fecha `YYYY-MM-DD` en `America/Mexico_City`.
  - `todayLocal(): string`
  - `effectiveDueDate(a: { due_date: string | null; created_at: string }): string`: `due_date`, o `localDate(created_at)` + 7 días.
  - `isClosed(a: { due_date: string | null; created_at: string; archived: boolean }, today: string): boolean`: `archived || effectiveDueDate(a) < today`.
  - `isTarget(p: { individual: boolean; joinedAt: string | null; assignmentCreatedAt: string; dueDate: string; bajaDate: string | null }): boolean`

  `isTarget` es verdadero si (`individual`, o `joinedAt` no es nulo y `localDate(joinedAt) <= localDate(assignmentCreatedAt)`) **y** no (`bajaDate` no es nulo y `bajaDate <= dueDate`).

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// src/lib/assignmentRules.test.ts
import { describe, it, expect } from 'vitest'
import { localDate, effectiveDueDate, isClosed, isTarget } from './assignmentRules'

describe('localDate', () => {
  it('usa el día de México, no el de UTC', () => {
    // 2026-11-10 04:30 UTC = 2026-11-09 22:30 en Ciudad de México
    expect(localDate('2026-11-10T04:30:00Z')).toBe('2026-11-09')
  })
})

describe('effectiveDueDate', () => {
  it('respeta la fecha límite si existe', () => {
    expect(effectiveDueDate({ due_date: '2026-11-12', created_at: '2026-11-01T15:00:00Z' })).toBe('2026-11-12')
  })
  it('sin fecha: 7 días después de creada, en día local', () => {
    expect(effectiveDueDate({ due_date: null, created_at: '2026-11-10T04:30:00Z' })).toBe('2026-11-16')
  })
  it('cruza fin de mes', () => {
    expect(effectiveDueDate({ due_date: null, created_at: '2026-11-28T18:00:00Z' })).toBe('2026-12-05')
  })
})

describe('isClosed', () => {
  const base = { due_date: '2026-11-12', created_at: '2026-11-05T15:00:00Z', archived: false }
  it('abierta el mismo día de la fecha límite', () => expect(isClosed(base, '2026-11-12')).toBe(false))
  it('cerrada al día siguiente', () => expect(isClosed(base, '2026-11-13')).toBe(true))
  it('archivada siempre cerrada', () => expect(isClosed({ ...base, archived: true }, '2026-11-06')).toBe(true))
})

describe('isTarget', () => {
  const a = { assignmentCreatedAt: '2026-11-05T15:00:00Z', dueDate: '2026-11-12' }
  it('miembro desde antes', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-09-01T12:00:00Z', bajaDate: null })).toBe(true))
  it('se unió el mismo día de la asignación', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-11-05T20:00:00Z', bajaDate: null })).toBe(true))
  it('se unió después: no es destinatario', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-11-06T12:00:00Z', bajaDate: null })).toBe(false))
  it('asignación individual siempre cuenta', () =>
    expect(isTarget({ ...a, individual: true, joinedAt: null, bajaDate: null })).toBe(true))
  it('baja antes o el día de la fecha límite: no cuenta', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-09-01T12:00:00Z', bajaDate: '2026-11-12' })).toBe(false))
  it('baja después de la fecha límite: sí cuenta', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-09-01T12:00:00Z', bajaDate: '2026-11-20' })).toBe(true))
})
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `npm test -- src/lib/assignmentRules.test.ts`
Expected: FAIL, porque no existe el módulo.

- [ ] **Step 3: Implementar `src/lib/assignmentRules.ts`**

- `localDate` usa `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' })`, que produce `YYYY-MM-DD`.
- La suma de días se hace sobre la fecha local como `Date.UTC(y, m - 1, d + 7)` para no depender de la zona del equipo.
- Las comparaciones de fecha son comparaciones de texto `YYYY-MM-DD`.

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `npm test`
Expected: PASS (las de `roster` y las de `assignmentRules`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assignmentRules.ts src/lib/assignmentRules.test.ts
git commit -m "Reglas comunes: fecha local, cierre de asignaciones y destinatarios"
```

---

### Task 3: SQL — ciclos, inscripciones, uniones a grupo, pasar de grado y borrado definitivo

**Files:**
- Create: `supabase/migrations/2026-11-09_ciclos_inscripciones.sql`

**Interfaces:**
- Produces (para `rosterApi.ts` y los planes siguientes):
  - `lec_cycles(cycle text pk, starts_on date not null, ends_on date not null, is_current boolean not null default false, terms jsonb not null default '[]')`. `terms` es `[{ "name": "T1", "starts_on": "YYYY-MM-DD", "ends_on": "YYYY-MM-DD" }]`. Lleva un índice único parcial que permite un solo `is_current = true`.
  - `lec_enrollments(student_id uuid → profiles, cycle text → lec_cycles, grade int null check 1-3, status text not null default 'activo' check in ('activo','baja','egresado'), status_date date, updated_by uuid → profiles, updated_at timestamptz default now(), primary key (student_id, cycle))`
  - `lec_group_joins(student_id uuid → profiles on delete cascade, group_id uuid → reading_groups on delete cascade, joined_at timestamptz not null default now(), primary key (student_id, group_id))`
  - `lec_current_cycle() returns text` (`stable`, `security definer`).
  - `lec_is_dropped(p_student uuid) returns boolean`: verdadero si en el ciclo actual tiene `status = 'baja'`. Sin fila, es falso.
  - `lec_promote_cycle(p_from text, p_to text) returns int`. Solo docentes. Crea `p_to` en `lec_cycles` si no existe, con las fechas de `p_from` más un año, `is_current = false` y `terms = '[]'`. Inserta, para cada fila de `p_from` con `status = 'activo'`:
    - grade 1 → 2, grade 2 → 3;
    - grade 3 → `status 'egresado'`, `grade null`;
    - `grade null` → `grade null`, `activo`.

    Usa `on conflict do nothing` y devuelve cuántas filas insertó.
  - `lec_purge_student(p_student uuid) returns jsonb`. Solo docentes. Borra las filas de ese estudiante en:
    - `lec_attempts` (en cascada se van `lec_answers` y `lec_fluency_reviews`);
    - `lec_student_levels`, `lec_level_changes`, `lec_consents`, `lec_accommodations`, `lec_enrollments` y `lec_group_joins`;
    - `lec_assignment_targets` donde `student_id = p_student`.

    Devuelve `{ "<tabla>": filas_borradas, ... }`. **No toca** `profiles`, `reading_group_members` ni otras tablas.

- [ ] **Step 1: Escribir el archivo SQL**

Contenido, en este orden:
1. Encabezado de comentario como el de `2026-11-04_lec_fase1.sql`: cómo aplicarla, que es solo aditiva y que se puede correr dos veces.
2. Las tres tablas.
3. Semilla del ciclo actual:

   ```sql
   insert into lec_cycles (cycle, starts_on, ends_on, is_current)
   values ('2026-2027', '2026-08-01', '2027-07-31', true)
   on conflict (cycle) do nothing;
   ```

   Comentar que las fechas y los trimestres se ajustan después con el calendario de Aprende NKT Virtual.
4. Respaldo de uniones existentes:

   ```sql
   insert into lec_group_joins (student_id, group_id, joined_at)
   select m.student_id, m.group_id, g.created_at
   from reading_group_members m
   join reading_groups g on g.id = m.group_id
   on conflict do nothing;
   ```

5. RLS de las tres tablas:
   - "docentes todo" en todas.
   - `lec_cycles`: cualquier usuario autenticado puede leer (`select`).
   - `lec_enrollments`: el estudiante lee solo la suya.
   - `lec_group_joins`: el estudiante lee e inserta solo las suyas (`with check (student_id = auth.uid())`), sin `update` ni `delete`.
6. Las cuatro funciones (`security definer`, `set search_path = public`). `lec_promote_cycle` y `lec_purge_student` empiezan con:

   ```sql
   if not public.lec_is_teacher() then raise exception 'Solo docentes'; end if;
   ```

7. Reemplazar la política "estudiantes crean intentos" de `lec_attempts` por:

   ```sql
   with check (student_id = auth.uid() and not public.lec_is_dropped(auth.uid()))
   ```

8. Verificación:

```sql
-- Verificación (esperado: 3 tablas; 1 ciclo actual; uniones = miembros actuales; 0 alumnos de baja)
select
  (select count(*) from information_schema.tables where table_schema='public'
     and table_name in ('lec_cycles','lec_enrollments','lec_group_joins')) as tablas,
  (select count(*) from lec_cycles where is_current) as ciclos_actuales,
  (select count(*) from lec_group_joins) as uniones,
  (select count(*) from reading_group_members) as miembros,
  (select count(*) from lec_enrollments where status='baja') as bajas;
```

- [ ] **Step 2: Revisar el SQL contra las restricciones globales**

Buscar en el archivo `delete from public.profiles`, `reading_group_members` dentro de `delete` o `update`, y `create trigger`.
Expected: ninguna coincidencia que modifique tablas compartidas. Las únicas menciones de `reading_group_members` son el `select` del respaldo y las políticas existentes.

- [ ] **Step 3: Larisa corre el SQL en Supabase**

Pedirle a Larisa que lo pegue en el SQL Editor y presione Run.
Expected: `tablas = 3`, `ciclos_actuales = 1`, `uniones = miembros`, `bajas = 0`. Pedirle que lo corra **una segunda vez**; el resultado debe ser idéntico, sin errores.

- [ ] **Step 4: Prueba de "Pasar de grado" dos veces (Review Focus 4)**

Pedirle a Larisa que corra en el SQL Editor, dentro de una transacción que se deshace:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<id de un perfil docente>"}';
  insert into lec_enrollments (student_id, cycle, grade) select id, '2026-2027', 3 from profiles where role='student' limit 1;
  insert into lec_enrollments (student_id, cycle, grade, status) select id, '2026-2027', 1, 'baja' from profiles where role='student' offset 1 limit 1;
  select lec_promote_cycle('2026-2027', '2027-2028') as primera;
  select lec_promote_cycle('2026-2027', '2027-2028') as segunda;
  select status, grade from lec_enrollments where cycle = '2027-2028';
rollback;
```

Expected:
- `primera = 1` y `segunda = 0`.
- Una sola fila en 2027-2028, `('egresado', null)`.
- El dado de baja no aparece.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/2026-11-09_ciclos_inscripciones.sql
git commit -m "SQL: ciclos, inscripciones por ciclo, uniones a grupo, pasar de grado y borrado definitivo"
```

---

### Task 4: Capa de datos, registro de uniones y bloqueo de estudiantes de baja

**Files:**
- Create: `src/lib/rosterApi.ts`, `src/lib/useEnrollmentStatus.ts`
- Modify: `src/pages/student/StudentDashboard.tsx` (la función `handleJoin`, alrededor de la línea 105) y `src/App.tsx` (`ProtectedRoute`).

**Interfaces:**
- Consumes: `Grade`, `EnrollmentStatus` y `parseRosterPaste` (Tarea 1); las tablas y funciones de la Tarea 3.
- Produces (en `src/lib/rosterApi.ts`):
  - `interface Cycle { cycle: string; starts_on: string; ends_on: string; is_current: boolean; terms: { name: string; starts_on: string; ends_on: string }[] }`
  - `fetchCurrentCycle(): Promise<Cycle>`
  - `interface RosterRow { id: string; full_name: string | null; email: string; grade: Grade | null; status: EnrollmentStatus; status_date: string | null; groups: string[]; levels: { es: number | null; en: number | null } }`
  - `fetchRoster(cycle: string): Promise<RosterRow[]>`: perfiles con `role = 'student'`; si no tienen fila de inscripción, `status: 'activo'` y `grade: null`.
  - `setGrade(studentId: string, cycle: string, grade: Grade | null): Promise<void>` (upsert).
  - `setStatus(studentId: string, cycle: string, status: EnrollmentStatus, statusDate: string | null): Promise<void>` (upsert, sin tocar `grade`).
  - `applyPaste(text: string, mode: 'grados' | 'bajas', cycle: string): Promise<{ updated: number; notFound: string[]; invalid: { line: number; text: string }[] }>`. En modo `bajas` usa `status_date = todayLocal()`.
  - `recordGroupJoin(studentId: string, groupId: string): Promise<void>`: upsert con `{ onConflict: 'student_id,group_id', ignoreDuplicates: true }`.
  - `purgeStudent(studentId: string): Promise<Record<string, number>>`: RPC `lec_purge_student`.
  - `promoteCycle(from: string, to: string): Promise<number>`: RPC `lec_promote_cycle`.
- Produces (en `src/lib/useEnrollmentStatus.ts`): `useEnrollmentStatus(studentId: string | undefined): { loading: boolean; status: EnrollmentStatus }`. Sin fila, o si falla la consulta, devuelve `'activo'`: nunca se bloquea por error.

- [ ] **Step 1: Implementar `rosterApi.ts` y `useEnrollmentStatus.ts`** con las firmas de arriba.

`applyPaste` busca los correos en `profiles` (`.in('email', emails)`, comparando en minúsculas) y hace un solo upsert en lote a `lec_enrollments`.

- [ ] **Step 2: Registrar la unión a grupo**

En `handleJoin` de `StudentDashboard.tsx`, después del upsert exitoso a `reading_group_members`, llamar `await recordGroupJoin(profile.id, group.id)`. Si falla, `console.error` sin bloquear al estudiante.

- [ ] **Step 3: Bloquear a estudiantes de baja**

En `ProtectedRoute` (`src/App.tsx`), cuando `role === 'student'`, usar `useEnrollmentStatus(profile.id)`:
- Mientras carga, mostrar el spinner actual.
- Si `status === 'baja'`, mostrar una pantalla con el texto exacto *"Tu cuenta ya no está activa en LectorNKT. Si es un error, avisa a tu docente."* y el botón "Cerrar sesión".

- [ ] **Step 4: Verificar compilación, lint y pruebas**

Run: `npx tsc -b && npx eslint src/lib/rosterApi.ts src/lib/useEnrollmentStatus.ts src/App.tsx src/pages/student/StudentDashboard.tsx && npm test`
Expected: sin errores; las pruebas pasan.

- [ ] **Step 5: Verificación manual en el preview (Review Focus 2 y 3)**

Con la cuenta `estudiante_prueba@`, que no tiene fila de inscripción:
- Entra normal, sin ver la pantalla de cuenta no activa.
- Se une a un grupo con su código, sale y vuelve a unirse.

Luego, en SQL:

```sql
select joined_at from lec_group_joins where student_id = (select id from profiles where email = 'estudiante_prueba@nikolatesla.edu.mx');
```

Expected: la fecha de la **primera** unión no cambió.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rosterApi.ts src/lib/useEnrollmentStatus.ts src/App.tsx src/pages/student/StudentDashboard.tsx
git commit -m "Inscripciones: capa de datos, registro de uniones a grupo y bloqueo de estudiantes de baja"
```

---

### Task 5: Pestaña Estudiantes nueva (grado, estado, pegar lista, bajas, borrado y pasar de grado)

**Files:**
- Create: `src/pages/teacher/Students.tsx`, `src/components/PasteListModal.tsx`
- Modify: `src/App.tsx` (la ruta `/teacher` apunta a `Students`).
- Delete: `src/pages/teacher/TeacherDashboard.tsx`

**Interfaces:**
- Consumes: todo `rosterApi.ts` (Tarea 4), `formatGrade` (Tarea 1), `TeacherHeader`, y `levelName` de `src/lib/lec.ts`.
- Produces: nada que usen otras tareas.

**Comportamiento** (la página usa el estilo de las demás pantallas docentes):

- **Encabezado:** `<TeacherHeader title="Estudiantes" />` y debajo "Ciclo 2026-2027", leído de `fetchCurrentCycle()`.
- **Aviso:** si hay estudiantes activos sin grado, un aviso ámbar: *"N estudiantes sin grado. Ponles grado para que sus lecturas cuenten en el cumplimiento."*
- **Barra de controles:**
  - Buscador por nombre o correo.
  - Filtro de grado (Todos, 1°, 2°, 3°, Sin grado).
  - Casilla **"Ver dados de baja"**, apagada por defecto. Apagada, se ocultan `baja` y `egresado`.
  - Botón **"Pegar lista"**, que abre `PasteListModal`.
  - Botón **"Pasar de grado"**.
- **Tabla:** Estudiante (nombre y correo), Grado (un `<select>` con —/1°/2°/3° que guarda al cambiar con `setGrade`), Grupos, Nivel (español e inglés con `levelName`, o "—"), Estado y Acciones.
- **Acciones por fila:**
  - Activo: **"Dar de baja"**, con `window.confirm` (*"¿Dar de baja a {nombre}? Dejará de contar en listas y porcentajes desde hoy. Su historial se conserva."*) y luego `setStatus(id, ciclo, 'baja', todayLocal())`.
  - De baja: **"Reactivar"**, que pasa a `setStatus(id, ciclo, 'activo', null)`.
  - En ambos casos, **"Borrar datos de LectorNKT"**: abre un diálogo que pide escribir el correo del estudiante. Explica que se borran sus lecturas, respuestas, revisiones, niveles, consentimiento, apoyos e inscripciones de LectorNKT; que **no** se borran sus datos de EvalNKT o VideoNKT ni su cuenta; que los audios de su Drive se borran al cierre del ciclo; y que **no se puede deshacer**. El botón se activa solo si el correo coincide; al terminar, muestra el resumen que devuelve `purgeStudent`.
- **`PasteListModal`:**
  - Opciones "Grados" o "Bajas" y un `textarea` con la ayuda *"Pega dos columnas: correo y grado (por ejemplo 7°, 2 o Tercero). Para bajas, basta el correo."*
  - Vista previa en vivo con `parseRosterPaste`: "N filas válidas · M con problema". Las líneas inválidas se listan con su número.
  - Al aplicar, muestra "Se actualizaron N" y la lista de correos no encontrados.
- **"Pasar de grado":**
  - Confirmación: *"Se creará el ciclo {siguiente} a partir de {actual}: 1° pasa a 2°, 2° pasa a 3° y 3° queda como egresado. Los dados de baja no pasan. Si ya existe, solo se agregan los que falten."*
  - `siguiente` se calcula sumando 1 a ambos años de `cycle`.
  - Al terminar: *"Listo: N estudiantes en {siguiente}."* Esto **no** cambia el ciclo actual.

- [ ] **Step 1: Implementar `PasteListModal.tsx`.** Es un diálogo accesible: `role="dialog"`, `aria-modal`, foco inicial en el `textarea` y `Esc` para cerrar, como el diálogo "Unirse a un grupo".

- [ ] **Step 2: Implementar `Students.tsx`** con el comportamiento de arriba. Cambiar la ruta en `App.tsx` y borrar `TeacherDashboard.tsx`.

- [ ] **Step 3: Verificar compilación, lint y pruebas**

Run: `npx tsc -b && npx eslint src && npm test`
Expected: sin errores nuevos. `eslint src` ya tenía unos 17 problemas previos: comparar contra ese número, sin agregar nuevos. Las pruebas pasan.

- [ ] **Step 4: Verificación en el navegador (preview de la rama, cuenta docente)**

1. Pegar una lista con encabezado y tabulaciones, por ejemplo copiada de una hoja de cálculo, con un correo que no existe. Se actualizan los que existen y se lista el desconocido.
2. Cambiar el grado de un estudiante con el `select` y recargar: el grado se conserva.
3. Dar de baja a `estudiante_prueba@`. Desaparece de la tabla y reaparece con "Ver dados de baja". En otra ventana, esa cuenta ve la pantalla de cuenta no activa. Reactivarla.
4. El aviso "N estudiantes sin grado" coincide con los activos con "—".
5. Revisar en ancho de celular (375 px): la tabla se recorre de lado y la página no se desborda.

- [ ] **Step 5: Commit**

```bash
git add src/pages/teacher/Students.tsx src/components/PasteListModal.tsx src/App.tsx
git rm src/pages/teacher/TeacherDashboard.tsx
git commit -m "Pestaña Estudiantes: grado por ciclo, bajas, pegar lista, borrado definitivo y pasar de grado"
```

---

### Task 6: Asignaciones cuentan solo destinatarios reales

**Files:**
- Modify: `src/pages/teacher/Assignments.tsx` (cálculo de `totalStudents` y `completed`, líneas 30-110 aproximadamente).

**Interfaces:**
- Consumes: `isTarget`, `effectiveDueDate` y `localDate` (Tarea 2); las tablas `lec_group_joins` y `lec_enrollments` (Tarea 3); `fetchCurrentCycle` (Tarea 4).
- Produces: nada.

- [ ] **Step 1: Cambiar el cálculo**

- En lugar de `reading_group_members`, leer `lec_group_joins` (`group_id, student_id, joined_at`) de los grupos involucrados.
- Leer `lec_enrollments` (`student_id, status, status_date`) del ciclo actual.
- Para cada asignación, el conjunto de destinatarios es:
  - los `student_id` de `lec_assignment_targets` (`individual: true`);
  - más los miembros de sus grupos que cumplen `isTarget({ individual: false, joinedAt, assignmentCreatedAt: a.created_at, dueDate: effectiveDueDate(a), bajaDate: status === 'baja' ? status_date : null })`.
- `completed` cuenta solo intentos completados **de destinatarios**. Un estudiante que llegó tarde y la completó no altera "N de M".

- [ ] **Step 2: Verificar compilación, lint y pruebas**

Run: `npx tsc -b && npx eslint src/pages/teacher/Assignments.tsx && npm test`
Expected: sin errores; las pruebas pasan.

- [ ] **Step 3: Verificación en el navegador**

Con una asignación del grupo PRUEBA:
- Anotar "N de M".
- Dar de baja a un miembro que **no** la ha hecho: M baja en 1.
- Reactivarlo: M vuelve a su valor.

- [ ] **Step 4: Commit**

```bash
git add src/pages/teacher/Assignments.tsx
git commit -m "Asignaciones: contar solo destinatarios (sin bajas ni quienes se unieron después)"
```

- [ ] **Step 5: Cierre del plan.** Avisar a Larisa que la rama `fase-4-fundamentos` está lista para probar en su preview, y pedir su OK antes de unir a `main`. Anotar en memoria el commit final y que lo siguiente es el Plan 2 (portadas).
