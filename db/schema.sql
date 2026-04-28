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

CREATE TABLE IF NOT EXISTS staff_users (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  firebase_uid text UNIQUE,
  name text NOT NULL,
  title text,
  email text,
  phone text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'staff', 'trainer')),
  is_active boolean NOT NULL DEFAULT true,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_phone_unique
  ON staff_users (organization_id, branch_id, phone);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_email_unique_not_null
  ON staff_users (organization_id, branch_id, LOWER(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_users_role
  ON staff_users (organization_id, branch_id, role, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS staff_profiles (
  staff_user_id uuid PRIMARY KEY REFERENCES staff_users(id) ON DELETE CASCADE,
  gender text CHECK (gender IN ('male', 'female')),
  languages text[] NOT NULL DEFAULT '{}'::text[],
  specialties text[] NOT NULL DEFAULT '{}'::text[],
  certifications text[] NOT NULL DEFAULT '{}'::text[],
  bio text,
  beginner_friendly boolean NOT NULL DEFAULT false,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_permission_overrides (
  id uuid PRIMARY KEY,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_permission_overrides_unique
  ON staff_permission_overrides (staff_user_id, permission_key);

CREATE TABLE IF NOT EXISTS staff_invites (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  phone text NOT NULL,
  sent_via text NOT NULL CHECK (sent_via IN ('whatsapp')),
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'opened', 'accepted', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL,
  opened_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_lookup
  ON staff_invites (token, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_invites_staff
  ON staff_invites (staff_user_id, created_at DESC);

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

DROP INDEX IF EXISTS idx_members_branch_card_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_branch_card_code
  ON members (organization_id, branch_id, card_code)
  WHERE card_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_members_branch_phone ON members (organization_id, branch_id, phone);

CREATE TABLE IF NOT EXISTS member_trainer_assignments (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  assigned_by_actor_type text NOT NULL CHECK (assigned_by_actor_type IN ('owner', 'staff')),
  assigned_by_actor_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT NOW(),
  unassigned_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_trainer_assignments_active_member
  ON member_trainer_assignments (organization_id, branch_id, member_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_member_trainer_assignments_trainer
  ON member_trainer_assignments (organization_id, branch_id, trainer_staff_user_id, is_active, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_branch_name ON members (organization_id, branch_id, name);

CREATE TABLE IF NOT EXISTS pt_packages (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  assigned_trainer_staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  sold_by_actor_type text NOT NULL CHECK (sold_by_actor_type IN ('owner', 'staff')),
  sold_by_actor_id uuid NOT NULL,
  title text NOT NULL,
  total_sessions integer NOT NULL CHECK (total_sessions > 0),
  sessions_used integer NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  price_paid numeric(12, 2) NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'exhausted', 'expired', 'cancelled')),
  notes text,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (valid_until >= valid_from),
  CHECK (sessions_used <= total_sessions)
);

CREATE INDEX IF NOT EXISTS idx_pt_packages_member
  ON pt_packages (organization_id, branch_id, member_id, status, valid_until, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pt_packages_trainer
  ON pt_packages (organization_id, branch_id, assigned_trainer_staff_user_id, status, valid_until, created_at DESC);

CREATE TABLE IF NOT EXISTS pt_sessions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES pt_packages(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_by_actor_type text NOT NULL CHECK (created_by_actor_type IN ('owner', 'staff')),
  created_by_actor_id uuid NOT NULL,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('scheduled', 'completed', 'no_show', 'late_cancel', 'cancelled')),
  deducts_session boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS idx_pt_sessions_package
  ON pt_sessions (organization_id, branch_id, package_id, scheduled_start DESC);

CREATE INDEX IF NOT EXISTS idx_pt_sessions_trainer
  ON pt_sessions (organization_id, branch_id, trainer_staff_user_id, scheduled_start, status);

CREATE INDEX IF NOT EXISTS idx_pt_sessions_member
  ON pt_sessions (organization_id, branch_id, member_id, scheduled_start DESC, status);

CREATE TABLE IF NOT EXISTS trainer_availability (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  trainer_staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute integer NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute integer NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (end_minute > start_minute)
);

CREATE INDEX IF NOT EXISTS idx_trainer_availability_lookup
  ON trainer_availability (organization_id, branch_id, trainer_staff_user_id, weekday, is_active);

CREATE TABLE IF NOT EXISTS trainer_time_off (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  trainer_staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_trainer_time_off_lookup
  ON trainer_time_off (organization_id, branch_id, trainer_staff_user_id, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  renewed_from_subscription_id bigint REFERENCES subscriptions(id) ON DELETE SET NULL,
  start_date bigint NOT NULL,
  end_date bigint NOT NULL,
  plan_months integer NOT NULL,
  price_paid numeric(12, 2),
  payment_method text CHECK (payment_method IN ('cash', 'digital')),
  sessions_per_month integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS renewed_from_subscription_id bigint REFERENCES subscriptions(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS idx_one_active_subscription_branch;

CREATE INDEX IF NOT EXISTS idx_subscriptions_member_cycle_lookup
  ON subscriptions (organization_id, branch_id, member_id, is_active, start_date DESC, end_date DESC, created_at DESC);

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
  method text NOT NULL DEFAULT 'scan' CHECK (method IN ('scan', 'manual', 'camera')),
  timestamp bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failure')),
  reason_code text NOT NULL,
  operation_id uuid,
  source text NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'offline_sync')),
  client_device_id text,
  offline_recorded_at bigint,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS logs
  DROP CONSTRAINT IF EXISTS logs_method_check;

ALTER TABLE IF EXISTS logs
  ADD CONSTRAINT logs_method_check
  CHECK (method IN ('scan', 'manual', 'camera'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_operation_id_unique
  ON logs (organization_id, branch_id, operation_id)
  WHERE operation_id IS NOT NULL;

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

INSERT INTO settings (organization_id, branch_id, key, value, updated_at)
SELECT organization_id,
       id AS branch_id,
       defaults.key,
       defaults.value,
       NOW()
  FROM branches
 CROSS JOIN (
   VALUES
     ('pt_session_default_minutes', '60'::jsonb),
     ('pt_no_show_deducts', 'true'::jsonb),
     ('pt_late_cancel_deducts', 'true'::jsonb),
     ('pt_low_balance_threshold_sessions', '2'::jsonb),
     ('pt_expiry_warning_days', '3'::jsonb),
     ('pt_reminder_hours_before', '24'::jsonb)
 ) AS defaults(key, value)
ON CONFLICT (organization_id, branch_id, key) DO NOTHING;

CREATE TABLE IF NOT EXISTS guest_passes (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  code text NOT NULL,
  member_name text NOT NULL,
  phone text,
  payment_method text CHECK (payment_method IN ('cash', 'digital')),
  inviter_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  inviter_subscription_id bigint REFERENCES subscriptions(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  voided_at timestamptz,
  amount numeric(12,2),
  converted_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE guest_passes
  ADD COLUMN IF NOT EXISTS inviter_member_id uuid REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE guest_passes
  ADD COLUMN IF NOT EXISTS inviter_subscription_id bigint REFERENCES subscriptions(id) ON DELETE SET NULL;

ALTER TABLE guest_passes
  ADD COLUMN IF NOT EXISTS voided_at timestamptz;

ALTER TABLE guest_passes
  ADD COLUMN IF NOT EXISTS converted_member_id uuid REFERENCES members(id) ON DELETE SET NULL;

ALTER TABLE guest_passes
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_guest_passes_inviter_cycle
  ON guest_passes (organization_id, branch_id, inviter_subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guest_passes_inviter_member
  ON guest_passes (organization_id, branch_id, inviter_member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_by_owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_org_branch_created
  ON whatsapp_campaigns (organization_id, branch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS message_queue (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL,
  target_phone text,
  target_name text,
  type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT NOW(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE message_queue
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL;

ALTER TABLE message_queue
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

ALTER TABLE message_queue
  ADD COLUMN IF NOT EXISTS provider_message_id text;

ALTER TABLE message_queue
  ADD COLUMN IF NOT EXISTS target_phone text;

ALTER TABLE message_queue
  ADD COLUMN IF NOT EXISTS target_name text;

ALTER TABLE message_queue
  ALTER COLUMN member_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_queue_ready
  ON message_queue (organization_id, branch_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_message_queue_campaign
  ON message_queue (organization_id, branch_id, campaign_id, status, scheduled_at);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('system', 'broadcast')),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id uuid PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  read_at timestamptz,
  delivered_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_recipient_unique_target
  ON notification_recipients (
    notification_id,
    organization_id,
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_source_type
  ON notifications (source, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_unread
  ON notification_recipients (organization_id, branch_id, read_at, delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_org
  ON notification_recipients (organization_id, branch_id, delivered_at DESC);

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

ALTER TABLE import_artifacts
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'desktop_archive';

ALTER TABLE import_artifacts
  ADD COLUMN IF NOT EXISTS file_format text;

ALTER TABLE import_artifacts
  ADD COLUMN IF NOT EXISTS mapping jsonb;

ALTER TABLE import_artifacts
  ADD COLUMN IF NOT EXISTS preview_summary jsonb;

ALTER TABLE import_artifacts
  DROP CONSTRAINT IF EXISTS import_artifacts_kind_check;

ALTER TABLE import_artifacts
  ADD CONSTRAINT import_artifacts_kind_check
  CHECK (kind IN ('desktop_archive', 'spreadsheet'));

ALTER TABLE import_artifacts
  DROP CONSTRAINT IF EXISTS import_artifacts_file_format_check;

ALTER TABLE import_artifacts
  ADD CONSTRAINT import_artifacts_file_format_check
  CHECK (file_format IN ('csv', 'xlsx', 'sqlite_db') OR file_format IS NULL);

ALTER TABLE import_artifacts
  DROP CONSTRAINT IF EXISTS import_artifacts_status_check;

ALTER TABLE import_artifacts
  ADD CONSTRAINT import_artifacts_status_check
  CHECK (status IN ('uploaded', 'parsed', 'mapped', 'validated', 'invalid', 'imported', 'failed'));

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

ALTER TABLE migration_jobs
  DROP CONSTRAINT IF EXISTS migration_jobs_type_check;

ALTER TABLE migration_jobs
  ADD CONSTRAINT migration_jobs_type_check
  CHECK (type IN ('desktop_import', 'backup_restore', 'spreadsheet_import'));

CREATE TABLE IF NOT EXISTS import_row_results (
  id uuid PRIMARY KEY,
  artifact_id uuid NOT NULL REFERENCES import_artifacts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_row jsonb NOT NULL,
  normalized_row jsonb,
  status text NOT NULL CHECK (status IN ('valid', 'warning', 'invalid', 'duplicate', 'imported', 'skipped', 'failed')),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  matched_member_id uuid,
  created_member_id uuid,
  created_subscription_id bigint,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_row_results_artifact
  ON import_row_results (artifact_id, row_number);

CREATE INDEX IF NOT EXISTS idx_import_row_results_status
  ON import_row_results (organization_id, branch_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  organization_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  member_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'subscription',
  subscription_id INT,
  guest_pass_id UUID,
  pt_package_id uuid REFERENCES pt_packages(id) ON DELETE SET NULL,
  payment_method TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pt_package_id uuid REFERENCES pt_packages(id) ON DELETE SET NULL;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_payment_method_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('cash', 'digital') OR payment_method IS NULL);

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS import_job_id uuid;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS is_legacy_import boolean NOT NULL DEFAULT false;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS joined_at timestamptz;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS whatsapp_do_not_contact boolean NOT NULL DEFAULT false;

ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_source_check;

ALTER TABLE members
  ADD CONSTRAINT members_source_check
  CHECK (source IN ('manual', 'import_csv', 'import_desktop'));

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS import_job_id uuid;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_legacy_import boolean NOT NULL DEFAULT false;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_source_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_source_check
  CHECK (source IN ('manual', 'renewal', 'import_csv', 'import_desktop'));
