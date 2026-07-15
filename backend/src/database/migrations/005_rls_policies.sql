-- 005_rls_policies.sql — RLS policies + assignee validation RPC
-- Ejecutar en Supabase SQL Editor después de 004_assignee.sql
--
-- IMPORTANTE: El backend usa la service role key que bypasea RLS.
-- Estas políticas se activarán si se cambia al anon key o si se
-- habilitan consultas directas desde el cliente Supabase.

-- ============================================================================
-- Limpiar funciones viejas si existieran (de intentos previos)
-- ============================================================================
DROP FUNCTION IF EXISTS auth.user_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_member_of(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_assign(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_assignee_membership(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_workspace_members(uuid) CASCADE;

-- Eliminar políticas viejas si existieran
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    AND tablename IN ('projects','content_items','tasks','memberships','clients','comments')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- Helper: obtener el user_id del JWT actual (schema public, NO auth)
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

-- ============================================================================
-- Helper: verificar si el usuario actual es miembro del workspace
-- ============================================================================
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

-- ============================================================================
-- Helper: obtener el rol del usuario actual en un workspace
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_role(p_workspace_id uuid)
RETURNS role_enum
LANGUAGE sql STABLE
AS $$
  SELECT role FROM memberships
  WHERE workspace_id = p_workspace_id
    AND user_id = public.get_jwt_user_id();
$$;

-- ============================================================================
-- Helper: verificar si el usuario puede asignar (admin o cm)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_assign(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT public.get_my_role(p_workspace_id) IN ('admin', 'cm');
$$;

-- ============================================================================
-- RPC: validar que un assignee es miembro del workspace
-- ============================================================================
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

-- ============================================================================
-- RPC: obtener miembros del workspace con info de usuario
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_workspace_members(p_workspace_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT jsonb_agg(jsonb_build_object(
    'user_id', m.user_id,
    'role', m.role,
    'joined_at', m.joined_at,
    'user', jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'name', u.name
    )
  ))
  FROM memberships m
  JOIN users u ON u.id = m.user_id
  WHERE m.workspace_id = p_workspace_id
  ORDER BY m.joined_at;
$$;

-- ============================================================================
-- Habilitar RLS en tablas protegidas
-- ============================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS: projects
-- ============================================================================
CREATE POLICY projects_select ON projects
  FOR SELECT USING (public.is_member_of(workspace_id));

CREATE POLICY projects_insert ON projects
  FOR INSERT WITH CHECK (
    public.is_member_of(workspace_id)
    AND public.can_assign(workspace_id)
  );

CREATE POLICY projects_update ON projects
  FOR UPDATE USING (
    public.is_member_of(workspace_id)
    AND public.can_assign(workspace_id)
  );

CREATE POLICY projects_delete ON projects
  FOR DELETE USING (
    public.is_member_of(workspace_id)
    AND public.get_my_role(workspace_id) = 'admin'
  );

-- ============================================================================
-- POLÍTICAS: content_items
-- ============================================================================
CREATE POLICY content_items_select ON content_items
  FOR SELECT USING (public.is_member_of(workspace_id));

CREATE POLICY content_items_insert ON content_items
  FOR INSERT WITH CHECK (
    public.is_member_of(workspace_id)
    AND public.can_assign(workspace_id)
  );

CREATE POLICY content_items_update ON content_items
  FOR UPDATE USING (
    public.is_member_of(workspace_id)
    AND public.can_assign(workspace_id)
  );

CREATE POLICY content_items_delete ON content_items
  FOR DELETE USING (
    public.is_member_of(workspace_id)
    AND public.get_my_role(workspace_id) = 'admin'
  );

-- ============================================================================
-- POLÍTICAS: tasks
-- ============================================================================
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (public.is_member_of(workspace_id));

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    public.is_member_of(workspace_id)
    AND public.can_assign(workspace_id)
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (
    public.is_member_of(workspace_id)
    AND public.can_assign(workspace_id)
  );

CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (
    public.is_member_of(workspace_id)
    AND public.get_my_role(workspace_id) = 'admin'
  );

-- ============================================================================
-- POLÍTICAS: clients
-- ============================================================================
CREATE POLICY clients_select ON clients
  FOR SELECT USING (public.is_member_of(workspace_id));

CREATE POLICY clients_insert ON clients
  FOR INSERT WITH CHECK (
    public.is_member_of(workspace_id)
    AND public.can_assign(workspace_id)
  );

CREATE POLICY clients_update ON clients
  FOR UPDATE USING (
    public.is_member_of(workspace_id)
    AND public.can_assign(workspace_id)
  );

CREATE POLICY clients_delete ON clients
  FOR DELETE USING (
    public.is_member_of(workspace_id)
    AND public.get_my_role(workspace_id) = 'admin'
  );

-- ============================================================================
-- POLÍTICAS: comments (basado en content_item → workspace)
-- ============================================================================
CREATE POLICY comments_select ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = content_item_id
        AND public.is_member_of(ci.workspace_id)
    )
  );

CREATE POLICY comments_insert ON comments
  FOR INSERT WITH CHECK (
    author_id = public.get_jwt_user_id()
    AND EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = content_item_id
        AND public.is_member_of(ci.workspace_id)
    )
  );

CREATE POLICY comments_delete ON comments
  FOR DELETE USING (
    author_id = public.get_jwt_user_id()
    OR EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = content_item_id
        AND public.get_my_role(ci.workspace_id) = 'admin'
    )
  );

-- ============================================================================
-- POLÍTICAS: memberships
-- Cualquier miembro puede ver membresías del workspace
-- Solo admin puede modificar
-- ============================================================================
CREATE POLICY memberships_select ON memberships
  FOR SELECT USING (public.is_member_of(workspace_id));

CREATE POLICY memberships_insert ON memberships
  FOR INSERT WITH CHECK (
    public.get_my_role(workspace_id) = 'admin'
  );

CREATE POLICY memberships_update ON memberships
  FOR UPDATE USING (
    public.get_my_role(workspace_id) = 'admin'
  );

CREATE POLICY memberships_delete ON memberships
  FOR DELETE USING (
    public.get_my_role(workspace_id) = 'admin'
  );
