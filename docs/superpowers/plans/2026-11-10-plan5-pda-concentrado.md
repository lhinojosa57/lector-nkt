# Plan 5 · PDA: catálogo, etiquetado, panel de cumplimiento y Concentrado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada docente pueda etiquetar sus lecturas con PDA de cualquier campo formativo y disciplina, ver qué PDA lleva trabajados por grupo y grado, y descargar en Excel y PDF el "Concentrado de avance del Programa Sintético".

**Architecture:**
- Catálogo:
  - Lo arma un script del repo (`scripts/build-pda-sql.mjs`) que lee `C:\Users\laris\NKT\NKT-CS\raw\Catalogo-de-PDAs.md` y escribe un SQL de datos que corre Larisa.
  - El parser vive en `scripts/pdaParse.mjs` y se prueba con Vitest.
- El esquema (tablas, RLS y configuración) va en otro SQL.
- La contribución (en curso, abordado o con evidencia de logro) **no se guarda**: se calcula al consultar con una función pura probada (`pdaProgress.ts`).
- El panel y el reporte usan esa misma función.
- Excel con SheetJS y PDF con jsPDF + autotable. Los dos se cargan con `import()` dinámico solo al descargar.

**Tech Stack:** React 19, TypeScript, Tailwind 3, Supabase, Vitest, SheetJS (`xlsx` desde `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, no la versión vieja de npm), `jspdf@2.5.2` y `jspdf-autotable@3.8.4`.

**Spec:** `docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md`, secciones 6.7, 6.8 y 7 (importador).

## Global Constraints

- **Formato del catálogo** (líneas observadas en el archivo):
  - **Encabezados** (`#`, `##`) con nivel inconsistente: por ejemplo, `# F. FÍSICA` y `# E. ÉTICA…` están en nivel 1. El campo y la disciplina **no** se sacan de los encabezados, sino del código.
  - **Línea con código:** el primer token, sin espacios, se parte por `.`, y se consumen segmentos mientras cumplan `^(?:[A-Z]{1,4}|[a-zñ]|C\d+|G[1-3])$`. El resto es el texto.
    - `S.M.C2.G1.b Compara…` da el código `S.M.C2.G1.b`.
    - `H.ESE.b.C3.Reconoce…`, sin espacio, da el código `H.ESE.b.C3` y el texto `Reconoce…`.
  - **Contenido:** un código sin segmento `G` cuyo último segmento es `C\d+`. Ejemplos: `L.E.C1.`, `H.EF.a.C1.`.
    - **Excepción** (spec 7): `H.ESE.b.C3.` seguido de texto de PDA se trata como **PDA con `grade = null`**.
    - Regla operativa: si hay un contenido con el mismo `contenido_code` ya visto, y el texto es distinto al de ese contenido, es un PDA sin grado.
  - **PDA:** un código con segmento `G1|G2|G3`; el grado es ese número.
  - **`contenido_code`:** el prefijo hasta `C\d+` inclusive, quitando los segmentos de una letra minúscula. Así, `E.H.C1.ñ.G1` → `E.H.C1` y `H.ESE.b.C3` → `H.ESE.C3`.
  - **Campo y disciplina por prefijo:**
    - Lenguajes: `L.E` Español, `L.I` Inglés, `L.A` Artes.
    - Saberes y pensamiento científico: `S.M` Matemáticas, `S.B` Biología, `S.F` Física, `S.Q` Química.
    - Ética, naturaleza y sociedades: `E.G` Geografía, `E.H` Historia, `E.FCYE` Formación Cívica y Ética.
    - De lo humano y lo comunitario: `H.TEC` Tecnología, `H.ESE` Educación socioemocional, `H.EF` Educación física.
  - **Errata:** la línea 226, `S.M.C1.G1. Reconoce la necesidad de los números negativos…`, pasa a `S.M.C2.G1`.
  - Se ignoran las líneas vacías, `C. Contenidos`, `G1. 1er grado` (y G2, G3) y las líneas de título como `S. Saberes y pensamiento científico`.
  - Los **duplicados exactos** (mismo código, grado y texto) se descartan. Los códigos repetidos con texto distinto se conservan, porque `id` es propio y `code` no es único.
- **Contribución** (6.7):
  - Por asignación y por grado G presente entre sus **destinatarios**: se usa `computeTargets` (plan 4) y el grado del ciclo de creación, como en `assignmentResultsApi`.
  - **Abordado:** al menos el **60%** de los destinatarios de grado G la completaron.
  - **Con evidencia de logro:** abordado, y la comprensión promedio de los de grado G que la completaron (primer intento) es **≥ 75%**.
  - **En curso:** la asignación no está cerrada (`isClosed`).
  - Solo cuentan los PDA de la lectura con `grade = G` o `grade = null`.
  - **Estado de un PDA:** el mejor entre sus asignaciones, en el orden con evidencia de logro > abordado > en curso > pendiente por trabajar. Se muestra como "sin trabajar" en el panel y como "pendiente por trabajar" en el reporte.
- **Periodo del reporte:** solo cuentan las asignaciones cuyo `created_at` (día local) cae en el periodo. El estado "en curso" se evalúa con la fecha de hoy.
- **Ciclo y trimestres:** `lec_cycles.terms` (jsonb `[{name, starts_on, ends_on}]`) se captura en la pantalla nueva **Configuración**, igual que escuela y CCT.
- **El estudiante nunca ve PDA.** En las tablas nuevas, RLS solo para docentes.
- **AssignModal:** si los grupos elegidos tienen estudiantes de un grado sin PDA en la lectura, y la lectura tiene al menos un PDA, muestra: "Esta lectura no tiene PDA de {N}°; tus estudiantes de {N}° la leerán, pero no sumará a su cumplimiento". Si la lectura no tiene ningún PDA: "Esta lectura no tiene PDA; no sumará al cumplimiento".
- **Copy y estilo:**
  - Español mexicano.
  - Botones con constantes de clase separadas, nunca concatenando una clase de color base con otra que la sobreescriba.
  - Los estados usan siempre texto y color, nunca solo color.
- **Rama** `fase-8-pda`, desde `main`. Preview: `https://lector-nkt-git-fase-8-pda-sistemas-9143s-projects.vercel.app`. Merge solo con el OK de Larisa.

## Review Focus

1. **Lectura con PDA de 1° asignada a un grupo multigrado de 1° y 3°:** suma a los de 1°; en 3° no suma, y el modal ya lo había avisado. (Pruebas en las Tareas 4 y 5.)
2. **Exactamente 60% completado y promedio exactamente 75%:** cuenta como abordado con evidencia de logro (≥, no >). (Pruebas en la Tarea 4.)
3. **PDA con `grade = null`:** aparece y suma en los tres grados. (Pruebas en las Tareas 1 y 4.)
4. **Grupo sin estudiantes con grado:** el panel muestra "Ponles grado en Estudiantes para ver su avance" en lugar de tablas vacías. (Verificación en la Tarea 5.)
5. **Reporte de un periodo sin asignaciones:** todos los PDA del grado aparecen como "pendiente por trabajar", y el Excel y el PDF se generan igual. (Pruebas en la Tarea 4 y verificación en la Tarea 6.)

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `scripts/pdaParse.mjs` + `scripts/pdaParse.test.ts` (nuevos) | `parsePdaCatalog(text)` → `{ pdas, contenidos, warnings }`. |
| `scripts/build-pda-sql.mjs` (nuevo) | Lee el catálogo y escribe `supabase/migrations/2026-11-10_pda_datos.sql`. |
| `supabase/migrations/2026-11-10_pda_esquema.sql` (nuevo) | `lec_pda`, `lec_reading_pdas`, `lec_settings`, RLS y verificación. |
| `supabase/migrations/2026-11-10_pda_datos.sql` (generado) | Inserta el catálogo (idempotente) y verifica los conteos. |
| `src/lib/pda.ts` (nuevo) | Tipos, `CAMPOS` (orden y disciplinas), `fetchPdaCatalog`, `fetchReadingPdas`, `setReadingPdas`. |
| `src/components/PdaPicker.tsx` (nuevo) | Selector con búsqueda y filtros, en el detalle de la lectura. |
| `src/lib/pdaProgress.ts` + test (nuevos) | `assignmentContribution` y `pdaStatuses`. |
| `src/lib/pdaProgressApi.ts` (nuevo) | Carga asignaciones, destinatarios, grados, intentos y etiquetas para un grupo, ciclo y periodo. |
| `src/pages/teacher/PdaPanel.tsx` (nuevo) | Pestaña "PDA": panel de cumplimiento y botón del reporte. |
| `src/lib/concentrado.ts` + test (nuevos) | `buildConcentradoRows` (filas por grado) y `concentradoFileName`. |
| `src/lib/concentradoExport.ts` (nuevo) | `downloadConcentradoXlsx` y `downloadConcentradoPdf` (con `import()` dinámico). |
| `src/pages/teacher/Settings.tsx` (nuevo) | Pantalla "Configuración": escuela, CCT y trimestres del ciclo actual. |
| Modificar: `ReadingDetail.tsx`, `AssignModal.tsx`, `TeacherHeader.tsx`, `App.tsx` y `package.json` | Integración. |

---

### Task 1: Parser del catálogo y SQL de datos

**Files:** `scripts/pdaParse.mjs`, `scripts/pdaParse.test.ts`, `scripts/build-pda-sql.mjs`, `supabase/migrations/2026-11-10_pda_datos.sql` (generado), `package.json` (script `"pda:sql": "node scripts/build-pda-sql.mjs"` y el `include` de Vitest si hace falta para `scripts/**/*.test.ts`).

**Interfaces:**
- `parsePdaCatalog(text: string): { pdas: { code, campo, disciplina, contenido_code, contenido_text, grade: 1|2|3|null, text, line }[]; contenidos: Map<string,string>; warnings: string[] }`
  - Aplica la errata por número de línea (226) **y** por contenido del texto, por si la línea se mueve.
  - `warnings` lista las líneas con código que no se pudieron clasificar.
- `build-pda-sql.mjs`:
  - Escribe `insert into public.lec_pda (code, campo, disciplina, contenido_code, contenido_text, grade, text, position) values … on conflict (code, coalesce(grade,0), md5(text)) do nothing;`. La unicidad la da el índice que crea el esquema de la Tarea 2.
  - `position` es el orden en el archivo.
  - Al final: verificación con conteos por disciplina.
  - En consola imprime el total, el conteo por disciplina y los warnings.

- [ ] **Step 1: Crear la rama** `git checkout main && git pull && git checkout -b fase-8-pda`.
- [ ] **Step 2: Pruebas que fallan** (`scripts/pdaParse.test.ts`), con un texto pequeño en línea:
  - `L.E.C1.G2. Comprende…` → `grade 2`, `campo 'Lenguajes'`, `disciplina 'Español'`, `contenido_code 'L.E.C1'` y el `contenido_text` de la línea `L.E.C1. …` previa.
  - `S.M.C2.G1.b Compara…` → `code 'S.M.C2.G1.b'`, `grade 1`.
  - `E.H.C1.ñ.G1. Reconstruye…` → `contenido_code 'E.H.C1'`.
  - `H.ESE.b.C3.Reconoce nuevos intereses…` → `grade null`, `contenido_code 'H.ESE.C3'`.
  - `H.EF.a.C1. Capacidades, habilidades y destrezas motrices.`, igual al contenido → no es PDA.
  - Dos líneas idénticas → 1 PDA. Mismo código con texto distinto → 2 PDA.
  - `# F. FÍSICA` y `S. Saberes y pensamiento científico` no rompen nada ni producen PDA.
  - Errata: en un texto donde la línea 226 es `S.M.C1.G1. Reconoce la necesidad de los números negativos…`, el código queda `S.M.C2.G1`.
  - **Prueba del archivo real** (se salta con `it.skipIf(!existsSync(ruta))`): sin warnings; cada una de las 13 disciplinas tiene al menos 1 PDA; ningún PDA de Español queda con `campo` distinto de Lenguajes.
- [ ] **Step 3:** `npm test -- scripts/pdaParse.test.ts` → FAIL (no existe el módulo).
- [ ] **Step 4:** Implementar `pdaParse.mjs` y `build-pda-sql.mjs`.
- [ ] **Step 5:** `npm test` → PASS. Luego `npm run pda:sql` → imprime los conteos sin warnings y genera el SQL.
- [ ] **Step 6: Commit**: `git add scripts package.json supabase/migrations/2026-11-10_pda_datos.sql && git commit -m "PDA: parser del catálogo oficial y SQL de datos"`.

---

### Task 2: Esquema SQL (Larisa lo corre antes que los datos)

**Files:** `supabase/migrations/2026-11-10_pda_esquema.sql`

**Contenido:**
- `lec_pda`: `id uuid pk default gen_random_uuid()`, `code text not null`, `campo text not null`, `disciplina text not null`, `contenido_code text not null`, `contenido_text text`, `grade int check (grade between 1 and 3)`, `text text not null`, `position int not null`. Además, el índice único `lec_pda_uniq on (code, coalesce(grade,0), md5(text))`.
- `lec_reading_pdas`: `reading_id uuid references lec_readings on delete cascade`, `pda_id uuid references lec_pda on delete cascade`, `added_by uuid references profiles on delete set null`, `added_at timestamptz default now()` y `primary key (reading_id, pda_id)`.
- `lec_settings`: una sola fila, con `id boolean primary key default true check (id)`, `school_name text`, `cct text`, `updated_at timestamptz default now()` y `updated_by uuid`. Se inserta la fila vacía con `on conflict do nothing`.
- RLS en las tres tablas: la política "docentes todo" con `lec_is_teacher()`. No hay política para estudiantes.
- Verificación: `tablas = 3`, `politicas = 3`, `settings = 1`.

- [ ] **Step 1:** Escribir el SQL, idempotente y con comentario de cómo correrlo.
- [ ] **Step 2: Larisa corre el esquema y luego los datos.** Esperado:
  - esquema `3 | 3 | 1`;
  - datos: un conteo por disciplina igual al que imprimió el script;
  - si corre los datos dos veces, el total no cambia.
- [ ] **Step 3: Commit**: `git commit -m "PDA: esquema (catálogo, etiquetas por lectura y configuración)"`.

---

### Task 3: Etiquetar lecturas y aviso al asignar

**Files:** `src/lib/pda.ts`, `src/components/PdaPicker.tsx`, `src/pages/teacher/ReadingDetail.tsx` y `src/components/AssignModal.tsx`.

**Interfaces:**
- `interface Pda { id: string; code: string; campo: string; disciplina: string; contenido_code: string; contenido_text: string | null; grade: 1|2|3|null; text: string; position: number }`
- `CAMPOS: { campo: string; disciplinas: string[] }[]`, en el orden de las Global Constraints.
- `fetchPdaCatalog(): Promise<Pda[]>`: se guarda en memoria del módulo; lee de mil en mil con `range()` hasta terminar.
- `fetchReadingPdas(readingId): Promise<Pda[]>`
- `setReadingPdas(readingId, pdaIds: string[]): Promise<void>`: borra las que ya no están e inserta las nuevas.
- `pdaGradesCovered(pdas: Pda[]): Set<1|2|3>`: un PDA con `grade null` cubre los 3. Va en `pda.ts` y se prueba en `src/lib/pda.test.ts`.

**PdaPicker** (en `ReadingDetail`, como una sección "PDA que trabaja esta lectura", visible para cualquier docente):
- La lista de los PDA elegidos se agrupa por campo → disciplina, con "código · texto" y un botón "Quitar".
- El botón "+ Agregar PDA" abre un panel con:
  - un buscador de texto (sin acentos, con `fold`);
  - los selects Campo, Disciplina y Grado (1°, 2°, 3° o todos);
  - la lista de resultados, con máximo 50 visibles y un checkbox en cada uno;
  - los botones "Guardar" y "Cancelar".
- Al guardar muestra "PDA guardados ✓".

**AssignModal:**
- Al marcar grupos, lee los grados de sus miembros en el ciclo actual (`lec_enrollments`) y los PDA de la lectura.
- Muestra el aviso de las Global Constraints para cada grado presente que no esté cubierto. No bloquea.

- [ ] **Step 1:** Prueba que falla para `pdaGradesCovered`, con estos casos: `[]` → vacío; `[{grade:1}]` → {1}; `[{grade:null}]` → {1,2,3}.
- [ ] **Step 2:** `npm test -- src/lib/pda.test.ts` → FAIL.
- [ ] **Step 3:** Implementar `pda.ts`, `PdaPicker.tsx` y los cambios en `ReadingDetail` y `AssignModal`.
- [ ] **Step 4:** `npm test && npx tsc -b && npx eslint <archivos>` → limpio.
- [ ] **Step 5: Commit**: `git commit -m "PDA: etiquetar lecturas y aviso al asignar a grados sin PDA"`.

---

### Task 4: Cálculo de contribución y filas del Concentrado (lógica pura)

**Files:** `src/lib/pdaProgress.ts` + `src/lib/pdaProgress.test.ts`, `src/lib/concentrado.ts` + `src/lib/concentrado.test.ts`

**Interfaces:**
- `type PdaState = 'logro' | 'abordado' | 'en_curso' | 'pendiente'`
- `interface ContributionInput { assignmentId: string; readingTitle: string; createdAt: string; closed: boolean; readingPdaIds: string[]; students: { id: string; grade: 1|2|3|null; completed: boolean; comprehension: number | null }[] }`. `students` son los destinatarios, y `completed` y `comprehension` vienen del primer intento completado.
- `assignmentContribution(a: ContributionInput, pdaGrade: Map<string, 1|2|3|null>): { grade: 1|2|3; pdaIds: string[]; state: Exclude<PdaState,'pendiente'>; completed: number; total: number; avg: number | null }[]`
  - Calcula por cada grado presente.
  - Los estudiantes sin grado no entran en ningún grado.
  - Si la asignación no está cerrada, el estado es `en_curso` y los números son informativos.
- `interface PdaEvidence { assignmentId: string; readingTitle: string; date: string; state: …; completed: number; total: number; avg: number | null }`
- `pdaStatuses(contribs: (ReturnType<typeof assignmentContribution>[number] & { assignmentId: string; readingTitle: string; createdAt: string })[], grade: 1|2|3): Map<string, { state: PdaState; evidence: PdaEvidence[] }>`: devuelve el mejor estado y toda la evidencia, ordenada por fecha.
- `STATE_LABEL: Record<PdaState, string>` = `{ logro: 'Con evidencia de logro', abordado: 'Abordado', en_curso: 'En curso', pendiente: 'Pendiente por trabajar' }`
- `buildConcentradoRows(catalog: Pda[], statuses: Map<…>, grade: 1|2|3, disciplinas: string[]): ConcentradoRow[]`
  - Toma todos los PDA del catálogo con `grade = G` o `null` de las disciplinas elegidas.
  - Los ordena por `CAMPOS`, disciplina y `position`.
  - `ConcentradoRow = { campo, disciplina, contenido: "code · texto", pdaCode, pdaText, estado, lecturas: "Título (dd/mm/aaaa)" unidas con "; ", completaron: "N de M" sumado, comprension: number | null }`
- `concentradoFileName(grupo, grado, periodo)` → `concentrado-{grupo}-{grado}o-{periodo}.xlsx`, sin acentos ni espacios.

- [ ] **Step 1: Pruebas que fallan**
  - **Multigrado:** 5 de 1° y 5 de 3°. La lectura tiene un PDA de 1° y uno de 2°. Completan 3 de 1° (con 80, 70 y 76) y 1 de 3°.
    - En 1° sale `abordado` con `avg 75.3`, así que **logro**, y solo el PDA de 1°.
    - El grado 3° aparece con `pdaIds []`.
  - **Bordes:** 3 de 5 (60%) con promedio exactamente 75 → `logro`. 2 de 5 → no aparece como abordado: el estado es `pendiente` y no se agrega evidencia de abordado. **[Ruling previsto]** La evidencia sí se registra, con el estado `pendiente`, para que el docente vea que se intentó.
  - **No cerrada:** `en_curso`.
  - **`grade null`:** el PDA cuenta en 1°, 2° y 3°.
  - **`pdaStatuses`:** de una asignación `abordado` y otra `logro` del mismo PDA, gana `logro` y la evidencia queda con las 2, ordenada por fecha.
  - **`buildConcentradoRows` sin asignaciones:** todas las filas en "Pendiente por trabajar"; el conteo es igual al de PDA del grado en esas disciplinas; están en el orden de los campos.
- [ ] **Step 2:** `npm test -- src/lib/pdaProgress.test.ts src/lib/concentrado.test.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit**: `git commit -m "PDA: cálculo de contribución por grado y filas del Concentrado"`.

---

### Task 5: Panel de cumplimiento y Configuración

**Files:** `src/lib/pdaProgressApi.ts`, `src/pages/teacher/PdaPanel.tsx`, `src/pages/teacher/Settings.tsx`, `src/components/TeacherHeader.tsx` (pestañas "PDA" y "Configuración") y `src/App.tsx` (rutas `/teacher/pda` y `/teacher/settings`).

**Interfaces:**
- `fetchPdaProgress({ groupId, from, to, allTeachers, teacherId }): Promise<{ grades: (1|2|3)[]; studentsWithoutGrade: number; byGrade: Map<1|2|3, Map<string, {state, evidence}>> }>`
  - Toma las asignaciones que tienen al grupo como destino, creadas entre `from` y `to` (días locales). Si `allTeachers` es falso, solo las de `created_by = teacherId`.
  - Reutiliza la carga de miembros, uniones, bajas, ciclo y grados de `assignmentResultsApi`. Esa parte se extrae a una función compartida `loadTargetsContext(groupIds, createdAt)` en `assignmentResultsApi.ts`, sin cambiar su comportamiento.
  - También lee los intentos (primer completado) y `lec_reading_pdas`.
- `fetchSettings()`, `saveSettings({ school_name, cct })` y `saveTerms(cycle, terms)`, en `src/lib/settingsApi.ts`.

**PdaPanel:**
- Controles:
  - Grupo: los grupos activos del docente.
  - Periodo: "Todo el ciclo", cada trimestre configurado o "Rango…" con dos fechas.
  - Grado: solo si hay más de uno.
  - El interruptor "Ver las de todo el equipo".
- Si `grades` está vacío: "Ponles grado en Estudiantes para ver su avance" (y "{N} sin grado").
- Por campo formativo, en el orden de `CAMPOS`, una tarjeta por disciplina con "N de M PDA abordados". Abordado incluye logro. Es una lista plegable de los PDA con:
  - código y texto;
  - una etiqueta de estado con texto y color: logro verde, abordado azul, en curso ámbar y sin trabajar gris;
  - al abrir, la evidencia: lectura, fecha, "completaron N de M" y comprensión.
- Botón "⬇ Concentrado del Programa Sintético", que abre las opciones de la Tarea 6.

**Settings:**
- Campos "Nombre de la escuela" y "CCT", con el botón "Guardar".
- Debajo, "Trimestres del ciclo {ciclo}": filas de nombre, inicio y fin, "+ Agregar trimestre" y "Guardar trimestres". Se valida que inicio ≤ fin y que estén dentro del ciclo.
- El texto de ayuda aclara que estos datos se usan en el encabezado del Concentrado y en los periodos del panel.

- [ ] **Step 1:** Implementar. **Antes** de extraer `loadTargetsContext`, correr `npm test` para tener la línea base; después, las pruebas de `assignmentResults` y `assignmentTargets` deben seguir pasando.
- [ ] **Step 2:** `npm test && npx tsc -b && npx eslint <archivos> && npm run build` → limpio.
- [ ] **Step 3: Commit**: `git commit -m "PDA: panel de cumplimiento por grupo y grado, y pantalla de Configuración"`.

---

### Task 6: Descarga del Concentrado (Excel y PDF)

**Files:** `src/lib/concentradoExport.ts`, `package.json` (dependencias) y `src/pages/teacher/PdaPanel.tsx` (opciones de descarga).

**Comportamiento:**
- El diálogo "Concentrado del Programa Sintético" ofrece:
  - las disciplinas, con checkboxes que por defecto marcan todas las de Lenguajes, Saberes y Ética, y dejan sin marcar Educación física, Educación socioemocional y Tecnología;
  - los grados presentes;
  - los botones "Descargar Excel" y "Descargar PDF".
- **Excel**, con una hoja por grado llamada `1° grado`, etc.:
  - Filas 1 a 4, el encabezado: escuela, CCT, ciclo, grupo, grado, docente y periodo. Si faltan escuela o CCT, en la celda va "(Configura escuela y CCT)".
  - Fila 6 en adelante, la tabla con las columnas: Campo formativo · Disciplina · Contenido · Código PDA · PDA · Estado · Lecturas (fechas) · Completaron · Comprensión promedio.
  - Anchos de columna razonables, con ajuste de texto en "PDA" y "Contenido".
- **PDF:** horizontal, tamaño carta, una sección por grado con el mismo encabezado y una tabla `autoTable`. Las filas se agrupan visualmente por campo → disciplina con filas de título.
- Las librerías se cargan con `await import('xlsx')` y `await import('jspdf')` / `await import('jspdf-autotable')`. El bundle principal no debe crecer más de 5 KB; se verifica comparando la salida de `npm run build`.

- [ ] **Step 1:** `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz jspdf@2.5.2 jspdf-autotable@3.8.4`.
- [ ] **Step 2:** Implementar `concentradoExport.ts` y el diálogo.
- [ ] **Step 3:** `npx tsc -b && npm test && npm run build` → limpio. Anotar el tamaño del chunk principal antes y después.
- [ ] **Step 4: Commit y push**: `git commit -m "PDA: descarga del Concentrado en Excel y PDF"` y `git push -u origin fase-8-pda`.
- [ ] **Step 5: Verificación de Larisa en la preview**
  1. Configuración: captura escuela, CCT y por lo menos un trimestre.
  2. En una lectura agrega 3 PDA de dos disciplinas distintas, uno de ellos sin grado.
  3. Asigna esa lectura a PRUEBA: aparece el aviso si el grado de `estudiante_prueba` no tiene PDA.
  4. En PDA, el panel muestra los estados.
  5. El Excel y el PDF se descargan, con su encabezado y "pendiente por trabajar" en los PDA no trabajados.
- [ ] **Step 6: Cierre.** Revisión final, OK de Larisa, merge a `main` y memoria.
