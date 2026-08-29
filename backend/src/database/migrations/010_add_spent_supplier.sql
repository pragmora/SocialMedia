-- Add support for gastos (spent) payments
-- is_spent: true = egreso/gasto, false = ingreso/cobro
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_spent BOOLEAN NOT NULL DEFAULT false;

-- Reserved for future suppliers (sin FK: la tabla suppliers aún no existe)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- Los egresos no tienen cliente asociado
ALTER TABLE payments ALTER COLUMN client_id DROP NOT NULL;
