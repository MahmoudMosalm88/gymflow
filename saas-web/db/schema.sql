CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY,
  firebase_uid text NOT NULL UNIQUE,
  email text,
  name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS owners
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE IF EXISTS owners
  ALTER COLUMN email DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_email_unique_not_null
  ON owners (LOWER(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_phone_unique_not_null
  ON owners (phone)
  WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS owner_branch_access (
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, branch_id)
);

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  photo_path text,
  access_tier text NOT NULL DEFAULT 'full',
  card_code text,
  address text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_branch_card_code
  ON members (organization_id, branch_id, card_code)
  WHERE card_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_branch_phone ON members (organization_id, branch_id, phone);
CREATE INDEX IF NOT EXISTS idx_members_branch_name ON members (organization_id, branch_id, name);

CREATE TABLE IF NOT EXISTS subscriptions (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  start_date bigint NOT NULL,
  end_date bigint NOT NULL,
  plan_months integer NOT NULL,
  price_paid numeric(12, 2),
  sessions_per_month integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_subscription_branch
  ON subscriptions (organization_id, branch_id, member_id)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS subscription_freezes (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  subscription_id bigint NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  start_date bigint NOT NULL,
  end_date bigint NOT NULL,
  days integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotas (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  subscription_id bigint NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  cycle_start bigint NOT NULL,
  cycle_end bigint NOT NULL,
  sessions_used integer NOT NULL DEFAULT 0,
  sessions_cap integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, branch_id, subscription_id, cycle_start)
);

CREATE TABLE IF NOT EXISTS logs (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  scanned_value text NOT NULL,
  method text NOT NULL DEFAULT 'scan' CHECK (method IN ('scan', 'manual')),
  timestamp bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failure')),
  reason_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_branch_timestamp ON logs (organization_id, branch_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_branch_member ON logs (organization_id, branch_id, member_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS settings (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, branch_id, key)
);

CREATE TABLE IF NOT EXISTS guest_passes (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  code text NOT NULL,
  member_name text NOT NULL,
  phone text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_queue (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT NOW(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_queue_ready
  ON message_queue (organization_id, branch_id, status, scheduled_at);

CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('manual', 'scheduled', 'pre_restore')),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  storage_path text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_artifacts (
  id uuid PRIMARY KEY,
  backup_id uuid NOT NULL REFERENCES backups(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  archive jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_artifacts_backup ON backup_artifacts (backup_id);

CREATE TABLE IF NOT EXISTS import_artifacts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('uploaded', 'validated', 'invalid', 'imported', 'failed')),
  validation_report jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_jobs (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('desktop_import', 'backup_restore')),
  status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  payload jsonb,
  result jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
