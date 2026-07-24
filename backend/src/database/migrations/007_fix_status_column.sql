-- ============================================================================
-- 007_fix_status_column.sql
-- Ejecutar en Supabase SQL Editor DESPUÉS del 006
-- Repara la columna status que fue eliminada por CASCADE en el 006
-- ============================================================================

-- Si la columna status no existe (fue eliminada por DROP TYPE CASCADE), recrearla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_items' AND column_name = 'status'
  ) THEN
    ALTER TABLE content_items
      ADD COLUMN status content_status_enum NOT NULL DEFAULT 'pre_produccion';
    RAISE NOTICE 'Columna status recreada en content_items';
  ELSE
    RAISE NOTICE 'Columna status ya existe, no se necesita reparar';
  END IF;
END $$;

-- Asegurar que el default sea correcto
ALTER TABLE content_items ALTER COLUMN status SET DEFAULT 'pre_produccion';

-- Migrar datos existentes por si quedaron valores viejos
UPDATE content_items SET status = 'pre_produccion' WHERE status::text = 'draft';
UPDATE content_items SET status = 'en_espera' WHERE status::text = 'review';
UPDATE content_items SET status = 'en_edicion' WHERE status::text = 'approved';
UPDATE content_items SET status = 'subido' WHERE status::text = 'published';
