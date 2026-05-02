type Queryable = {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
};

export type PlanTemplateRow = {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  duration_months: number;
  price: string | number;
  sessions_per_month: number | null;
  perks: unknown;
  freeze_days_per_cycle: number;
  guest_invites_per_cycle: number;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlanTemplate = {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  duration_months: number;
  price: number;
  sessions_per_month: number | null;
  perks: string[];
  freeze_days_per_cycle: number;
  guest_invites_per_cycle: number;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlanTemplateSnapshot = {
  planTemplateId: string;
  planTemplateName: string;
  planPerks: string[];
  freezeDaysAllowed: number;
  guestInvitesAllowed: number;
};

function normalizePerks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function normalizePlanTemplate(row: PlanTemplateRow): PlanTemplate {
  return {
    ...row,
    duration_months: Number(row.duration_months),
    price: Number(row.price),
    sessions_per_month: row.sessions_per_month == null ? null : Number(row.sessions_per_month),
    perks: normalizePerks(row.perks),
    freeze_days_per_cycle: Number(row.freeze_days_per_cycle || 0),
    guest_invites_per_cycle: Number(row.guest_invites_per_cycle || 0),
    is_archived: Boolean(row.is_archived),
    sort_order: Number(row.sort_order || 0)
  };
}

export async function ensurePlanTemplateSchema(executor: Queryable) {
  await executor.query(`
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
    )
  `);

  await executor.query(`
    CREATE INDEX IF NOT EXISTS idx_plan_templates_org_branch_active
      ON plan_templates (organization_id, branch_id, is_archived, sort_order, created_at)
  `);

  await executor.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_template_id uuid`);
  await executor.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_template_name text`);
  await executor.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_perks jsonb`);
  await executor.query(`
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
  `);
  await executor.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS freeze_days_allowed integer`);
  await executor.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS guest_invites_allowed integer`);

  await executor.query(`
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
  `);
}

export async function loadPlanTemplateSnapshot(
  executor: Queryable,
  organizationId: string,
  branchId: string,
  planTemplateId: string | null | undefined
): Promise<PlanTemplateSnapshot | null> {
  if (!planTemplateId) return null;
  await ensurePlanTemplateSchema(executor);

  const rows = await executor.query<PlanTemplateRow>(
    `SELECT *
       FROM plan_templates
      WHERE id = $1
        AND organization_id = $2
        AND branch_id = $3
        AND is_archived = false
      LIMIT 1`,
    [planTemplateId, organizationId, branchId]
  );

  const template = rows.rows[0] ? normalizePlanTemplate(rows.rows[0]) : null;
  if (!template) {
    throw Object.assign(new Error("Plan template not found or archived."), { statusCode: 404 });
  }

  return {
    planTemplateId: template.id,
    planTemplateName: template.name,
    planPerks: template.perks,
    freezeDaysAllowed: template.freeze_days_per_cycle,
    guestInvitesAllowed: template.guest_invites_per_cycle
  };
}
