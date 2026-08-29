// ── Filter Constants ───────────────────────────────────────────────
export const STATUS_OPTIONS = ['all', 'pre_produccion', 'en_espera', 'en_edicion', 'validacion', 'listo_para_subir', 'subido', 'archivado'] as const
export const PLATFORM_OPTIONS = ['all', 'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other'] as const

// ── Query Builder ───────────────────────────────────────────────────
export function buildCalendarQuery(params: {
  month?: string
  year?: string
  status?: string
  platform?: string
  project_id?: string
  client_id?: string
  assignee_id?: string
}): string {
  const parts: string[] = []
  if (params.year) {
    parts.push(`year=${params.year}`)
  } else if (params.month) {
    parts.push(`month=${params.month}`)
  }
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
  if (params.assignee_id) {
    parts.push(`assignee_id=${params.assignee_id}`)
  }
  return `/calendar?${parts.join('&')}`
}
