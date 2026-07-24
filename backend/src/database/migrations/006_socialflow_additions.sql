-- ============================================================================
-- 006_socialflow_additions.sql
-- Ejecutar en Supabase SQL Editor DESPUÉS del 000_clean_slate.sql
-- Agrega: estados actualizados, workspace_projects, permisos, finanzas, 
--         start_date/end_date en tasks
-- ============================================================================

-- ============================================================================
-- FASE 1: Actualizar enum de estados
-- ============================================================================

-- Eliminar el default viejo 'draft' antes de modificar el tipo
ALTER TABLE content_items ALTER COLUMN status DROP DEFAULT;

-- Recrear el enum con los 7 estados nuevos (CASCADE elimina el tipo viejo y sus dependencias)
DROP TYPE IF EXISTS content_status_enum CASCADE;
CREATE TYPE content_status_enum AS ENUM (
  'pre_produccion',
  'en_espera',
  'en_edicion',
  'validacion',
  'listo_para_subir',
  'subido',
  'archivado'
);

-- Recrear la columna status con el tipo nuevo y default correcto
ALTER TABLE content_items
  ADD COLUMN status content_status_enum NOT NULL DEFAULT 'pre_produccion';

-- Migrar datos existentes: 'draft' -> 'pre_produccion', 'review' -> 'en_espera', etc.
UPDATE content_items SET status = 'pre_produccion' WHERE status::text = 'draft';
UPDATE content_items SET status = 'en_espera' WHERE status::text = 'review';
UPDATE content_items SET status = 'en_edicion' WHERE status::text = 'approved';
UPDATE content_items SET status = 'subido' WHERE status::text = 'published';

-- ============================================================================
-- FASE 2: Tabla workspace_projects (muchos a muchos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_projects (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_projects_project ON workspace_projects (project_id);

-- Migrar datos existentes: cada project existente se asocia a su workspace_id actual
INSERT INTO workspace_projects (workspace_id, project_id)
SELECT workspace_id, id FROM projects WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FASE 3: Tabla workspace_module_permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_module_permissions (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_key   TEXT NOT NULL CHECK (module_key IN (
    'dashboard', 'calendar', 'content', 'projects', 'tasks', 'clients', 'members', 'finances'
  )),
  enabled      BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (workspace_id, user_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_wmp_workspace_user ON workspace_module_permissions (workspace_id, user_id);

-- ============================================================================
-- FASE 4: Tabla payments (finanzas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL,
  payment_date   DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'transferencia'
    CHECK (payment_method IN ('transferencia', 'efectivo', 'tarjeta', 'otro')),
  notes          TEXT NOT NULL DEFAULT '',
  created_by     UUID NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_workspace ON payments (workspace_id);
CREATE INDEX IF NOT EXISTS idx_payments_workspace_client ON payments (workspace_id, client_id);
CREATE INDEX IF NOT EXISTS idx_payments_workspace_date ON payments (workspace_id, payment_date);

-- ============================================================================
-- FASE 5: Migrar tasks: reemplazar due_date por start_date + end_date
-- ============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATE;

-- Migrar due_date existente a end_date (si due_date aún existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='due_date') THEN
    UPDATE tasks SET end_date = due_date WHERE due_date IS NOT NULL;
    ALTER TABLE tasks DROP COLUMN due_date;
  END IF;
END $$;

-- ============================================================================
-- FASE 6: RLS para las nuevas tablas
-- ============================================================================

ALTER TABLE workspace_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- workspace_projects policies
DO $$ BEGIN
  CREATE POLICY wp_select ON workspace_projects
    FOR SELECT USING (public.is_member_of(workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY wp_insert ON workspace_projects
    FOR INSERT WITH CHECK (public.get_my_role(workspace_id) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY wp_delete ON workspace_projects
    FOR DELETE USING (public.get_my_role(workspace_id) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- workspace_module_permissions policies
DO $$ BEGIN
  CREATE POLICY wmp_select ON workspace_module_permissions
    FOR SELECT USING (public.is_member_of(workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY wmp_insert ON workspace_module_permissions
    FOR INSERT WITH CHECK (public.get_my_role(workspace_id) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY wmp_update ON workspace_module_permissions
    FOR UPDATE USING (public.get_my_role(workspace_id) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY wmp_delete ON workspace_module_permissions
    FOR DELETE USING (public.get_my_role(workspace_id) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- payments policies
DO $$ BEGIN
  CREATE POLICY payments_select ON payments
    FOR SELECT USING (public.is_member_of(workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY payments_insert ON payments
    FOR INSERT WITH CHECK (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY payments_update ON payments
    FOR UPDATE USING (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY payments_delete ON payments
    FOR DELETE USING (public.is_member_of(workspace_id) AND public.get_my_role(workspace_id) = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FASE 7: Funciones helper para module permissions
-- ============================================================================

-- Obtener módulos habilitados para un usuario en un workspace
CREATE OR REPLACE FUNCTION public.get_user_modules(
  p_workspace_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(module_key ORDER BY module_key),
    -- Si no hay permisos configurados, devolver todos los módulos (fallback)
    '["dashboard","calendar","content","projects","tasks","clients","members","finances"]'::jsonb
  )
  FROM workspace_module_permissions
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND enabled = true;
$$;

-- ============================================================================
-- DONE
-- ============================================================================
