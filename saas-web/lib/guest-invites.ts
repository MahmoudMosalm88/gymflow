import { query } from "@/lib/db";

const DEFAULT_GUEST_INVITES_PER_CYCLE = 1;

type Queryable = {
  query<T>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type MemberRow = {
  id: string;
  name: string;
  phone: string | null;
  card_code: string | null;
};

type SubscriptionCycleRow = {
  id: number;
  start_date: number;
  end_date: number;
  plan_months: number;
  sessions_per_month: number | null;
};

type CountRow = {
  total: string | number;
};

type RecentGuestRow = {
  id: string;
  code: string;
  guest_name: string;
  phone: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  voided_at: string | null;
  converted_at: string | null;
  converted_member_id: string | null;
  converted_member_name: string | null;
};

export type GuestInviteSummary = {
  member: MemberRow;
  allowance: number;
  used: number;
  remaining: number;
  hasActiveCycle: boolean;
  currentCycle: {
    id: number;
    startDate: number;
    endDate: number;
    planMonths: number;
    sessionsPerMonth: number | null;
  } | null;
  recentGuests: RecentGuestRow[];
};

function parseAllowance(raw: unknown): number {
  if (raw == null) return DEFAULT_GUEST_INVITES_PER_CYCLE;
  const numeric = typeof raw === "number" ? raw : Number(String(raw));
  if (!Number.isFinite(numeric) || numeric < 0) return DEFAULT_GUEST_INVITES_PER_CYCLE;
  return Math.floor(numeric);
}

async function getSettingValue(
  executor: Queryable,
  organizationId: string,
  branchId: string,
  key: string
): Promise<unknown | null> {
  const result = await executor.query<{ value: unknown }>(
    `SELECT value
       FROM settings
      WHERE organization_id = $1
        AND branch_id = $2
        AND key = $3
      LIMIT 1`,
    [organizationId, branchId, key]
  );
  return result.rows[0]?.value ?? null;
}

export async function getGuestInviteAllowance(
  executor: Queryable,
  organizationId: string,
  branchId: string
): Promise<number> {
  const raw = await getSettingValue(executor, organizationId, branchId, "guest_invites_per_cycle");
  return parseAllowance(raw);
}

export async function findActiveInviteCycle(
  executor: Queryable,
  organizationId: string,
  branchId: string,
  memberId: string,
  now = Math.floor(Date.now() / 1000)
): Promise<SubscriptionCycleRow | null> {
  const result = await executor.query<SubscriptionCycleRow>(
    `SELECT id, start_date, end_date, plan_months, sessions_per_month
       FROM subscriptions
      WHERE organization_id = $1
        AND branch_id = $2
        AND member_id = $3
        AND is_active = true
        AND start_date <= $4
        AND end_date > $4
      ORDER BY start_date DESC, end_date DESC, created_at DESC
      LIMIT 1`,
    [organizationId, branchId, memberId, now]
  );
  return result.rows[0] ?? null;
}

export async function getGuestInviteSummary(
  organizationId: string,
  branchId: string,
  memberId: string
): Promise<GuestInviteSummary | null> {
  const memberRows = await query<MemberRow>(
    `SELECT id, name, phone, card_code
       FROM members
      WHERE id = $1
        AND organization_id = $2
        AND branch_id = $3
        AND deleted_at IS NULL
      LIMIT 1`,
    [memberId, organizationId, branchId]
  );
  const member = memberRows[0];
  if (!member) return null;

  const executor: Queryable = {
    query: async <T>(text: string, params: readonly unknown[] = []) => ({
      rows: await query<T>(text, params as unknown[])
    })
  };
  const allowance = await getGuestInviteAllowance(executor, organizationId, branchId);
  const currentCycle = await findActiveInviteCycle(executor, organizationId, branchId, memberId);

  let used = 0;
  let recentGuests: RecentGuestRow[] = [];

  if (currentCycle) {
    const usedRows = await query<CountRow>(
      `SELECT COUNT(*)::int AS total
         FROM guest_passes
        WHERE organization_id = $1
          AND branch_id = $2
          AND inviter_subscription_id = $3
          AND voided_at IS NULL`,
      [organizationId, branchId, currentCycle.id]
    );
    used = Number(usedRows[0]?.total || 0);

    recentGuests = await query<RecentGuestRow>(
      `SELECT gp.id,
              gp.code,
              gp.member_name AS guest_name,
              gp.phone,
              gp.created_at,
              gp.expires_at,
              gp.used_at,
              gp.voided_at,
              gp.converted_at,
              gp.converted_member_id,
              converted.name AS converted_member_name
         FROM guest_passes gp
         LEFT JOIN members converted
           ON converted.id = gp.converted_member_id
          AND converted.organization_id = gp.organization_id
          AND converted.branch_id = gp.branch_id
        WHERE gp.organization_id = $1
          AND gp.branch_id = $2
          AND gp.inviter_subscription_id = $3
        ORDER BY gp.created_at DESC
        LIMIT 10`,
      [organizationId, branchId, currentCycle.id]
    );
  }

  return {
    member,
    allowance,
    used,
    remaining: currentCycle ? Math.max(allowance - used, 0) : 0,
    hasActiveCycle: Boolean(currentCycle),
    currentCycle: currentCycle
      ? {
          id: currentCycle.id,
          startDate: currentCycle.start_date,
          endDate: currentCycle.end_date,
          planMonths: currentCycle.plan_months,
          sessionsPerMonth: currentCycle.sessions_per_month,
        }
      : null,
    recentGuests,
  };
}
