# LectorNKT 2.0 — Documento de diseño

**Fecha:** 2026-11-04 · **Estado:** borrador para revisión de Larisa
**Repo:** `lector-nkt` · **Producción:** `lectornkt.vercel.app` · **Supabase:** `vioylqkituyzknwfpbhu` (compartido con VideoNKT y EvalNKT)

---

## 1. Propósito

Que los estudiantes de Aprende NKT **lean bien y comprendan lo que leen**, y que el docente pueda **ver y acompañar su proceso de lectura** con datos confiables, en cualquier materia y en español o inglés.

### Decisiones ya tomadas

| # | Decisión |
|---|---|
| 1 | Usuarios: **solo cuentas @nikolatesla.edu.mx de Aprende NKT** (docentes y estudiantes). No Hotmart. |
| 2 | La fluidez en voz alta **la califica el docente** escuchando el audio. La calificación automática (voz a texto) se probará después, comparándola contra calificaciones del docente. |
| 3 | El **nivel lo define la dificultad del texto**, no la velocidad. La velocidad es un indicador, no el criterio de ascenso. |
| 4 | Nada depende de fechas del calendario: el docente **asigna** lecturas y el estudiante también puede **entrenar libremente**. |

---

## 2. Qué se conserva y qué cambia

**Se conserva** (funciona en producción):
- Login Google @nikolatesla.edu.mx, roles docente/estudiante, rutas protegidas.
- Grupos con código de 6 caracteres, unirse desde el dashboard, ver miembros, archivar.
- La apertura "La Gran Historia del Lenguaje".
- Los 4 momentos de la sesión (calentamiento → lectura → preguntas → cierre con reflexión).
- Los nombres de nivel (Escriba, Cronista, Intelectual, Corresponsal, Humanista) y el estilo visual sepia/tinta.
- Protecciones de no copiar/pegar en preguntas y reflexión.

**Cambia** (problemas encontrados en el código actual):

| Hoy | Problema | En 2.0 |
|---|---|---|
| El WPM es el `word_count` del texto | No se mide nada: todos salen igual | Palabras correctas por minuto calificadas por el docente |
| El audio se graba pero **no se sube a ningún lado** | El docente no puede escucharlo | Se guarda en el Google Drive del estudiante, compartido con docentes |
| Las respuestas no se guardan una por una | No se puede analizar por habilidad | Cada respuesta se guarda con su habilidad |
| Texto del día = `week_number` + `day_of_week` en `school_calendar` (semanas 29-40 del ciclo pasado) | Hoy no hay sesión ningún día | Asignaciones + entrenamiento libre |
| Calentamientos de lectura rápida fijos por día de la semana | Evidencia débil y siempre el mismo contenido | Se quitan; queda vocabulario tomado de la lectura |
| Nivel por rango de WPM; "proyección +50% a fin de ciclo" | Proyección inventada | Nivel por precisión + comprensión; sin proyecciones |
| Archivos heredados de VideoNKT (`WatchVideo`, `CreateAssignment`, `TeacherReports`) | Ruido | Se eliminan |

---

## 3. Conceptos

- **Lectura:** un tema o pieza (ej. "Los volcanes de México"). Tiene idioma, materia, temática, tipo de texto, fuente y autor.
- **Versión:** la misma lectura escrita para un nivel (1 a 5). Una lectura puede tener de 1 a 5 versiones. Cada versión tiene su texto, sus preguntas, su vocabulario y su dato curioso.
- **Asignación:** el docente manda una lectura a un grupo (o a estudiantes específicos), con un **modo** y fecha límite opcional. Cada estudiante recibe la versión de su nivel (el docente puede forzar otra).
- **Intento:** cada vez que un estudiante hace una lectura (asignada o libre).
- **Revisión de fluidez:** la calificación que el docente hace del audio de un intento.

### Modos de lectura

| Modo | Qué hace el estudiante | Qué se mide | ¿Requiere revisión docente? |
|---|---|---|---|
| **Voz alta** | Graba 1 minuto leyendo en voz alta, luego lee completo y contesta | Palabras correctas/min, precisión, comprensión | Sí (escuchar y marcar) |
| **En silencio** | Lee con cronómetro visible, toca "terminé", contesta | Tiempo de lectura, comprensión | No |
| **Solo comprensión** | Lee sin cronómetro, contesta | Comprensión | No |

Voz alta es para el entrenamiento de fluidez (Español, Inglés). En silencio / solo comprensión sirve para Historia, Ciencias, etc., sin carga de revisión.

---

## 4. Niveles

### 4.1 Nivel de un texto

Se asigna al crear la versión. La app **sugiere** el nivel con un índice de legibilidad y el docente lo confirma o cambia.

- Español: índice **INFLESZ** (Barrio-Cantalejo et al., 2008).
- Inglés: **Flesch Reading Ease**.

Ambos van de 0 (muy difícil) a 100 (muy fácil). Tabla **provisional**, a calibrar con los primeros textos reales:

| Nivel | Nombre | Legibilidad sugerida | Extensión aprox. | Preguntas que incluye |
|---|---|---|---|---|
| 1 | Escriba | ≥ 70 | 150–250 palabras | Literal, idea principal |
| 2 | Cronista | 60–69 | 250–350 | + Inferencial |
| 3 | Intelectual | 50–59 | 350–500 | + Vocabulario en contexto |
| 4 | Corresponsal | 40–49 | 500–700 | + Estructura del texto |
| 5 | Humanista | < 40 | 700+ | + Crítica / valoración |

El índice solo mide largo de palabras y oraciones, no la dificultad de las ideas. Por eso el docente tiene la última palabra.

### 4.2 Nivel del estudiante

Se basa en los criterios clásicos de niveles de lectura (Betts): un texto está en el **nivel adecuado** del estudiante cuando lo lee con ~95% de precisión y ~75% de comprensión.

| Resultado en un intento | Interpretación |
|---|---|
| Precisión ≥ 98% y comprensión ≥ 90% | Fácil para él → candidato a subir |
| Precisión 95–97% y comprensión 75–89% | Nivel adecuado → seguir aquí |
| Precisión < 90% o comprensión < 50% | Frustración → candidato a bajar |

- **Subir/bajar no es automático.** La app **sugiere** el cambio cuando 3 intentos seguidos caen en "fácil" (o 2 en "frustración"), y el docente lo confirma con un clic.
- En modos sin audio solo cuenta la comprensión.
- La velocidad (palabras correctas/min) se muestra como tendencia, para que el estudiante vea su avance, pero no decide el nivel.

### 4.3 Diagnóstico

**Un diagnóstico común para 7°, 8° y 9°**, uno por idioma (español e inglés llevan niveles independientes).

Como en un mismo grado hay estudiantes que leen muy distinto, el diagnóstico es un **texto escalonado**: empieza en nivel 1 y cada párrafo sube un nivel, hasta el 5. Cada párrafo tiene 1 o 2 preguntas.
- **Voz alta (1 minuto):** el docente marca los errores como en cualquier revisión. La app calcula la precisión **por párrafo** y muestra en qué nivel empieza a caer (más de 5% de errores).
- **Comprensión:** se ve en qué párrafo empiezan las respuestas incorrectas.
- **Nivel propuesto** = el último nivel en que la precisión es de 95% o más y las preguntas están bien. El docente lo confirma.
- Quien no llega a leer todos los párrafos en el minuto termina la lectura en silencio para contestar las preguntas restantes.
- Mientras el docente no califica, el estudiante queda en **nivel 2 provisional** y ya puede leer.

---

## 5. Flujo del docente

### 5.1 Biblioteca
Lista de lecturas con filtros: idioma, materia, temática, nivel, autor, estado (borrador / publicada). Cada fila muestra qué niveles tiene versión (●●●○○).

### 5.2 Crear lectura
- **Fase 2a, manual:** formulario con título, idioma, materia, temática, tipo de texto, fuente. Luego, por versión: texto, preguntas (opción múltiple con explicación, marcando la habilidad), vocabulario y dato curioso. La app calcula conteo de palabras y legibilidad, y sugiere el nivel.
- **Fase 2b, con IA:** el docente da un tema o pega un texto propio o de dominio público, elige idioma, materia y niveles deseados. La IA propone las versiones con sus preguntas. **Todo queda en borrador hasta que el docente revisa, edita y publica.** Si el texto parte de una noticia, la IA redacta un texto original a partir de los hechos, no adapta el artículo completo. Los datos se verifican antes de publicar.

Las lecturas publicadas las ven todos los docentes de Aprende NKT, para que se acumule un banco común.

### 5.3 Asignar
Desde una lectura: botón "Asignar" → elegir grupo(s) o estudiantes, modo, fecha límite (opcional) y versión (automática por nivel o una fija para todos).

### 5.4 Revisar fluidez (modo voz alta)
Bandeja "Por revisar" con los intentos de voz alta pendientes. Al abrir uno:

1. Arriba, el reproductor del audio (1 minuto). Se puede pausar y regresar 5 segundos.
2. Abajo, el texto con cada palabra tocable.
3. El docente toca una palabra con error y queda marcada en rojo. Un segundo toque la quita.
4. Al final toca **la última palabra leída** y queda marcada en azul.
5. Opcional: un comentario y una calificación de expresividad de 1 a 4 (entonación, pausas, ritmo).
6. "Guardar". La app calcula:
   - **Palabras leídas** = posición de la última palabra
   - **Palabras correctas por minuto** = (leídas − errores) × 60 / segundos grabados
   - **Precisión** = (leídas − errores) / leídas

**Qué es error:** cambiar una palabra por otra, saltarla o quedarse más de 3 segundos sin leerla. **No es error:** repetir, corregirse solo o el acento regional. Esta guía aparece siempre en la pantalla de revisión, para que todos los docentes califiquen igual.

### 5.5 Panel de evaluación
- **Por grupo:** quién tiene asignaciones pendientes, quién no ha leído en 7 días, comprensión promedio por habilidad (qué habilidad está más débil en el grupo), distribución de niveles.
- **Por estudiante:** nivel actual e historial de cambios; tendencia de palabras correctas/min y precisión; comprensión por habilidad; lista de intentos con su audio, respuestas y reflexión; comentarios del docente.
- **Exportar** a Excel (por grupo).

---

## 6. Flujo del estudiante

**Dashboard:**
- **"Mis lecturas"**: asignaciones pendientes, con fecha límite si la hay, y completadas.
- **"Entrenamiento libre"**: biblioteca filtrada a su nivel (y uno abajo), elige por materia o tema.
- Su nivel, racha de días leyendo y gráfica de avance.

**Sesión:** los mismos 4 momentos de hoy, adaptados al modo:
1. **Vocabulario** (1–2 min), tomado de la lectura: palabras clave con definición y ejemplo. Sustituye a los calentamientos de lectura rápida, que se quitan.
2. **Lectura** según el modo (voz alta / en silencio / solo comprensión).
3. **Preguntas** con retroalimentación inmediata explicada.
4. **Cierre:** dato curioso + reflexión ("¿qué fue lo más interesante?"). En voz alta: "Tu maestra(o) escuchará tu lectura" en lugar de un número inmediato.

---

## 7. Modelo de datos

Hoy solo hay 1 diagnóstico y 6 textos cargados, así que conviene **tablas nuevas limpias** y migrar esos 6 textos. Las tablas viejas se dejan sin uso y se borran después de verificar. No se toca ninguna tabla de VideoNKT ni de EvalNKT.

| Tabla | Para qué | Campos clave |
|---|---|---|
| `lec_readings` | Lectura | id, title, language (`es`/`en`), subject, topic, text_type, source, created_by, status (`draft`/`published`), created_at |
| `lec_versions` | Versión por nivel | id, reading_id, level (1–5), body, word_count, readability, vocabulary (json), curiosity_fact |
| `lec_questions` | Preguntas | id, version_id, skill (`literal`/`inferencial`/`vocabulario`/`estructura`/`idea_principal`/`critica`), text, options (json), correct_option, explanation, position |
| `lec_assignments` | Asignación | id, reading_id, mode (`aloud`/`silent`/`comprehension`), fixed_level (nullable), due_date (nullable), created_by, created_at |
| `lec_assignment_targets` | A quién | assignment_id, group_id **o** student_id |
| `lec_attempts` | Intento | id, student_id, version_id, assignment_id (nullable = libre), mode, is_diagnostic, audio_path, audio_seconds, reading_seconds, comprehension_pct, reflection, started_at, completed_at |
| `lec_answers` | Respuestas | attempt_id, question_id, selected_option, is_correct |
| `lec_fluency_reviews` | Revisión docente | attempt_id, reviewer_id, words_read, error_positions (json), wcpm, accuracy_pct, expression (1–4), comment, reviewed_at |
| `lec_student_levels` | Nivel por idioma | student_id, language, level, is_provisional, updated_by, updated_at (+ historial en `lec_level_changes`) |

- **Grupos:** se reusan `reading_groups` y `reading_group_members`.
- **Audios en el Google Drive del estudiante** (no en Supabase): en `lec_attempts`, `audio_path` se sustituye por `drive_file_id`. Ver 7.1.
- `lec_consents`: student_id, guardian_name, relationship, accepted_at, consent_version (ver sección 8).

### 7.1 Audios en Google Drive

**Por qué:** sin costo de almacenamiento. Estimado: 1 minuto ≈ 0.5 MB; ~100 estudiantes × 1 lectura en voz alta por semana × 36 semanas ≈ 1.8 GB por ciclo, más de lo que da gratis el plan de Supabase. Además los archivos quedan dentro de Google Workspace del colegio, bajo sus políticas.

**Cómo funciona:**
1. Al terminar de grabar, la app pide permiso a Google (solo la primera vez) para **crear archivos en el Drive del estudiante**. Se usa el permiso `drive.file`, que solo deja a la app ver y modificar los archivos que ella misma crea, no el resto del Drive.
2. La app guarda el audio en una carpeta **"LectorNKT"** del Drive del estudiante: `2026-11-04 — Los volcanes (N2).webm`.
3. La app comparte el archivo **solo con lectura** con los docentes. Mejor si existe un grupo de Google de docentes de Aprende NKT; si no, con el docente que asignó la lectura.
4. En la pantalla de revisión, el docente escucha el audio **desde Drive, incrustado en la misma pantalla**, junto al texto. No tiene que abrir Drive aparte.

**Detalles a resolver al construir:**
- La app debe estar marcada como **interna** del dominio nikolatesla.edu.mx en Google Cloud, para no requerir verificación de Google. Hay que revisar en la consola de administración de Workspace que los estudiantes puedan autorizarla.
- **Borrado al cierre del ciclo:** con `drive.file` la app puede borrar los archivos que creó, siempre que el estudiante vuelva a entrar. Si no entra, se borran desde la consola de Workspace o el estudiante los borra él mismo. *(Detalle técnico a confirmar.)*
- Si el estudiante borra el archivo antes de la revisión, el intento aparece como "audio no disponible".

**Sustituye a Vocaroo**, que hoy usan en Español. Con LectorNKT el estudiante graba con el texto en pantalla, el audio llega solo al docente (no queda un enlace público) y la calificación queda registrada.
- **RLS:** el estudiante ve y escribe solo lo suyo; los docentes ven todo lo de Aprende NKT; las lecturas publicadas son visibles para todos los usuarios.
- **Se retiran:** `school_calendar`, `warmup_exercises`, el trigger `after_reading_session_complete` (recalculaba WPM falso) y el cálculo de nivel por WPM.

---

## 8. Privacidad

Se graba la voz de menores de edad. Antes de activar el modo voz alta se requiere el consentimiento de la familia.

**Aviso (contenido):** para qué se graba (que el docente escuche y acompañe su lectura), quién lo escucha (solo docentes de Aprende NKT), dónde se guarda (Drive institucional del estudiante), cuánto tiempo (se borra al cierre del ciclo escolar) y que se puede retirar el consentimiento en cualquier momento. Debe remitir al aviso de privacidad del colegio.

**Cómo llega, por dos vías:**
1. **Correo** al correo institucional del estudiante con el aviso, para que lo lea en casa con su familia.
2. **En la app:** la primera vez que el estudiante entra a un modo voz alta, aparece la pantalla de consentimiento. Mientras no se acepte, el estudiante puede usar los modos en silencio y solo comprensión, sin bloqueo.

**Datos que se piden en la pantalla:** nombre completo de la madre, padre o tutor; parentesco; casilla "Leí el aviso y acepto"; fecha (automática).
**Texto del aviso:** ver `docs/consentimiento-familias-2026-27.md`. El mismo consentimiento cubre los servicios adicionales de Google para menores de 18 (YouTube, Maps, My Maps, Arts & Culture, Traductor, Búsqueda y Asistente), que ya se confirmaron en la consola de administración el 2026-11-04. Se piden dos casillas separadas: servicios de Google y grabación de voz.

**No se pide la CURP** (decisión 2026-11-04): no es necesaria para un consentimiento informativo y el colegio ya la tiene por la inscripción oficial ante la SEP. *(Revisar el texto con el aviso de privacidad vigente del colegio.)*

- Los audios nunca tienen enlace público.
- **Retención:** se borran al cierre del ciclo escolar; se conservan solo las calificaciones.
- No se afirma accesibilidad en el copy (los materiales aún no son accesibles).

---

## 9. Fases

| Fase | Entregable | Listo cuando… |
|---|---|---|
| **0. Limpieza** | Commit del botón "← Panel docente", borrar archivos de VideoNKT, quitar proyección inventada, manejo de errores al guardar | El build pasa y producción se ve igual |
| **1. Base nueva** | Tablas `lec_*`, migración de los 6 textos, asignaciones, entrenamiento libre, 3 modos, consentimiento, subida de audio a Drive, respuestas guardadas | Un docente asigna una lectura a "Prueba" y el estudiante la completa en los 3 modos |
| **2a. Lecturas manuales** | Biblioteca + formulario de lectura/versiones/preguntas, legibilidad automática | Un docente crea una lectura de Historia en 3 niveles sin ayuda |
| **3. Revisión de fluidez** | Bandeja "Por revisar", pantalla de marcado, cálculo, diagnóstico con nivel propuesto | El docente califica 5 audios reales en < 2 min cada uno |
| **4. Panel de evaluación** | Vistas por grupo y estudiante, sugerencias de nivel, exportar a Excel | Se ve la habilidad más débil de un grupo |
| **2b. Generador con IA** | Propuesta de versiones + preguntas en borrador | Un docente genera, edita y publica una lectura en < 10 min |
| *Después* | Prueba de calificación automática vs. ~20 audios calificados; integración con Classroom (la función `classroom-sync` ya existe) | — |

La 2b va después de la 3 y la 4 a propósito: primero que medir y evaluar funcione con textos hechos a mano; luego acelerar la producción de textos.

---

## 10. Fuera de alcance (por ahora)
Hotmart / NKT 12·15, cuentas fuera de @nikolatesla.edu.mx, AmoxtliNKT (náhuatl), integración con NewsAPI, ejercicio RSVP, dashboard institucional anonimizado.

---

## 11. Decisiones de la revisión (2026-11-04)
1. **Calentamientos de lectura rápida** (campo visual, velocidad, movimiento ocular): **se quitan**. Queda solo el vocabulario de la lectura.
2. **Todos los docentes** de Aprende NKT pueden crear lecturas (2a manual, 2b con IA).
3. **Audios:** se guardan en el **Google Drive del estudiante** (7.1) y se borran al cierre del ciclo.
4. **Diagnóstico común** para los 3 grados (ver 4.3).
5. **Inglés entra desde el inicio**; el profe Javier califica la fluidez en inglés.
6. **Consentimiento:** por correo institucional + pantalla en la app (sección 8).

7. **Sin CURP** en el consentimiento.

### Pendientes
- **Crear el grupo de Google de docentes de Aprende NKT** (no existe todavía); los audios se comparten con ese grupo.
- **Confirmar la configuración de Google** (Larisa): en el código actual el login **no pide ningún permiso de Drive**; solo pide la cuenta. Hay que revisar en Google Cloud y en la consola de administración de Workspace que la app esté autorizada para estudiantes, incluidos los menores de 18.
- Redactar el texto del aviso de consentimiento.
