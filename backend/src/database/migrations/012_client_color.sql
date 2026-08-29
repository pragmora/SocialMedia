-- ============================================================================
-- 012_client_color.sql
-- Ejecutar en Supabase SQL Editor DESPUÉS de 011_security_and_model.sql
--
-- Cambios:
--   1. clients.color (hex) para identificar visualmente a cada cliente en el
--      calendario y en el resto de la aplicación.
--   2. Backfill: los clientes existentes reciben un color determinístico según
--      su nombre (misma paleta que usa el backend para clientes nuevos).
--   3. CHECK que garantiza formato #RRGGBB.
-- ============================================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS color TEXT;

-- Backfill de clientes existentes: color estable por nombre
UPDATE clients
SET color = (
  CASE abs(hashtext(coalesce(name, ''))) % 12
    WHEN 0  THEN '#4F46E5' -- índigo
    WHEN 1  THEN '#059669' -- esmeralda
    WHEN 2  THEN '#7C3AED' -- violeta
    WHEN 3  THEN '#EA580C' -- naranja
    WHEN 4  THEN '#0EA5E9' -- cielo
    WHEN 5  THEN '#E11D48' -- rosa
    WHEN 6  THEN '#2563EB' -- azul
    WHEN 7  THEN '#16A34A' -- verde
    WHEN 8  THEN '#9333EA' -- púrpura
    WHEN 9  THEN '#DC2626' -- rojo
    WHEN 10 THEN '#0891B2' -- cian
    ELSE         '#D97706' -- ámbar
  END
)
WHERE color IS NULL OR color = '';

-- Valores inválidos no permitidos
ALTER TABLE clients ADD CONSTRAINT clients_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- ============================================================================
-- DONE
-- ============================================================================
