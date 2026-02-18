import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  name: string;
  phone: string;
  card_code: string | null;
  gender: "male" | "female";
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

type SettingRow = {
  key: string;
  value: unknown;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const now = Math.floor(Date.now() / 1000);

    // Get all active members with their subscription, quota, and last check-in
    const members = await query<MemberRow>(
      `SELECT
        m.id, m.name, m.phone, m.card_code, m.gender,
        s.id AS sub_id, s.start_date AS sub_start_date, s.end_date AS sub_end_date,
        s.sessions_per_month AS sub_sessions_per_month, s.is_active AS sub_is_active,
        q.sessions_used AS quota_sessions_used, q.sessions_cap AS quota_sessions_cap,
        q.cycle_start AS quota_cycle_start, q.cycle_end AS quota_cycle_end,
        (SELECT MAX(l.timestamp) FROM logs l
         WHERE l.member_id = m.id AND l.organization_id = $1 AND l.branch_id = $2
         AND l.status = 'success') AS last_success_timestamp
      FROM members m
      LEFT JOIN subscriptions s ON s.member_id = m.id
        AND s.organization_id = $1 AND s.branch_id = $2
        AND s.is_active = true AND s.start_date <= $3 AND s.end_date > $3
      LEFT JOIN quotas q ON q.subscription_id = s.id
        AND q.organization_id = $1 AND q.branch_id = $2
        AND q.cycle_start <= $3 AND q.cycle_end > $3
      WHERE m.organization_id = $1 AND m.branch_id = $2 AND m.deleted_at IS NULL
      ORDER BY m.name`,
      [auth.organizationId, auth.branchId, now]
    );

    // Get relevant settings
    const settings = await query<SettingRow>(
      `SELECT key, value FROM settings
       WHERE organization_id = $1 AND branch_id = $2
       AND key IN ('scan_cooldown_seconds', 'offline_checkin_enabled', 'offline_max_age_hours')`,
      [auth.organizationId, auth.branchId]
    );

    // Transform to offline-friendly shape
    const bundle = members.map((m) => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      card_code: m.card_code,
      gender: m.gender,
      subscription: m.sub_id ? {
        id: m.sub_id,
        start_date: m.sub_start_date!,
        end_date: m.sub_end_date!,
        sessions_per_month: m.sub_sessions_per_month,
        is_active: m.sub_is_active ?? false
      } : null,
      quota: m.quota_cycle_start ? {
        sessions_used: m.quota_sessions_used ?? 0,
        sessions_cap: m.quota_sessions_cap ?? 26,
        cycle_start: m.quota_cycle_start,
        cycle_end: m.quota_cycle_end!
      } : null,
      last_success_timestamp: m.last_success_timestamp
    }));

    return ok({
      members: bundle,
      settings: settings.map((s) => ({ key: s.key, value: s.value })),
      serverNow: now
    });
  } catch (error) {
    return routeError(error);
  }
}
