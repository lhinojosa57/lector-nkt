# Plan 2 · Portadas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada lectura tenga portada: la que sube el docente (generada en Gemini con un prompt que la app copia) o una provisional, dibujada con el color de su materia. Las portadas se ven en el detalle de la lectura y en las listas actuales de biblioteca, docente y estudiante.

**Architecture:**
- La columna `lec_readings.cover_path` apunta a un archivo en el bucket público `lec-covers` de Supabase Storage. Solo los docentes pueden escribir en él.
- El navegador recorta la imagen a 2:3 y la convierte a WebP de 600×900 antes de subirla.
- Un solo componente `ReadingCover` decide entre la imagen y la portada provisional. Lo reutilizan los planes 3 y 4 en los estantes.

**Tech Stack:** React 19, TypeScript, Tailwind 3, Supabase Storage y Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-biblioteca-estantes-pda-design.md`, sección 6.1 (y la 3).

## Global Constraints

- Prefijo `lec_` y SQL idempotente que corre Larisa. El archivo es `supabase/migrations/2026-11-09_portadas.sql` y termina con consultas de verificación.
- **Bucket `lec-covers`, de lectura pública.** Subir, reemplazar y borrar solo con `public.lec_is_teacher()`.
- **Formatos aceptados:** JPG, PNG o WebP de hasta 10 MB. Se guarda WebP de 600×900 px, con 300 KB o menos como objetivo, recortado al centro en proporción 2:3. No hay recortador manual.
- **Prompt para Gemini (texto exacto):** `Ilustración vertical (proporción 2:3) para la portada de una lectura escolar titulada «{título}», de {materia}. Estilo de portada de libro juvenil, colorida y atractiva para estudiantes de secundaria. Sin texto ni letras en la imagen. Si aparecen personas, que sean mexicanas.`
- **Pasos que se muestran junto al botón (texto exacto):** `Copia el prompt → pégalo en Gemini → descarga la imagen → "Subir portada".`
- **Colores de materia** (fondo de la tabla del spec). El texto que va encima debe tener contraste **≥ 4.5:1** (AA para texto pequeño). Si algún color no lo logra, se oscurece el fondo o se cambia el texto a oscuro. Física, Química y Biología deben quedar en tres verdes distinguibles. "Otra" es gris.
- Español mexicano, sin "Bienvenido/a" ni diagonales. Accesibilidad: la imagen lleva `alt` y la portada provisional `role="img"` con `aria-label`.
- Rama `fase-5-portadas`, creada desde `main`. Preview en `https://lector-nkt-git-fase-5-portadas-sistemas-9143s-projects.vercel.app`. A `main` solo con el OK de Larisa.
- **Fuera de este plan:** la costilla (plan 3), los estantes (planes 3 y 4) y el editor de lecturas (Fase 2a).

## Review Focus

1. **Foto del celular en formato HEIC, o de más de 10 MB:** se rechaza con un mensaje claro, sin subir nada. (Pruebas en la Tarea 1.)
2. **Imagen horizontal o cuadrada:** queda recortada al centro en 2:3, nunca estirada. (Verificación en la Tarea 3.)
3. **Cambiar la portada:** se ve la nueva de inmediato, sin la versión vieja en caché, y el archivo anterior se borra del bucket. (Tareas 2 y 3.)
4. **Lectura con una materia que no está en la lista** (por ejemplo "Ciencias"), o con un título muy largo: la portada provisional usa el estilo de "Otra" y el título se corta en líneas sin desbordarse. (Pruebas en la Tarea 1 y verificación en la Tarea 3.)
5. **El navegador no deja copiar al portapapeles:** el prompt se muestra seleccionado para copiarlo a mano. (Tarea 3.)

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/covers.ts` (nuevo) | Lógica pura: `SUBJECT_STYLES`, `subjectStyle`, `contrastRatio`, `coverPrompt`, `validateCoverFile`, `COVER_STEPS`. |
| `src/lib/covers.test.ts` (nuevo) | Pruebas de lo anterior, incluido el contraste AA de cada materia. |
| `src/lib/coverImage.ts` (nuevo) | `toCoverBlob(file)`: recorte 2:3 al centro y conversión a WebP en canvas. |
| `src/lib/coverApi.ts` (nuevo) | `coverUrl`, `uploadCover` y `removeCover` contra Storage y `lec_readings`. |
| `supabase/migrations/2026-11-09_portadas.sql` (nuevo) | Columna `cover_path`, bucket, políticas y verificación. |
| `src/components/ReadingCover.tsx` (nuevo) | Portada: imagen o provisional. |
| `src/components/CoverPanel.tsx` (nuevo) | En el detalle de la lectura: portada, "Subir/Cambiar portada", "Quitar portada" y "Copiar prompt para Gemini". |
| `src/lib/lec.ts` (modificar) | `LecReading.cover_path: string \| null`. |
| `src/pages/teacher/ReadingDetail.tsx` (modificar) | Monta `CoverPanel` en el encabezado. |
| `src/pages/teacher/Library.tsx` y `src/pages/student/StudentLibrary.tsx` (modificar) | Miniatura `ReadingCover` en cada fila. |

---

### Task 1: Estilos de materia, prompt y validación de archivo

**Files:**
- Create: `src/lib/covers.ts`
- Test: `src/lib/covers.test.ts`

**Interfaces:**
- Consumes: `SUBJECTS` de `src/lib/lec.ts`.
- Produces:
  - `interface SubjectStyle { bg: string; fg: string; motif: string }`, donde `motif` es un emoji.
  - `SUBJECT_STYLES: Record<string, SubjectStyle>`, con una entrada por cada valor de `SUBJECTS`, incluida `'Otra'`.
  - `subjectStyle(subject: string): SubjectStyle`, que devuelve el estilo de `'Otra'` si la materia no existe.
  - `contrastRatio(hexA: string, hexB: string): number`, calculado con la fórmula WCAG de luminancia relativa.
  - `coverPrompt(title: string, subject: string): string`
  - `COVER_STEPS: string`, con el texto exacto de las restricciones.
  - `COVER_ACCEPT = 'image/jpeg,image/png,image/webp'` y `COVER_MAX_BYTES = 10 * 1024 * 1024`.
  - `validateCoverFile(f: { type: string; size: number }): string | null`, que devuelve el mensaje de error o `null`.

- [ ] **Step 1: Crear la rama**

```bash
git checkout main && git pull && git checkout -b fase-5-portadas
```

- [ ] **Step 2: Escribir las pruebas que fallan**

```ts
// src/lib/covers.test.ts
import { describe, it, expect } from 'vitest'
import { SUBJECTS } from './lec'
import { SUBJECT_STYLES, subjectStyle, contrastRatio, coverPrompt, validateCoverFile, COVER_STEPS } from './covers'

describe('estilos de materia', () => {
  it('hay estilo para cada materia de SUBJECTS', () => {
    for (const s of SUBJECTS) expect(SUBJECT_STYLES[s], s).toBeDefined()
  })
  it.each(SUBJECTS)('%s: texto con contraste AA (≥ 4.5)', s => {
    const { bg, fg } = SUBJECT_STYLES[s]
    expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5)
  })
  it('Biología, Física y Química son tres verdes distintos', () => {
    const greens = ['Biología', 'Física', 'Química'].map(s => SUBJECT_STYLES[s].bg.toLowerCase())
    expect(new Set(greens).size).toBe(3)
  })
  it('materia desconocida usa el estilo de Otra', () => {
    expect(subjectStyle('Ciencias')).toEqual(SUBJECT_STYLES['Otra'])
  })
  it('contrastRatio: negro sobre blanco = 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })
})

describe('coverPrompt', () => {
  it('pone título y materia en el texto exacto', () => {
    expect(coverPrompt('El planeta que nos presta su casa', 'Español')).toBe(
      'Ilustración vertical (proporción 2:3) para la portada de una lectura escolar titulada «El planeta que nos presta su casa», de Español. Estilo de portada de libro juvenil, colorida y atractiva para estudiantes de secundaria. Sin texto ni letras en la imagen. Si aparecen personas, que sean mexicanas.'
    )
  })
  it('pasos exactos', () => {
    expect(COVER_STEPS).toBe('Copia el prompt → pégalo en Gemini → descarga la imagen → "Subir portada".')
  })
})

describe('validateCoverFile', () => {
  it('acepta jpg, png y webp de hasta 10 MB', () => {
    expect(validateCoverFile({ type: 'image/jpeg', size: 2_000_000 })).toBeNull()
    expect(validateCoverFile({ type: 'image/png', size: 10 * 1024 * 1024 })).toBeNull()
    expect(validateCoverFile({ type: 'image/webp', size: 1 })).toBeNull()
  })
  it('rechaza HEIC y otros formatos con mensaje claro', () => {
    expect(validateCoverFile({ type: 'image/heic', size: 1000 })).toMatch(/JPG, PNG o WebP/)
    expect(validateCoverFile({ type: 'application/pdf', size: 1000 })).toMatch(/JPG, PNG o WebP/)
  })
  it('rechaza más de 10 MB', () => {
    expect(validateCoverFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toMatch(/10 MB/)
  })
})
```

- [ ] **Step 3: Correr las pruebas y confirmar que fallan**

Run: `npm test -- src/lib/covers.test.ts`
Expected: FAIL, porque no existe `./covers`.

- [ ] **Step 4: Implementar `src/lib/covers.ts`**

- Los fondos parten de la tabla del spec (sección 6.1). Ajusta los que no pasen 4.5:1:
  - Química, Formación Cívica y Ética, Artes y Otra probablemente necesitan fondo más oscuro o texto oscuro.
  - Si se usa texto oscuro, debe ser un café o tinta de la paleta (por ejemplo `#2b2014`).
- Motivos (emoji):
  - Español 📖, Inglés 🗽, Historia 🏛️, Geografía 🗺️, Biología 🌿, Física 🧲, Química ⚗️;
  - Matemáticas 📐, Formación Cívica y Ética ⚖️, Artes 🎨, Tecnología 🤖, Otra 📚.
- Mensajes de error exactos:
  - Formato: `"Sube una imagen JPG, PNG o WebP. Si es una foto del celular en HEIC, primero guárdala como JPG."`
  - Tamaño: `"La imagen pesa más de 10 MB. Descárgala de Gemini en un tamaño menor."`

- [ ] **Step 5: Correr las pruebas y confirmar que pasan**

Run: `npm test`
Expected: PASS (todas, incluidas las 53 anteriores).

- [ ] **Step 6: Commit**

```bash
git add src/lib/covers.ts src/lib/covers.test.ts
git commit -m "Portadas: colores de materia con contraste AA, prompt para Gemini y validación de archivo"
```

---

### Task 2: SQL de portadas y capa de datos

**Files:**
- Create: `supabase/migrations/2026-11-09_portadas.sql`, `src/lib/coverImage.ts`, `src/lib/coverApi.ts`
- Modify: `src/lib/lec.ts` (en `interface LecReading`, agregar `cover_path: string | null`).

**Interfaces:**
- Produces:
  - SQL:
    - `alter table public.lec_readings add column if not exists cover_path text;`
    - Bucket `lec-covers`: `public = true`, `file_size_limit = 1048576` y `allowed_mime_types = '{image/webp}'`.
    - Políticas en `storage.objects` con `bucket_id = 'lec-covers'`: "lec covers docentes insert", "… update" y "… delete", todas con `public.lec_is_teacher()`. La lectura es pública porque el bucket lo es.
  - `toCoverBlob(file: File): Promise<Blob>` en `coverImage.ts`. Proceso:
    1. Carga la imagen con `createImageBitmap(file)`.
    2. Recorta al centro el rectángulo 2:3 más grande que quepa.
    3. Lo dibuja en un canvas de 600×900.
    4. Exporta con `canvas.toBlob(…, 'image/webp', q)`, empezando en `q = 0.85` y bajando de 0.1 en 0.1, hasta pesar ≤ 300 000 bytes o llegar a `q = 0.5`.

    Si `createImageBitmap` falla, lanza `Error('No pudimos leer la imagen. Prueba con otro archivo.')`.
  - En `coverApi.ts`:
    - `coverUrl(path: string | null): string | null`: con `supabase.storage.from('lec-covers').getPublicUrl(path)`.
    - `uploadCover(reading: { id: string; cover_path: string | null }, blob: Blob): Promise<string>`:
      1. Sube a `${reading.id}/${Date.now()}.webp`. Un nombre nuevo cada vez evita la caché.
      2. Actualiza `lec_readings.cover_path` y `updated_at`.
      3. Después borra el archivo anterior si existía. Si ese borrado falla, solo hace `console.error`.
      4. Devuelve el path nuevo.
    - `removeCover(reading: { id: string; cover_path: string | null }): Promise<void>`: pone `cover_path = null` y luego borra el archivo.

- [ ] **Step 1: Escribir el SQL**

Usa el encabezado de comentario de los otros archivos. Crea el bucket con:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lec-covers', 'lec-covers', true, 1048576, '{image/webp}')
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
```

Cierra con esta verificación:

```sql
-- Esperado: columna = 1; bucket_publico = true; politicas = 4
select
  (select count(*) from information_schema.columns where table_name = 'lec_readings' and column_name = 'cover_path') as columna,
  (select public from storage.buckets where id = 'lec-covers') as bucket_publico,
  (select count(*) from pg_policies where tablename = 'objects' and policyname like 'lec covers docentes%') as politicas;
```

- [ ] **Step 2: Implementar `coverImage.ts`, `coverApi.ts` y el campo en `lec.ts`** con las firmas de arriba.

- [ ] **Step 3: Verificar compilación y pruebas**

Run: `npx tsc -b && npx eslint src/lib/coverImage.ts src/lib/coverApi.ts src/lib/lec.ts && npm test`
Expected: sin errores; las pruebas pasan.

- [ ] **Step 4: Larisa corre el SQL**

Pedirle que corra `2026-11-09_portadas.sql` en el SQL Editor, dos veces.
Expected: `columna = 1`, `bucket_publico = true` y `politicas = 4` en ambas corridas, sin errores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/2026-11-09_portadas.sql src/lib/coverImage.ts src/lib/coverApi.ts src/lib/lec.ts
git commit -m "Portadas: bucket lec-covers, columna cover_path, conversión a WebP 2:3 y subida"
```

---

### Task 3: Componentes y pantallas

**Files:**
- Create: `src/components/ReadingCover.tsx`, `src/components/CoverPanel.tsx`
- Modify: `src/pages/teacher/ReadingDetail.tsx` (encabezado, líneas 89-118), `src/pages/teacher/Library.tsx` (fila de la lista, alrededor de la línea 106) y `src/pages/student/StudentLibrary.tsx` (fila, alrededor de la línea 96).

**Interfaces:**
- Consumes: `subjectStyle`, `coverPrompt`, `COVER_STEPS`, `COVER_ACCEPT` y `validateCoverFile` (Tarea 1); `toCoverBlob`, `coverUrl`, `uploadCover` y `removeCover` (Tarea 2).
- Produces (para los planes 3 y 4):
  - `ReadingCover({ title, subject, coverPath, size = 'md', className? }: { title: string; subject: string; coverPath: string | null; size?: 'sm' | 'md' | 'lg'; className?: string })`.
    - Tamaños: `sm` = 48 px de ancho, `md` = 140 px, `lg` = 180 px; siempre `aspect-[2/3]`.
    - **Con imagen:** `<img src={coverUrl(coverPath)} alt={`Portada de ${title}`} loading="lazy" className="object-cover …">`. Si la imagen no carga (`onError`), se cambia a la provisional.
    - **Provisional:** `div role="img" aria-label={`Portada de ${title}`}`, con el fondo y texto de `subjectStyle(subject)`, la materia en versalitas arriba, el título abajo en `font-display` con `line-clamp` (4 líneas en `md`/`lg`) y el emoji grande semitransparente en la esquina inferior derecha. En `sm` solo se ven el color y el emoji, sin texto.
    - Ambas llevan sombreado de lomo a la izquierda (`box-shadow: inset 6px 0 8px -4px rgba(0,0,0,.35)`) y esquinas `rounded-[3px_6px_6px_3px]`.
  - `CoverPanel({ reading, onChange }: { reading: LecReading; onChange: (coverPath: string | null) => void })`, donde `reading` incluye `cover_path`.

**Comportamiento de `CoverPanel`:**
- Muestra `ReadingCover` en tamaño `lg` y, a un lado, los botones:
  - **"⬆ Subir portada"**, o **"Cambiar portada"** si ya hay una. Abre un `<input type="file" accept={COVER_ACCEPT}>` oculto.
  - **"Quitar portada"**, solo si hay una. Pide confirmación con `window.confirm('¿Quitar la portada? Se mostrará la portada provisional.')`.
  - **"📋 Copiar prompt para Gemini"**.
- Debajo, una línea con `COVER_STEPS`. Si no hay imagen subida, una etiqueta "Portada provisional".
- **Al elegir un archivo:**
  1. Llama `validateCoverFile`. Si hay error, lo muestra en `role="alert"` y no sube nada.
  2. Si pasa, muestra "Subiendo portada…", llama `toCoverBlob`, luego `uploadCover`, y después `onChange(path)`.
  3. Si algo falla, muestra "No se pudo subir la portada. Inténtalo de nuevo."
- **Al copiar:** `navigator.clipboard.writeText(coverPrompt(title, subject))` y el aviso "Prompt copiado". Si falla, muestra el prompt en un `<textarea readOnly>` ya seleccionado (`select()` al montarse) con el texto "Cópialo con Ctrl+C".

- [ ] **Step 1: Implementar `ReadingCover.tsx` y `CoverPanel.tsx`.**

- [ ] **Step 2: Integrar en las pantallas**

- **`ReadingDetail.tsx`:** en el bloque del encabezado (`bg-parchment-50 … flex flex-wrap`), poner `CoverPanel` como primer hijo. `onChange` hace `setReading({ ...reading, cover_path })`.
- **`Library.tsx`** (docente) y **`StudentLibrary.tsx`:** al inicio de cada botón de fila, poner `<ReadingCover size="sm" title={r.title} subject={r.subject} coverPath={r.cover_path} />`. El botón queda `flex items-center gap-3`. Ambas consultas ya usan `select('*, …')`, así que `cover_path` llega sin cambiar la consulta.

- [ ] **Step 3: Verificar compilación, lint y pruebas**

Run: `npx tsc -b && npx eslint src/components/ReadingCover.tsx src/components/CoverPanel.tsx src/pages/teacher/ReadingDetail.tsx src/pages/teacher/Library.tsx src/pages/student/StudentLibrary.tsx && npm test`
Expected: sin errores nuevos (los archivos modificados pueden tener errores previos de `react-hooks`; comparar contra `git stash`). Las pruebas pasan.

- [ ] **Step 4: Verificación en el navegador (preview de la rama, cuenta docente, con el SQL ya corrido)**

1. Las 6 lecturas existentes muestran portada provisional azul (Español) en la Biblioteca y en el detalle, sin huecos.
2. "Copiar prompt": se pega en otro lugar con el título correcto.
3. Subir una imagen **horizontal** (por ejemplo una captura de pantalla): queda recortada al centro, sin estirarse. En Storage, el archivo pesa ≤ 300 KB y mide 600×900.
4. "Cambiar portada" con otra imagen: se ve la nueva de inmediato, y en Storage queda un solo archivo en la carpeta de esa lectura.
5. Intentar subir un PDF o un `.heic`: sale el mensaje y no sube nada.
6. "Quitar portada": vuelve la provisional y la carpeta queda vacía.
7. Con la cuenta `estudiante_prueba@`, la lista de Entrenamiento libre muestra las miniaturas.
8. En ancho de celular (375 px), el encabezado del detalle se acomoda en columna sin desbordarse.

- [ ] **Step 5: Commit**

```bash
git add src/components/ReadingCover.tsx src/components/CoverPanel.tsx src/pages/teacher/ReadingDetail.tsx src/pages/teacher/Library.tsx src/pages/student/StudentLibrary.tsx
git commit -m "Portadas: componente ReadingCover, panel para subir/cambiar/quitar y copiar prompt; miniaturas en bibliotecas"
```

- [ ] **Step 6: Cierre del plan.** Avisar a Larisa que la rama está lista para probar y pedir su OK para unir a `main`. Anotar en memoria y anunciar que lo siguiente es el plan 3 (estantes del estudiante y subida de nivel).
