-- Agregar client_id a la tabla projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects (client_id);
