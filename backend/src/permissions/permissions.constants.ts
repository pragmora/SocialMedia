/**
 * Permisos por acción.
 *
 * Modelo "combinado":
 *  - Cada rol (admin/cm/viewer) define un set de acciones por defecto por módulo.
 *  - El administrador puede sobreescribir por usuario mediante la tabla
 *    workspace_module_permissions (solo se guardan filas que difieren del preset).
 */

export const MODULES = [
  'dashboard',
  'calendar',
  'content',
  'projects',
  'tasks',
  'clients',
  'members',
  'finances',
] as const;

export const ACTIONS = ['view', 'create', 'update', 'delete'] as const;

export type ActionMatrix = Record<string, Record<string, boolean>>;

export interface PermissionOverride {
  module_key: string;
  action: string;
  enabled: boolean;
}

function makeMatrix(
  perms: Record<string, Partial<Record<string, boolean>>>,
): ActionMatrix {
  const matrix: ActionMatrix = {};
  for (const mod of MODULES) {
    matrix[mod] = {};
    for (const action of ACTIONS) {
      matrix[mod][action] = perms[mod]?.[action] ?? false;
    }
  }
  return matrix;
}

export function allPermissions(): ActionMatrix {
  const matrix: ActionMatrix = {};
  for (const mod of MODULES) {
    matrix[mod] = {};
    for (const action of ACTIONS) {
      matrix[mod][action] = true;
    }
  }
  return matrix;
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
};

export function getRolePreset(role?: string): ActionMatrix {
  return ROLE_PRESETS[role ?? 'viewer'] ?? ROLE_PRESETS.viewer;
}

export function matrixFromRows(rows: PermissionOverride[]): ActionMatrix {
  const matrix = makeMatrix({});
  for (const row of rows) {
    if (matrix[row.module_key]) {
      matrix[row.module_key][row.action] = row.enabled;
    }
  }
  return matrix;
}

export function applyOverrides(
  base: ActionMatrix,
  overrides: PermissionOverride[],
): ActionMatrix {
  const result: ActionMatrix = {};
  for (const mod of MODULES) {
    result[mod] = { ...(base[mod] ?? {}) };
  }
  for (const o of overrides) {
    if (result[o.module_key] && o.action in result[o.module_key]) {
      result[o.module_key][o.action] = o.enabled;
    }
  }
  return result;
}

export function matrixModules(matrix: ActionMatrix): string[] {
  return MODULES.filter((mod) =>
    ACTIONS.some((action) => matrix[mod]?.[action]),
  );
}

export function matrixPermissions(
  matrix: ActionMatrix,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const mod of MODULES) {
    const actions = ACTIONS.filter((action) => matrix[mod]?.[action]);
    if (actions.length > 0) out[mod] = actions;
  }
  return out;
}

export function matrixDiffOverrides(
  preset: ActionMatrix,
  desired: ActionMatrix,
): PermissionOverride[] {
  const rows: PermissionOverride[] = [];
  for (const mod of MODULES) {
    for (const action of ACTIONS) {
      const presetValue = preset[mod]?.[action] ?? false;
      const desiredValue = desired[mod]?.[action] ?? false;
      if (presetValue !== desiredValue) {
        rows.push({ module_key: mod, action, enabled: desiredValue });
      }
    }
  }
  return rows;
}
