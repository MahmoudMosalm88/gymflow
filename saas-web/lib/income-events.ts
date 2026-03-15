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
subscription_events AS (
  SELECT
    CONCAT('subscription:', s.id::text) AS event_id,
    'subscription'::text AS payment_type,
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
    s.plan_months::int AS plan_months,
    s.sessions_per_month::int AS sessions_per_month
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
    s.plan_months::int AS plan_months,
    s.sessions_per_month::int AS sessions_per_month
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
    0::int AS plan_months,
    NULL::int AS sessions_per_month
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
    FROM guest_pass_events
)
`;

export async function ensurePaymentsTable() {
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
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export type IncomeEventRow = {
  event_id: string;
  payment_type: "subscription" | "renewal" | "guest_pass";
  effective_at: string;
  amount: string | number;
  member_id: string | null;
  member_name: string;
  phone: string | null;
  subscription_id: number | null;
  payment_id: number | null;
  guest_pass_id: string | null;
  plan_months: number;
  sessions_per_month: number | null;
};
