/**
 * Spanish display-label helpers for domain enum values.
 * Maps wire-format values to Spanish labels without mutating domain contracts.
 *
 * All get* functions return the raw value as fallback when the input is not
 * a known enum value — this prevents UI breakage from unexpected API values.
 */

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  review: 'Revisión',
  approved: 'Aprobado',
  published: 'Publicado',
  archived: 'Archivado',
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
