-- Add status column to payments table (pending = cobrar, paid = cobrado)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'paid'));

-- Update existing payments to 'paid' since they were already recorded
UPDATE payments SET status = 'paid' WHERE status = 'pending';
