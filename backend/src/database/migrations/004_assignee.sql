-- 004_assignee.sql — Add assignee_id to projects
-- Ejecutar en Supabase SQL Editor

ALTER TABLE projects
    ADD COLUMN assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_assignee ON projects (workspace_id, assignee_id);
