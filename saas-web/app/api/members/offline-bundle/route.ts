import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable } from "@/lib/income-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  name: string;
  phone: string;
  gender: "male" | "female";
  photo_path: string | null;
  access_tier: string;
  card_code: string | null;
  address: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  sub_id: number | null;
  sub_start_date: number | null;
  sub_end_date: number | null;
  sub_sessions_per_month: number | null;
  sub_is_active: boolean | null;
  quota_sessions_used: number | null;
  quota_sessions_cap: number | null;
  quota_cycle_start: number | null;
  quota_cycle_end: number | null;
  last_success_timestamp: number | null;
};

type SubscriptionRow = {
  id: number;
  member_id: string;
  member_name: string | null;
  renewed_from_subscription_id: number | null;
  start_date: number;
  end_date: number;
  plan_months: number;
  price_paid: string | number | null;
  sessions_per_month: number | null;
  is_active: boolean;
  created_at: string | Date;
};

type FreezeRow = {
  id: number;
  subscription_id: number;
  start_date: number;
  end_date: number;
  days: number;
  created_at: string | Date;
};

type PaymentRow = {
  id: number;
  member_id: string;
  amount: string | number;
  type: "subscription" | "renewal" | "guest_pass" | "other";
  subscription_id: number | null;
  guest_pass_id: string | null;
  note: string | null;
  created_at: string | Date;
};

type AttendanceRow = {
  id: string;
  member_id: string | null;
  member_name: string | null;
  scanned_value: string;
  method: "scan" | "manual" | "camera";
  timestamp: number;
  status: "success" | "failure";
  reason_code: string;
  operation_id: string | null;
};

type SettingRow = {
  key: string;
  value: unknown;
};

function toUnixSeconds(input: string | Date | number | null | undefined) {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input > 1_000_000_000_000 ? Math.floor(input / 1000) : Math.floor(input);
  }
  if (!input) return 0;
  const date = input instanceof Date ? input : new Date(input);
  return Math.floor(date.getTime() / 1000);
}

function toNumber(input: unknown) {
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function isMissingRelation(error: unknown, relation?: string) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";
  if (code === "42P01") return true;

  const message = error instanceof Error ? error.message : String(error || "");
  if (!message.includes("does not exist")) return false;
  return relation ? message.includes(relation) : true;
}

async function getMembers(auth: { organizationId: string; branchId: string }, now: number) {
  let members: MemberRow[];
  try {
    members = await query<MemberRow>(
      `SELECT
         m.id,
         m.name,
         m.phone,
         m.gender,
         m.photo_path,
         m.access_tier,
         m.card_code,
         m.address,
         m.created_at,
         m.updated_at,
         s.id AS sub_id,
         s.start_date AS sub_start_date,
         s.end_date AS sub_end_date,
         s.sessions_per_month AS sub_sessions_per_month,
         s.is_active AS sub_is_active,
         q.sessions_used AS quota_sessions_used,
         q.sessions_cap AS quota_sessions_cap,
         q.cycle_start AS quota_cycle_start,
         q.cycle_end AS quota_cycle_end,
         (
           SELECT MAX(l.timestamp)
             FROM logs l
            WHERE l.member_id = m.id
              AND l.organization_id = $1
              AND l.branch_id = $2
              AND l.status = 'success'
         ) AS last_success_timestamp
       FROM members m
       LEFT JOIN subscriptions s
         ON s.member_id = m.id
        AND s.organization_id = $1
        AND s.branch_id = $2
        AND s.is_active = true
        AND s.start_date <= $3
        AND s.end_date > $3
       LEFT JOIN quotas q
         ON q.subscription_id = s.id
        AND q.organization_id = $1
        AND q.branch_id = $2
        AND q.cycle_start <= $3
        AND q.cycle_end > $3
      WHERE m.organization_id = $1
        AND m.branch_id = $2
        AND m.deleted_at IS NULL
      ORDER BY m.name`,
      [auth.organizationId, auth.branchId, now]
    );
  } catch (error) {
    if (!isMissingRelation(error, "quotas")) throw error;
    members = await query<MemberRow>(
      `SELECT
         m.id,
         m.name,
         m.phone,
         m.gender,
         m.photo_path,
         m.access_tier,
         m.card_code,
         m.address,
         m.created_at,
         m.updated_at,
         s.id AS sub_id,
         s.start_date AS sub_start_date,
         s.end_date AS sub_end_date,
         s.sessions_per_month AS sub_sessions_per_month,
         s.is_active AS sub_is_active,
         NULL::int AS quota_sessions_used,
         NULL::int AS quota_sessions_cap,
         NULL::bigint AS quota_cycle_start,
         NULL::bigint AS quota_cycle_end,
         (
           SELECT MAX(l.timestamp)
             FROM logs l
            WHERE l.member_id = m.id
              AND l.organization_id = $1
              AND l.branch_id = $2
              AND l.status = 'success'
         ) AS last_success_timestamp
       FROM members m
       LEFT JOIN subscriptions s
         ON s.member_id = m.id
        AND s.organization_id = $1
        AND s.branch_id = $2
        AND s.is_active = true
        AND s.start_date <= $3
        AND s.end_date > $3
      WHERE m.organization_id = $1
        AND m.branch_id = $2
        AND m.deleted_at IS NULL
      ORDER BY m.name`,
      [auth.organizationId, auth.branchId, now]
    );
  }

  return members.map((member) => ({
    id: member.id,
    name: member.name,
    phone: member.phone,
    gender: member.gender,
    photo_path: member.photo_path,
    access_tier: member.access_tier,
    card_code: member.card_code,
    address: member.address,
    created_at: toUnixSeconds(member.created_at),
    updated_at: toUnixSeconds(member.updated_at),
    subscription: member.sub_id
      ? {
          id: member.sub_id,
          start_date: member.sub_start_date!,
          end_date: member.sub_end_date!,
          sessions_per_month: member.sub_sessions_per_month,
          is_active: member.sub_is_active ?? false
        }
      : null,
    quota: member.quota_cycle_start
      ? {
          sessions_used: member.quota_sessions_used ?? 0,
          sessions_cap: member.quota_sessions_cap ?? 0,
          cycle_start: member.quota_cycle_start,
          cycle_end: member.quota_cycle_end!
        }
      : null,
    last_success_timestamp: member.last_success_timestamp
  }));
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const now = Math.floor(Date.now() / 1000);
    await ensurePaymentsTable();

    const [members, subscriptions, freezes, payments, attendanceLogs, settings] = await Promise.all([
      getMembers(auth, now),
      query<SubscriptionRow>(
        `SELECT s.id,
                s.member_id,
                m.name AS member_name,
                s.renewed_from_subscription_id,
                s.start_date,
                s.end_date,
                s.plan_months,
                s.price_paid,
                s.sessions_per_month,
                s.is_active,
                s.created_at
           FROM subscriptions s
           JOIN members m
             ON m.id = s.member_id
            AND m.organization_id = s.organization_id
            AND m.branch_id = s.branch_id
            AND m.deleted_at IS NULL
          WHERE s.organization_id = $1
            AND s.branch_id = $2
          ORDER BY s.created_at DESC`,
        [auth.organizationId, auth.branchId]
      ),
      query<FreezeRow>(
        `SELECT id, subscription_id, start_date, end_date, days, created_at
           FROM subscription_freezes
          WHERE organization_id = $1
            AND branch_id = $2
          ORDER BY created_at DESC`,
        [auth.organizationId, auth.branchId]
      ).catch((error) => {
        if (!isMissingRelation(error, "subscription_freezes")) throw error;
        return [] as FreezeRow[];
      }),
      query<PaymentRow>(
        `SELECT id, member_id, amount, type, subscription_id, guest_pass_id, note, created_at
           FROM payments
          WHERE organization_id = $1
            AND branch_id = $2
          ORDER BY created_at DESC`,
        [auth.organizationId, auth.branchId]
      ),
      query<AttendanceRow>(
        `SELECT CONCAT('server:', l.id::text) AS id,
                l.member_id,
                m.name AS member_name,
                l.scanned_value,
                l.method,
                l.timestamp,
                l.status,
                l.reason_code,
                l.operation_id
           FROM logs l
           LEFT JOIN members m
             ON m.id = l.member_id
            AND m.organization_id = l.organization_id
            AND m.branch_id = l.branch_id
          WHERE l.organization_id = $1
            AND l.branch_id = $2
          ORDER BY l.timestamp DESC
          LIMIT 1000`,
        [auth.organizationId, auth.branchId]
      ),
      query<SettingRow>(
        `SELECT key, value
           FROM settings
          WHERE organization_id = $1
            AND branch_id = $2
            AND key IN ('scan_cooldown_seconds', 'offline_checkin_enabled', 'offline_max_age_hours')`,
        [auth.organizationId, auth.branchId]
      ).catch((error) => {
        if (!isMissingRelation(error, "settings")) throw error;
        return [] as SettingRow[];
      })
    ]);

    return ok({
      members,
      subscriptions: subscriptions.map((subscription) => ({
        ...subscription,
        price_paid: subscription.price_paid == null ? null : toNumber(subscription.price_paid),
        created_at: toUnixSeconds(subscription.created_at)
      })),
      freezes: freezes.map((freeze) => ({
        ...freeze,
        created_at: toUnixSeconds(freeze.created_at)
      })),
      payments: payments.map((payment) => ({
        ...payment,
        amount: toNumber(payment.amount),
        created_at: new Date(payment.created_at).toISOString()
      })),
      attendanceLogs: attendanceLogs.map((row) => ({
        ...row,
        source: "server",
        sync_status: "synced"
      })),
      settings: settings.map((setting) => ({ key: setting.key, value: setting.value })),
      serverNow: now
    });
  } catch (error) {
    return routeError(error);
  }
}
