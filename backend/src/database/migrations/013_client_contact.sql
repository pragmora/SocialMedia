-- ============================================================================
-- 013_client_contact.sql
-- Ejecutar en Supabase SQL Editor DESPUÉS de 012_client_color.sql
--
-- Cambios:
--   1. clients.phone    → teléfono (texto libre, p. ej. "+54 221 555-5555").
--   2. clients.email    → correo electrónico.
--   3. clients.website  → sitio web.
--      (color y notes ya existen)
-- Sin constraint estricto para no romper clientes existentes; solo TEXT nullable.
-- ============================================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;

-- ============================================================================
-- DONE
-- ============================================================================
