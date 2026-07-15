-- 003_projects.sql — Projects table + project_id on content_items
-- Ejecutar en Supabase SQL Editor

-- ============================================================================
-- Projects
-- ============================================================================
CREATE TABLE projects (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    start_date    DATE,
    end_date      DATE,
    created_by    UUID NOT NULL REFERENCES users(id),
    updated_by    UUID NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_projects_workspace ON projects (workspace_id);

-- ============================================================================
-- Add project_id to content_items
-- ============================================================================
ALTER TABLE content_items
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX idx_content_items_workspace_project
    ON content_items (workspace_id, project_id);
