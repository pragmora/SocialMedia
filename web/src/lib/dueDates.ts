/**
 * Lógica centralizada de vencimientos.
 * La fecha que determina el vencimiento es SIEMPRE la fecha de fin (fecha_final / end_date).
 * Comparación de fechas por componente (Y-M-D), segura ante zonas horarias: nunca se usa
 * toISOString()/toLocaleString() para derivar "hoy", porque pueden desplazar el día.
 */

/** Ventana de días para considerar un elemento "próximo a vencer". Debe coincidir con el backend (dashboard.service.ts). */
export const DUE_SOON_DAYS = 7

export type DueTone = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'none'

/** Fecha de hoy como YYYY-MM-DD en la zona horaria local del usuario. */
export function localTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Días (enteros) desde hoy hasta dateStr. null si no hay fecha. */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const parse = (s: string): number => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((parse(dateStr) - parse(localTodayStr())) / 86400000)
}

/**
 * Estado de vencimiento de un elemento.
 * - done: true → 'none' (completado no genera alerta).
 * - Sin fecha → 'none'.
 */
export function dueTone(dateStr: string | null | undefined, done?: boolean): DueTone {
  if (done) return 'none'
  const days = daysUntil(dateStr)
  if (days === null) return 'none'
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= DUE_SOON_DAYS) return 'soon'
  return 'none'
}

export interface DueToneStyle {
  /** Clave i18n de la etiqueta corta. */
  i18nKey: string
  /** Punto de color (clase tailwind). */
  dot: string
  /** Badge (clase tailwind). */
  badge: string
  /** Texto (clase tailwind). */
  text: string
}

export const DUE_TONE_STYLES: Record<Exclude<DueTone, 'none'>, DueToneStyle> = {
  overdue: { i18nKey: 'due.overdue', dot: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300', text: 'text-red-600 dark:text-red-400' },
  today: { i18nKey: 'due.today', dot: 'bg-orange-500', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300', text: 'text-orange-600 dark:text-orange-300' },
  tomorrow: { i18nKey: 'due.tomorrow', dot: 'bg-yellow-500', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300', text: 'text-yellow-700 dark:text-yellow-300' },
  soon: { i18nKey: 'due.soon', dot: 'bg-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300', text: 'text-amber-700 dark:text-amber-300' },
}

export const DUE_TONE_ORDER: Exclude<DueTone, 'none'>[] = ['overdue', 'today', 'tomorrow', 'soon']

function tonePriority(dateStr: string | null | undefined, done?: boolean): number {
  const tone = dueTone(dateStr, done)
  if (tone === 'none') return 99
  return DUE_TONE_ORDER.indexOf(tone)
}

/** Ordena vencimientos: vencidos → hoy → mañana → próximos, y por fecha de fin ascendente dentro del mismo nivel. */
export function sortByDuePriority<T extends { due_date: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pa = tonePriority(a.due_date)
    const pb = tonePriority(b.due_date)
    if (pa !== pb) return pa - pb
    return (a.due_date ?? '').localeCompare(b.due_date ?? '')
  })
}
