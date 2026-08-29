-- ============================================================================
-- 014_project_logo.sql
-- Ejecutar en Supabase SQL Editor DESPUÉS de 013_client_contact.sql
--
-- Cambios:
--   1. projects.logo_url → URL pública del logo subido a Supabase Storage.
--      El bucket "project_logos" se crea automáticamente (público) desde el
--      backend en el primer upload; no hace falta crearlo a mano.
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============================================================================
-- DONE
-- ============================================================================
