// ── Filter Constants ───────────────────────────────────────────────
export const STATUS_OPTIONS = ['all', 'pre_produccion', 'en_espera', 'en_edicion', 'validacion', 'listo_para_subir', 'subido', 'archivado'] as const
export const PLATFORM_OPTIONS = ['all', 'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other'] as const

// ── Query Builder ───────────────────────────────────────────────────
export function buildCalendarQuery(params: {
  month: string
  status?: string
  platform?: string
  project_id?: string
  client_id?: string
}): string {
  const parts: string[] = [`month=${params.month}`]
  if (params.status && params.status !== 'all') {
    parts.push(`status=${params.status}`)
  }
  if (params.platform && params.platform !== 'all') {
    parts.push(`platform=${params.platform}`)
  }
  if (params.project_id) {
    parts.push(`project_id=${params.project_id}`)
  }
  if (params.client_id) {
    parts.push(`client_id=${params.client_id}`)
  }
  return `/calendar?${parts.join('&')}`
}
