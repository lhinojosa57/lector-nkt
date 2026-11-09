# LectorNKT — Biblioteca con portadas y estantes, subida automática de nivel, grados por ciclo y PDA

Fecha: 2026-11-09 · Autora del diseño: Larisa Hinojosa (con Claude) · Estado: borrador para aprobación

Bocetos de referencia (no son la app final): `.superpowers/brainstorm/966-1794257735/content/`
- `estantes-estudiante-v5.html`: biblioteca del estudiante.
- `biblioteca-docente-v2.html`: biblioteca del docente.
- `detalle-asignacion-anterior.html`: "cómo les fue".

Contexto previo: `docs/2026-11-04-diseno-lectornkt-2.md`, que contiene las decisiones de las Fases 0-4.

---

## 1. Intención y por qué

LectorNKT ya funciona para asignar y leer, pero la biblioteca es una lista de texto. Queremos que se sienta como un **librero**: portadas como en Amazon o Goodreads, y estantes que inviten a leer. También queremos que el estudiante vea **su propio avance** y sepa **qué le falta para subir de nivel**.

Del lado docente, los PDA (Procesos de Desarrollo de Aprendizaje, Fase 6 de la SEP) sirven como **guía de cumplimiento de programas**. El docente ve qué PDA, de qué disciplinas y campos formativos, ha trabajado con las lecturas que asignó, y puede generar **reportes de cumplimiento para la autoridad educativa**. Una lectura de ciencias también trabaja PDA de Español, Inglés, Cívica y Ética o Tecnología.

Principio rector, decidido por Larisa en sesiones previas: **el PDA es una referencia aproximada, no una alineación dura, y el estudiante nunca ve códigos de PDA.** Al estudiante se le habla de aprender, no de cumplir.

## 2. Objetivos, no objetivos y anti-objetivos

**Objetivos**
1. Cada lectura tiene portada: la que sube el docente o una provisional que genera la app.
2. Biblioteca del estudiante en tres estantes (asignadas, entrenamiento libre, realizadas), con indicadores motivadores arriba.
3. Subida de nivel **automática** con una regla compuesta de desempeño y cumplimiento.
4. Biblioteca del docente en tres estantes (mis lecturas, disponibles, asignadas anteriormente) y detalle de "cómo les fue".
5. Grado de cada estudiante por ciclo escolar, configurado por el equipo, y bajas de estudiantes sin borrar datos.
6. PDA: catálogo Fase 6 en la app, etiquetado de lecturas, cálculo de contribución por grado (incluidos grupos multigrado), panel de cumplimiento y reporte descargable.

**No objetivos (por ahora)**
- Que la app genere las portadas con IA. El docente las genera en Gemini y las sube.
- Que la app sugiera los PDA de una lectura. Queda para la Fase 2b (generador con IA).
- Editor completo de lecturas (Fase 2a). Aquí solo se agrega el campo de portada y el de PDA donde corresponda. Si el editor ya existe al construir esto, ambos campos van incluidos desde el inicio.
- Rankings o comparaciones entre estudiantes.

**Anti-objetivos (sería un fracaso aunque "funcione")**
- Que el estudiante vea códigos de PDA o lenguaje de "cumplimiento".
- Que un estudiante suba de nivel con buenas calificaciones mientras deja asignadas sin hacer.
- Borrar a un estudiante de la tabla compartida `profiles`, que también usan EvalNKT y VideoNKT.
- Que un estudiante dado de baja baje los promedios o el cumplimiento del grupo.
- Que un estudiante tenga que decir su grado.

## 3. Restricciones

- **Supabase compartido** (`vioylqkituyzknwfpbhu`) con VideoNKT y EvalNKT. Las tablas nuevas llevan prefijo `lec_`. No se tocan tablas ajenas, salvo leer `profiles`, `reading_groups` y `reading_group_members`.
- **El SQL lo corre Larisa** en el SQL Editor de Supabase. Los archivos van en `supabase/migrations/AAAA-MM-DD_nombre.sql`, deben ser idempotentes (`if not exists`, `create or replace`) y traer una consulta de verificación al final.
- Solo hay dos roles (`teacher`, `student`) y solo cuentas `@nikolatesla.edu.mx` de Aprende NKT.
- **Sin costos nuevos:** nada de APIs de pago.
- Accesibilidad al nivel de lo ya hecho en las pantallas del estudiante: foco visible, contraste AA, navegación con teclado, `aria-*`. No afirmar "accesible" en ningún texto.
- Copy: español mexicano, sin "Bienvenido/a" ni diagonales de género; usar "lista(o)" como ya se hace.
- Despliegue: rama propia; previews en el alias fijo `lector-nkt-git-<rama>-sistemas-9143s-projects.vercel.app`. Si la rama usa Drive, ese origen se agrega en "Orígenes autorizados de JavaScript" del cliente OAuth `81o43…`. A `main` solo se une con el OK de Larisa.
- La rama `fase-3` todavía no está en `main`. Este trabajo parte de `fase-3`, o de `main` si Larisa ya la unió.

## 4. Lo que decidió Larisa (tal cual)

1. Portadas: **cada docente genera su portada en Gemini y la sube** al crear la lectura. La app ofrece un botón para **copiar un prompt base**. Si no hay portada, **la app genera una provisional**.
2. Colores por materia: Español azul; Inglés azul cielo; Historia café; Geografía crema; Biología, Física y Química verde, en tres tonos distintos; Matemáticas rojo; Formación Cívica y Ética naranja; Artes rosa; Tecnología morado.
3. Botón **"Subir portada"** en el detalle de las lecturas existentes, y el campo de portada desde el inicio en el editor futuro.
4. Biblioteca del estudiante con **tres estantes:**
   - Asignadas, de la más reciente a la más antigua por fecha de asignación, con los mismos detalles que ya muestra.
   - Entrenamiento libre, con **tres sugeridas**.
   - Realizadas, con los libros **de costilla**; al tocar la costilla se vuelve a ver la lectura.
5. Indicadores arriba a la derecha del encabezado "Mi biblioteca".
6. Subida de nivel **automática**, con **regla compuesta de desempeño y cumplimiento**. "No quiero que suban de nivel solo por hacer 3 en verde si dejan 10 pendientes." Larisa delegó la regla concreta y aprobó la de la sección 6.3.
7. Biblioteca del docente con **tres estantes:** mis lecturas, lecturas disponibles y asignadas anteriormente (estas de costilla).
8. Detalle de "cómo les fue" al tocar una asignación anterior: aprobado completo, tal como el boceto.
9. PDA: guía de cumplimiento para el docente. Una lectura puede contribuir a **PDA de varias disciplinas y campos formativos**. Sirven para **reportes de cumplimiento a la autoridad educativa**. Deben funcionar en **grupos multigrado**.
10. **Grado por estudiante, fijo durante el ciclo escolar**, configurado por el equipo al inicio. El estudiante nunca lo dice.
11. Poder **dar de baja** a estudiantes que ya no están en el colegio.

## 5. Decisiones de Claude (Larisa las vio en el chat; revisar al leer)

Se marcan con **[C]** en el resto del documento. Las principales:
- Portadas 2:3, sin recorte manual.
- Prompt "sin texto en la imagen" y "personas mexicanas".
- Gris para la materia "Otra".
- Indicadores motivadores: palabras leídas, mejora de fluidez y camino al siguiente nivel.
- Umbrales de la regla de nivel.
- Reglas de "abordado" (60%) y "con evidencia de logro" (75%).
- El nivel nunca baja automáticamente.
- Bajas sin borrado.
- Botón "Pasar de grado".
- Los filtros del docente aplican a los tres estantes.

---

## 6. Cómo funciona

### 6.1 Portadas

**Datos.** `lec_readings.cover_path text null` guarda la ruta del archivo en Supabase Storage. **[C]** Se usa un bucket `lec-covers` con lectura pública, porque las portadas no son sensibles; solo los docentes pueden subir, reemplazar o quitar.

**Subida** (detalle de la lectura y editor futuro):
- Botones **"⬆ Subir portada"** (o "Cambiar portada"), **"Quitar portada"** y **"📋 Copiar prompt para Gemini"**.
- Acepta JPG, PNG o WebP de hasta ~10 MB.
- **[C]** El navegador la reduce y convierte a WebP de 600×900 px, con un tamaño objetivo de 300 KB o menos, antes de subirla.
- Se muestra con proporción 2:3, recortada al centro (`object-fit: cover`). No hay recortador manual.
- Si alguien sube otra, reemplaza la anterior y se borra el archivo viejo.

**Prompt base [C]**, con el título y la materia ya puestos:
> Ilustración vertical (proporción 2:3) para la portada de una lectura escolar titulada «{título}», de {materia}. Estilo de portada de libro juvenil, colorida y atractiva para estudiantes de secundaria. Sin texto ni letras en la imagen. Si aparecen personas, que sean mexicanas.

Junto al botón se muestran los pasos en una línea: copia el prompt → pégalo en Gemini → descarga la imagen → "Subir portada".

**Portada provisional.** Es un componente que se dibuja en la app; no se guarda ninguna imagen. Lleva el color de la materia, la materia en versalitas arriba, el título en tipografía display abajo y un emoji o motivo grande semitransparente en la esquina, **[C]** uno por materia. Tiene un ligero sombreado de lomo a la izquierda.

**Colores de materia.** Son los de Larisa; los tonos exactos son **[C]** y deben dar contraste AA con el texto que llevan encima:

| Materia | Fondo | Texto |
|---|---|---|
| Español | #1e4fa3 | blanco |
| Inglés | #5fb3e6 | #0b2540 |
| Historia | #7a4a2a | blanco |
| Geografía | #e9dcb8 | #3d2e14 |
| Biología | #2f6b3a | blanco |
| Física | #8bb43a | #1f2a0a |
| Química | #1f9d74 | blanco (verificar AA; oscurecer si no pasa) |
| Matemáticas | #c62828 | blanco |
| Formación Cívica y Ética | #ef7d1a | verificar AA con blanco; si no pasa, texto oscuro |
| Artes | #e57aa8 | verificar AA con blanco; si no pasa, texto oscuro |
| Tecnología | #6a3fa0 | blanco |
| Otra **[C]** | #8a8f98 | verificar AA |

La tabla debe vivir en un solo lugar del código (por ejemplo en `src/lib/lec.ts`), junto a `SUBJECTS`.

**Costilla** (vista lateral): una franja vertical del color de la materia, con el título en texto vertical. **[C]** La altura varía un poco según la extensión de la lectura, solo por estética.

### 6.2 Biblioteca del estudiante

Reemplaza la vista actual de `StudentDashboard` y `StudentLibrary`; ver el boceto `estantes-estudiante-v5.html`. Las acciones que existen hoy (unirse a grupo, control "Aa", salir, avisos) se conservan.

**Encabezado "Mi biblioteca".**
- A la izquierda: la insignia de nivel (`LevelBadge`), el nombre y "Nivel N · Nombre". Si tiene nivel en dos idiomas, se muestran ambos, como hoy.
- A la derecha, tres indicadores **[C]**:
  1. **Lecturas leídas:** total de intentos completados (asignadas y libres), más "📖 N palabras ≈ un libro de P páginas". Las palabras son la suma del `word_count` de las versiones completadas, y se cuentan **250 palabras por página**.
  2. **Mejora de fluidez:** "+X ppm desde tu primera lectura en voz alta (A → B)", comparando la primera y la última revisión de fluidez del mismo idioma. Solo aparece con 2 o más revisiones; si no las hay, dice "Lee en voz alta para ver tu avance". Si la diferencia es negativa o cero, no se muestra un número negativo; se muestra solo "Tu última lectura: B ppm".
  3. **Camino al Nivel N+1:** dos barritas, una de comprensión y otra de cumplimiento, según la regla de la sección 6.3. En Nivel 5 dice "Llegaste al nivel más alto".
- No hay rankings ni comparación con compañeros.

**Estante 1 · 📌 Lecturas asignadas.**
- Asignaciones pendientes, ordenadas por **fecha de asignación**, de la más reciente a la más antigua.
- Junto al título del estante, una etiqueta "N por leer".
- Cada libro se muestra de frente: portada, título, materia, modo, "Entregar antes del …" (o "Sin fecha límite") y botón **Leer**.
- Si no hay pendientes, el estante muestra un mensaje amable.
- Las vencidas sin hacer siguen aquí, marcadas como vencidas.

**Estante 2 · 🌱 Entrenamiento libre.**
- **Tres** lecturas publicadas que tengan versión en el nivel actual del estudiante en ese idioma y que el estudiante no haya completado.
- **[C]** Si tiene nivel en español y en inglés, se mezclan, con al menos una de cada idioma cuando sea posible.
- **[C]** Cambian cuando termina una lectura. Mientras no termine ninguna, se mantienen estables en el día.
- Al final del estante, un enlace "Ver toda la biblioteca →" que abre la cuadrícula completa de lecturas de su nivel, con filtros por materia e idioma.

**Estante 3 · 📚 Lecturas realizadas.**
- Intentos completados, asignados y libres, como **costillas**, del más reciente al más antiguo, de izquierda a derecha **[C]**.
- Cada costilla lleva un **punto de semáforo** de comprensión (≥75 verde, 50-74 amarillo, <50 rojo, como el semáforo actual).
- Al pasar el mouse o con foco, la costilla se levanta un poco; se desactiva con `prefers-reduced-motion`.
- Al tocarla se abre una **ficha**: portada, título, materia, modo, fecha, comprensión con semáforo, fluidez y precisión si hubo revisión, comentario del docente y botón **"Volver a leer"**. "Volver a leer" abre la lectura en modo de entrenamiento libre y crea un intento nuevo, sin asignación. Esa ficha es la información que hoy muestra la lista de completadas.
- Si hay muchas, la fila se recorre de lado y se cargan por páginas.

**Accesibilidad.** Cada libro y cada costilla es un `button` con `aria-label` completo (título, materia y, en realizadas, la comprensión). Los estantes son `section` con encabezado. El texto vertical de las costillas no es la única forma de saber el título: la etiqueta y la ficha lo repiten. En el celular, cada estante se recorre de lado sin que la página se desborde.

### 6.3 Subida automática de nivel

**Requisito previo (decidido por Larisa):** solo se evalúa a quien **ya hizo su diagnóstico inicial** en ese idioma, es decir, quien tiene `is_provisional = false`. El diagnóstico es su prueba de ubicación de nivel. Mientras su nivel sea provisional, la tarjeta "Camino al siguiente nivel" dice "Haz tu diagnóstico para ubicar tu nivel" en lugar de las barritas.

Se evalúa **por idioma**. El estudiante sube de N a N+1 (máximo 5) cuando se cumplen **las tres** condiciones **[C]**:

1. **Comprensión.** En sus **últimos 5 intentos completados en su nivel actual** de ese idioma (asignados o libres; sin diagnósticos; un intento "en su nivel" es uno cuya versión tiene `level = nivel actual`), al menos **4 tienen 75% o más** y el **promedio es de 80% o más**. Si tiene menos de 5 intentos en su nivel, la condición no se cumple. Solo cuentan los intentos completados **después** de su último cambio de nivel o de su diagnóstico. **[C]** El porcentaje se **recalcula en el servidor** a partir de `lec_answers.is_correct` (que ya calcula la RPC `lec_answer`), sin confiar en `lec_attempts.comprehension_pct`, que escribe el navegador. Los intentos sin preguntas no cuentan para esta condición.
2. **Precisión en voz alta.** Entre esos 5 intentos, los que fueron en voz alta y ya tienen revisión de fluidez deben tener **precisión de 95% o más**. Los que no tienen revisión no bloquean. Las palabras por minuto **no** cuentan para subir; solo son indicador, como se decidió el 2026-11-04.
3. **Cumplimiento.** De sus asignaciones de ese idioma que **ya cuentan** (cerradas según la sección 6.8), completó **al menos el 80%**, y tiene **como máximo 1 vencida sin hacer**. Si no hay ninguna asignación que cuente, la condición se considera cumplida. Solo cuentan las asignaciones en las que el estudiante era destino (sección 6.8).

**Cuándo se evalúa:** al completar un intento y al guardar una revisión de fluidez. **[C]** Debe ser una función en la base de datos (`security definer`) que valide y escriba el cambio, para que el estudiante no pueda subirse de nivel desde el navegador.

**Al subir:**
- Se actualiza `lec_student_levels` (`is_provisional = false`) y se registra en `lec_level_changes`, con `reason = 'auto'` y la regla que se cumplió.
- El estudiante ve una **pantalla de felicitación** con su nueva insignia y lema la próxima vez que abra su biblioteca. Se muestra una sola vez.
- El docente ve "Subieron de nivel" en su panel.
- El conteo hacia el siguiente nivel empieza de cero, porque solo cuentan intentos del nivel nuevo.

**El nivel nunca baja automáticamente [C].** El docente puede cambiarlo a mano, y eso queda en `lec_level_changes` con `reason = 'docente'`.

Las barritas del encabezado (sección 6.2) muestran estas mismas cuentas:
- "3 de tus últimas 5 en verde · necesitas 4"
- "5 de 8 asignadas · necesitas 80%"

### 6.4 Biblioteca del docente

Reemplaza la lista de `Library.tsx`; ver el boceto `biblioteca-docente-v2.html`.

- **Filtros** (los de hoy: idioma, materia, nivel y estado) más un **buscador por título**. **[C]** Aplican a los tres estantes a la vez.
- **✍️ Mis lecturas:** las creadas por el docente, borradores incluidos (etiqueta "Borrador" sobre la portada), más el acceso "+ Nueva lectura". Si la Fase 2a no existe todavía, el acceso se oculta.
- **📚 Lecturas disponibles:** las publicadas por todo el equipo, sin las propias, de la más nueva a la más vieja. La fila se recorre de lado y termina en "Ver todas (N) →", que abre la cuadrícula completa con los mismos filtros. Los borradores de otros docentes no se ven.
- **🗂️ Asignadas anteriormente:** asignaciones **del docente** que ya **cerraron**, es decir, con fecha límite vencida o archivadas. Se muestran como costillas con el grupo o grupos debajo. Al tocar una se abre el detalle de la sección 6.5. Las asignaciones activas siguen en la pantalla **Asignaciones**, que ya existe.
- Cada libro de frente muestra la portada, el título, la materia, el idioma y cinco circulitos con los niveles que tienen versión (como hoy).

### 6.5 Detalle "cómo les fue" (asignación anterior)

Ver el boceto `detalle-asignacion-anterior.html`.

- **Encabezado:** portada, título, materia, nivel, modo y fechas (de asignación a fecha límite).
- **Pestañas por grupo destino,** más "Todos". En grupos multigrado hay además un **filtro por grado**.
- **Botones:**
  - "↻ Volver a asignar": abre `AssignModal` con la misma lectura y el mismo grupo.
  - "Asignar a otro grupo".
  - "⬇ Descargar resultados": CSV o Excel con la tabla de estudiantes.
- **Tres números:**
  - Completaron N de M, y cuántos sin hacer.
  - Comprensión promedio, con una barrita de semáforo (verdes, amarillos y rojos).
  - Fluidez mediana, precisión promedio y "N de M grabaciones revisadas", con un enlace a revisar las pendientes.
- **Preguntas que costaron más:** porcentaje de acierto por pregunta, de la más difícil a la más fácil, con su texto. Sale de `lec_answers`. **[C]** Sugerencia automática sin IA: si menos del 50% acertó, mostrar "💡 La pregunta N (tipo: {skill}) la acertó menos de la mitad del grupo: puede valer la pena comentarla en clase".
- **Tabla de estudiantes:** nombre, comprensión con semáforo, fluidez, precisión y "no la hizo". Se puede ordenar por cualquier columna; al tocar un nombre se abre su intento o su revisión de fluidez.
- **PDA trabajados** (ver la sección 6.7): lista de los PDA que esta asignación abordó, por grado, con su estado ("abordado" o "con evidencia de logro").
- Los estudiantes dados de baja no aparecen ni cuentan (ver la sección 6.6).

### 6.6 Grados por ciclo y bajas

**Datos [C]:**
- Tabla `lec_enrollments`: `student_id`, `cycle text` (por ejemplo `'2026-2027'`), `grade int null check (1-3)` (1° = 7°, 2° = 8°, 3° = 9°), `status text check ('activo', 'baja', 'egresado')`, `status_date`, `updated_by` y `updated_at`. Llave primaria: `(student_id, cycle)`.
- El ciclo actual se guarda en un solo lugar configurable, por ejemplo una tabla `lec_settings` o una constante.

**Quién y dónde.** Los docentes, en la pestaña **Estudiantes**:
- Columna **"Grado 2026-2027"**, editable por estudiante.
- Columna de estado.
- Botón **"Pegar lista"**: se pega `correo, grado` desde una hoja de cálculo o desde Classroom. Debe aceptar `1`, `1°`, `7`, `7°`, `primero`, etc. Al final muestra un resumen: cuántos se actualizaron y qué correos no se encontraron.
- La misma herramienta sirve para pegar una lista de **bajas**.

**El estudiante nunca elige su grado.** Si a alguien le falta, el docente ve el aviso "N estudiantes sin grado". El cálculo de PDA se hace al consultar, así que al ponerle grado **se suman también sus lecturas anteriores**.

**Bajas:**
- Botón **"Dar de baja"** por estudiante, o por lista.
- **No se borra nada de `profiles`.**
- Quien está de baja:
  - Desaparece de las listas, los grupos, los conteos, los porcentajes y el cumplimiento **desde su fecha de baja**.
  - Su historial anterior a la baja se conserva y cuenta en los reportes de ese periodo.
  - No puede usar LectorNKT: al entrar ve "Tu cuenta ya no está activa en LectorNKT; si es un error, avisa a tu docente".
- Filtro **"Ver dados de baja"** y botón **"Reactivar"**.

**Borrado definitivo,** solo si una familia lo pide:
- Botón aparte, con confirmación que explica qué se borra y que no se puede deshacer.
- Borra **solo las filas `lec_*`** de ese estudiante: intentos, respuestas, revisiones, niveles, cambios de nivel, consentimiento, apoyos, inscripciones y metas asignadas a él individualmente.
- No toca `profiles`, ni datos de EvalNKT o VideoNKT, ni las membresías de `reading_groups`.
- Los audios están en el Drive del estudiante; la app no puede borrarlos, porque el docente solo tiene lectura. El mensaje lo aclara: se borran al cierre del ciclo, como ya se había decidido.

**Cambio de ciclo [C].** Botón **"Pasar de grado"**: crea las filas del ciclo nuevo (1°→2°, 2°→3°, 3°→`egresado`). Los dados de baja no pasan. El equipo solo corrige excepciones.

**Grupos de un solo grado.** Ya existe `reading_groups.grado`. Como sugerencia, al configurar grados se puede ofrecer "poner el grado del grupo a todos sus miembros sin grado".

### 6.7 PDA

**Catálogo.**
- Fuente: `NKT/NKT-CS/raw/Catalogo-de-PDAs.md`, la transcripción fiel del DOF hecha por Larisa, cotejada contra la edición SEP 2024. Ruta absoluta: `C:\Users\laris\NKT\NKT-CS\raw\Catalogo-de-PDAs.md`.
- Se importa una vez a la tabla `lec_pda`, con: `code` (por ejemplo `L.E.C2.G2.b`), `campo` (campo formativo), `disciplina`, `contenido_code`, `contenido_text`, `grade` (1-3, sacado de `G1`, `G2`, `G3`) y `text`.
- El importador es un script del repo que genera el SQL. Debe:
  - Quitar duplicados exactos.
  - Corregir la errata conocida: la línea 226 dice `S.M.C1.G1` y debe ser `S.M.C2.G1`.
  - Tolerar los encabezados inconsistentes del archivo (por ejemplo, `# F. FÍSICA` está en nivel 1).
- **Campos formativos:** Lenguajes (Español, Inglés, Artes); Saberes y pensamiento científico (Matemáticas, Biología, Física, Química); Ética, naturaleza y sociedades (Geografía, Historia, Formación Cívica y Ética); De lo humano y lo comunitario (Tecnología, Educación socioemocional/Tutoría, Educación física).

**Etiquetado de lecturas.**
- Tabla `lec_reading_pdas (reading_id, pda_id)`. Una lectura puede tener PDA de **varias disciplinas, campos y grados**.
- Se edita en el detalle de la lectura, y en el editor cuando exista, con un selector que busca por texto y filtra por campo, disciplina y grado.
- Pueden editarlos el autor de la lectura y cualquier docente **[C]**, igual que hoy cualquier docente crea lecturas.
- **El estudiante nunca ve esta información.**

**Contribución (se calcula al consultar, no se guarda) [C].**
- Para cada **asignación cerrada** y cada **grado** presente entre sus estudiantes destino, se toman:
  - Los **estudiantes destino:** miembros activos de los grupos destino, más los asignados individualmente.
  - Su grado del ciclo correspondiente a la fecha de la asignación.
  - Quedan fuera los dados de baja antes de la fecha límite.
- Para ese grado G:
  - **Abordado:** completó la lectura al menos el **60%** de los estudiantes de grado G.
  - **Con evidencia de logro:** abordado, y además la **comprensión promedio** de los de grado G que la completaron es de **75% o más**.
  - Solo cuentan los PDA de la lectura con `grade = G`.
- Las asignaciones **activas** aparecen como "en curso" y no suman todavía.
- Si una lectura no tiene PDA para un grado presente en el grupo, `AssignModal` muestra el aviso: "Esta lectura no tiene PDA de 3°; tus estudiantes de 3° la leerán, pero no sumará a su cumplimiento".

**Panel de cumplimiento.** Es una pestaña nueva para el docente.
- Se elige grupo y ciclo; en multigrado, también grado.
- Muestra los PDA del grado agrupados por **campo formativo → disciplina**. **[C]** En lugar de un porcentaje global, cada disciplina dice "N de M PDA abordados", porque las lecturas no pueden cubrir, por ejemplo, Educación física.
- Cada PDA muestra su estado (sin trabajar, en curso, abordado, con evidencia de logro) y, al abrirlo, con qué lecturas y en qué fechas se trabajó.
- Por defecto se ven las asignaciones del propio docente; un interruptor permite ver **las de todo el equipo** para ese grupo.

**Reporte descargable: "Concentrado de avance del Programa Sintético" (decidido con Larisa).**

Es el reporte que piden las supervisiones, normalmente cada trimestre: qué PDA ya se abordaron y cuáles faltan. Está pensado para integrarse al **Programa Analítico** de la escuela.

- **Periodo:** trimestre o rango de fechas. Los trimestres son configurables y se cargan con el calendario de Aprende NKT Virtual.
- **Estructura igual al Programa Sintético:** campo formativo → disciplina → contenido → PDA, con código y texto oficial.
- **Estado por PDA en el periodo:** con evidencia de logro · abordado · en curso · **pendiente por trabajar**. Incluye todos los PDA del grado de las disciplinas elegidas, no solo los trabajados, para que se vea lo que falta.
- **Evidencia por PDA:** lecturas, fechas, estudiantes que completaron y comprensión promedio. Sirve como sustento para listas de cotejo y rúbricas.
- **Un bloque u hoja por grado;** en multigrado, hojas separadas.
- **Formatos:** **Excel** como principal, con una fila por PDA, editable, para copiar o combinar con proyectos que no son de LectorNKT. Además, **PDF** para imprimir. **[C]** Se generan en el navegador con librerías gratuitas.
- **Encabezado:** escuela, CCT, ciclo, grupo, grado, docente y periodo. Escuela y CCT salen de una configuración que se captura una vez, para que Larisa decida después si va el Colegio o la escuela sombrilla.

---

### 6.8 Reglas comunes: destinatarios, cierre y ciclos (respuestas a la revisión) [C]

- **Quién es destinatario de una asignación.** `reading_group_members` es compartida y no guarda fechas, así que se agrega `lec_group_joins (student_id, group_id, joined_at)`:
  - La app la escribe cuando un estudiante se une con código.
  - Al migrar, los miembros actuales reciben `joined_at = fecha de creación del grupo`.
  - Un estudiante es destinatario si se unió al grupo **el día de creación de la asignación o antes**, o si fue asignado individualmente.
  - Quien se une después **puede hacerla**. Si la completa, cuenta como completada, pero no cuenta como "no la hizo".
  - Los dados de baja antes de la fecha límite no son destinatarios.
- **Cierre de asignaciones sin fecha límite.** Tienen una fecha límite implícita: **7 días después de creadas**. Se usa en todo: cumplimiento, "asignadas anteriormente", "cómo les fue" y PDA.
- **Ciclos.** `lec_cycles (cycle, starts_on, ends_on, is_current)` con trimestres configurables. El grado que cuenta es el del ciclo que contiene la fecha de creación de la asignación.
  - **Si un estudiante no tiene fila de inscripción, se le trata como activo sin grado.** Nunca se bloquea a nadie por falta de fila.
- **Al publicar la versión, no hay subidas retroactivas en lote.** La regla se evalúa en el siguiente intento o revisión de cada estudiante, con el requisito previo del diagnóstico.

## 7. Lo que se deja a quien construya

- Diseño fino (tipografías y espaciados ya existentes), textura de madera de los estantes y animaciones.
- Paginación y orden fino dentro de cada estante.
- Nombres exactos de tablas, columnas, funciones y componentes, siempre con el prefijo `lec_` y en el estilo del repo.
- Cómo partir el trabajo en ramas y entregas. Orden sugerido: grados y bajas → portadas → estantes del estudiante → estantes y detalle del docente → subida de nivel → catálogo y etiquetado de PDA → panel y reporte.
- Las políticas RLS concretas, siguiendo el patrón actual (`is_teacher()` y "el estudiante solo ve lo suyo").
- **Importador de PDA [C]:**
  - `lec_pda` usa un `id` propio; `code` no es único, porque hay códigos repetidos con texto distinto, como `S.B.C5.G1` en las líneas 359 y 361.
  - En pantalla y en el reporte se muestran código y texto juntos.
  - Las líneas sin grado (por ejemplo `H.ESE.b.C3…`) se importan con `grade = null`, que significa "aplica a los tres grados".
  - Los duplicados exactos se descartan.

## 8. Preguntas abiertas

Ninguna que bloquee. Las resueltas tras la revisión:
- Formato del reporte: Excel y PDF, como "Concentrado de avance del Programa Sintético" (Larisa).
- Subir de nivel con nivel provisional: no, primero el diagnóstico inicial (Larisa).
- Membresía histórica, cierre sin fecha, ciclos, cálculo de comprensión en el servidor, no retroactividad e importador de PDA: decisiones [C] en las secciones 6.3, 6.8 y 7.

Pendientes que no bloquean el inicio: nombre y CCT del encabezado (se capturan en configuración) y fechas de los trimestres de Aprende NKT Virtual 2026-2027 (se capturan en `lec_cycles`).
