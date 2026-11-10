# Plan 4 · Biblioteca del docente y "Cómo les fue" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la Biblioteca del docente tenga tres estantes (mis lecturas, disponibles y asignadas anteriormente, estas de costilla) y que al tocar una asignación anterior se abra "Cómo les fue": números del grupo, preguntas que costaron más, tabla de estudiantes y descarga de resultados.

**Architecture:**
- **No hay SQL nuevo.** Los docentes ya leen todas las tablas `lec_*` con la política "docentes todo".
- Toda la lógica son funciones puras probadas con Vitest:
  - `assignmentTargets.ts`: quién es destinatario. Se extrae de `Assignments.tsx` para que esa pantalla y "Cómo les fue" usen la misma regla.
  - `teacherShelves.ts`: arma los tres estantes y aplica los filtros.
  - `assignmentResults.ts`: calcula los números de "Cómo les fue".
  - `csv.ts`: genera el archivo de resultados.
- Las páginas solo cargan datos y pintan.

**Tech Stack:** React 19, TypeScript, Tailwind 3, Supabase y Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md`, secciones 6.4, 6.5 y 6.8. Bocetos: `.superpowers/brainstorm/966-1794257735/content/biblioteca-docente-v2.html` y `detalle-asignacion-anterior.html`.

## Global Constraints

- **Destinatario** (6.8; la regla ya vive en `isTarget` de `assignmentRules.ts`):
  - Asignación individual, o miembro del grupo destino cuya unión (día local) es anterior o igual al día local de creación. Sin fila en `lec_group_joins`, cuenta como miembro desde siempre.
  - Los dados de baja antes de la fecha límite efectiva no son destinatarios.
- **Cierre:** archivada, o fecha límite efectiva anterior a hoy (hora de México). La fecha implícita es el día de creación más 7 días (`isClosed`, `effectiveDueDate`).
- **Quien se une tarde** (no es destinatario) y la completa: aparece en la tabla con la etiqueta "se unió después". **No** cuenta en "Completaron N de M" ni en "sin hacer". Sí cuenta en comprensión, fluidez y preguntas.
- **Intento que cuenta** por estudiante: el **primero completado** de esa asignación, igual que en la subida de nivel.
- **Comprensión por intento:** `comprehension_pct`. Las preguntas salen de `lec_answers`, unidas a `lec_questions` (el docente puede leer `correct_option`).
- **Semáforo:** `comprehensionLight` (≥75 verde, 50-74 amarillo, <50 rojo).
- **Fluidez:** se usa la **mediana** de `wcpm`. La precisión es el **promedio** de `accuracy_pct`. Solo cuentan los intentos con revisión. "N de M grabaciones revisadas" considera solo los intentos `aloud` que ya tienen archivo.
- **Pista** (6.5, sin IA): si una pregunta tiene menos de 50% de acierto con al menos 1 respuesta, se muestra: "💡 La pregunta {n} (tipo: {skill en español}) la acertó menos de la mitad del grupo: puede valer la pena comentarla en clase". `{n}` es `position + 1`.
- **Grado del estudiante:** se toma de `lec_enrollments` del ciclo cuyo rango (`starts_on`–`ends_on`) contiene la fecha de creación de la asignación. Si ningún ciclo la contiene, se usa el ciclo actual.
- **PDA trabajados** (6.5, último punto): **fuera de este plan**, llegan con el plan 5. No se muestra ningún placeholder.
- **"+ Nueva lectura":** oculto. La Fase 2a, el editor, todavía no existe.
- **Copy:** español mexicano, sin "Bienvenido/a" ni diagonales.
- **Botones:** nunca concatenar una clase de color base con otra de color que la sobreescriba. Cada variante es su propia constante (ver la memoria `feedback-css-contraste-botones-verdes-nkt`).
- **Accesibilidad:**
  - libros y costillas son `button` con `aria-label` completo;
  - los estantes son `section` con encabezado;
  - las pestañas son `role="tablist"`;
  - la tabla tiene `th scope="col"` y los encabezados ordenables son `button` con `aria-sort`.
- **Rama corta** `fase-7-docente`, creada desde `main`. Preview: `https://lector-nkt-git-fase-7-docente-sistemas-9143s-projects.vercel.app`; si no responde, sacar la URL del deploy con `gh api`. Merge solo con el OK de Larisa.

## Review Focus

1. **Grupo multigrado con estudiantes sin grado:** el filtro "Grado" ofrece 1°, 2°, 3° y "Sin grado". Los números y la tabla se recalculan con el filtro, sin divisiones entre cero ni "NaN". (Pruebas en la Tarea 2.)
2. **Asignación sin nadie que la completara:** "Completaron 0 de M", comprensión y fluidez dicen "—", no hay preguntas que mostrar ni pistas, y la tabla lista a todos con "no la hizo". (Pruebas en la Tarea 2.)
3. **Estudiante que se unió después y sí la hizo:** aparece en la tabla con "se unió después" y no infla "N de M". (Pruebas en la Tarea 2.)
4. **CSV con nombres que llevan comas, comillas o acentos:** se abre bien en Excel en español. Se escapa con comillas dobles, se usa BOM UTF-8 y separador `,`. (Pruebas en la Tarea 3.)
5. **Docente sin asignaciones cerradas ni lecturas propias:** los estantes vacíos muestran mensajes amables y la página no se rompe. (Pruebas en la Tarea 1 y verificación en la Tarea 4.)

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/teacherShelves.ts` (nuevo) + test | `filterReadings`, `splitTeacherShelves`, `pastAssignments`. |
| `src/lib/assignmentTargets.ts` (nuevo) + test | `computeTargets`: destinatarios y "se unió después" de una asignación. |
| `src/lib/assignmentResults.ts` (nuevo) + test | `summarizeResults`: números, preguntas, pistas y filas de la tabla. |
| `src/lib/csv.ts` (nuevo) + test | `toCsv`, `downloadCsv`. |
| `src/lib/assignmentResultsApi.ts` (nuevo) | `fetchAssignmentResults(assignmentId)`: carga todo lo de una asignación. |
| `src/pages/teacher/Library.tsx` (reescribir) | Los tres estantes con filtros compartidos y la cuadrícula "Ver todas". |
| `src/pages/teacher/AssignmentResults.tsx` (nuevo) | "Cómo les fue", en la ruta `/teacher/assignments/:assignmentId/results`. |
| `src/pages/teacher/Assignments.tsx` (modificar) | Usa `computeTargets` y agrega el enlace "Cómo les fue →" en cada fila. |
| `src/components/AssignModal.tsx` (modificar) | Prop opcional `initialGroupIds?: string[]` para "Volver a asignar". |
| `src/App.tsx` (modificar) | Ruta nueva protegida para docentes. |

---

### Task 1: Estantes del docente (lógica pura)

**Files:**
- Create: `src/lib/teacherShelves.ts`
- Test: `src/lib/teacherShelves.test.ts`

**Interfaces:**
- Consumes: `isClosed` y `todayLocal` de `assignmentRules.ts`; `LecReading` y `Language` de `lec.ts`.
- Produces:
  - `interface ShelfReadingRow extends LecReading { levels: number[] }`
  - `interface ReadingFilters { search: string; language: Language | ''; subject: string; level: number | ''; status: '' | 'draft' | 'published' }`
  - `filterReadings(rows: ShelfReadingRow[], f: ReadingFilters): ShelfReadingRow[]`: misma lógica que el `filtered` actual de `Library.tsx`. Busca en título y tema, sin distinguir mayúsculas ni acentos (`normalize('NFD')` y quitar diacríticos).
  - `splitTeacherShelves(rows: ShelfReadingRow[], teacherId: string): { mine: ShelfReadingRow[]; available: ShelfReadingRow[] }`
    - `mine` son las de `created_by === teacherId`, borradores incluidos, de la más nueva a la más vieja.
    - `available` son las publicadas de otros docentes, de la más nueva a la más vieja. Los borradores ajenos nunca aparecen.
  - `interface PastAssignmentInput { id: string; reading_id: string; mode: ReadingMode; due_date: string | null; created_at: string; archived: boolean; groupNames: string[]; avgComprehension: number | null }`
  - `pastAssignments<T extends PastAssignmentInput>(rows: T[], today: string): T[]`: solo las cerradas, de la más reciente a la más vieja por `created_at`.

- [ ] **Step 1: Crear la rama**

```bash
git checkout main && git pull && git checkout -b fase-7-docente
```

- [ ] **Step 2: Escribir las pruebas que fallan** (`src/lib/teacherShelves.test.ts`)
  - `filterReadings`:
    - "Fisica" encuentra "Física".
    - El filtro de nivel exige que `levels` lo incluya.
    - Con todos los filtros vacíos devuelve todo.
  - `splitTeacherShelves`:
    - Con lecturas propias (borrador y publicada), una publicada ajena y un borrador ajeno: `mine` tiene 2, `available` tiene 1 y el borrador ajeno no aparece en ninguna.
    - Orden por `created_at` descendente.
    - Sin lecturas: `{ mine: [], available: [] }`.
  - `pastAssignments`, con `today = '2026-11-09'`:
    - Una archivada, una con `due_date` 2026-11-08, una con `due_date` 2026-11-09 (todavía abierta), una sin fecha creada el 2026-11-01 (cerrada, porque su fecha implícita es el 08) y otra sin fecha creada el 2026-11-05 (abierta). Devuelve las 3 cerradas, de la más reciente a la más vieja.

- [ ] **Step 3: Correrlas y confirmar que fallan**

Run: `npm test -- src/lib/teacherShelves.test.ts`
Expected: FAIL, porque no existe el módulo.

- [ ] **Step 4: Implementar `src/lib/teacherShelves.ts`.**

- [ ] **Step 5: Correr todas las pruebas**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/teacherShelves.ts src/lib/teacherShelves.test.ts
git commit -m "Biblioteca docente: filtros y reparto en mis lecturas, disponibles y asignadas anteriormente"
```

---

### Task 2: Destinatarios y resultados de una asignación (lógica pura)

**Files:**
- Create: `src/lib/assignmentTargets.ts`, `src/lib/assignmentResults.ts`
- Test: `src/lib/assignmentTargets.test.ts`, `src/lib/assignmentResults.test.ts`
- Modify: `src/pages/teacher/Assignments.tsx`, para que use `computeTargets` en lugar del bucle propio. El comportamiento no cambia.

**Interfaces:**
- Produces, en `assignmentTargets.ts`:
  - `interface TargetInput { assignment: { created_at: string; due_date: string | null }; targets: { group_id: string | null; student_id: string | null }[]; membersByGroup: Map<string, { student_id: string; joined_at: string | null }[]>; bajaDate: Map<string, string | null> }`
  - `computeTargets(i: TargetInput): { targets: Set<string>; lateJoiners: Set<string>; groupOf: Map<string, string[]> }`
    - `targets` son los destinatarios según `isTarget`.
    - `lateJoiners` son los miembros actuales de un grupo destino que **no** son destinatarios por haberse unido después, y que no están dados de baja.
    - `groupOf` indica, para cada estudiante, en qué grupos destino está.
- Produces, en `assignmentResults.ts`:
  - `interface ResultAttempt { id: string; student_id: string; completed_at: string | null; mode: ReadingMode; comprehension_pct: number | null; drive_file_id: string | null; wcpm: number | null; accuracy: number | null }`
  - `interface ResultAnswer { attempt_id: string; question_id: string; is_correct: boolean }`
  - `interface ResultQuestion { id: string; position: number; text: string; skill: Skill }`
  - `interface ResultStudent { id: string; name: string; grade: Grade | null; groups: string[]; isTarget: boolean; lateJoiner: boolean }`
  - `interface StudentRow { studentId: string; name: string; grade: Grade | null; status: 'hecha' | 'no la hizo' | 'se unió después'; attemptId: string | null; comprehension: number | null; light: Light | null; wcpm: number | null; accuracy: number | null; needsReview: boolean }`
  - `interface ResultsSummary { assigned: number; completed: number; notDone: number; avgComprehension: number | null; lights: { green: number; yellow: number; red: number }; medianWcpm: number | null; avgAccuracy: number | null; aloudTotal: number; aloudReviewed: number; questions: { id: string; n: number; text: string; skill: Skill; pctCorrect: number; answered: number }[]; hints: string[]; rows: StudentRow[] }`
  - `summarizeResults(students: ResultStudent[], attempts: ResultAttempt[], answers: ResultAnswer[], questions: ResultQuestion[]): ResultsSummary`
    - Recibe los estudiantes **ya filtrados** por grupo y grado (la página filtra antes de llamar).
    - Se queda con el primer intento completado de cada estudiante.
    - Las preguntas van de menor a mayor `pctCorrect`. Las que no tienen respuestas se omiten.
    - `rows` va por nombre (`localeCompare('es')`): primero los destinatarios y luego los que se unieron después.
    - `needsReview` es `mode === 'aloud'` con archivo y sin `wcpm`.

- [ ] **Step 1: Escribir las pruebas que fallan**
  - `assignmentTargets.test.ts`:
    - Un individual cuenta.
    - Un miembro unido el mismo día de creación cuenta.
    - Un miembro unido después va a `lateJoiners`.
    - Un miembro sin fila de unión cuenta.
    - Uno dado de baja antes de la fecha límite no está en ninguno de los dos.
    - Un estudiante en dos grupos destino aparece una vez en `targets`, con ambos grupos en `groupOf`.
  - `assignmentResults.test.ts`:
    - **Nadie la hizo:** 3 destinatarios sin intentos dan `completed 0`, `notDone 3`, `avgComprehension null`, `medianWcpm null`, `questions []`, `hints []` y 3 filas "no la hizo".
    - **Caso normal:** 4 destinatarios. 3 completan con 100, 60 y 40, y uno completa dos veces con 80 y luego 20, así que cuenta el 80. Resultado: `completed 4`, `avgComprehension 70`, `lights { green: 2, yellow: 1, red: 1 }`.
    - **Mediana de fluidez:** con revisiones de 90, 120 y 150 da `medianWcpm 120`; con 90 y 120 da 105. Además `aloudTotal` y `aloudReviewed` salen correctos, y la fila sin revisión tiene `needsReview: true`.
    - **Preguntas:**
      - P1 con 3 de 4 correctas y P2 con 1 de 4 quedan ordenadas `[P2, P1]`, con `pctCorrect` 25 y 75.
      - Hay una pista exacta: "💡 La pregunta 2 (tipo: Inferencial) la acertó menos de la mitad del grupo: puede valer la pena comentarla en clase".
    - **Se unió después:** un no destinatario con intento aparece con `status 'se unió después'`, no suma a `assigned` ni a `completed` y sí al promedio.
    - **Grado null** no rompe el orden ni los números.

- [ ] **Step 2: Correrlas y confirmar que fallan**

Run: `npm test -- src/lib/assignmentTargets.test.ts src/lib/assignmentResults.test.ts`
Expected: FAIL, porque no existen los módulos.

- [ ] **Step 3: Implementar los dos módulos** y reemplazar en `Assignments.tsx` el bucle de destinatarios por `computeTargets(...).targets`.

- [ ] **Step 4: Correr pruebas, compilación y lint**

Run: `npm test && npx tsc -b && npx eslint src/lib/assignmentTargets.ts src/lib/assignmentResults.ts src/pages/teacher/Assignments.tsx`
Expected: todo limpio.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assignmentTargets.ts src/lib/assignmentTargets.test.ts src/lib/assignmentResults.ts src/lib/assignmentResults.test.ts src/pages/teacher/Assignments.tsx
git commit -m "Cómo les fue: destinatarios compartidos y resumen de resultados por asignación"
```

---

### Task 3: CSV y carga de datos de una asignación

**Files:**
- Create: `src/lib/csv.ts` + `src/lib/csv.test.ts`, `src/lib/assignmentResultsApi.ts`

**Interfaces:**
- Produces:
  - `toCsv(header: string[], rows: (string | number | null)[][]): string`
    - Comienza con BOM `﻿` y separa con `,`, con saltos `\r\n`.
    - Escapa el campo con comillas dobles si contiene `,`, `"`, `\n` o `;`, duplicando las comillas internas.
    - `null` se escribe como campo vacío.
  - `downloadCsv(filename: string, csv: string): void`: usa un `Blob` y un `<a download>` temporal.
  - `interface AssignmentResultsData { assignment: { id: string; reading_id: string; mode: ReadingMode; fixed_level: number | null; due_date: string | null; created_at: string; archived: boolean }; reading: { id: string; title: string; subject: string; language: Language; cover_path: string | null; levels: number[] }; groups: { id: string; name: string }[]; students: ResultStudent[]; attempts: ResultAttempt[]; answers: ResultAnswer[]; questions: ResultQuestion[] }`
  - `fetchAssignmentResults(assignmentId: string): Promise<AssignmentResultsData>`
    - Lee la asignación con sus targets y la lectura con niveles; miembros y uniones de los grupos destino; bajas y grados del ciclo que corresponde (Global Constraints); nombres desde `profiles`.
    - Lee los intentos de esa asignación con `lec_fluency_reviews(wcpm, accuracy_pct)` y las respuestas de esos intentos.
    - Lee las preguntas de las versiones usadas en esos intentos. Si una lectura tiene varias versiones (por niveles), las preguntas se agrupan por versión y se reportan con su `position`. **[Ruling previsto]** Si los intentos usan más de una versión, la sección de preguntas lo indica con "Las preguntas cambian según el nivel; se muestran las de la versión más usada" y usa solo esa versión.
    - Arma `students` con `computeTargets`: destinatarios más los que se unieron después y tienen intento.

- [ ] **Step 1: Pruebas que fallan de `toCsv`**
  - Un nombre con coma y comillas (`Pérez, "Toño"`) queda como `"Pérez, ""Toño"""`.
  - Empieza con BOM.
  - `null` produce un campo vacío.
  - Las filas se separan con `\r\n`.

- [ ] **Step 2: Correr y ver que fallan**

Run: `npm test -- src/lib/csv.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `csv.ts` y `assignmentResultsApi.ts`.**

- [ ] **Step 4: Verificar**

Run: `npm test && npx tsc -b && npx eslint src/lib/csv.ts src/lib/assignmentResultsApi.ts`
Expected: todo limpio.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts src/lib/assignmentResultsApi.ts
git commit -m "Cómo les fue: descarga CSV y carga de datos de una asignación"
```

---

### Task 4: Pantallas — Biblioteca con estantes y "Cómo les fue"

**Files:**
- Modify: `src/pages/teacher/Library.tsx`, `src/components/AssignModal.tsx`, `src/App.tsx`, `src/pages/teacher/Assignments.tsx` (enlace)
- Create: `src/pages/teacher/AssignmentResults.tsx`

**Comportamiento de `Library.tsx`** (boceto `biblioteca-docente-v2.html`):
- **Arriba, los filtros actuales**, con el buscador "Buscar por título o tema". Aplican a los tres estantes.
- **"✍️ Mis lecturas"** (subtítulo "Las que tú creaste, incluidos tus borradores"): libros de frente con `ReadingCover md`. Los borradores llevan la etiqueta "Borrador" sobre la portada. Vacío: "Todavía no has creado lecturas.".
- **"📚 Lecturas disponibles"** (subtítulo "Publicadas por todo el equipo docente · las más nuevas primero"):
  - Muestra las primeras 12 y, al final, el botón "Ver todas ({n}) →". Ese botón cambia el estante a una cuadrícula (`grid-cols-2 sm:grid-cols-4 lg:grid-cols-6`) con todas, y su texto pasa a "Ver menos".
  - Vacío: "No hay lecturas publicadas de otros docentes con esos filtros.".
- **Cada libro de frente:** portada, título, "{materia} · {en español | en inglés}" y los cinco circulitos de niveles, que se conservan del diseño actual. Al tocarlo lleva a `/teacher/library/{id}`.
- **"🗂️ Asignadas anteriormente"** (subtítulo "Las que ya asignaste y cerraron · toca una costilla para ver cómo les fue a tus grupos"):
  - Una `BookSpine` por asignación cerrada **del docente**, que no se filtra por estado, con el título y la materia de su lectura.
  - El semáforo es el promedio de comprensión de la asignación (null si nadie la hizo).
  - Debajo de cada costilla va un texto pequeño con los grupos, truncado a 1 línea y de 56 px de ancho.
  - Al tocarla lleva a `/teacher/assignments/{id}/results`.
  - Vacío: "Aquí aparecerán tus asignaciones cuando cierren.".
  - **Carga:** asignaciones del docente con targets, `reading_groups(name)` y `lec_readings(title, subject, language, cover_path)`, más los intentos completados de esas asignaciones para sacar el promedio (primer intento por estudiante). Los filtros de idioma, materia y búsqueda aplican a la lectura de cada asignación.
- Se quita la nota "Crear y editar lecturas llega en la siguiente fase…".

**Comportamiento de `AssignmentResults.tsx`** (boceto `detalle-asignacion-anterior.html`):
- **Encabezado:**
  - `ReadingCover md`, título, "{materia} · {modo}", el nivel ("Nivel fijo N · nombre" o "Nivel de cada estudiante") y "Asignada el {fecha local} · cerró el {fecha límite efectiva}".
  - Un enlace "← Biblioteca".
- **Pestañas:** "Todos" más una por grupo destino, en un `role="tablist"`. Si los estudiantes visibles tienen más de un grado distinto (contando "Sin grado"), aparece un select "Grado: Todos / 1° / 2° / 3° / Sin grado" con solo las opciones presentes.
- **Botones** (con clases separadas para cada variante):
  - "↻ Volver a asignar": abre `AssignModal` con `initialGroupIds` igual a los grupos de esta asignación.
  - "Asignar a otro grupo": abre `AssignModal` sin preselección.
  - "⬇ Descargar resultados": genera el CSV de la vista filtrada, llamado `resultados-{titulo-sin-acentos}-{yyyy-mm-dd}.csv`, con las columnas `Estudiante, Grado, Grupo(s), Estado, Comprensión %, Fluidez (ppm), Precisión %`.
- **Tres tarjetas:**
  1. "Completaron **{completed}** de {assigned}" y "{notDone} sin hacer".
  2. "Comprensión promedio **{avg}%**" (o "—"), con una barra apilada de verdes, amarillos y rojos y la leyenda de conteos.
  3. "Fluidez mediana **{m} ppm** · precisión **{a}%**" (o "—") y "{aloudReviewed} de {aloudTotal} grabaciones revisadas", con el enlace "Revisar pendientes →" a `/teacher/fluency` si faltan. Si la asignación no es de voz alta, la tarjeta dice "Esta asignación no fue en voz alta".
- **"Preguntas que costaron más":** una fila por pregunta con "P{n}", el texto (`line-clamp-2`), una barra con el color del semáforo según `pctCorrect` y el porcentaje. Debajo, las pistas. Si no hay respuestas: "Todavía no hay respuestas.".
- **Tabla:** Estudiante, Grado, Comprensión (punto y %), Fluidez, Precisión y Estado.
  - Se ordena tocando el encabezado; el orden por defecto es por nombre.
  - El nombre lleva a `/teacher/fluency/{attemptId}` si el intento es de voz alta con archivo; si no, es texto.
  - "no la hizo" va en gris; "se unió después" en una etiqueta ámbar.
- **Carga:** `fetchAssignmentResults`, con spinner. Si hay error: "No se pudieron cargar los resultados de esta asignación.".

**`AssignModal`:** se agrega la prop `initialGroupIds?: string[]`, que inicializa `selected` (filtrada a grupos activos del docente cuando cargan).

**`App.tsx`:** se agrega la ruta `/teacher/assignments/:assignmentId/results`, con la misma protección que `/teacher/assignments`.

**`Assignments.tsx`:** cada fila lleva el enlace "Cómo les fue →" a la ruta nueva, también en las activas, porque sirve para ver el avance.

- [ ] **Step 1: Implementar las pantallas y los cambios.**

- [ ] **Step 2: Verificar**

Run: `npx tsc -b && npx eslint src/pages/teacher/Library.tsx src/pages/teacher/AssignmentResults.tsx src/components/AssignModal.tsx src/App.tsx src/pages/teacher/Assignments.tsx && npm test && npm run build`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit y push**

```bash
git add src/pages/teacher/Library.tsx src/pages/teacher/AssignmentResults.tsx src/components/AssignModal.tsx src/App.tsx src/pages/teacher/Assignments.tsx
git commit -m "Biblioteca docente con tres estantes y pantalla Cómo les fue"
git push -u origin fase-7-docente
```

- [ ] **Step 4: Verificación en el navegador (Larisa, en la preview)**
1. Biblioteca:
   - Los tres estantes con portadas.
   - Un filtro (por ejemplo, Inglés) cambia los tres.
   - "Ver todas" abre la cuadrícula.
   - Las asignaciones cerradas aparecen como costillas con el grupo debajo.
2. Al tocar una costilla:
   - Los números cuadran con la pantalla Asignaciones (mismo "N de M").
   - Las preguntas aparecen de la más difícil a la más fácil.
   - La tabla se ordena.
   - El CSV abre en Excel con acentos correctos.
3. "↻ Volver a asignar" abre el modal con el grupo ya marcado.
4. A 375 px de ancho no hay desborde horizontal de la página; la tabla se recorre de lado dentro de su caja.

- [ ] **Step 5: Cierre.** Revisión final, OK de Larisa, merge a `main`, memoria y anuncio del plan 5 (PDA y Concentrado).
