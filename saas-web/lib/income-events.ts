import { query } from "@/lib/db";

export const incomeEventsCte = `
WITH renewal_totals AS (
  SELECT p.subscription_id,
         COALESCE(SUM(p.amount), 0)::numeric(12, 2) AS renewal_total
    FROM payments p
   WHERE p.organization_id = $1
     AND p.branch_id = $2
     AND p.type = 'renewal'
     AND p.subscription_id IS NOT NULL
   GROUP BY p.subscription_id
),
pt_package_events AS (
  SELECT
    CONCAT('pt_package:', p.id::text) AS event_id,
    'pt_package'::text AS payment_type,
    pay.created_at AS effective_at,
    pay.amount::numeric(12, 2) AS amount,
    p.member_id,
    COALESCE(m.name, 'Unknown client') AS member_name,
    m.phone,
    NULL::bigint AS subscription_id,
    pay.id AS payment_id,
    NULL::uuid AS guest_pass_id,
    p.id AS pt_package_id,
    COALESCE(pay.payment_method, 'unknown')::text AS payment_method,
    0::int AS plan_months,
    NULL::int AS sessions_per_month,
    p.title AS package_title
  FROM pt_packages p
  JOIN payments pay
    ON pay.pt_package_id = p.id
   AND pay.organization_id = p.organization_id
   AND pay.branch_id = p.branch_id
   AND pay.type = 'pt_package'
  LEFT JOIN members m
    ON m.id = p.member_id
   AND m.organization_id = p.organization_id
   AND m.branch_id = p.branch_id
  WHERE p.organization_id = $1
    AND p.branch_id = $2
),
subscription_events AS (
  SELECT
    CONCAT('subscription:', s.id::text) AS event_id,
    CASE
      WHEN s.renewed_from_subscription_id IS NULL THEN 'subscription'::text
      ELSE 'renewal'::text
    END AS payment_type,
    s.created_at AS effective_at,
    GREATEST(
      COALESCE(s.price_paid, 0)::numeric(12, 2)
      - COALESCE(rt.renewal_total, 0)::numeric(12, 2),
      0::numeric(12, 2)
    ) AS amount,
    s.member_id,
    COALESCE(m.name, 'Unknown client') AS member_name,
    m.phone,
    s.id AS subscription_id,
    NULL::int AS payment_id,
    NULL::uuid AS guest_pass_id,
    NULL::uuid AS pt_package_id,
    COALESCE(s.payment_method, 'unknown')::text AS payment_method,
    s.plan_months::int AS plan_months,
    s.sessions_per_month::int AS sessions_per_month,
    NULL::text AS package_title
  FROM subscriptions s
  LEFT JOIN renewal_totals rt
    ON rt.subscription_id = s.id
  LEFT JOIN members m
    ON m.id = s.member_id
   AND m.organization_id = s.organization_id
   AND m.branch_id = s.branch_id
  WHERE s.organization_id = $1
    AND s.branch_id = $2
    AND s.price_paid IS NOT NULL
),
renewal_events AS (
  SELECT
    CONCAT('renewal:', p.id::text) AS event_id,
    'renewal'::text AS payment_type,
    p.created_at AS effective_at,
    p.amount::numeric(12, 2) AS amount,
    p.member_id,
    COALESCE(m.name, 'Unknown client') AS member_name,
    m.phone,
    p.subscription_id,
    p.id AS payment_id,
    NULL::uuid AS guest_pass_id,
    NULL::uuid AS pt_package_id,
    COALESCE(p.payment_method, 'unknown')::text AS payment_method,
    s.plan_months::int AS plan_months,
    s.sessions_per_month::int AS sessions_per_month,
    NULL::text AS package_title
  FROM payments p
  LEFT JOIN subscriptions s
    ON s.id = p.subscription_id
   AND s.organization_id = p.organization_id
   AND s.branch_id = p.branch_id
  LEFT JOIN members m
    ON m.id = p.member_id
   AND m.organization_id = p.organization_id
   AND m.branch_id = p.branch_id
  WHERE p.organization_id = $1
    AND p.branch_id = $2
    AND p.type = 'renewal'
),
guest_pass_events AS (
  SELECT
    CONCAT('guest_pass:', g.id::text) AS event_id,
    'guest_pass'::text AS payment_type,
    g.used_at AS effective_at,
    g.amount::numeric(12, 2) AS amount,
    NULL::uuid AS member_id,
    COALESCE(g.member_name, 'Guest') AS member_name,
    g.phone,
    NULL::bigint AS subscription_id,
    NULL::int AS payment_id,
    g.id AS guest_pass_id,
    NULL::uuid AS pt_package_id,
    COALESCE(g.payment_method, 'unknown')::text AS payment_method,
    0::int AS plan_months,
    NULL::int AS sessions_per_month,
    NULL::text AS package_title
  FROM guest_passes g
  WHERE g.organization_id = $1
    AND g.branch_id = $2
    AND g.used_at IS NOT NULL
    AND g.amount IS NOT NULL
),
income_events AS (
  SELECT *
    FROM subscription_events
   WHERE amount > 0
  UNION ALL
  SELECT *
    FROM renewal_events
  UNION ALL
  SELECT *
    FROM pt_package_events
  UNION ALL
  SELECT *
    FROM guest_pass_events
)
`;

export async function ensurePaymentsTable() {
  // Keep the three revenue sources aligned so reports can split payment methods honestly.
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      organization_id UUID NOT NULL,
      branch_id UUID NOT NULL,
      member_id UUID NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      type TEXT NOT NULL DEFAULT 'subscription',
      subscription_id INT,
      guest_pass_id UUID,
      pt_package_id UUID,
      payment_method TEXT,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS pt_package_id UUID`);
  await query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT`);
  await query(`ALTER TABLE guest_passes ADD COLUMN IF NOT EXISTS payment_method TEXT`);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_payment_method_check'
      ) THEN
        ALTER TABLE payments
          ADD CONSTRAINT payments_payment_method_check
          CHECK (payment_method IN ('cash', 'digital') OR payment_method IS NULL);
      END IF;
    END $$;
  `);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_payment_method_check'
      ) THEN
        ALTER TABLE subscriptions
          ADD CONSTRAINT subscriptions_payment_method_check
          CHECK (payment_method IN ('cash', 'digital') OR payment_method IS NULL);
      END IF;
    END $$;
  `);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'guest_passes_payment_method_check'
      ) THEN
        ALTER TABLE guest_passes
          ADD CONSTRAINT guest_passes_payment_method_check
          CHECK (payment_method IN ('cash', 'digital') OR payment_method IS NULL);
      END IF;
    END $$;
  `);
}

export type IncomeEventRow = {
  event_id: string;
  payment_type: "subscription" | "renewal" | "guest_pass" | "pt_package";
  effective_at: string;
  amount: string | number;
  member_id: string | null;
  member_name: string;
  phone: string | null;
  subscription_id: number | null;
  payment_id: number | null;
  guest_pass_id: string | null;
  pt_package_id: string | null;
  payment_method: "cash" | "digital" | "unknown";
  plan_months: number;
  sessions_per_month: number | null;
  package_title?: string | null;
};
