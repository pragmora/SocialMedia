import type { CurrentUser } from '@/context/MeContext'

export const MODULES = [
  'dashboard',
  'calendar',
  'content',
  'projects',
  'tasks',
  'clients',
  'members',
  'finances',
] as const

export const ACTIONS = ['view', 'create', 'update', 'delete'] as const

export type ActionMatrix = Record<string, Record<string, boolean>>

function makeMatrix(perms: Record<string, Partial<Record<string, boolean>>>): ActionMatrix {
  const matrix: ActionMatrix = {}
  for (const mod of MODULES) {
    matrix[mod] = {}
    for (const action of ACTIONS) {
      matrix[mod][action] = perms[mod]?.[action] ?? false
    }
  }
  return matrix
}

function allPermissions(): ActionMatrix {
  const matrix: ActionMatrix = {}
  for (const mod of MODULES) {
    matrix[mod] = {}
    for (const action of ACTIONS) {
      matrix[mod][action] = true
    }
  }
  return matrix
}

export const ROLE_PRESETS: Record<string, ActionMatrix> = {
  admin: allPermissions(),
  cm: makeMatrix({
    dashboard: { view: true },
    calendar: { view: true },
    content: { view: true, create: true, update: true, delete: true },
    projects: { view: true, create: true, update: true, delete: true },
    tasks: { view: true, create: true, update: true, delete: true },
    clients: { view: true, create: true, update: true, delete: true },
    members: { view: true },
    finances: { view: true, create: true, update: true },
  }),
  viewer: makeMatrix({
    dashboard: { view: true },
    calendar: { view: true },
    content: { view: true },
    projects: { view: true },
    tasks: { view: true },
    clients: { view: true },
    members: { view: true },
    finances: { view: true },
  }),
}

export function getRolePreset(role?: string): ActionMatrix {
  return ROLE_PRESETS[role ?? 'viewer'] ?? ROLE_PRESETS.viewer
}

export function applyOverrides(
  base: ActionMatrix,
  overrides: { module_key: string; action: string; enabled: boolean }[],
): ActionMatrix {
  const result: ActionMatrix = {}
  for (const mod of MODULES) {
    result[mod] = { ...(base[mod] ?? {}) }
  }
  for (const o of overrides) {
    if (result[o.module_key] && o.action in result[o.module_key]) {
      result[o.module_key][o.action] = o.enabled
    }
  }
  return result
}

export function matrixToRows(matrix: ActionMatrix): { module_key: string; action: string; enabled: boolean }[] {
  const rows: { module_key: string; action: string; enabled: boolean }[] = []
  for (const mod of MODULES) {
    for (const action of ACTIONS) {
      rows.push({ module_key: mod, action, enabled: matrix[mod]?.[action] ?? false })
    }
  }
  return rows
}

/**
 * ¿El usuario puede ejecutar una acción sobre un módulo?
 * Los admins y superadmins siempre pueden. Si no hay user (pantallas en
 * carga o tests aislados), o el user no trae `permissions` (respuestas
 * legacy/mocks), se asume que sí para no ocultar controles. El backend
 * es el que realmente enforcea los permisos.
 */
export function can(user: CurrentUser | null, module: string, action: string): boolean {
  if (!user) return true
  if (user.is_superadmin || user.role === 'admin') return true
  if (!user.permissions) return true
  return user.permissions[module]?.includes(action) ?? false
}
