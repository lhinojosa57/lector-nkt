// Genera supabase/migrations/2026-11-10_pda_datos.sql desde el catálogo oficial.
// Uso: npm run pda:sql  (o: node scripts/build-pda-sql.mjs [ruta-del-catalogo])
import { readFileSync, writeFileSync } from 'node:fs'
import { parsePdaCatalog } from './pdaParse.mjs'

const SRC = process.argv[2] ?? 'C:/Users/laris/NKT/NKT-CS/raw/Catalogo-de-PDAs.md'
const OUT = new URL('../supabase/migrations/2026-11-10_pda_datos.sql', import.meta.url)

const { pdas, warnings } = parsePdaCatalog(readFileSync(SRC, 'utf8'))
const q = v => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)

const counts = {}
for (const p of pdas) counts[p.disciplina] = (counts[p.disciplina] ?? 0) + 1

const values = pdas.map(p =>
  `  (${q(p.code)}, ${q(p.campo)}, ${q(p.disciplina)}, ${q(p.contenido_code)}, ${q(p.contenido_text)}, ${p.grade ?? 'null'}, ${q(p.text)}, ${p.position})`,
).join(',\n')

const sql = `-- =====================================================================
-- LectorNKT · Catálogo de PDA (Fase 6) — DATOS
-- Generado por scripts/build-pda-sql.mjs desde NKT-CS/raw/Catalogo-de-PDAs.md.
-- No editar a mano: corregir el catálogo y volver a generar.
--
-- Cómo aplicarla: PRIMERO corre 2026-11-10_pda_esquema.sql. Después pega todo
-- este archivo en el SQL Editor → Run. Se puede correr dos veces sin duplicar.
-- Ojo: si después se corrige el texto o el código de un PDA en el catálogo, la
-- fila vieja NO se actualiza sola (se agregaría una nueva): hay que corregirla a mano.
-- Total: ${pdas.length} PDA.
-- =====================================================================

insert into public.lec_pda (code, campo, disciplina, contenido_code, contenido_text, grade, text, position) values
${values}
on conflict (code, coalesce(grade, 0), md5(text)) do nothing;

-- ---------- Verificación ----------
-- Esperado: total = ${pdas.length}
${Object.entries(counts).map(([d, n]) => `--   ${d}: ${n}`).join('\n')}
select disciplina, count(*) as pda from public.lec_pda group by disciplina order by disciplina;
select count(*) as total from public.lec_pda;
`

writeFileSync(OUT, sql)
console.log(`PDA: ${pdas.length}`)
console.table(counts)
if (warnings.length) {
  console.warn('Avisos:')
  for (const w of warnings) console.warn(' - ' + w)
  process.exitCode = 1
}
