// Cuenta administradora de LectorNKT y reglas de "Pasar de grado".
// La base de datos aplica las mismas reglas (supabase/migrations/2026-11-10_admin_grados.sql);
// aquí solo se usan para mostrar u ocultar botones.

export const ADMIN_EMAIL = 'sistemas@nikolatesla.edu.mx'

/** Solo esta cuenta asigna grados, da de baja, borra estudiantes y pasa de grado. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === ADMIN_EMAIL
}

/** Días antes del fin del ciclo en que se habilita "Pasar de grado" (31-jul → 15-jun). */
export const PROMOTE_DAYS_BEFORE_END = 46

export function promoteAvailableFrom(cycleEndsOn: string): string {
  const [y, m, d] = cycleEndsOn.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - PROMOTE_DAYS_BEFORE_END)).toISOString().slice(0, 10)
}

export function canPromoteOn(today: string, cycleEndsOn: string): boolean {
  return today >= promoteAvailableFrom(cycleEndsOn)
}

export function nextCycle(cycle: string): string {
  const m = cycle.match(/^(\d{4})-(\d{4})$/)
  return m ? `${Number(m[1]) + 1}-${Number(m[2]) + 1}` : cycle
}
