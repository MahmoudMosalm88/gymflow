CREATE TABLE IF NOT EXISTS plan_templates (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_months integer NOT NULL CHECK (duration_months > 0),
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  sessions_per_month integer CHECK (sessions_per_month IS NULL OR sessions_per_month > 0),
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  freeze_days_per_cycle integer NOT NULL DEFAULT 0 CHECK (freeze_days_per_cycle >= 0),
  guest_invites_per_cycle integer NOT NULL DEFAULT 0 CHECK (guest_invites_per_cycle >= 0),
  is_archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_templates_org_branch_active
  ON plan_templates (organization_id, branch_id, is_archived, sort_order, created_at);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_template_id uuid;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_template_name text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_perks jsonb;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'subscriptions'
       AND column_name = 'plan_perks'
       AND data_type = 'ARRAY'
       AND udt_name = '_text'
  ) THEN
    ALTER TABLE subscriptions
      ALTER COLUMN plan_perks TYPE jsonb
      USING COALESCE(to_jsonb(plan_perks), '[]'::jsonb);
  END IF;
END $$;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS freeze_days_allowed integer;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS guest_invites_allowed integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'subscriptions_plan_template_id_fkey'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_plan_template_id_fkey
      FOREIGN KEY (plan_template_id) REFERENCES plan_templates(id) ON DELETE SET NULL;
  END IF;
END $$;
