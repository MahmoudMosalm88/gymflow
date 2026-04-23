-- Add offline check-in support columns to logs table
ALTER TABLE logs ADD COLUMN IF NOT EXISTS operation_id uuid;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'online'
  CHECK (source IN ('online', 'offline_sync'));
ALTER TABLE logs ADD COLUMN IF NOT EXISTS client_device_id text;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS offline_recorded_at bigint;

-- Idempotency index: prevents duplicate offline check-ins from syncing twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_operation_id_unique
  ON logs (organization_id, branch_id, operation_id)
  WHERE operation_id IS NOT NULL;
