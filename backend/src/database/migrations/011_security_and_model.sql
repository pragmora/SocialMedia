-- ============================================================================
-- 011_security_and_model.sql
-- Ejecutar en Supabase SQL Editor DESPUÉS de 010_add_spent_supplier.sql
--
-- Cambios:
--   1. users.is_superadmin (superadmin global, separado del rol por workspace)
--   2. get_user_modules: sin permisos configurados => NINGUNO (no TODOS)
--   3. Responsables múltiples N:N: project_assignees / content_assignees / task_assignees
--      + migración de assignee_id existente
--   4. tasks.project_id (la tarea como entidad central, filtrable por proyecto)
--   5. payments.project_id (los pagos respetan el filtro de proyecto en calendario)
-- ============================================================================

-- ============================================================================
-- FASE 1: Superadmin global
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- FASE 2: Corregir fallback de get_user_modules
-- Antes: sin permisos => todos los módulos (inseguro).
-- Ahora: sin permisos => ningún módulo. El backend otorga todos los módulos
-- a los admins del workspace y a los superadmins por separado.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_modules(
  p_workspace_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(module_key ORDER BY module_key),
    '[]'::jsonb
  )
  FROM workspace_module_permissions
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND enabled = true;
$$;

-- ============================================================================
-- FASE 3: Responsables múltiples (N:N)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_assignees (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS content_assignees (
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (content_item_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_assignees_user ON project_assignees (user_id);
CREATE INDEX IF NOT EXISTS idx_content_assignees_user ON content_assignees (user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees (user_id);

-- Migrar assignee_id existente a las tablas N:N
INSERT INTO project_assignees (project_id, user_id)
SELECT id, assignee_id FROM projects WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO content_assignees (content_item_id, user_id)
SELECT id, assignee_id FROM content_items WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO task_assignees (task_id, user_id)
SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS: el backend usa service role key; estas políticas quedan como red de seguridad
ALTER TABLE project_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY project_assignees_select ON project_assignees
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND public.is_member_of(p.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY project_assignees_insert ON project_assignees
    FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND public.can_assign(p.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY project_assignees_delete ON project_assignees
    FOR DELETE USING (EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_id AND public.can_assign(p.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY content_assignees_select ON content_assignees
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM content_items ci WHERE ci.id = content_item_id AND public.is_member_of(ci.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY content_assignees_insert ON content_assignees
    FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM content_items ci WHERE ci.id = content_item_id AND public.can_assign(ci.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY content_assignees_delete ON content_assignees
    FOR DELETE USING (EXISTS (
      SELECT 1 FROM content_items ci WHERE ci.id = content_item_id AND public.can_assign(ci.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY task_assignees_select ON task_assignees
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_id AND public.is_member_of(t.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY task_assignees_insert ON task_assignees
    FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_id AND public.can_assign(t.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY task_assignees_delete ON task_assignees
    FOR DELETE USING (EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_id AND public.can_assign(t.workspace_id)
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- FASE 4: tasks.project_id (tarea como entidad central)
-- ============================================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_project ON tasks (workspace_id, project_id);

-- ============================================================================
-- FASE 5: payments.project_id (pagos filtrables por proyecto en calendario)
-- ============================================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_workspace_project ON payments (workspace_id, project_id);

-- ============================================================================
-- DONE
-- ============================================================================
