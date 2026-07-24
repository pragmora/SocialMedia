-- ============================================================================
-- SOCIALFLOW - CLEAN SLATE MIGRATION
-- Ejecutar UNA VEZ en Supabase SQL Editor
-- Dropea todo y recrea desde cero
-- ============================================================================

-- ============================================================================
-- FASE 1: DROP todo (orden inverso de dependencias)
-- ============================================================================

-- Políticas
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    AND tablename IN ('projects','content_items','tasks','memberships','clients','comments','workspace_projects','workspace_module_permissions','payments')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Funciones helper
DROP FUNCTION IF EXISTS public.get_jwt_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_member_of(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_assign(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_assignee_membership(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_workspace_members(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.delete_comment(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_modules(uuid, uuid) CASCADE;

-- RLS
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS content_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_module_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;

-- Tablas (orden de dependencias)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS workspace_module_permissions CASCADE;
DROP TABLE IF EXISTS workspace_projects CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS content_items CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS workspace_invites CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Tipos enum
DROP TYPE IF EXISTS role_enum CASCADE;
DROP TYPE IF EXISTS content_status_enum CASCADE;
DROP TYPE IF EXISTS content_platform_enum CASCADE;
DROP TYPE IF EXISTS content_type_enum CASCADE;

-- Extensiones
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- ============================================================================
-- FASE 2: CREAR todo desde cero
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users
-- ============================================================================
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name        TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Workspaces
-- ============================================================================
CREATE TABLE workspaces (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- Memberships
-- ============================================================================
CREATE TYPE role_enum AS ENUM ('admin', 'cm', 'viewer');

CREATE TABLE memberships (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         role_enum NOT NULL DEFAULT 'viewer',
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- ============================================================================
-- Workspace Invites
-- ============================================================================
CREATE TABLE workspace_invites (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token        TEXT NOT NULL UNIQUE,
    max_uses     INT NOT NULL DEFAULT 10,
    use_count    INT NOT NULL DEFAULT 0,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Clients
-- ============================================================================
CREATE TABLE clients (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    social_handles JSONB NOT NULL DEFAULT '{}',
    notes          TEXT NOT NULL DEFAULT '',
    active         BOOLEAN NOT NULL DEFAULT true,
    created_by     UUID NOT NULL REFERENCES users(id),
    updated_by     UUID NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_clients_workspace_name
    ON clients (workspace_id, lower(name))
    WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_workspace ON clients (workspace_id);

-- ============================================================================
-- Projects
-- ============================================================================
CREATE TABLE projects (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    start_date    DATE,
    end_date      DATE,
    assignee_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by    UUID NOT NULL REFERENCES users(id),
    updated_by    UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_projects_workspace ON projects (workspace_id);
CREATE INDEX idx_projects_assignee ON projects (workspace_id, assignee_id);

-- ============================================================================
-- Content Items
-- ============================================================================
CREATE TYPE content_status_enum AS ENUM (
    'pre_produccion', 'en_espera', 'en_edicion',
    'validacion', 'listo_para_subir', 'subido', 'archivado'
);
CREATE TYPE content_platform_enum AS ENUM (
    'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other'
);
CREATE TYPE content_type_enum AS ENUM (
    'post', 'story', 'reel', 'video', 'carousel', 'other'
);

CREATE TABLE content_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    platform        content_platform_enum NOT NULL DEFAULT 'other',
    content_type    content_type_enum NOT NULL DEFAULT 'post',
    status          content_status_enum NOT NULL DEFAULT 'pre_produccion',
    scheduled_date  DATE,
    fecha_inicial   DATE,
    fecha_final     DATE,
    created_by      UUID NOT NULL REFERENCES users(id),
    updated_by      UUID NOT NULL REFERENCES users(id),
    assignee_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_items_workspace_status ON content_items (workspace_id, status);
CREATE INDEX idx_content_items_workspace_scheduled ON content_items (workspace_id, scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX idx_content_items_workspace_client ON content_items (workspace_id, client_id);
CREATE INDEX idx_content_items_workspace_updated ON content_items (workspace_id, updated_at DESC);
CREATE INDEX idx_content_items_fechas ON content_items (workspace_id, fecha_inicial, fecha_final);
CREATE INDEX idx_content_items_workspace_project ON content_items (workspace_id, project_id);

-- ============================================================================
-- Comments
-- ============================================================================
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id),
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_content_item ON comments (content_item_id, created_at);

-- ============================================================================
-- Tasks
-- ============================================================================
CREATE TABLE tasks (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    assignee_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    start_date       DATE,
    end_date         DATE,
    done             BOOLEAN NOT NULL DEFAULT false,
    content_item_id  UUID REFERENCES content_items(id) ON DELETE SET NULL,
    client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
    created_by       UUID NOT NULL REFERENCES users(id),
    updated_by       UUID NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_workspace ON tasks (workspace_id);
CREATE INDEX idx_tasks_workspace_end ON tasks (workspace_id, end_date) WHERE done = false;

-- ============================================================================
-- Audit Logs
-- ============================================================================
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name    TEXT NOT NULL,
    record_id     UUID NOT NULL,
    action        TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values    JSONB,
    new_values    JSONB,
    performed_by  UUID NOT NULL REFERENCES users(id),
    workspace_id  UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs (workspace_id, created_at DESC);

-- ============================================================================
-- Workspace Projects (muchos a muchos)
-- ============================================================================
CREATE TABLE workspace_projects (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, project_id)
);
CREATE INDEX idx_workspace_projects_project ON workspace_projects (project_id);

-- ============================================================================
-- Workspace Module Permissions
-- ============================================================================
CREATE TABLE workspace_module_permissions (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_key   TEXT NOT NULL CHECK (module_key IN (
        'dashboard', 'calendar', 'content', 'projects', 'tasks', 'clients', 'members', 'finances'
    )),
    enabled      BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (workspace_id, user_id, module_key)
);
CREATE INDEX idx_wmp_workspace_user ON workspace_module_permissions (workspace_id, user_id);

-- ============================================================================
-- Payments (Finanzas)
-- ============================================================================
CREATE TABLE payments (
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
CREATE INDEX idx_payments_workspace ON payments (workspace_id);
CREATE INDEX idx_payments_workspace_client ON payments (workspace_id, client_id);
CREATE INDEX idx_payments_workspace_date ON payments (workspace_id, payment_date);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Helper: delete comment scoped to workspace + author
CREATE OR REPLACE FUNCTION public.delete_comment(
  p_comment_id UUID,
  p_author_id UUID,
  p_workspace_id UUID
)
RETURNS void AS $$
BEGIN
  DELETE FROM comments c
  USING content_items ci
  WHERE c.id = p_comment_id
    AND c.author_id = p_author_id
    AND ci.id = c.content_item_id
    AND ci.workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'comment not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS HELPERS (todas en schema public)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_jwt_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.sub', true)
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.is_member_of(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE workspace_id = p_workspace_id
      AND user_id = public.get_jwt_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role(p_workspace_id uuid)
RETURNS role_enum
LANGUAGE sql STABLE
AS $$
  SELECT role FROM memberships
  WHERE workspace_id = p_workspace_id
    AND user_id = public.get_jwt_user_id();
$$;

CREATE OR REPLACE FUNCTION public.can_assign(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT public.get_my_role(p_workspace_id) IN ('admin', 'cm');
$$;

-- RPC: validar assignee membership
CREATE OR REPLACE FUNCTION public.validate_assignee_membership(
  p_user_id uuid,
  p_workspace_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member record;
BEGIN
  SELECT m.user_id, m.role, u.name, u.email
  INTO v_member
  FROM memberships m
  JOIN users u ON u.id = m.user_id
  WHERE m.user_id = p_user_id
    AND m.workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'El usuario asignado no es miembro de este espacio de trabajo'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_member.user_id,
    'role', v_member.role,
    'name', v_member.name,
    'email', v_member.email
  );
END;
$$;

-- RPC: obtener miembros del workspace
CREATE OR REPLACE FUNCTION public.get_workspace_members(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(jsonb_agg(sub.* ORDER BY sub.joined_at), '[]'::jsonb)
  FROM (
    SELECT m.user_id, m.role, m.joined_at,
           jsonb_build_object('id', u.id, 'email', u.email, 'name', u.name) AS "user"
    FROM memberships m
    JOIN users u ON u.id = m.user_id
    WHERE m.workspace_id = p_workspace_id
  ) sub;
$$;

-- RPC: obtener módulos habilitados para un usuario en un workspace
CREATE OR REPLACE FUNCTION public.get_user_modules(
  p_workspace_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(module_key ORDER BY module_key),
    '["dashboard","calendar","content","projects","tasks","clients","members","finances"]'::jsonb
  )
  FROM workspace_module_permissions
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND enabled = true;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- projects
CREATE POLICY projects_select ON projects
  FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY projects_insert ON projects
  FOR INSERT WITH CHECK (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY projects_update ON projects
  FOR UPDATE USING (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY projects_delete ON projects
  FOR DELETE USING (public.is_member_of(workspace_id) AND public.get_my_role(workspace_id) = 'admin');

-- content_items
CREATE POLICY content_items_select ON content_items
  FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY content_items_insert ON content_items
  FOR INSERT WITH CHECK (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY content_items_update ON content_items
  FOR UPDATE USING (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY content_items_delete ON content_items
  FOR DELETE USING (public.is_member_of(workspace_id) AND public.get_my_role(workspace_id) = 'admin');

-- tasks
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (public.is_member_of(workspace_id) AND public.get_my_role(workspace_id) = 'admin');

-- clients
CREATE POLICY clients_select ON clients
  FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY clients_insert ON clients
  FOR INSERT WITH CHECK (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY clients_update ON clients
  FOR UPDATE USING (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY clients_delete ON clients
  FOR DELETE USING (public.is_member_of(workspace_id) AND public.get_my_role(workspace_id) = 'admin');

-- comments
CREATE POLICY comments_select ON comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM content_items ci WHERE ci.id = content_item_id AND public.is_member_of(ci.workspace_id))
  );
CREATE POLICY comments_insert ON comments
  FOR INSERT WITH CHECK (
    author_id = public.get_jwt_user_id()
    AND EXISTS (SELECT 1 FROM content_items ci WHERE ci.id = content_item_id AND public.is_member_of(ci.workspace_id))
  );
CREATE POLICY comments_delete ON comments
  FOR DELETE USING (
    author_id = public.get_jwt_user_id()
    OR EXISTS (SELECT 1 FROM content_items ci WHERE ci.id = content_item_id AND public.get_my_role(ci.workspace_id) = 'admin')
  );

-- memberships
CREATE POLICY memberships_select ON memberships
  FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY memberships_insert ON memberships
  FOR INSERT WITH CHECK (public.get_my_role(workspace_id) = 'admin');
CREATE POLICY memberships_update ON memberships
  FOR UPDATE USING (public.get_my_role(workspace_id) = 'admin');
CREATE POLICY memberships_delete ON memberships
  FOR DELETE USING (public.get_my_role(workspace_id) = 'admin');

-- workspace_projects
CREATE POLICY wp_select ON workspace_projects
  FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY wp_insert ON workspace_projects
  FOR INSERT WITH CHECK (public.get_my_role(workspace_id) = 'admin');
CREATE POLICY wp_delete ON workspace_projects
  FOR DELETE USING (public.get_my_role(workspace_id) = 'admin');

-- workspace_module_permissions
CREATE POLICY wmp_select ON workspace_module_permissions
  FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY wmp_insert ON workspace_module_permissions
  FOR INSERT WITH CHECK (public.get_my_role(workspace_id) = 'admin');
CREATE POLICY wmp_update ON workspace_module_permissions
  FOR UPDATE USING (public.get_my_role(workspace_id) = 'admin');
CREATE POLICY wmp_delete ON workspace_module_permissions
  FOR DELETE USING (public.get_my_role(workspace_id) = 'admin');

-- payments
CREATE POLICY payments_select ON payments
  FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY payments_insert ON payments
  FOR INSERT WITH CHECK (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY payments_update ON payments
  FOR UPDATE USING (public.is_member_of(workspace_id) AND public.can_assign(workspace_id));
CREATE POLICY payments_delete ON payments
  FOR DELETE USING (public.is_member_of(workspace_id) AND public.get_my_role(workspace_id) = 'admin');
