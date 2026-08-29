/**
 * Spanish display-label helpers for domain enum values.
 * Maps wire-format values to Spanish labels without mutating domain contracts.
 *
 * All get* functions return the raw value as fallback when the input is not
 * a known enum value — this prevents UI breakage from unexpected API values.
 */

const STATUS_LABELS: Record<string, string> = {
  pre_produccion: 'Pre Producción',
  en_espera: 'En Espera',
  en_edicion: 'En Edición',
  validacion: 'Validación',
  listo_para_subir: 'Listo para Subir',
  subido: 'Subido',
  archivado: 'Archivado',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  other: 'Otro',
}

export function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: 'Publicación',
  story: 'Historia',
  reel: 'Reel',
  video: 'Video',
  carousel: 'Carrusel',
  other: 'Otro',
}

export function getContentTypeLabel(contentType: string): string {
  return CONTENT_TYPE_LABELS[contentType] ?? contentType
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  cm: 'Community Manager',
  editor: 'Editor',
  viewer: 'Observador',
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export const PAYMENT_METHODS = ['transferencia', 'efectivo', 'tarjeta', 'otro'] as const

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
}

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Cobrado',
}

/**
 * Estado de un movimiento financiero resuelto en contexto.
 *
 * El valor persistido `paid` es polisémico: significa Cobrado para un
 * ingreso (is_spent=false) y Pagado para un egreso (is_spent=true).
 * Los egresos se muestran siempre como Pagado —incluidos los registros
 * históricos con status='pending'— porque Pagado es el único estado
 * válido del dominio para un egreso.
 */
export function getMovementStatusLabel(status: string, isSpent: boolean): string {
  if (isSpent) return 'Pagado'
  return PAYMENT_STATUS_LABELS[status] ?? status
}
