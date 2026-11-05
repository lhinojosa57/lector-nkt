/**
 * Subida de audios al Google Drive institucional del estudiante.
 *
 * - Permiso `drive.file`: la app solo ve los archivos que ella misma crea.
 * - Carpeta "LectorNKT" en el Drive del estudiante, compartida (solo lectura)
 *   con el grupo de docentes de Aprende NKT.
 * - Cliente OAuth "LectorNKT" del proyecto de Google Cloud (público Interno).
 */

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID ||
  '488991934580-81o43d0sjphp4qij1tmo92cm1h6ocb26.apps.googleusercontent.com'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FOLDER_NAME = 'LectorNKT'
const TEACHERS_GROUP = 'docentes-aprendenkt@nikolatesla.edu.mx'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}
interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string; login_hint?: string }) => void
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            hd?: string
            login_hint?: string
            callback: (r: TokenResponse) => void
            error_callback?: (e: { type: string; message?: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

let gisPromise: Promise<void> | null = null
let token: { value: string; expiresAt: number } | null = null

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = GIS_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => { gisPromise = null; reject(new Error('No se pudo cargar Google.')) }
      document.head.appendChild(s)
    })
  }
  return gisPromise
}

/** Precarga el script de Google para que el permiso abra al instante. */
export function preloadDrive() {
  void loadGis().catch(() => {})
}

export function hasDriveToken() {
  return !!token && token.expiresAt > Date.now() + 60_000
}

/**
 * Pide el permiso de Drive. Debe llamarse desde un clic del estudiante
 * (si no, el navegador bloquea la ventana de Google).
 */
export async function requestDriveAccess(email?: string): Promise<string> {
  if (hasDriveToken()) return token!.value
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      hd: 'nikolatesla.edu.mx',
      login_hint: email,
      callback: r => {
        if (r.error || !r.access_token) {
          reject(new Error(r.error_description || r.error || 'Permiso no concedido'))
          return
        }
        token = { value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 }
        resolve(r.access_token)
      },
      error_callback: e => reject(new Error(e.type === 'popup_closed' ? 'Cerraste la ventana de Google.' : e.message || e.type)),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

async function driveFetch(url: string, init: RequestInit = {}) {
  if (!token) throw new Error('Sin permiso de Drive')
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token.value}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Drive ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function getOrCreateFolder(): Promise<string> {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )
  const found = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`)
  if (found.files?.length) return found.files[0].id as string

  const folder = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  // Compartir la carpeta (solo lectura) con docentes; los audios heredan el permiso.
  await shareWithTeachers(folder.id).catch(() => {})
  return folder.id as string
}

async function shareWithTeachers(fileId: string) {
  try {
    await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false&fields=id`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'group', role: 'reader', emailAddress: TEACHERS_GROUP }),
      }
    )
  } catch (err) {
    console.error('No se pudo compartir con docentes', err)
    throw err
  }
}

/** Sube el audio; devuelve el id del archivo y si quedó compartido con docentes. */
export async function uploadAudio(blob: Blob, fileName: string): Promise<{ id: string; shared: boolean }> {
  const folderId = await getOrCreateFolder()
  const metadata = { name: fileName, parents: [folderId], mimeType: blob.type || 'audio/webm' }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', blob)
  const file = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', body: form }
  )
  // Además del permiso heredado de la carpeta, se comparte el archivo directamente.
  const shared = await shareWithTeachers(file.id).then(() => true, () => false)
  return { id: file.id as string, shared }
}

export function audioFileName(title: string, level: number, mimeType: string) {
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const safe = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 80)
  return `${date} — ${safe} (N${level}).${ext}`
}
