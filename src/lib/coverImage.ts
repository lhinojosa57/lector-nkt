/** Convierte la imagen elegida en una portada WebP de 600×900 (2:3), recortada al centro. */

const W = 600
const H = 900
const TARGET_BYTES = 300_000

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality))
}

export async function toCoverWebp(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('No pudimos leer la imagen. Prueba con otro archivo.')
  }

  // Rectángulo 2:3 más grande que cabe, centrado.
  const ratio = W / H
  let sw = bitmap.width
  let sh = bitmap.height
  if (sw / sh > ratio) sw = sh * ratio
  else sh = sw / ratio
  const sx = (bitmap.width - sw) / 2
  const sy = (bitmap.height - sh) / 2

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No pudimos leer la imagen. Prueba con otro archivo.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, W, H)
  bitmap.close()

  let best: Blob | null = null
  for (let q = 0.85; q >= 0.5 - 1e-9; q -= 0.1) {
    const blob = await toBlob(canvas, q)
    if (!blob) break
    best = blob
    if (blob.size <= TARGET_BYTES) break
  }
  if (!best || best.type !== 'image/webp') {
    throw new Error('Tu navegador no pudo convertir la imagen. Prueba con Chrome o Edge.')
  }
  return best
}
