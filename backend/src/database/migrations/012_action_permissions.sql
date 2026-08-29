-- ============================================================================
-- 012_action_permissions.sql
-- Ejecutar en Supabase SQL Editor DESPUÉS de 011_security_and_model.sql
--
-- Cambios:
--   1. workspace_module_permissions pasa a manejar acciones (view/create/update/delete)
--      además del módulo. PK pasa a (workspace_id, user_id, module_key, action).
--   2. Migración: cada fila existente (módulo habilitado) se replica a las 4 acciones
--      con el mismo `enabled`, preservando el comportamiento previo.
--   3. get_user_modules deduplica módulos (una fila por módulo/acción).
-- ============================================================================

-- ============================================================================
-- FASE 1: Agregar columna action y nueva PK
-- ============================================================================

ALTER TABLE workspace_module_permissions
  DROP CONSTRAINT IF EXISTS workspace_module_permissions_pkey;

ALTER TABLE workspace_module_permissions
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'view'
    CHECK (action IN ('view', 'create', 'update', 'delete'));

-- Las filas existentes quedaron con action='view'; replicar a las demás acciones
INSERT INTO workspace_module_permissions (workspace_id, user_id, module_key, action, enabled)
SELECT workspace_id, user_id, module_key, a.action, enabled
FROM workspace_module_permissions,
     (VALUES ('create'), ('update'), ('delete')) AS a(action);

ALTER TABLE workspace_module_permissions
  ADD CONSTRAINT workspace_module_permissions_pkey
    PRIMARY KEY (workspace_id, user_id, module_key, action);

-- ============================================================================
-- FASE 2: get_user_modules con módulos únicos (una fila por módulo/acción)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_modules(
  p_workspace_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(DISTINCT module_key ORDER BY module_key),
    '[]'::jsonb
  )
  FROM workspace_module_permissions
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND enabled = true;
$$;

-- ============================================================================
-- DONE
-- ============================================================================
