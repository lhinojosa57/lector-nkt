# Plan 3 · Estantes del estudiante y subida automática de nivel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la pantalla principal del estudiante sea "Mi biblioteca", con tres estantes (asignadas de frente, entrenamiento libre con 3 sugerencias y realizadas de costilla) y tres indicadores motivadores. Además, que el nivel suba solo cuando se cumple la regla compuesta de comprensión, precisión y cumplimiento, y únicamente para quien ya hizo su diagnóstico.

**Architecture:**
- La regla de nivel vive **en la base de datos**:
  - `lec_level_progress(student, language)` devuelve el avance en JSON. Es la fuente única, la usan la tarjeta "Camino al nivel" y la subida.
  - `lec_try_level_up(student, language)` sube el nivel si se cumplen las tres condiciones.
  - Las dos son `security definer` y calculan la comprensión desde `lec_answers`, nunca desde lo que escribe el navegador.
- La app llama `lec_try_level_up` al terminar una lectura y al guardar una revisión de fluidez.
- Los estantes se arman en el navegador con funciones puras probadas en Vitest.

**Tech Stack:** React 19, TypeScript, Tailwind 3, Supabase (Postgres, plpgsql) y Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md`, secciones 6.2, 6.3 y 6.8. Boceto: `.superpowers/brainstorm/966-1794257735/content/estantes-estudiante-v5.html`.

## Global Constraints

- **Regla de nivel** (sección 6.3 del spec; los valores son exactos y se evalúa por idioma):
  - **Requisito previo:** `lec_student_levels.is_provisional = false` para ese idioma. Sin fila, o provisional, no hay subida.
  - **Comprensión:**
    - Se toman los **últimos 5** intentos completados, que no sean diagnóstico, cuya versión tenga `level =` nivel actual, en ese idioma, completados **después de** `lec_student_levels.updated_at` y que tengan al menos 1 pregunta.
    - El porcentaje de cada intento es `100 × correctas / preguntas de la versión`. Las preguntas sin contestar cuentan como incorrectas.
    - Se cumple si hay 5 intentos, **al menos 4 con ≥ 75** y el **promedio es ≥ 80**.
  - **Precisión:** entre esos 5, los que son de modo `aloud` y tienen revisión deben tener `accuracy_pct ≥ 95`. Los que no tienen revisión no bloquean.
  - **Cumplimiento:**
    - Cuentan las asignaciones de ese idioma **cerradas**: archivadas, o con fecha límite efectiva anterior a hoy en hora de México. La fecha límite efectiva es `due_date`, o el día local de `created_at` más 7 días.
    - Solo cuentan aquellas donde el estudiante es **destinatario**: asignación individual, o miembro actual del grupo destino cuya unión (`lec_group_joins.joined_at`, día local) es anterior o igual al día local de creación. Sin fila de unión, cuenta como miembro desde siempre.
    - Se cumple si no hay ninguna asignación que cuente, o si `completadas / contadas ≥ 0.8` **y** `vencidas sin hacer ≤ 1`.
  - Tope: Nivel 5. **El nivel nunca baja automáticamente.**
- **Al subir:**
  - `lec_student_levels` pasa a `level + 1`, con `updated_at = now()` (así el conteo vuelve a empezar), `updated_by = null` y `is_provisional = false`.
  - Se inserta una fila en `lec_level_changes` con `reason = 'auto'`, `changed_by = null`.
  - El estudiante ve la felicitación **una sola vez**, controlada con la columna nueva `seen_at`.
- **Indicadores** (sección 6.2):
  - Palabras leídas: se dividen entre **250 palabras por página**.
  - Mejora de fluidez: solo con **2 o más** revisiones del mismo idioma; nunca se muestra un número negativo.
  - Sin rankings ni comparaciones con compañeros.
- **Semáforo** existente: `comprehensionLight` de `src/lib/lec.ts` (≥75 verde, 50-74 amarillo, <50 rojo).
- SQL idempotente que corre Larisa: `supabase/migrations/2026-11-09_subida_nivel.sql`, con verificación al final.
- Copy en español mexicano, sin "Bienvenido/a" ni diagonales; usar "lista(o)" donde aplique. Accesibilidad:
  - libros y costillas son `button` con `aria-label` completo;
  - los estantes son `section` con encabezado;
  - `prefers-reduced-motion` desactiva el levantado de la costilla;
  - a 375 px no hay desborde horizontal de la página.
- Rama `fase-6-estantes-estudiante`, creada desde `main`. Preview en `https://lector-nkt-git-fase-6-estantes-estudiante-sistemas-9143s-projects.vercel.app`. Merge solo con el OK de Larisa.

## Review Focus

1. **Estudiante sin ninguna actividad:** los tres estantes muestran mensajes amables, los indicadores dicen 0 (nunca "NaN" ni "undefined") y la tarjeta de nivel indica qué falta. (Pruebas en la Tarea 1.)
2. **Lectura completada varias veces:** aparece **una sola** costilla con el resultado más reciente, y la ficha dice "La leíste N veces". (Pruebas en la Tarea 1.)
3. **Dos llamadas casi simultáneas a `lec_try_level_up`**, por ejemplo al terminar la lectura y al guardar la revisión: el nivel sube **una sola vez**. Se resuelve con `select … for update` sobre la fila de `lec_student_levels`. (Prueba SQL en la Tarea 2.)
4. **Estudiante con nivel provisional que cumple todo:** no sube, y la tarjeta dice "Haz tu diagnóstico para ubicar tu nivel". (Prueba SQL en la Tarea 2 y verificación en la Tarea 5.)
5. **Estudiante con 60 lecturas realizadas en un celular de 375 px:** la fila de costillas se recorre de lado sin desbordar la página. (Verificación en la Tarea 5.)

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/shelves.ts` (nuevo) | Lógica pura: `pickSuggestions`, `groupDoneByReading`, `fluencyGain`, `pagesFromWords` y `sortPendingAssignments`. |
| `src/lib/shelves.test.ts` (nuevo) | Pruebas de lo anterior. |
| `supabase/migrations/2026-11-09_subida_nivel.sql` (nuevo) | `seen_at`, `lec_level_progress`, `lec_try_level_up`, `lec_mark_level_seen` y verificación. |
| `src/lib/levelApi.ts` (nuevo) | `fetchLevelProgress`, `tryLevelUp`, `fetchUnseenLevelUps` y `markLevelSeen`. |
| `src/lib/studentShelvesApi.ts` (nuevo) | `fetchStudentShelves(studentId)`: una sola carga con todo lo que necesita la pantalla. |
| `src/components/BookSpine.tsx` (nuevo) | Costilla del libro. |
| `src/components/Shelf.tsx` (nuevo) | Estante: título, subtítulo, fila con recorrido lateral y repisa de madera. |
| `src/components/DoneBookDialog.tsx` (nuevo) | Ficha de una lectura realizada. |
| `src/components/LevelPathCard.tsx` (nuevo) | Tarjeta "Camino al Nivel N+1" con dos barras. |
| `src/components/LevelUpCelebration.tsx` (nuevo) | Diálogo de felicitación. |
| `src/pages/student/StudentDashboard.tsx` (reescribir la parte de la vista) | "Mi biblioteca". Se conservan el banner de consentimiento, "Unirse a grupo", "Cerrar sesión" y los avisos. |
| `src/pages/student/ReadingSession.tsx` (modificar `finish`, alrededor de la línea 206) | Llamar `tryLevelUp` después de guardar. |
| `src/pages/teacher/FluencyReview.tsx` (modificar `save`, alrededor de la línea 134) | Llamar `tryLevelUp` después de guardar la revisión. |
| `src/pages/teacher/Students.tsx` (modificar) | Aviso "Subieron de nivel en los últimos 7 días". |

---

### Task 1: Lógica pura de los estantes

**Files:**
- Create: `src/lib/shelves.ts`
- Test: `src/lib/shelves.test.ts`

**Interfaces:**
- Consumes: `Language` de `src/lib/lec.ts`.
- Produces:
  - `interface SuggestionCandidate { id: string; language: Language; levels: number[] }`
  - `pickSuggestions(cands: SuggestionCandidate[], doneReadingIds: Set<string>, levels: Partial<Record<Language, number>>, seed: string, n = 3): string[]`
    - Devuelve ids. Una lectura es elegible si su idioma está en `levels`, tiene versión en `levels[lang]` o en `levels[lang] - 1`, y no está en `doneReadingIds`.
    - El orden es determinista: se ordena por `hash(seed + id)` con FNV-1a de 32 bits.
    - Si hay dos idiomas con elegibles, se incluye al menos una de cada idioma, mientras `n ≥ 2`.
  - `interface DoneAttempt { attemptId: string; readingId: string; completedAt: string; mode: ReadingMode; comprehension: number | null; wcpm: number | null; accuracy: number | null; comment: string | null; words: number }`
  - `interface DoneBook { readingId: string; latest: DoneAttempt; times: number }`
  - `groupDoneByReading(attempts: DoneAttempt[]): DoneBook[]`: un libro por lectura, con el intento más reciente, ordenados del más reciente al más antiguo.
  - `fluencyGain(reviews: { language: Language; reviewedAt: string; wcpm: number }[], language: Language): { first: number; last: number; delta: number } | null`. Devuelve `null` con menos de 2 revisiones; `delta = last - first` puede ser ≤ 0 y la vista decide qué mostrar.
  - `pagesFromWords(words: number): number`: `Math.round(words / 250)`, con mínimo 1 si `words > 0`, y 0 si `words` es 0.
  - `sortPendingAssignments<T extends { created_at: string }>(rows: T[]): T[]`: de la más reciente a la más antigua.

- [ ] **Step 1: Crear la rama**

```bash
git checkout main && git pull && git checkout -b fase-6-estantes-estudiante
```

- [ ] **Step 2: Escribir las pruebas que fallan**

```ts
// src/lib/shelves.test.ts
import { describe, it, expect } from 'vitest'
import { pickSuggestions, groupDoneByReading, fluencyGain, pagesFromWords, sortPendingAssignments, type DoneAttempt } from './shelves'

const c = (id: string, language: 'es' | 'en', levels: number[]) => ({ id, language, levels })

describe('pickSuggestions', () => {
  const cands = [c('a', 'es', [2]), c('b', 'es', [1]), c('c', 'es', [3]), c('d', 'en', [2]), c('e', 'es', [2]), c('f', 'es', [2])]
  it('solo de su nivel o uno abajo, sin las ya leídas, máximo 3', () => {
    const r = pickSuggestions(cands, new Set(['e']), { es: 2 }, 'x')
    expect(r.length).toBe(3)
    expect(r).not.toContain('c')
    expect(r).not.toContain('e')
    expect(r).not.toContain('d') // no tiene nivel en inglés
  })
  it('mezcla idiomas: al menos una de cada uno', () => {
    const r = pickSuggestions(cands, new Set(), { es: 2, en: 2 }, 'x')
    expect(r).toContain('d')
    expect(r.some(id => id !== 'd')).toBe(true)
  })
  it('determinista con la misma semilla y cambia con otra', () => {
    const many = Array.from({ length: 20 }, (_, i) => c(`r${i}`, 'es', [2]))
    expect(pickSuggestions(many, new Set(), { es: 2 }, 's1')).toEqual(pickSuggestions(many, new Set(), { es: 2 }, 's1'))
    expect(pickSuggestions(many, new Set(), { es: 2 }, 's1')).not.toEqual(pickSuggestions(many, new Set(), { es: 2 }, 's2'))
  })
  it('sin candidatas devuelve lista vacía', () => {
    expect(pickSuggestions([], new Set(), { es: 2 }, 'x')).toEqual([])
  })
})

const at = (o: Partial<DoneAttempt>): DoneAttempt => ({
  attemptId: 'x', readingId: 'r', completedAt: '2026-11-01T10:00:00Z', mode: 'silent',
  comprehension: 80, wcpm: null, accuracy: null, comment: null, words: 200, ...o,
})

describe('groupDoneByReading', () => {
  it('una por lectura con el intento más reciente y cuántas veces', () => {
    const r = groupDoneByReading([
      at({ attemptId: '1', readingId: 'A', completedAt: '2026-11-01T10:00:00Z', comprehension: 50 }),
      at({ attemptId: '2', readingId: 'B', completedAt: '2026-11-03T10:00:00Z' }),
      at({ attemptId: '3', readingId: 'A', completedAt: '2026-11-05T10:00:00Z', comprehension: 90 }),
    ])
    expect(r.map(b => b.readingId)).toEqual(['A', 'B'])
    expect(r[0].latest.attemptId).toBe('3')
    expect(r[0].times).toBe(2)
  })
  it('vacío → vacío', () => expect(groupDoneByReading([])).toEqual([]))
})

describe('fluencyGain', () => {
  it('compara primera y última del idioma', () => {
    expect(fluencyGain([
      { language: 'es', reviewedAt: '2026-11-05T00:00:00Z', wcpm: 144 },
      { language: 'es', reviewedAt: '2026-11-01T00:00:00Z', wcpm: 98 },
      { language: 'en', reviewedAt: '2026-11-02T00:00:00Z', wcpm: 60 },
    ], 'es')).toEqual({ first: 98, last: 144, delta: 46 })
  })
  it('menos de 2 revisiones → null', () => {
    expect(fluencyGain([{ language: 'es', reviewedAt: '2026-11-01T00:00:00Z', wcpm: 98 }], 'es')).toBeNull()
  })
})

describe('pagesFromWords', () => {
  it.each([[0, 0], [100, 1], [9450, 38], [250, 1]])('%i palabras → %i páginas', (w, p) => expect(pagesFromWords(w)).toBe(p))
})

describe('sortPendingAssignments', () => {
  it('la más reciente primero', () => {
    const r = sortPendingAssignments([{ created_at: '2026-11-01T00:00:00Z' }, { created_at: '2026-11-08T00:00:00Z' }])
    expect(r[0].created_at).toBe('2026-11-08T00:00:00Z')
  })
})
```

- [ ] **Step 3: Correr las pruebas y confirmar que fallan**

Run: `npm test -- src/lib/shelves.test.ts`
Expected: FAIL, porque no existe `./shelves`.

- [ ] **Step 4: Implementar `src/lib/shelves.ts`** con las firmas de arriba.

- [ ] **Step 5: Correr todas las pruebas**

Run: `npm test`
Expected: PASS (las 75 anteriores más las nuevas).

- [ ] **Step 6: Commit**

```bash
git add src/lib/shelves.ts src/lib/shelves.test.ts
git commit -m "Estantes del estudiante: sugerencias, libros realizados, mejora de fluidez y páginas"
```

---

### Task 2: SQL de la subida automática de nivel

**Files:**
- Create: `supabase/migrations/2026-11-09_subida_nivel.sql`

**Interfaces:**
- Produces:
  - `alter table public.lec_level_changes add column if not exists seen_at timestamptz;`
  - `lec_level_progress(p_student uuid, p_language text) returns jsonb` (`stable`, `security definer`, `set search_path = public`). Si el que llama no es `p_student` ni docente, lanza `'No autorizado'`. Devuelve:

    ```json
    { "level": 2, "provisional": true, "max": false,
      "comprehension": { "considered": 3, "greens": 2, "avg": 78.5, "needGreens": 4, "needCount": 5, "ok": false },
      "accuracy": { "reviewed": 1, "ok": true },
      "compliance": { "counted": 8, "completed": 5, "overduePending": 3, "pct": 62.5, "ok": false },
      "eligible": false }
    ```

    - `eligible = not provisional and not max and comprehension.ok and accuracy.ok and compliance.ok`.
    - Sin fila en `lec_student_levels`: `level = 2`, `provisional = true`.
    - `max = level >= 5`.
  - `lec_try_level_up(p_student uuid, p_language text) returns int`. Misma autorización. Hace:
    1. `select … from lec_student_levels … for update`.
    2. Recalcula `lec_level_progress`.
    3. Si `eligible`, actualiza el nivel, inserta en `lec_level_changes` (`reason = 'auto'`, `from_level`, `to_level`) y devuelve el nivel nuevo.

    Si no, devuelve `null`. Se otorga `execute … to authenticated`.
  - `lec_mark_level_seen(p_change_id uuid) returns void`: pone `seen_at = now()` solo si la fila es de `auth.uid()`.

- [ ] **Step 1: Escribir el SQL**

Es la regla de las restricciones globales, en SQL:
- Día local: `(x at time zone 'America/Mexico_City')::date`.
- Hoy: `(now() at time zone 'America/Mexico_City')::date`.
- Porcentaje por intento:

  ```sql
  100.0 * count(*) filter (where ans.is_correct) / nullif((select count(*) from lec_questions q where q.version_id = a.version_id), 0)
  ```

  Hay que excluir los intentos cuya versión no tiene preguntas.
- Usar un CTE para "últimos 5": `order by a.completed_at desc limit 5`.
- Destinatarios por asignación `t`:

  ```sql
  t.student_id = p_student
  or (t.group_id is not null
      and exists (select 1 from reading_group_members m where m.group_id = t.group_id and m.student_id = p_student)
      and coalesce((select (j.joined_at at time zone 'America/Mexico_City')::date from lec_group_joins j
                    where j.group_id = t.group_id and j.student_id = p_student), '1970-01-01')
          <= (asg.created_at at time zone 'America/Mexico_City')::date)
  ```

Al final, la verificación:

```sql
-- Esperado: seen_at = 1; funciones = 3
select
  (select count(*) from information_schema.columns where table_name = 'lec_level_changes' and column_name = 'seen_at') as seen_at,
  (select count(*) from pg_proc where proname in ('lec_level_progress', 'lec_try_level_up', 'lec_mark_level_seen')) as funciones;
```

- [ ] **Step 2: Prueba SQL de la regla (para Larisa, en transacción con `rollback`)**

Escribir al final del archivo, comentado, un bloque `begin … rollback` que, como docente (con `set_config('request.jwt.claims', …)` igual que en el plan 1):
1. Toma la lectura publicada con más preguntas en nivel 2 y al estudiante `estudiante_prueba@nikolatesla.edu.mx`.
2. **(a)** Con su nivel **provisional**, inserta 5 intentos completados con todas las respuestas correctas. `lec_try_level_up` devuelve `null`.
3. **(b)** Marca el nivel como no provisional, con `updated_at` anterior a los intentos. `lec_try_level_up` devuelve `3`.
4. **(c)** Lo llama otra vez: devuelve `null`, porque los intentos ya son anteriores al cambio de nivel y no hay 5 en el nivel 3.
5. Selecciona `level` de `lec_student_levels` y el conteo de `lec_level_changes` con `reason = 'auto'`.

Expected:
- `(a) null`, `(b) 3`, `(c) null`;
- `level = 3`;
- 1 cambio `auto`.

- [ ] **Step 3: Larisa corre el SQL**, dos veces, y luego el bloque de prueba.
Expected: verificación `seen_at = 1`, `funciones = 3`. La prueba da lo descrito en el Step 2.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-11-09_subida_nivel.sql
git commit -m "SQL: avance y subida automática de nivel (regla compuesta, requiere diagnóstico)"
```

---

### Task 3: Capa de datos y llamadas a la subida

**Files:**
- Create: `src/lib/levelApi.ts`, `src/lib/studentShelvesApi.ts`
- Modify: `src/pages/student/ReadingSession.tsx` (`finish`) y `src/pages/teacher/FluencyReview.tsx` (`save`).

**Interfaces:**
- Consumes: Tarea 1 (todas sus funciones) y Tarea 2 (RPCs). Además `effectiveDueDate` de `assignmentRules.ts` y `todayLocal()`.
- Produces:
  - En `levelApi.ts`:
    - `interface LevelProgress { level: number; provisional: boolean; max: boolean; comprehension: { considered: number; greens: number; avg: number | null; needGreens: number; needCount: number; ok: boolean }; accuracy: { reviewed: number; ok: boolean }; compliance: { counted: number; completed: number; overduePending: number; pct: number | null; ok: boolean }; eligible: boolean }`
    - `fetchLevelProgress(studentId: string, language: Language): Promise<LevelProgress | null>`: `null` si falla, por ejemplo si el SQL todavía no se corre.
    - `tryLevelUp(studentId: string, language: Language): Promise<number | null>`: atrapa cualquier error y devuelve `null`, porque nunca debe romper el flujo.
    - `fetchUnseenLevelUps(studentId: string): Promise<{ id: string; language: Language; to_level: number }[]>`: filas con `reason = 'auto'` y `seen_at` nulo.
    - `markLevelSeen(id: string): Promise<void>`
  - En `studentShelvesApi.ts`:
    - `interface PendingBook { assignmentId: string; readingId: string; title: string; subject: string; language: Language; coverPath: string | null; mode: ReadingMode; createdAt: string; dueLabel: string; overdue: boolean }`
      - `dueLabel` es `"Entregar antes del dd/mm/aaaa"`, o `"Sin fecha límite"` si `due_date` es nulo.
      - `overdue` es `effectiveDueDate(a) < todayLocal()`.
    - `interface ShelfReading { id: string; title: string; subject: string; language: Language; coverPath: string | null; topic: string | null; wordsAtLevel: number | null }`
    - `interface StudentShelves { pending: PendingBook[]; suggestions: ShelfReading[]; done: (DoneBook & { reading: ShelfReading })[]; kpis: { readCount: number; words: number; pages: number; gain: Partial<Record<Language, { first: number; last: number; delta: number }>> }; levels: Record<Language, { level: number; provisional: boolean }>; progress: Partial<Record<Language, LevelProgress>>; unseenLevelUps: { id: string; language: Language; to_level: number }[] }`
    - `fetchStudentShelves(studentId: string): Promise<StudentShelves>`
      - Lee las asignaciones visibles (como hoy), los intentos completados no diagnósticos con `lec_versions(level, word_count, reading_id, lec_readings(...))` y `lec_fluency_reviews(...)`, las lecturas publicadas con sus niveles, `lec_student_levels`, el progreso de **ambos** idiomas y las subidas no vistas.
      - `readCount` es el número de intentos completados, no de libros.
      - La semilla de sugerencias es `todayLocal() + ':' + readCount`.

- [ ] **Step 1: Implementar `levelApi.ts` y `studentShelvesApi.ts`.**

- [ ] **Step 2: Llamar la subida**

- En `ReadingSession.finish`, después del `update` exitoso y antes de `setStep('close')`: `void tryLevelUp(studentId, reading.language)`. Se dispara sin esperar.
- En `FluencyReview.save`, después de guardar con éxito: `void tryLevelUp(<student_id del intento>, data.language)`. Si `Loaded` no trae `studentId`, agregarlo leyendo `student_id` en la consulta del intento.

- [ ] **Step 3: Verificar compilación, lint y pruebas**

Run: `npx tsc -b && npx eslint src/lib/levelApi.ts src/lib/studentShelvesApi.ts && npm test`
Expected: sin errores; las pruebas pasan. En `ReadingSession.tsx` y `FluencyReview.tsx` puede haber errores previos: no se deben agregar nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/lib/levelApi.ts src/lib/studentShelvesApi.ts src/pages/student/ReadingSession.tsx src/pages/teacher/FluencyReview.tsx
git commit -m "Estantes: carga de datos del estudiante y subida de nivel al terminar lectura o revisión"
```

---

### Task 4: Componentes de estante, costilla, ficha, camino y felicitación

**Files:**
- Create: `src/components/Shelf.tsx`, `src/components/BookSpine.tsx`, `src/components/DoneBookDialog.tsx`, `src/components/LevelPathCard.tsx`, `src/components/LevelUpCelebration.tsx`

**Interfaces:**
- Consumes: `ReadingCover` y `subjectStyle` (plan 2), `LevelBadge` y `levelMotto`, `levelName`, `modeLabel`, `comprehensionLight`, y los tipos de la Tarea 3.
- Produces:
  - `Shelf({ title, subtitle, badge?, children, empty }: { title: string; subtitle: string; badge?: ReactNode; children: ReactNode; empty?: string })`.
    - Es un `section` con `aria-labelledby`. Tiene una fila `flex items-end gap-5 overflow-x-auto px-3 pb-0`. Si no hay `children` y existe `empty`, muestra ese texto en su lugar.
    - Abajo lleva la repisa `h-4 rounded bg-gradient-to-b from-[#8a5a33] to-[#6e4524] shadow`.
  - `BookSpine({ title, subject, words, light, onClick }: { title: string; subject: string; words: number; light: Light | null; onClick: () => void })`.
    - Es un `button` de 40 px de ancho, con altura `160 + min(40, words / 50)` px, del color de `subjectStyle(subject)`.
    - El título va en texto vertical (`[writing-mode:vertical-rl] rotate-180`, `truncate`) y hay un punto de semáforo abajo.
    - `aria-label = "{title}, {subject}, comprensión {pct}%"`.
    - Lleva `hover:-translate-y-2 focus-visible:-translate-y-2 transition motion-reduce:transform-none motion-reduce:transition-none`.
  - `DoneBookDialog({ book, onClose, onReadAgain })`: diálogo accesible con `ReadingCover` `md`, título, materia, modo y fecha local. Muestra:
    - "Comprensión: N% {semáforo}".
    - Si hay revisión: "Fluidez: W palabras correctas por minuto · A% de precisión".
    - Si hay comentario: "Tu docente: “…”".
    - Si `times > 1`: "La leíste N veces".
    - El botón **"Volver a leer"**. Se cierra con `Esc`.
  - `LevelPathCard({ language, progress }: { language: Language; progress: LevelProgress | null })`. Textos exactos:
    - Provisional: "Haz tu diagnóstico para ubicar tu nivel".
    - Nivel máximo: "Llegaste al nivel más alto".
    - En los demás casos, el título "Camino al Nivel {N+1} · {nombre}" y dos barras:
      - "📖 Comprensión: {greens} de tus últimas {considered} en verde · necesitas {needGreens}". Si `considered < 5`, dice "Llevas {considered} de 5 lecturas en tu nivel".
      - "✅ Cumplimiento: {completed} de {counted} asignadas · necesitas 80%". Si `counted = 0`, dice "Sin asignadas vencidas".

      Cada barra es verde si su condición se cumple y ámbar si no.
    - Si `accuracy.ok` es falso, una línea más: "🎙️ Cuida tu precisión en voz alta: necesitas 95% o más".
    - Si `progress` es null, no se muestra nada.
  - `LevelUpCelebration({ change, onClose }: { change: { id: string; language: Language; to_level: number }; onClose: () => void })`.
    - Es un diálogo con `LevelBadge` del nivel nuevo, "¡Subiste al Nivel {N} · {nombre}!", el lema del nivel y el idioma ("en español" o "en inglés").
    - El botón "¡Vamos!" llama `markLevelSeen` y luego `onClose`.

- [ ] **Step 1: Implementar los cinco componentes.**

- [ ] **Step 2: Verificar compilación y lint**

Run: `npx tsc -b && npx eslint src/components/Shelf.tsx src/components/BookSpine.tsx src/components/DoneBookDialog.tsx src/components/LevelPathCard.tsx src/components/LevelUpCelebration.tsx`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/Shelf.tsx src/components/BookSpine.tsx src/components/DoneBookDialog.tsx src/components/LevelPathCard.tsx src/components/LevelUpCelebration.tsx
git commit -m "Estantes: componentes de estante, costilla, ficha, camino al nivel y felicitación"
```

---

### Task 5: "Mi biblioteca" del estudiante y aviso al docente

**Files:**
- Modify: `src/pages/student/StudentDashboard.tsx`, que se reescribe sobre `fetchStudentShelves`. Se conservan intactos el encabezado (nombre, "+ Unirse a grupo", "Cerrar sesión"), el aviso, el banner de consentimiento y el diálogo para unirse.
- Modify: `src/pages/teacher/Students.tsx`

**Comportamiento** (boceto `estantes-estudiante-v5.html`):
- **Encabezado "Mi biblioteca":**
  - A la izquierda, `LevelBadge` y "Nivel N · Nombre" por idioma. Se muestra inglés solo si tiene fila de nivel en inglés o alguna asignación en inglés; si no, solo español.
  - A la derecha, tres tarjetas:
    1. "**{readCount}** lecturas leídas", con la línea "📖 {words} palabras ≈ {pages} páginas". Usar `toLocaleString('es-MX')` y "1 página" en singular.
    2. Mejora de fluidez (primer idioma con `gain`):
       - Si `delta > 0`: "**+{delta}** ppm desde tu primera lectura en voz alta ({first} → {last})".
       - Si `delta ≤ 0`: "Tu última lectura: {last} ppm".
       - Sin `gain`: "Lee en voz alta para ver tu avance".
    3. `LevelPathCard` del español, y debajo la del inglés si se muestra ese idioma.
- **Estante "📌 Lecturas asignadas":**
  - `badge` = "{n} por leer".
  - Cada libro: `ReadingCover md`, título, "{materia} · {modo}", `dueLabel` (en ámbar y con "· vencida" si `overdue`) y un botón "Leer" que lleva a `/student/read/{assignmentId}`.
  - Vacío: "No tienes lecturas asignadas pendientes. 🎉".
- **Estante "🌱 Entrenamiento libre":**
  - Las sugerencias, con `ReadingCover md`, título y "{materia} · Nivel {n}". Al tocarlas llevan a `/student/practice/{id}`.
  - Al final, el enlace "Ver toda la biblioteca →" a `/student/library`.
  - Vacío: "Ya leíste todas las lecturas de tu nivel. ¡Pronto habrá más!".
- **Estante "📚 Lecturas realizadas":**
  - Una `BookSpine` por libro; al tocarla se abre `DoneBookDialog`, cuyo "Volver a leer" lleva a `/student/practice/{readingId}`.
  - Debajo, la leyenda del semáforo, como la actual.
  - Vacío: "Aquí se irán acomodando los libros que termines.".
- **Al cargar:** si `unseenLevelUps` tiene filas, mostrar `LevelUpCelebration` de la primera; al cerrarla, la siguiente.
- **Se quitan** la tarjeta vieja "Entrenamiento libre →" y la lista vieja de "Completadas", que ya viven en los estantes.
- **`Students.tsx`:** arriba de la tabla, si hay cambios `reason = 'auto'` en los últimos 7 días, mostrar "🎉 Subieron de nivel: {nombre} → Nivel N ({idioma}), …". Se lee de `lec_level_changes` con el nombre desde `fetchRoster`.

- [ ] **Step 1: Reescribir la vista de `StudentDashboard.tsx` y agregar el aviso en `Students.tsx`.**

- [ ] **Step 2: Verificar compilación, lint y pruebas**

Run: `npx tsc -b && npx eslint src/pages/student/StudentDashboard.tsx src/pages/teacher/Students.tsx && npm test`
Expected: sin errores nuevos; las pruebas pasan.

- [ ] **Step 3: Verificación en el navegador (preview, con el SQL ya corrido)**

1. Con `estudiante_prueba@`:
   - Los tres estantes se ven con portadas.
   - Las realizadas aparecen como costillas: una por lectura. "El planeta…", que leyó 2 veces, abre su ficha con "La leíste 2 veces".
   - La tarjeta de nivel dice "Haz tu diagnóstico para ubicar tu nivel" (es provisional).
2. En la ficha, "Volver a leer" abre la lectura en modo libre.
3. A 375 px de ancho, cada estante se recorre de lado y la página no se desborda. Con el teclado (Tab), las costillas reciben foco visible y se levantan.
4. Una cuenta sin actividad ve los mensajes de estantes vacíos y "0 lecturas leídas".
5. Docente: en Estudiantes no aparece el aviso de subidas, porque no hay ninguna.

- [ ] **Step 4: Commit**

```bash
git add src/pages/student/StudentDashboard.tsx src/pages/teacher/Students.tsx
git commit -m "Mi biblioteca: tres estantes, indicadores, camino al nivel y felicitación; aviso de subidas al docente"
```

- [ ] **Step 5: Cierre del plan.** Avisar a Larisa, pedir su OK para unir a `main`, anotar en memoria y anunciar el plan 4 (estantes del docente y "cómo les fue").
