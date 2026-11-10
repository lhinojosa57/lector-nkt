// Parser del catálogo oficial de PDA (Fase 6), transcrito por Larisa en
// NKT-CS/raw/Catalogo-de-PDAs.md. Campo y disciplina salen del código, no de
// los encabezados (que tienen niveles inconsistentes).

const DISCIPLINAS = {
  'L.E': ['Lenguajes', 'Español'],
  'L.I': ['Lenguajes', 'Inglés'],
  'L.A': ['Lenguajes', 'Artes'],
  'S.M': ['Saberes y pensamiento científico', 'Matemáticas'],
  'S.B': ['Saberes y pensamiento científico', 'Biología'],
  'S.F': ['Saberes y pensamiento científico', 'Física'],
  'S.Q': ['Saberes y pensamiento científico', 'Química'],
  'E.G': ['Ética, naturaleza y sociedades', 'Geografía'],
  'E.H': ['Ética, naturaleza y sociedades', 'Historia'],
  'E.FCYE': ['Ética, naturaleza y sociedades', 'Formación Cívica y Ética'],
  'H.TEC': ['De lo humano y lo comunitario', 'Tecnología'],
  'H.ESE': ['De lo humano y lo comunitario', 'Educación socioemocional'],
  'H.EF': ['De lo humano y lo comunitario', 'Educación física'],
}

// Sufijos de una o dos letras minúsculas (Historia llega hasta aa, ab…).
const SEG = /^(?:[A-Z]{1,4}|[a-zñ]{1,2}|C\d+|G[1-3])$/
const isLetterSuffix = s => /^[a-zñ]{1,2}$/.test(s)
// Dos renglones pegados en la transcripción: "…tendencias.E.H.C4.a.G2. …"
const GLUED = /(?<=\.)(?=[LSEH]\.[A-Z]{1,5}\.(?:[a-zñ]{1,2}\.)?C\d+)/

/** Errata conocida (línea 226): el PDA de números negativos es del contenido C2. */
function fixErrata(code, text) {
  if (code === 'S.M.C1.G1' && text.startsWith('Reconoce la necesidad de los números negativos')) return 'S.M.C2.G1'
  return code
}

function splitCode(line) {
  const token = line.split(/\s/)[0]
  const parts = token.split('.')
  const segs = []
  for (const p of parts) {
    if (!SEG.test(p)) break
    segs.push(p)
  }
  const prefix = segs.join('.')
  const text = line.slice(prefix.length).replace(/^[.\s]+/, '').trim()
  return { segs, text }
}

function contenidoCode(segs) {
  const out = []
  for (const s of segs) {
    if (isLetterSuffix(s)) continue
    out.push(s)
    if (/^C\d+$/.test(s)) break
  }
  return out.join('.')
}

/**
 * @param {string} text
 * @returns {{ pdas: {code:string,campo:string,disciplina:string,contenido_code:string,contenido_text:string|null,grade:1|2|3|null,text:string,line:number,position:number}[], contenidos: Map<string,string>, warnings: string[] }}
 */
export function parsePdaCatalog(text) {
  const contenidos = new Map()
  const pdas = []
  const warnings = []
  const seen = new Set()
  const lines = text.split(/\r?\n/)

  lines.forEach((rawLine, idx) => rawLine.split(GLUED).forEach(raw => {
    const lineNo = idx + 1
    const line = raw.trim()
    if (!line || line.startsWith('#') || /^C\. Contenidos/.test(line) || /^G[1-3]\.\s/.test(line)) return

    let { segs, text: body } = splitCode(line)
    if (!segs.some(s => /^C\d+$/.test(s))) {
      if (segs.length >= 3) warnings.push(`Línea ${lineNo}: código sin contenido (${line.slice(0, 40)})`)
      return
    }
    const key = segs[0] + '.' + segs[1]
    const cd = DISCIPLINAS[key]
    if (!cd) {
      warnings.push(`Línea ${lineNo}: prefijo desconocido ${key}`)
      return
    }
    let code = segs.join('.')
    const gradeSeg = segs.find(s => /^G[1-3]$/.test(s))
    const cc = contenidoCode(segs)

    if (!gradeSeg) {
      // Contenido, salvo que repita un contenido ya visto con texto distinto: PDA sin grado.
      const prev = contenidos.get(cc)
      if (prev === undefined) {
        contenidos.set(cc, body)
        return
      }
      if (prev.replace(/\.$/, '') === body.replace(/\.$/, '')) return
    }

    code = fixErrata(code, body)
    const fixedSegs = code.split('.')
    const contenido_code = contenidoCode(fixedSegs)
    const grade = gradeSeg ? Number(gradeSeg.slice(1)) : null
    const dedup = `${code}|${grade}|${body}`
    if (seen.has(dedup)) return
    seen.add(dedup)
    pdas.push({
      code,
      campo: cd[0],
      disciplina: cd[1],
      contenido_code,
      contenido_text: contenidos.get(contenido_code) ?? null,
      grade,
      text: body,
      line: lineNo,
      position: pdas.length + 1,
    })
  }))

  return { pdas, contenidos, warnings }
}
