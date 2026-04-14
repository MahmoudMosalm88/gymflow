import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte } from "@/lib/income-events";
import { getCairoDayStartUnix } from "@/lib/cairo-time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NumberRow = {
  count?: string | number;
  total?: string | number;
  allowed?: string | number;
  warning?: string | number;
  denied?: string | number;
};

type LowSessionRow = {
  subscription_id: number;
  member_id: string;
  name: string;
  phone: string;
  gender: "male" | "female";
  start_date: number;
  end_date: number;
  sessions_per_month: number | null;
  sessions_used: number | null;
  sessions_cap: number | null;
};

type EndedSubscriptionRow = {
  id: number;
  member_id: string;
  name: string;
  phone: string | null;
  end_date: number;
  is_active: boolean;
};

type RevenueSavedRow = {
  reminder_days: number | null;
  messages_sent: number;
  members_reached: number;
  renewals_won: number;
  revenue_saved: string | number;
};

type RevenueByPlanRow = {
  plan_months: number | null;
  total_revenue: string | number;
  active_members: number;
  renewal_count: number;
  average_value: string | number;
};

type RevenueAtRiskRow = {
  id: number;
  member_id: string;
  name: string;
  phone: string | null;
  plan_months: number;
  price_paid: string | number | null;
  end_date: number;
  reminder_sent_at: string | null;
  has_reminder: boolean;
  has_renewal: boolean;
};

type RetentionRow = {
  member_id: string;
  name: string;
  phone: string | null;
  end_date: number;
  price_paid: string | number | null;
};

type AtRiskMemberRow = {
  member_id: string;
  name: string;
  phone: string | null;
  end_date: number;
  last_visit: number | null;
  recent_visits: number;
  previous_visits: number;
};

type CohortRow = {
  cohort_month: string;
  joined_members: number;
  still_active: number;
};

type MessagePerformanceRow = {
  message_type: string;
  messages_sent: number;
  members_reached: number;
  renewals_won: number;
  revenue_saved: string | number;
};

type GhostMemberRow = {
  member_id: string;
  name: string;
  phone: string | null;
  end_date: number;
  last_visit: number | null;
  recent_visits: number;
};

type AttendanceDeclineRow = {
  member_id: string;
  name: string;
  phone: string | null;
  last_visit: number | null;
  recent_visits: number;
  previous_visits: number;
};

type RenewalRevenueRow = {
  day: string;
  new_revenue: string | number;
  renewal_revenue: string | number;
  new_count: number;
  renewal_count: number;
};

type ReferralFunnelRow = {
  inviter_member_id: string | null;
  inviter_name: string | null;
  invites_sent: number;
  invites_used: number;
  converted_members: number;
  referral_revenue: string | number;
};

const WHATSAPP_ATTRIBUTION_WINDOW_DAYS = 14;

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readDaysParam(url: URL, fallback = 30) {
  const raw = Number(url.searchParams.get("days") || fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(365, Math.max(1, Math.trunc(raw)));
}

function readLimitParam(url: URL, fallback = 50, max = 500) {
  const raw = Number(url.searchParams.get("limit") || fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(raw)));
}

function readThresholdParam(url: URL, fallback = 3) {
  const raw = Number(url.searchParams.get("threshold") || fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.trunc(raw));
}

export async function GET(request: NextRequest, { params }: { params: { report: string } }) {
  try {
    const auth = await requireAuth(request);
    await ensurePaymentsTable();
    const report = params.report;
    const url = new URL(request.url);
    const nowDate = new Date();
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = getCairoDayStartUnix(nowDate);
    const startOfMonth = Math.floor(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1) / 1000);
    const startOfPreviousMonth = Math.floor(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - 1, 1) / 1000);

    if (report === "overview") {
      const [members, activeSubs, expiredSubs, revenue, currentMonthRevenue, previousMonthRevenue, today, revenueAtRisk, revenueSaved, atRiskMembers, newMembersThisMonth, churnedThisMonth, inGymNow, expiringThisWeek, yesterdayCheckIns, lastWeekActiveSubs, dailyCheckIns7d, ptLowBalance] = await Promise.all([
        query<NumberRow>(
          `SELECT COUNT(*)::text AS count
             FROM members
            WHERE organization_id = $1
              AND branch_id = $2
              AND deleted_at IS NULL`,
          [auth.organizationId, auth.branchId]
        ),
        query<NumberRow>(
          `SELECT COUNT(DISTINCT member_id)::text AS count
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND start_date <= $3
              AND end_date > $3`,
          [auth.organizationId, auth.branchId, now]
        ),
        query<NumberRow>(
          `WITH latest_cycle AS (
             SELECT DISTINCT ON (member_id)
                    member_id, end_date, is_active
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
              ORDER BY member_id, start_date DESC, end_date DESC, created_at DESC
           )
           SELECT COUNT(*)::text AS count
             FROM latest_cycle
            WHERE end_date < $3
              AND NOT EXISTS (
                SELECT 1
                  FROM subscriptions s
                 WHERE s.organization_id = $1
                   AND s.branch_id = $2
                   AND s.member_id = latest_cycle.member_id
                   AND s.is_active = true
                   AND s.start_date <= $3
                   AND s.end_date > $3
              )`,
          [auth.organizationId, auth.branchId, now]
        ),
        query<NumberRow>(
          `${incomeEventsCte}
           SELECT COALESCE(SUM(amount), 0)::text AS total
             FROM income_events`,
          [auth.organizationId, auth.branchId]
        ),
        query<NumberRow>(
          `${incomeEventsCte}
           SELECT COALESCE(SUM(amount), 0)::text AS total
             FROM income_events
            WHERE effective_at >= to_timestamp($3)`,
          [auth.organizationId, auth.branchId, startOfMonth]
        ),
        query<NumberRow>(
          `${incomeEventsCte}
           SELECT COALESCE(SUM(amount), 0)::text AS total
             FROM income_events
            WHERE effective_at >= to_timestamp($3)
              AND effective_at < to_timestamp($4)`,
          [auth.organizationId, auth.branchId, startOfPreviousMonth, startOfMonth]
        ),
        query<NumberRow>(
          `SELECT
              COUNT(*) FILTER (WHERE status = 'success')::text AS allowed,
              COUNT(*) FILTER (
                WHERE status = 'failure'
                  AND reason_code = 'already_checked_in_today'
              )::text AS warning,
              COUNT(*) FILTER (
                WHERE status = 'failure'
                  AND reason_code <> 'already_checked_in_today'
              )::text AS denied
             FROM logs
            WHERE organization_id = $1
              AND branch_id = $2
              AND timestamp >= $3
              AND timestamp < $4`,
          [auth.organizationId, auth.branchId, startOfDay, startOfDay + 86400]
        ),
        query<NumberRow>(
          `SELECT COALESCE(SUM(price_paid), 0)::text AS total
             FROM subscriptions s
            WHERE s.organization_id = $1
              AND s.branch_id = $2
              AND s.is_active = true
              AND s.start_date <= $3
              AND s.end_date > $3
              AND s.end_date <= $4
              AND NOT EXISTS (
                SELECT 1 FROM subscriptions r
                 WHERE r.organization_id = s.organization_id
                   AND r.branch_id = s.branch_id
                   AND r.member_id = s.member_id
                   AND r.renewed_from_subscription_id = s.id
              )`,
          [auth.organizationId, auth.branchId, now, now + 7 * 86400]
        ),
        query<NumberRow>(
          `WITH sent_messages AS (
             SELECT mq.member_id,
                    COALESCE(mq.sent_at, mq.scheduled_at) AS sent_at,
                    NULLIF(mq.payload->>'subscription_id', '')::int AS source_subscription_id
               FROM message_queue mq
              WHERE mq.organization_id = $1
                AND mq.branch_id = $2
                AND mq.type = 'renewal'
                AND mq.status = 'sent'
                AND COALESCE(mq.sent_at, mq.scheduled_at) >= to_timestamp($3)
           ),
           attributed AS (
             SELECT COALESCE(renewal.price_paid, 0)::numeric(12, 2) AS revenue_saved
               FROM sent_messages sm
               LEFT JOIN LATERAL (
                 SELECT s.price_paid
                   FROM subscriptions s
                  WHERE s.organization_id = $1
                    AND s.branch_id = $2
                    AND s.member_id = sm.member_id
                    AND s.renewed_from_subscription_id IS NOT NULL
                    AND (sm.source_subscription_id IS NULL OR s.renewed_from_subscription_id = sm.source_subscription_id)
                    AND s.created_at >= sm.sent_at
                    AND s.created_at < sm.sent_at + interval '14 day'
                  ORDER BY s.created_at ASC
                  LIMIT 1
               ) renewal ON true
           )
           SELECT COALESCE(SUM(revenue_saved), 0)::text AS total
             FROM attributed`,
          [auth.organizationId, auth.branchId, now - 30 * 86400]
        ),
        query<NumberRow>(
          `WITH active_members AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND is_active = true
                AND start_date <= $3
                AND end_date > $3
           ),
           activity AS (
             SELECT member_id,
                    MAX(timestamp) FILTER (WHERE status = 'success') AS last_visit
               FROM logs
              WHERE organization_id = $1
                AND branch_id = $2
                AND member_id IS NOT NULL
              GROUP BY member_id
           )
           SELECT COUNT(*)::text AS count
             FROM active_members am
             LEFT JOIN activity a ON a.member_id = am.member_id
            WHERE a.last_visit IS NULL OR a.last_visit < $4`,
          [auth.organizationId, auth.branchId, now, now - 14 * 86400]
        ),
        query<NumberRow>(
          `SELECT COUNT(*)::text AS count
             FROM members
            WHERE organization_id = $1
              AND branch_id = $2
              AND deleted_at IS NULL
              AND EXTRACT(EPOCH FROM created_at)::bigint >= $3`,
          [auth.organizationId, auth.branchId, startOfMonth]
        ),
        query<NumberRow>(
          `WITH active_start AS (
             SELECT DISTINCT member_id
               FROM subscriptions
             WHERE organization_id = $1
               AND branch_id = $2
                AND start_date <= $3
                AND end_date > $3
           ),
           active_end AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND start_date <= $4
                AND end_date > $4
           )
           SELECT COUNT(*)::text AS count
             FROM active_start s
             LEFT JOIN active_end e ON e.member_id = s.member_id
            WHERE e.member_id IS NULL`,
          [auth.organizationId, auth.branchId, startOfMonth, now]
        ),
        // Members likely still in gym — unique successful scans in last 60 min
        query<NumberRow>(
          `SELECT COUNT(DISTINCT member_id)::text AS count
             FROM logs
            WHERE organization_id = $1
              AND branch_id = $2
              AND status = 'success'
              AND timestamp >= $3`,
          [auth.organizationId, auth.branchId, now - 3600]
        ),
        // Active subscriptions expiring in the next 7 days
        query<NumberRow>(
          `SELECT COUNT(*)::text AS count
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND end_date > $3
              AND end_date <= $4`,
          [auth.organizationId, auth.branchId, now, now + 7 * 86400]
        ),
        // Yesterday's check-ins (for delta comparison)
        query<NumberRow>(
          `SELECT COUNT(*) FILTER (WHERE status = 'success')::text AS count
             FROM logs
            WHERE organization_id = $1
              AND branch_id = $2
              AND timestamp >= $3
              AND timestamp < $4`,
          [auth.organizationId, auth.branchId, startOfDay - 86400, startOfDay]
        ),
        // Last month's active subscriptions (for delta comparison).
        // Uses start_date/end_date window only — not is_active — because
        // is_active reflects the current state, not state 30 days ago.
        query<NumberRow>(
          `SELECT COUNT(DISTINCT member_id)::text AS count
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND start_date <= $3
              AND end_date > $3`,
          [auth.organizationId, auth.branchId, now - 30 * 86400]
        ),
        // 7-day daily check-in counts (for sparkline)
        query<{ day: number; count: number }>(
          `SELECT d::int AS day,
                  COUNT(*) FILTER (WHERE l.status = 'success')::int AS count
             FROM generate_series(0, 6) AS d
             LEFT JOIN logs l
               ON l.organization_id = $1
              AND l.branch_id = $2
              AND l.timestamp >= $3 + (d * 86400)
              AND l.timestamp < $3 + ((d + 1) * 86400)
            GROUP BY d ORDER BY d`,
          [auth.organizationId, auth.branchId, startOfDay - 6 * 86400]
        ),
        // PT packages with low session balance (≤2 remaining)
        query<NumberRow>(
          `SELECT COUNT(*)::text AS count
             FROM pt_packages
            WHERE organization_id = $1
              AND branch_id = $2
              AND status = 'active'
              AND GREATEST(total_sessions - sessions_used, 0) <= 2`,
          [auth.organizationId, auth.branchId]
        )
      ]);

      return ok({
        totalMembers: toNumber(members[0]?.count),
        memberCount: toNumber(members[0]?.count),
        activeSubscriptions: toNumber(activeSubs[0]?.count),
        expiredSubscriptions: toNumber(expiredSubs[0]?.count),
        totalRevenue: toNumber(revenue[0]?.total),
        currentMonthRevenue: toNumber(currentMonthRevenue[0]?.total),
        previousMonthRevenue: toNumber(previousMonthRevenue[0]?.total),
        arpm:
          toNumber(activeSubs[0]?.count) > 0
            ? toNumber(revenue[0]?.total) / toNumber(activeSubs[0]?.count)
            : 0,
        revenueAtRisk: toNumber(revenueAtRisk[0]?.total),
        revenueSaved: toNumber(revenueSaved[0]?.total),
        atRiskMembers: toNumber(atRiskMembers[0]?.count),
        netMemberGrowth: toNumber(newMembersThisMonth[0]?.count) - toNumber(churnedThisMonth[0]?.count),
        todayCheckIns: toNumber(today[0]?.allowed),
        inGymNow: toNumber(inGymNow[0]?.count),
        expiringThisWeek: toNumber(expiringThisWeek[0]?.count),
        newThisMonth: toNumber(newMembersThisMonth[0]?.count),
        todayStats: {
          allowed: toNumber(today[0]?.allowed),
          warning: toNumber(today[0]?.warning),
          denied: toNumber(today[0]?.denied)
        },
        yesterdayCheckIns: toNumber(yesterdayCheckIns[0]?.count),
        lastWeekActiveSubs: toNumber(lastWeekActiveSubs[0]?.count),
        checkInSparkline: (dailyCheckIns7d ?? []).map((r: any) => Number(r.count ?? 0)),
        ptLowBalance: toNumber(ptLowBalance[0]?.count),
      });
    }

    if (report === "daily-stats") {
      const days = readDaysParam(url, 30);
      const rangeStart = startOfDay - (days - 1) * 86400;

      const rows = await query(
        `WITH day_range AS (
           SELECT generate_series(
             date_trunc('day', to_timestamp($3)),
             date_trunc('day', to_timestamp($4)),
             interval '1 day'
           ) AS day
         ),
         agg AS (
           SELECT date_trunc('day', to_timestamp(timestamp)) AS day,
                  COUNT(*) FILTER (WHERE status = 'success')::int AS allowed,
                  COUNT(*) FILTER (
                    WHERE status = 'failure'
                      AND reason_code = 'already_checked_in_today'
                  )::int AS warning,
                  COUNT(*) FILTER (
                    WHERE status = 'failure'
                      AND reason_code <> 'already_checked_in_today'
                  )::int AS denied
             FROM logs
            WHERE organization_id = $1
              AND branch_id = $2
              AND timestamp >= $3
              AND timestamp < $5
            GROUP BY 1
         )
         SELECT to_char(day_range.day, 'YYYY-MM-DD') AS date,
                COALESCE(agg.allowed, 0)::int AS allowed,
                COALESCE(agg.warning, 0)::int AS warning,
                COALESCE(agg.denied, 0)::int AS denied
           FROM day_range
           LEFT JOIN agg ON agg.day = day_range.day
          ORDER BY day_range.day ASC`,
        [auth.organizationId, auth.branchId, rangeStart, startOfDay, startOfDay + 86400]
      );

      return ok(rows);
    }

    if (report === "today-hourly") {
      // Today's check-ins bucketed by hour (0–23), for the dashboard mini chart
      const rows = await query<{ hour: number; count: number }>(
        `SELECT EXTRACT(HOUR FROM to_timestamp(timestamp) AT TIME ZONE 'Africa/Cairo')::int AS hour,
                COUNT(*)::int AS count
           FROM logs
          WHERE organization_id = $1
            AND branch_id = $2
            AND status = 'success'
            AND timestamp >= $3
            AND timestamp < $4
          GROUP BY 1
          ORDER BY 1`,
        [auth.organizationId, auth.branchId, startOfDay, startOfDay + 86400]
      );
      // Fill all 24 hours so the chart always has a full array
      const byHour = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        count: rows.find(r => r.hour === h)?.count ?? 0,
      }));
      return ok(byHour);
    }

    if (report === "hourly-distribution") {
      // Heat map data: day-of-week × hour grid over the last 4 weeks
      const weeksBack = 4;
      const rangeStart = startOfDay - weeksBack * 7 * 86400;

      const rows = await query<{ dow: number; hour: number; count: number }>(
        `SELECT EXTRACT(DOW FROM to_timestamp(timestamp))::int AS dow,
                EXTRACT(HOUR FROM to_timestamp(timestamp))::int AS hour,
                COUNT(*)::int AS count
           FROM logs
          WHERE organization_id = $1
            AND branch_id = $2
            AND status = 'success'
            AND timestamp >= $3
            AND timestamp < $4
          GROUP BY 1, 2
          ORDER BY 1, 2`,
        [auth.organizationId, auth.branchId, rangeStart, startOfDay + 86400]
      );
      return ok(rows);
    }

    // Legacy compatibility for older clients still requesting removed report ids.
    if (report === "member-attendance-trends") {
      const days = readDaysParam(url, 30);
      const rangeStart = startOfDay - (days - 1) * 86400;

      const rows = await query(
        `WITH day_range AS (
           SELECT generate_series(
             date_trunc('day', to_timestamp($3)),
             date_trunc('day', to_timestamp($4)),
             interval '1 day'
           ) AS day
         ),
         agg AS (
           SELECT date_trunc('day', to_timestamp(timestamp)) AS day,
                  COUNT(*) FILTER (WHERE status = 'success')::int AS visits
             FROM logs
            WHERE organization_id = $1
              AND branch_id = $2
              AND timestamp >= $3
              AND timestamp < $5
            GROUP BY 1
         )
         SELECT to_char(day_range.day, 'YYYY-MM-DD') AS date,
                COALESCE(agg.visits, 0)::int AS visits
           FROM day_range
           LEFT JOIN agg ON agg.day = day_range.day
          ORDER BY day_range.day ASC`,
        [auth.organizationId, auth.branchId, rangeStart, startOfDay, startOfDay + 86400]
      );

      return ok(rows);
    }

    if (report === "top-members") {
      const days = readDaysParam(url, 30);
      const limit = readLimitParam(url, 10, 100);
      const rangeStart = now - days * 86400;

      const rows = await query(
        `SELECT l.member_id,
                COALESCE(m.name, 'Unknown') AS name,
                COUNT(*)::int AS visits
           FROM logs l
           LEFT JOIN members m
             ON m.id = l.member_id
            AND m.organization_id = l.organization_id
            AND m.branch_id = l.branch_id
          WHERE l.organization_id = $1
            AND l.branch_id = $2
            AND l.status = 'success'
            AND l.timestamp >= $3
            AND l.member_id IS NOT NULL
          GROUP BY l.member_id, m.name
          ORDER BY visits DESC
          LIMIT $4`,
        [auth.organizationId, auth.branchId, rangeStart, limit]
      );

      return ok(rows);
    }

    if (report === "detailed-revenue-breakdown") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const rows = await query(
        `${incomeEventsCte}
         SELECT source, amount::float8 AS amount
           FROM (
             SELECT 'Subscriptions'::text AS source,
                    COALESCE(
                      SUM(CASE WHEN payment_type IN ('subscription', 'renewal') THEN amount ELSE 0 END),
                      0
                    )::numeric(12, 2) AS amount
               FROM income_events
              WHERE effective_at >= to_timestamp($3)
             UNION ALL
             SELECT 'Guest Passes'::text AS source,
                    COALESCE(
                      SUM(CASE WHEN payment_type = 'guest_pass' THEN amount ELSE 0 END),
                      0
                    )::numeric(12, 2) AS amount
               FROM income_events
              WHERE effective_at >= to_timestamp($3)
             UNION ALL
             SELECT 'Other'::text AS source, 0::numeric(12, 2) AS amount
           ) grouped`,
        [auth.organizationId, auth.branchId, rangeStart]
      );

      return ok(rows);
    }

    if (report === "outstanding-payments-debtors") {
      const limit = readLimitParam(url, 200, 500);

      // Back-compat approximation: expired active subscriptions are treated as renewals due.
      const rows = await query(
        `WITH latest_cycle AS (
           SELECT DISTINCT ON (s.member_id)
                  s.member_id,
                  s.price_paid,
                  s.end_date
             FROM subscriptions s
            WHERE s.organization_id = $1
              AND s.branch_id = $2
            ORDER BY s.member_id, s.start_date DESC, s.end_date DESC, s.created_at DESC
         )
         SELECT m.name,
                m.phone,
                COALESCE(lc.price_paid, 0)::float8 AS amount_due,
                lc.end_date AS due_date
           FROM latest_cycle lc
           JOIN members m
             ON m.id = lc.member_id
            AND m.organization_id = $1
            AND m.branch_id = $2
          WHERE lc.end_date < $3
            AND NOT EXISTS (
              SELECT 1
                FROM subscriptions s
               WHERE s.organization_id = $1
                 AND s.branch_id = $2
                 AND s.member_id = lc.member_id
                 AND s.is_active = true
                 AND s.start_date <= $3
                 AND s.end_date > $3
            )
          ORDER BY lc.end_date DESC
          LIMIT $4`,
        [auth.organizationId, auth.branchId, now, limit]
      );

      return ok(rows);
    }

    if (report === "peak-hours-capacity-utilization") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const rows = await query(
        `SELECT EXTRACT(HOUR FROM to_timestamp(timestamp))::int AS hour,
                COUNT(*)::int AS visits
           FROM logs
          WHERE organization_id = $1
            AND branch_id = $2
            AND status = 'success'
            AND timestamp >= $3
          GROUP BY 1
          ORDER BY 1`,
        [auth.organizationId, auth.branchId, rangeStart]
      );

      return ok(rows);
    }

    if (report === "denial-reasons") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const rows = await query(
        `SELECT reason_code, COUNT(*)::int AS count
           FROM logs
          WHERE organization_id = $1
            AND branch_id = $2
            AND status = 'failure'
            AND timestamp >= $3
          GROUP BY reason_code
          ORDER BY count DESC`,
        [auth.organizationId, auth.branchId, rangeStart]
      );

      return ok(rows);
    }

    if (report === "denied-entries") {
      const days = readDaysParam(url, 30);
      const limit = readLimitParam(url, 100, 500);
      const rangeStart = now - days * 86400;

      const rows = await query(
        `SELECT COALESCE(m.name, l.scanned_value) AS name,
                l.timestamp,
                l.reason_code
           FROM logs l
           LEFT JOIN members m
             ON m.id = l.member_id
            AND m.organization_id = l.organization_id
            AND m.branch_id = l.branch_id
          WHERE l.organization_id = $1
            AND l.branch_id = $2
            AND l.status = 'failure'
            AND l.timestamp >= $3
          ORDER BY l.timestamp DESC
          LIMIT $4`,
        [auth.organizationId, auth.branchId, rangeStart, limit]
      );

      return ok(rows);
    }

    if (report === "expiring-subscriptions") {
      const days = readDaysParam(url, 7);
      const cutoff = now + days * 86400;

      const rows = await query(
        `SELECT s.id,
                s.member_id,
                s.end_date,
                m.name,
                m.phone
           FROM subscriptions s
           JOIN members m
             ON m.id = s.member_id
            AND m.organization_id = s.organization_id
            AND m.branch_id = s.branch_id
          WHERE s.organization_id = $1
            AND s.branch_id = $2
            AND s.is_active = true
            AND s.start_date <= $3
            AND s.end_date > $3
            AND s.end_date <= $4
          ORDER BY s.end_date ASC`,
        [auth.organizationId, auth.branchId, now, cutoff]
      );

      return ok(rows);
    }

    if (report === "revenue-at-risk") {
      const days = readDaysParam(url, 14);
      const cutoff = now + days * 86400;

      const rows = await query<RevenueAtRiskRow>(
        `WITH expiring_cycles AS (
           SELECT s.id,
                  s.member_id,
                  s.plan_months,
                  s.price_paid,
                  s.end_date,
                  m.name,
                  m.phone
             FROM subscriptions s
             JOIN members m
               ON m.id = s.member_id
              AND m.organization_id = s.organization_id
              AND m.branch_id = s.branch_id
            WHERE s.organization_id = $1
              AND s.branch_id = $2
              AND s.is_active = true
              AND s.start_date <= $3
              AND s.end_date > $3
              AND s.end_date <= $4
              AND m.deleted_at IS NULL
         ),
         reminder_events AS (
           SELECT DISTINCT ON ((payload->>'subscription_id'))
                  (payload->>'subscription_id')::bigint AS subscription_id,
                  COALESCE(sent_at, scheduled_at) AS reminder_at,
                  status
             FROM message_queue
            WHERE organization_id = $1
              AND branch_id = $2
              AND type = 'renewal'
              AND status IN ('pending', 'processing', 'sent')
              AND payload ? 'subscription_id'
            ORDER BY (payload->>'subscription_id'), COALESCE(sent_at, scheduled_at) DESC
         ),
         renewal_links AS (
           SELECT DISTINCT renewed_from_subscription_id AS previous_subscription_id
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND renewed_from_subscription_id IS NOT NULL
         ),
         wa_active AS (
           SELECT EXISTS(
             SELECT 1 FROM message_queue
              WHERE organization_id = $1
                AND branch_id = $2
                AND type = 'renewal'
              LIMIT 1
           ) AS has_any
         )
         SELECT ec.id,
                ec.member_id,
                ec.name,
                ec.phone,
                ec.plan_months,
                ec.price_paid,
                ec.end_date,
                re.reminder_at::text AS reminder_sent_at,
                (re.status = 'sent') AS has_reminder,
                (re.status IN ('pending', 'processing')) AS has_pending_reminder,
                (rl.previous_subscription_id IS NOT NULL) AS has_renewal,
                wa.has_any AS wa_active
           FROM expiring_cycles ec
           LEFT JOIN reminder_events re
             ON re.subscription_id = ec.id
           LEFT JOIN renewal_links rl
             ON rl.previous_subscription_id = ec.id
           CROSS JOIN wa_active wa
          ORDER BY ec.end_date ASC, ec.name ASC`,
        [auth.organizationId, auth.branchId, now, cutoff]
      );

      const items = rows.map((row) => {
        const pricePaid = toNumber(row.price_paid);
        const amountAtRisk = row.has_renewal ? 0 : pricePaid;
        const reminderStatus = row.has_reminder
          ? "reminded"
          : (row as any).has_pending_reminder
            ? "pending"
            : (row as any).wa_active
              ? "not_reminded"
              : "no_automation";
        return {
          id: row.id,
          member_id: row.member_id,
          name: row.name,
          phone: row.phone,
          plan_months: row.plan_months,
          price_paid: pricePaid,
          amount_at_risk: amountAtRisk,
          end_date: row.end_date,
          days_left: Math.max(0, Math.ceil((row.end_date - now) / 86400)),
          reminder_status: reminderStatus,
          reminder_sent_at: row.reminder_sent_at,
          renewal_status: row.has_renewal ? "renewed" : "at_risk",
        };
      });

      const summary = items.reduce(
        (acc, item) => {
          acc.membersInWindow += 1;
          acc.totalExpiringValue += item.price_paid;
          acc.revenueAtRisk += item.amount_at_risk;
          if (item.reminder_status === "reminded") acc.remindedMembers += 1;
          if (item.reminder_status === "reminded") acc.remindedValue += item.amount_at_risk;
          if (item.reminder_status === "not_reminded") acc.notRemindedMembers += 1;
          if (item.reminder_status === "not_reminded") acc.notRemindedValue += item.amount_at_risk;
          if (item.renewal_status === "renewed") {
            acc.renewedMembers += 1;
            acc.revenueSecured += item.price_paid;
          }
          return acc;
        },
        {
          membersInWindow: 0,
          totalExpiringValue: 0,
          revenueAtRisk: 0,
          remindedMembers: 0,
          remindedValue: 0,
          notRemindedMembers: 0,
          notRemindedValue: 0,
          renewedMembers: 0,
          revenueSecured: 0,
        }
      );

      return ok({ summary, items });
    }

    if (report === "ended-subscriptions") {
      const limit = readLimitParam(url, 100, 500);

      const rows = await query<EndedSubscriptionRow>(
        `WITH latest_cycle AS (
           SELECT DISTINCT ON (s.member_id)
                  s.id,
                  s.member_id,
                  s.end_date,
                  s.is_active
             FROM subscriptions s
            WHERE s.organization_id = $1
              AND s.branch_id = $2
            ORDER BY s.member_id, s.start_date DESC, s.end_date DESC, s.created_at DESC
         )
         SELECT lc.id,
                lc.member_id,
                lc.end_date,
                lc.is_active,
                m.name,
                m.phone
           FROM latest_cycle lc
           JOIN members m
             ON m.id = lc.member_id
            AND m.organization_id = $1
            AND m.branch_id = $2
          WHERE (lc.end_date <= $3 OR lc.is_active = false)
            AND NOT EXISTS (
              SELECT 1
                FROM subscriptions s
               WHERE s.organization_id = $1
                 AND s.branch_id = $2
                 AND s.member_id = lc.member_id
                 AND s.is_active = true
                 AND s.start_date <= $3
                 AND s.end_date > $3
            )
          ORDER BY lc.end_date DESC
          LIMIT $4`,
        [auth.organizationId, auth.branchId, now, limit]
      );

      const output = rows.map((row) => ({
        subscription_id: row.id,
        member_id: row.member_id,
        name: row.name,
        phone: row.phone,
        end_date: row.end_date,
        status: row.end_date <= now ? "expired" : "inactive"
      }));

      return ok(output);
    }

    if (report === "low-sessions") {
      const threshold = readThresholdParam(url, 3);
      const limit = readLimitParam(url, 100, 500);

      const rows = await query<LowSessionRow>(
        `SELECT s.id AS subscription_id,
                s.member_id,
                s.start_date,
                s.end_date,
                s.sessions_per_month,
                m.name,
                m.phone,
                m.gender,
                q.sessions_used,
                q.sessions_cap
           FROM subscriptions s
           JOIN members m
             ON m.id = s.member_id
            AND m.organization_id = s.organization_id
            AND m.branch_id = s.branch_id
           LEFT JOIN LATERAL (
             SELECT sessions_used, sessions_cap
               FROM quotas q
              WHERE q.organization_id = s.organization_id
                AND q.branch_id = s.branch_id
                AND q.subscription_id = s.id
                AND q.cycle_start <= $3
                AND q.cycle_end > $3
              ORDER BY q.updated_at DESC
              LIMIT 1
           ) q ON true
          WHERE s.organization_id = $1
            AND s.branch_id = $2
            AND s.is_active = true
            AND s.end_date > $3
          ORDER BY s.end_date ASC`,
        [auth.organizationId, auth.branchId, now]
      );

      const output = rows
        .map((row) => {
          const defaultCap = row.gender === "female" ? 30 : 26;
          const cap = row.sessions_cap ?? row.sessions_per_month ?? defaultCap;
          const used = row.sessions_used ?? 0;

          return {
            member_id: row.member_id,
            name: row.name,
            phone: row.phone,
            sessions_remaining: Math.max(0, Number(cap) - Number(used))
          };
        })
        .filter((row) => row.sessions_remaining <= threshold)
        .sort((a, b) => a.sessions_remaining - b.sessions_remaining)
        .slice(0, limit);

      return ok(output);
    }

    if (report === "revenue-saved-whatsapp") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const rows = await query<RevenueSavedRow>(
        `WITH sent_messages AS (
           SELECT mq.id,
                  mq.member_id,
                  COALESCE(mq.sent_at, mq.scheduled_at) AS sent_at,
                  NULLIF(mq.payload->>'reminder_days', '')::int AS reminder_days,
                  NULLIF(mq.payload->>'subscription_id', '')::int AS source_subscription_id
             FROM message_queue mq
            WHERE mq.organization_id = $1
              AND mq.branch_id = $2
              AND mq.type = 'renewal'
              AND mq.status = 'sent'
              AND COALESCE(mq.sent_at, mq.scheduled_at) >= to_timestamp($3)
         ),
         attributed AS (
           SELECT sm.id,
                  sm.member_id,
                  sm.reminder_days,
                  renewal.id AS renewal_id,
                  COALESCE(renewal.price_paid, 0)::numeric(12, 2) AS revenue_saved
             FROM sent_messages sm
             LEFT JOIN LATERAL (
               SELECT s.id, s.price_paid
                 FROM subscriptions s
                WHERE s.organization_id = $1
                  AND s.branch_id = $2
                  AND s.member_id = sm.member_id
                  AND s.renewed_from_subscription_id IS NOT NULL
                  AND (sm.source_subscription_id IS NULL OR s.renewed_from_subscription_id = sm.source_subscription_id)
                  AND s.created_at >= sm.sent_at
                  AND s.created_at < sm.sent_at + interval '14 day'
                ORDER BY s.created_at ASC
                LIMIT 1
             ) renewal ON true
         )
         SELECT reminder_days,
                COUNT(*)::int AS messages_sent,
                COUNT(DISTINCT member_id)::int AS members_reached,
                COUNT(renewal_id)::int AS renewals_won,
                COALESCE(SUM(revenue_saved), 0)::text AS revenue_saved
           FROM attributed
          GROUP BY reminder_days
          ORDER BY reminder_days DESC NULLS LAST`
        ,
        [auth.organizationId, auth.branchId, rangeStart]
      );

      const normalized = rows.map((row) => ({
        reminderDays: row.reminder_days ?? 0,
        messagesSent: row.messages_sent,
        membersReached: row.members_reached,
        renewalsWon: row.renewals_won,
        revenueSaved: toNumber(row.revenue_saved),
      }));

      return ok({
        attributionWindowDays: WHATSAPP_ATTRIBUTION_WINDOW_DAYS,
        summary: {
          messagesSent: normalized.reduce((sum, row) => sum + row.messagesSent, 0),
          membersReached: normalized.reduce((sum, row) => sum + row.membersReached, 0),
          renewalsWon: normalized.reduce((sum, row) => sum + row.renewalsWon, 0),
          revenueSaved: normalized.reduce((sum, row) => sum + row.revenueSaved, 0),
        },
        rows: normalized,
      });
    }

    if (report === "revenue-by-plan") {
      const days = readDaysParam(url, 90);
      const rangeStart = now - days * 86400;

      const rows = await query<RevenueByPlanRow>(
        `${incomeEventsCte},
         revenue_by_plan AS (
           SELECT COALESCE(plan_months, 0)::int AS plan_months,
                  COALESCE(SUM(amount), 0)::numeric(12, 2) AS total_revenue,
                  COUNT(*) FILTER (WHERE payment_type = 'renewal')::int AS renewal_count,
                  COALESCE(AVG(amount), 0)::numeric(12, 2) AS average_value
             FROM income_events ie
            WHERE ie.effective_at >= to_timestamp($3)
            GROUP BY COALESCE(plan_months, 0)
         ),
         active_by_plan AS (
           SELECT COALESCE(plan_months, 0)::int AS plan_months,
                  COUNT(DISTINCT member_id)::int AS active_members
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND start_date <= $4
              AND end_date > $4
            GROUP BY COALESCE(plan_months, 0)
         )
         SELECT COALESCE(r.plan_months, a.plan_months) AS plan_months,
                COALESCE(r.total_revenue, 0)::text AS total_revenue,
                COALESCE(a.active_members, 0)::int AS active_members,
                COALESCE(r.renewal_count, 0)::int AS renewal_count,
                COALESCE(r.average_value, 0)::text AS average_value
           FROM revenue_by_plan r
           FULL OUTER JOIN active_by_plan a
             ON a.plan_months = r.plan_months
          ORDER BY COALESCE(r.total_revenue, 0) DESC, COALESCE(r.plan_months, a.plan_months) ASC`,
        [auth.organizationId, auth.branchId, rangeStart, now]
      );

      return ok(
        rows.map((row) => ({
          planMonths: row.plan_months ?? 0,
          totalRevenue: toNumber(row.total_revenue),
          activeMembers: row.active_members,
          renewalCount: row.renewal_count,
          averageValue: toNumber(row.average_value),
        }))
      );
    }

    if (report === "retention-churn") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const [summaryRows, churnRows] = await Promise.all([
        query<{
          active_start: number;
          active_end: number;
          retained_members: number;
          churned_members: number;
          lost_revenue: string | number;
        }>(
          `WITH active_start AS (
             SELECT DISTINCT member_id
               FROM subscriptions
             WHERE organization_id = $1
               AND branch_id = $2
                AND start_date <= $3
                AND end_date > $3
           ),
           active_end AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND start_date <= $4
                AND end_date > $4
           ),
           churned AS (
             SELECT s.member_id
               FROM active_start s
               LEFT JOIN active_end e ON e.member_id = s.member_id
              WHERE e.member_id IS NULL
           ),
           latest_churned_cycle AS (
             SELECT DISTINCT ON (sub.member_id)
                    sub.member_id,
                    COALESCE(sub.price_paid, 0)::numeric(12, 2) AS price_paid
               FROM subscriptions sub
               JOIN churned c ON c.member_id = sub.member_id
              WHERE sub.organization_id = $1
                AND sub.branch_id = $2
              ORDER BY sub.member_id, sub.end_date DESC, sub.created_at DESC
           )
           SELECT
             (SELECT COUNT(*)::int FROM active_start) AS active_start,
             (SELECT COUNT(*)::int FROM active_end) AS active_end,
             (SELECT COUNT(*)::int FROM active_start s JOIN active_end e ON e.member_id = s.member_id) AS retained_members,
             (SELECT COUNT(*)::int FROM churned) AS churned_members,
             (SELECT COALESCE(SUM(price_paid), 0)::text FROM latest_churned_cycle) AS lost_revenue`,
          [auth.organizationId, auth.branchId, rangeStart, now]
        ),
        query<RetentionRow>(
          `WITH active_start AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND start_date <= $3
                AND end_date > $3
           ),
           active_end AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND start_date <= $4
                AND end_date > $4
           ),
           churned AS (
             SELECT s.member_id
               FROM active_start s
               LEFT JOIN active_end e ON e.member_id = s.member_id
              WHERE e.member_id IS NULL
           )
           SELECT DISTINCT ON (m.id)
                  m.id AS member_id,
                  m.name,
                  m.phone,
                  sub.end_date,
                  sub.price_paid
             FROM churned c
             JOIN members m
               ON m.id = c.member_id
              AND m.organization_id = $1
              AND m.branch_id = $2
             JOIN subscriptions sub
               ON sub.member_id = c.member_id
              AND sub.organization_id = $1
              AND sub.branch_id = $2
            ORDER BY m.id, sub.end_date DESC, sub.created_at DESC`,
          [auth.organizationId, auth.branchId, rangeStart, now]
        ),
      ]);

      const summary = summaryRows[0] || {
        active_start: 0,
        active_end: 0,
        retained_members: 0,
        churned_members: 0,
        lost_revenue: 0,
      };
      const activeStart = Number(summary.active_start || 0);
      const retainedMembers = Number(summary.retained_members || 0);
      const churnedMembers = Number(summary.churned_members || 0);

      return ok({
        summary: {
          activeStart,
          activeEnd: Number(summary.active_end || 0),
          retainedMembers,
          churnedMembers,
          retentionRate: activeStart > 0 ? (retainedMembers / activeStart) * 100 : 0,
          churnRate: activeStart > 0 ? (churnedMembers / activeStart) * 100 : 0,
          lostRevenue: toNumber(summary.lost_revenue),
        },
        rows: churnRows.map((row) => ({
          memberId: row.member_id,
          name: row.name,
          phone: row.phone,
          endDate: row.end_date,
          lostValue: toNumber(row.price_paid),
        })),
      });
    }

    if (report === "at-risk-members") {
      const days = readDaysParam(url, 14);
      const rangeStart = now - days * 86400;
      const previousStart = rangeStart - days * 86400;

      const rows = await query<AtRiskMemberRow>(
        `WITH active_members AS (
           SELECT DISTINCT ON (s.member_id)
                  s.member_id,
                  s.end_date
             FROM subscriptions s
            WHERE s.organization_id = $1
              AND s.branch_id = $2
              AND s.is_active = true
              AND s.start_date <= $3
              AND s.end_date > $3
            ORDER BY s.member_id, s.end_date DESC, s.created_at DESC
         ),
         activity AS (
           SELECT l.member_id,
                  MAX(l.timestamp) FILTER (WHERE l.status = 'success') AS last_visit,
                  COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= $4) AS recent_visits,
                  COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= $5 AND l.timestamp < $4) AS previous_visits
             FROM logs l
            WHERE l.organization_id = $1
              AND l.branch_id = $2
              AND l.member_id IS NOT NULL
            GROUP BY l.member_id
         )
         SELECT m.id AS member_id,
                m.name,
                m.phone,
                am.end_date,
                activity.last_visit,
                COALESCE(activity.recent_visits, 0)::int AS recent_visits,
                COALESCE(activity.previous_visits, 0)::int AS previous_visits
           FROM active_members am
           JOIN members m
             ON m.id = am.member_id
            AND m.organization_id = $1
            AND m.branch_id = $2
           LEFT JOIN activity ON activity.member_id = am.member_id
          WHERE activity.last_visit IS NULL
             OR activity.last_visit < $4
             OR (COALESCE(activity.previous_visits, 0) >= 2 AND COALESCE(activity.recent_visits, 0) = 0)
          ORDER BY activity.last_visit NULLS FIRST, am.end_date ASC, m.name ASC
          LIMIT 200`,
        [auth.organizationId, auth.branchId, now, rangeStart, previousStart]
      );

      return ok({
        thresholdDays: days,
        summary: {
          memberCount: rows.length,
          highRiskCount: rows.filter((row) => row.last_visit == null || (now - Number(row.last_visit)) / 86400 >= days).length,
        },
        rows: rows.map((row) => {
          const lastVisitDaysAgo = row.last_visit ? Math.floor((now - Number(row.last_visit)) / 86400) : null;
          const droppedToZero = row.previous_visits >= 2 && row.recent_visits === 0;
          return {
            memberId: row.member_id,
            name: row.name,
            phone: row.phone,
            endDate: row.end_date,
            lastVisit: row.last_visit,
            recentVisits: row.recent_visits,
            previousVisits: row.previous_visits,
            riskLevel: lastVisitDaysAgo == null || lastVisitDaysAgo >= days ? "high" : droppedToZero ? "medium" : "low",
            riskReason:
              lastVisitDaysAgo == null
                ? "No successful check-in recorded yet"
                : droppedToZero
                  ? `Attendance dropped from ${row.previous_visits} visits to 0`
                  : `Has not checked in for ${lastVisitDaysAgo} days`,
          };
        }),
      });
    }

    if (report === "cohort-retention") {
      const rows = await query<CohortRow>(
        `WITH first_cycle AS (
           SELECT member_id,
                  MIN(start_date) AS first_start_date
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
            GROUP BY member_id
         ),
         active_now AS (
           SELECT DISTINCT member_id
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND start_date <= $3
              AND end_date > $3
         )
         SELECT to_char(to_timestamp(fc.first_start_date), 'YYYY-MM') AS cohort_month,
                COUNT(*)::int AS joined_members,
                COUNT(*) FILTER (WHERE an.member_id IS NOT NULL)::int AS still_active
           FROM first_cycle fc
           LEFT JOIN active_now an ON an.member_id = fc.member_id
          GROUP BY to_char(to_timestamp(fc.first_start_date), 'YYYY-MM')
          ORDER BY cohort_month DESC
          LIMIT 24`,
        [auth.organizationId, auth.branchId, now]
      );

      return ok(
        rows.map((row) => ({
          cohortMonth: row.cohort_month,
          joinedMembers: row.joined_members,
          stillActive: row.still_active,
          retentionRate: row.joined_members > 0 ? (row.still_active / row.joined_members) * 100 : 0,
        }))
      );
    }

    if (report === "whatsapp-performance") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const rows = await query<MessagePerformanceRow>(
        `WITH sent_messages AS (
           SELECT mq.id,
                  COALESCE(NULLIF(mq.payload->>'sequence_kind', ''), mq.type) AS message_type,
                  mq.member_id,
                  COALESCE(mq.sent_at, mq.scheduled_at) AS sent_at,
                  NULLIF(mq.payload->>'subscription_id', '')::int AS source_subscription_id
             FROM message_queue mq
            WHERE mq.organization_id = $1
              AND mq.branch_id = $2
              AND mq.status = 'sent'
              AND COALESCE(mq.sent_at, mq.scheduled_at) >= to_timestamp($3)
         ),
         attributed_renewals AS (
           SELECT sm.id,
                  renewal.id AS renewal_id,
                  COALESCE(renewal.price_paid, 0)::numeric(12, 2) AS revenue_saved
             FROM sent_messages sm
             LEFT JOIN LATERAL (
               SELECT s.id, s.price_paid
                 FROM subscriptions s
                WHERE s.organization_id = $1
                  AND s.branch_id = $2
                  AND sm.message_type = 'renewal'
                  AND s.member_id = sm.member_id
                  AND s.renewed_from_subscription_id IS NOT NULL
                  AND (sm.source_subscription_id IS NULL OR s.renewed_from_subscription_id = sm.source_subscription_id)
                  AND s.created_at >= sm.sent_at
                  AND s.created_at < sm.sent_at + interval '14 day'
                ORDER BY s.created_at ASC
                LIMIT 1
             ) renewal ON true
         )
         SELECT sm.message_type,
                COUNT(*)::int AS messages_sent,
                COUNT(DISTINCT sm.member_id)::int AS members_reached,
                COUNT(ar.renewal_id)::int AS renewals_won,
                COALESCE(SUM(ar.revenue_saved), 0)::text AS revenue_saved
           FROM sent_messages sm
           LEFT JOIN attributed_renewals ar ON ar.id = sm.id
          GROUP BY sm.message_type
          ORDER BY messages_sent DESC, sm.message_type ASC`,
        [auth.organizationId, auth.branchId, rangeStart]
      );

      return ok({
        attributionWindowDays: WHATSAPP_ATTRIBUTION_WINDOW_DAYS,
        rows: rows.map((row) => ({
          messageType: row.message_type,
          messagesSent: row.messages_sent,
          membersReached: row.members_reached,
          renewalsWon: row.renewals_won,
          revenueSaved: toNumber(row.revenue_saved),
        })),
      });
    }

    if (report === "post-expiry-performance") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const [rows, summaryRows] = await Promise.all([
        query<{
          sequence_step: number;
          messages_sent: number;
          members_reached: number;
          renewals_won: number;
          revenue_saved: string | number;
        }>(
          `WITH sent_messages AS (
             SELECT mq.id,
                    mq.member_id,
                    COALESCE(mq.sent_at, mq.scheduled_at) AS sent_at,
                    NULLIF(mq.payload->>'sequence_step', '')::int AS sequence_step,
                    NULLIF(mq.payload->>'subscription_id', '')::int AS source_subscription_id
               FROM message_queue mq
              WHERE mq.organization_id = $1
                AND mq.branch_id = $2
                AND mq.type = 'renewal'
                AND mq.payload->>'sequence_kind' = 'post_expiry'
                AND mq.status = 'sent'
                AND COALESCE(mq.sent_at, mq.scheduled_at) >= to_timestamp($3)
           ),
           attributed AS (
             SELECT sm.id,
                    sm.sequence_step,
                    sm.member_id,
                    renewal.id AS renewal_id,
                    COALESCE(renewal.price_paid, 0)::numeric(12, 2) AS revenue_saved
               FROM sent_messages sm
               LEFT JOIN LATERAL (
                 SELECT s.id, s.price_paid
                   FROM subscriptions s
                  WHERE s.organization_id = $1
                    AND s.branch_id = $2
                    AND s.member_id = sm.member_id
                    AND s.renewed_from_subscription_id IS NOT NULL
                    AND (sm.source_subscription_id IS NULL OR s.renewed_from_subscription_id = sm.source_subscription_id)
                    AND s.created_at >= sm.sent_at
                    AND s.created_at < sm.sent_at + interval '14 day'
                  ORDER BY s.created_at ASC
                  LIMIT 1
               ) renewal ON true
           )
           SELECT COALESCE(sequence_step, 0)::int AS sequence_step,
                  COUNT(*)::int AS messages_sent,
                  COUNT(DISTINCT member_id)::int AS members_reached,
                  COUNT(renewal_id)::int AS renewals_won,
                  COALESCE(SUM(revenue_saved), 0)::text AS revenue_saved
             FROM attributed
            GROUP BY COALESCE(sequence_step, 0)
            ORDER BY sequence_step ASC`,
          [auth.organizationId, auth.branchId, rangeStart]
        ),
        query<{
          members_in_sequence: number;
          messages_sent: number;
          renewals_won: number;
          revenue_saved: string | number;
        }>(
          `WITH sent_messages AS (
             SELECT mq.id,
                    mq.member_id,
                    COALESCE(mq.sent_at, mq.scheduled_at) AS sent_at,
                    NULLIF(mq.payload->>'subscription_id', '')::int AS source_subscription_id
               FROM message_queue mq
              WHERE mq.organization_id = $1
                AND mq.branch_id = $2
                AND mq.type = 'renewal'
                AND mq.payload->>'sequence_kind' = 'post_expiry'
                AND mq.status = 'sent'
                AND COALESCE(mq.sent_at, mq.scheduled_at) >= to_timestamp($3)
           ),
           attributed AS (
             SELECT sm.id,
                    sm.member_id,
                    renewal.id AS renewal_id,
                    COALESCE(renewal.price_paid, 0)::numeric(12, 2) AS revenue_saved
               FROM sent_messages sm
               LEFT JOIN LATERAL (
                 SELECT s.id, s.price_paid
                   FROM subscriptions s
                  WHERE s.organization_id = $1
                    AND s.branch_id = $2
                    AND s.member_id = sm.member_id
                    AND s.renewed_from_subscription_id IS NOT NULL
                    AND (sm.source_subscription_id IS NULL OR s.renewed_from_subscription_id = sm.source_subscription_id)
                    AND s.created_at >= sm.sent_at
                    AND s.created_at < sm.sent_at + interval '14 day'
                  ORDER BY s.created_at ASC
                  LIMIT 1
               ) renewal ON true
           )
           SELECT COUNT(DISTINCT member_id)::int AS members_in_sequence,
                  COUNT(*)::int AS messages_sent,
                  COUNT(renewal_id)::int AS renewals_won,
                  COALESCE(SUM(revenue_saved), 0)::text AS revenue_saved
             FROM attributed`,
          [auth.organizationId, auth.branchId, rangeStart]
        ),
      ]);

      const normalized = rows.map((row) => ({
        step: row.sequence_step,
        messagesSent: row.messages_sent,
        membersReached: row.members_reached,
        renewalsWon: row.renewals_won,
        revenueSaved: toNumber(row.revenue_saved),
      }));
      const summaryRow = summaryRows[0];

      return ok({
        attributionWindowDays: WHATSAPP_ATTRIBUTION_WINDOW_DAYS,
        summary: {
          membersInSequence: Number(summaryRow?.members_in_sequence || 0),
          messagesSent: Number(summaryRow?.messages_sent || 0),
          renewalsWon: Number(summaryRow?.renewals_won || 0),
          revenueSaved: toNumber(summaryRow?.revenue_saved),
        },
        rows: normalized,
      });
    }

    if (report === "onboarding-performance") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const [summaryRows, messageRows] = await Promise.all([
        query<{
          joined_members: number;
          first_visit_members: number;
          completed_three_visits_14d: number;
          no_return_members: number;
        }>(
          `WITH recent_members AS (
             SELECT m.id AS member_id,
                    EXTRACT(EPOCH FROM m.created_at)::bigint AS joined_at
               FROM members m
              WHERE m.organization_id = $1
                AND m.branch_id = $2
                AND m.deleted_at IS NULL
                AND EXTRACT(EPOCH FROM m.created_at)::bigint >= $3
           ),
           activity AS (
             SELECT rm.member_id,
                    MIN(l.timestamp) FILTER (WHERE l.status = 'success' AND l.timestamp >= rm.joined_at)::bigint AS first_visit,
                    COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= rm.joined_at AND l.timestamp < rm.joined_at + 14 * 86400)::int AS visits_14d
               FROM recent_members rm
               LEFT JOIN logs l
                 ON l.organization_id = $1
                AND l.branch_id = $2
                AND l.member_id = rm.member_id
              GROUP BY rm.member_id
           )
           SELECT
             (SELECT COUNT(*)::int FROM recent_members) AS joined_members,
             COUNT(*) FILTER (WHERE first_visit IS NOT NULL)::int AS first_visit_members,
             COUNT(*) FILTER (WHERE visits_14d >= 3)::int AS completed_three_visits_14d,
             COUNT(*) FILTER (WHERE first_visit IS NOT NULL AND visits_14d <= 1)::int AS no_return_members
           FROM activity`,
          [auth.organizationId, auth.branchId, rangeStart]
        ),
        query<{
          sequence_kind: string;
          messages_sent: number;
        }>(
          `SELECT COALESCE(payload->>'sequence_kind', type) AS sequence_kind,
                  COUNT(*) FILTER (WHERE status = 'sent')::int AS messages_sent
             FROM message_queue
            WHERE organization_id = $1
              AND branch_id = $2
              AND COALESCE(sent_at, scheduled_at) >= to_timestamp($3)
              AND (
                type = 'welcome'
                OR payload->>'sequence_kind' LIKE 'onboarding_%'
              )
            GROUP BY COALESCE(payload->>'sequence_kind', type)`,
          [auth.organizationId, auth.branchId, rangeStart]
        ),
      ]);

      const messageMap = new Map(messageRows.map((row) => [row.sequence_kind, row.messages_sent]));
      const summary = summaryRows[0] || {
        joined_members: 0,
        first_visit_members: 0,
        completed_three_visits_14d: 0,
        no_return_members: 0,
      };

      return ok({
        summary: {
          joinedMembers: Number(summary.joined_members || 0),
          welcomeSent: Number(messageMap.get("welcome") || 0),
          firstVisitMembers: Number(summary.first_visit_members || 0),
          firstVisitRecognitionSent: Number(messageMap.get("onboarding_first_visit") || 0),
          completedThreeVisits14d: Number(summary.completed_three_visits_14d || 0),
          noReturnAlerts: Number(messageMap.get("onboarding_no_return_day7") || 0),
          lowEngagementAlerts: Number(messageMap.get("onboarding_low_engagement_day14") || 0),
          noReturnMembers: Number(summary.no_return_members || 0),
        },
        rows: [
          { stage: "welcome", count: Number(messageMap.get("welcome") || 0) },
          { stage: "first_visit", count: Number(summary.first_visit_members || 0) },
          { stage: "first_visit_recognition", count: Number(messageMap.get("onboarding_first_visit") || 0) },
          { stage: "completed_3_visits_14d", count: Number(summary.completed_three_visits_14d || 0) },
          { stage: "no_return_alert", count: Number(messageMap.get("onboarding_no_return_day7") || 0) },
          { stage: "low_engagement_day14", count: Number(messageMap.get("onboarding_low_engagement_day14") || 0) },
        ],
      });
    }

    if (report === "failed-payments") {
      const limit = readLimitParam(url, 200, 500);

      const rows = await query<{
        subscription_id: number;
        member_id: string;
        name: string;
        phone: string | null;
        amount_due: string | number;
        due_date: number;
        reminder_sent_at: string | null;
        reminder_status: string | null;
        renewal_id: number | null;
        recovered_amount: string | number | null;
      }>(
        `WITH overdue_cycles AS (
           SELECT DISTINCT ON (s.member_id)
                  s.id AS subscription_id,
                  s.member_id,
                  s.end_date AS due_date,
                  COALESCE(s.price_paid, 0)::numeric(12, 2) AS amount_due
             FROM subscriptions s
            WHERE s.organization_id = $1
              AND s.branch_id = $2
              AND s.end_date < $3
            ORDER BY s.member_id, s.end_date DESC, s.created_at DESC
         ),
         unresolved AS (
           SELECT oc.*
             FROM overdue_cycles oc
            WHERE NOT EXISTS (
              SELECT 1
                FROM subscriptions s
               WHERE s.organization_id = $1
                 AND s.branch_id = $2
                 AND s.member_id = oc.member_id
                 AND s.is_active = true
                 AND s.start_date <= $3
                 AND s.end_date > $3
            )
         ),
         reminder_events AS (
           SELECT DISTINCT ON ((payload->>'subscription_id'))
                  (payload->>'subscription_id')::bigint AS subscription_id,
                  COALESCE(sent_at, scheduled_at) AS reminder_sent_at,
                  status AS reminder_status
             FROM message_queue
            WHERE organization_id = $1
              AND branch_id = $2
              AND type = 'renewal'
              AND payload ? 'subscription_id'
            ORDER BY (payload->>'subscription_id'), COALESCE(sent_at, scheduled_at) DESC
         ),
         recovered AS (
           SELECT renewed_from_subscription_id AS source_subscription_id,
                  id AS renewal_id,
                  COALESCE(price_paid, 0)::numeric(12, 2) AS recovered_amount
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND renewed_from_subscription_id IS NOT NULL
         )
         SELECT u.subscription_id,
                u.member_id,
                m.name,
                m.phone,
                u.amount_due,
                u.due_date,
                re.reminder_sent_at::text,
                re.reminder_status,
                rc.renewal_id,
                rc.recovered_amount
           FROM unresolved u
           JOIN members m
             ON m.id = u.member_id
            AND m.organization_id = $1
            AND m.branch_id = $2
           LEFT JOIN reminder_events re
             ON re.subscription_id = u.subscription_id
           LEFT JOIN recovered rc
             ON rc.source_subscription_id = u.subscription_id
          WHERE m.deleted_at IS NULL
          ORDER BY u.due_date ASC, u.amount_due DESC, m.name ASC
          LIMIT $4`,
        [auth.organizationId, auth.branchId, now, limit]
      );

      const normalized = rows.map((row) => {
        const amountDue = toNumber(row.amount_due);
        const recoveredAmount = toNumber(row.recovered_amount);
        const daysOverdue = Math.max(0, Math.floor((now - row.due_date) / 86400));
        return {
          subscriptionId: row.subscription_id,
          memberId: row.member_id,
          name: row.name,
          phone: row.phone,
          amountDue,
          dueDate: row.due_date,
          daysOverdue,
          reminderStatus: row.reminder_status === "sent" ? "sent" : row.reminder_status === "failed" ? "failed" : row.reminder_sent_at ? "queued" : "not_sent",
          reminderSentAt: row.reminder_sent_at,
          recovered: Boolean(row.renewal_id),
          recoveredAmount,
        };
      });

      return ok({
        model: "overdue-renewal-recovery",
        summary: {
          failedPaymentValue: normalized.reduce((sum, row) => sum + row.amountDue, 0),
          recoveredValue: normalized.reduce((sum, row) => sum + row.recoveredAmount, 0),
          unresolvedCount: normalized.filter((row) => !row.recovered).length,
          recoveryRate: normalized.length > 0
            ? (normalized.filter((row) => row.recovered).length / normalized.length) * 100
            : 0,
          oldestUnresolvedDays: normalized.reduce((max, row) => row.recovered ? max : Math.max(max, row.daysOverdue), 0),
        },
        rows: normalized,
      });
    }

    if (report === "ghost-members") {
      const days = readDaysParam(url, 30);
      const rows = await query<GhostMemberRow>(
        `WITH active_members AS (
           SELECT DISTINCT ON (s.member_id)
                  s.member_id,
                  s.end_date
             FROM subscriptions s
            WHERE s.organization_id = $1
              AND s.branch_id = $2
              AND s.is_active = true
              AND s.start_date <= $3
              AND s.end_date > $3
            ORDER BY s.member_id, s.end_date DESC, s.created_at DESC
         ),
         activity AS (
           SELECT l.member_id,
                  MAX(l.timestamp) FILTER (WHERE l.status = 'success') AS last_visit,
                  COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= $4) AS recent_visits
             FROM logs l
            WHERE l.organization_id = $1
              AND l.branch_id = $2
              AND l.member_id IS NOT NULL
            GROUP BY l.member_id
         )
         SELECT m.id AS member_id,
                m.name,
                m.phone,
                am.end_date,
                activity.last_visit,
                COALESCE(activity.recent_visits, 0)::int AS recent_visits
           FROM active_members am
           JOIN members m
             ON m.id = am.member_id
            AND m.organization_id = $1
            AND m.branch_id = $2
           LEFT JOIN activity ON activity.member_id = am.member_id
          WHERE m.deleted_at IS NULL
            AND (activity.last_visit IS NULL OR activity.last_visit < $4)
          ORDER BY activity.last_visit NULLS FIRST, am.end_date ASC, m.name ASC
          LIMIT 200`,
        [auth.organizationId, auth.branchId, now, now - days * 86400]
      );

      const normalized = rows.map((row) => ({
        memberId: row.member_id,
        name: row.name,
        phone: row.phone,
        endDate: row.end_date,
        lastVisit: row.last_visit,
        recentVisits: row.recent_visits,
        daysSinceLastVisit: row.last_visit == null ? null : Math.floor((now - Number(row.last_visit)) / 86400),
      }));

      return ok({
        thresholdDays: days,
        summary: {
          memberCount: normalized.length,
          ghostMembers: normalized.length,
          longestAbsenceDays: normalized.reduce((max, row) => Math.max(max, row.daysSinceLastVisit ?? days), 0),
        },
        rows: normalized,
      });
    }

    if (report === "attendance-decline") {
      const days = readDaysParam(url, 14);
      const rangeStart = now - days * 86400;
      const previousStart = rangeStart - days * 86400;

      const rows = await query<AttendanceDeclineRow>(
        `WITH active_members AS (
           SELECT DISTINCT member_id
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND start_date <= $3
              AND end_date > $3
         ),
         activity AS (
           SELECT l.member_id,
                  MAX(l.timestamp) FILTER (WHERE l.status = 'success') AS last_visit,
                  COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= $4) AS recent_visits,
                  COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= $5 AND l.timestamp < $4) AS previous_visits
             FROM logs l
            WHERE l.organization_id = $1
              AND l.branch_id = $2
              AND l.member_id IS NOT NULL
            GROUP BY l.member_id
         )
         SELECT m.id AS member_id,
                m.name,
                m.phone,
                a.last_visit,
                COALESCE(a.recent_visits, 0)::int AS recent_visits,
                COALESCE(a.previous_visits, 0)::int AS previous_visits
           FROM active_members am
           JOIN members m
             ON m.id = am.member_id
            AND m.organization_id = $1
            AND m.branch_id = $2
           JOIN activity a ON a.member_id = am.member_id
          WHERE m.deleted_at IS NULL
            AND COALESCE(a.previous_visits, 0) >= 2
            AND COALESCE(a.recent_visits, 0) < COALESCE(a.previous_visits, 0)
          ORDER BY (COALESCE(a.previous_visits, 0) - COALESCE(a.recent_visits, 0)) DESC,
                   a.last_visit NULLS FIRST,
                   m.name ASC
          LIMIT 200`,
        [auth.organizationId, auth.branchId, now, rangeStart, previousStart]
      );

      const normalized = rows.map((row) => {
        const previousVisits = row.previous_visits;
        const recentVisits = row.recent_visits;
        const declinePercent = previousVisits > 0
          ? ((previousVisits - recentVisits) / previousVisits) * 100
          : 0;
        return {
          memberId: row.member_id,
          name: row.name,
          phone: row.phone,
          lastVisit: row.last_visit,
          previousVisits,
          recentVisits,
          declinePercent,
          severity: recentVisits === 0 || declinePercent >= 75 ? "high" : declinePercent >= 40 ? "medium" : "low",
        };
      });

      return ok({
        thresholdDays: days,
        summary: {
          memberCount: normalized.length,
          highSeverityCount: normalized.filter((row) => row.severity === "high").length,
          avgDeclinePercent: normalized.length > 0
            ? normalized.reduce((sum, row) => sum + row.declinePercent, 0) / normalized.length
            : 0,
        },
        rows: normalized,
      });
    }

    if (report === "expected-revenue") {
      const days = readDaysParam(url, 30);
      const rangeEnd = now + days * 86400;

      const [runRateRows, dueRows, securedRows, retentionRows] = await Promise.all([
        query<{ total: string | number }>(
          `SELECT COALESCE(SUM(price_paid / NULLIF(plan_months, 0)), 0)::text AS total
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND start_date <= $3
              AND end_date > $3
              AND price_paid IS NOT NULL
              AND plan_months IS NOT NULL
              AND plan_months > 0`,
          [auth.organizationId, auth.branchId, now]
        ),
        query<{ total: string | number; members: number }>(
          `SELECT COALESCE(SUM(price_paid), 0)::text AS total,
                  COUNT(*)::int AS members
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND start_date <= $3
              AND end_date > $3
              AND end_date <= $4
              AND price_paid IS NOT NULL`,
          [auth.organizationId, auth.branchId, now, rangeEnd]
        ),
        query<{ total: string | number; members: number }>(
          `SELECT COALESCE(SUM(renewal.price_paid), 0)::text AS total,
                  COUNT(*)::int AS members
             FROM subscriptions expiring
             JOIN subscriptions renewal
               ON renewal.organization_id = expiring.organization_id
              AND renewal.branch_id = expiring.branch_id
              AND renewal.renewed_from_subscription_id = expiring.id
            WHERE expiring.organization_id = $1
              AND expiring.branch_id = $2
              AND expiring.is_active = true
              AND expiring.start_date <= $3
              AND expiring.end_date > $3
              AND expiring.end_date <= $4`,
          [auth.organizationId, auth.branchId, now, rangeEnd]
        ),
        query<{ active_start: number; retained_members: number }>(
          `WITH active_start AS (
             SELECT DISTINCT member_id
               FROM subscriptions
             WHERE organization_id = $1
               AND branch_id = $2
                AND start_date <= $3
                AND end_date > $3
           ),
           active_end AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND start_date <= $4
                AND end_date > $4
           )
           SELECT
             (SELECT COUNT(*)::int FROM active_start) AS active_start,
             (SELECT COUNT(*)::int FROM active_start s JOIN active_end e ON e.member_id = s.member_id) AS retained_members`,
          [auth.organizationId, auth.branchId, now - days * 86400, now]
        ),
      ]);

      const runRate = toNumber(runRateRows[0]?.total);
      const renewalExposure = toNumber(dueRows[0]?.total);
      const securedRenewalValue = toNumber(securedRows[0]?.total);
      const activeStart = Number(retentionRows[0]?.active_start || 0);
      const retainedMembers = Number(retentionRows[0]?.retained_members || 0);
      const retentionRate = activeStart > 0 ? retainedMembers / activeStart : 0;
      const projectedRenewalValue = securedRenewalValue + Math.max(renewalExposure - securedRenewalValue, 0) * retentionRate;
      const projectedRevenueNext30Days = projectedRenewalValue;

      return ok({
        summary: {
          monthlyRunRate: runRate,
          renewalExposure,
          securedRenewalValue,
          projectedRenewalValue,
          projectedRevenueNext30Days,
          expectedRetentionRate: retentionRate * 100,
          membersDue: Number(dueRows[0]?.members || 0),
        },
      });
    }

    if (report === "renewal-vs-new") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;

      const rows = await query<RenewalRevenueRow>(
        `${incomeEventsCte}
         SELECT to_char(date_trunc('day', effective_at), 'YYYY-MM-DD') AS day,
                COALESCE(SUM(CASE WHEN payment_type = 'subscription' THEN amount ELSE 0 END), 0)::text AS new_revenue,
                COALESCE(SUM(CASE WHEN payment_type = 'renewal' THEN amount ELSE 0 END), 0)::text AS renewal_revenue,
                COUNT(*) FILTER (WHERE payment_type = 'subscription')::int AS new_count,
                COUNT(*) FILTER (WHERE payment_type = 'renewal')::int AS renewal_count
           FROM income_events
          WHERE effective_at >= to_timestamp($3)
          GROUP BY 1
          ORDER BY day ASC`,
        [auth.organizationId, auth.branchId, rangeStart]
      );

      const normalized = rows.map((row) => ({
        day: row.day,
        newRevenue: toNumber(row.new_revenue),
        renewalRevenue: toNumber(row.renewal_revenue),
        newCount: row.new_count,
        renewalCount: row.renewal_count,
      }));

      return ok({
        summary: {
          newRevenue: normalized.reduce((sum, row) => sum + row.newRevenue, 0),
          renewalRevenue: normalized.reduce((sum, row) => sum + row.renewalRevenue, 0),
          newCount: normalized.reduce((sum, row) => sum + row.newCount, 0),
          renewalCount: normalized.reduce((sum, row) => sum + row.renewalCount, 0),
        },
        rows: normalized,
      });
    }

    if (report === "cash-vs-digital") {
      const rows = await query<{ payment_method: string; total: string | number; count: number }>(
        `${incomeEventsCte}
         SELECT payment_method,
                COALESCE(SUM(amount), 0)::text AS total,
                COUNT(*)::int AS count
           FROM income_events
          GROUP BY payment_method
          ORDER BY
            CASE payment_method
              WHEN 'cash' THEN 0
              WHEN 'digital' THEN 1
              ELSE 2
            END`,
        [auth.organizationId, auth.branchId]
      );

      const normalized = ["cash", "digital", "unknown"].map((method) => {
        const match = rows.find((row) => row.payment_method === method);
        return {
          method,
          revenue: toNumber(match?.total),
          count: Number(match?.count || 0),
        };
      });

      const totalRevenue = normalized.reduce((sum, row) => sum + row.revenue, 0);
      const totalCount = normalized.reduce((sum, row) => sum + row.count, 0);

      return ok({
        summary: {
          cashRevenue: normalized.find((row) => row.method === "cash")?.revenue ?? 0,
          digitalRevenue: normalized.find((row) => row.method === "digital")?.revenue ?? 0,
          unknownRevenue: normalized.find((row) => row.method === "unknown")?.revenue ?? 0,
          totalRevenue,
          totalCount,
        },
        rows: normalized,
      });
    }

    if (report === "referral-funnel") {
      const days = readDaysParam(url, 90);
      const rangeStart = now - days * 86400;

      const rows = await query<ReferralFunnelRow>(
        `WITH referral_base AS (
           SELECT gp.inviter_member_id,
                  COUNT(*)::int AS invites_sent,
                  COUNT(*) FILTER (WHERE gp.used_at IS NOT NULL)::int AS invites_used,
                  COUNT(*) FILTER (WHERE gp.converted_member_id IS NOT NULL)::int AS converted_members
             FROM guest_passes gp
            WHERE gp.organization_id = $1
              AND gp.branch_id = $2
              AND EXTRACT(EPOCH FROM gp.created_at)::bigint >= $3
              AND gp.voided_at IS NULL
            GROUP BY gp.inviter_member_id
         ),
         referral_revenue AS (
           SELECT gp.inviter_member_id,
                  COALESCE(SUM(first_sub.price_paid), 0)::numeric(12, 2) AS referral_revenue
             FROM guest_passes gp
             LEFT JOIN LATERAL (
               SELECT s.price_paid
                 FROM subscriptions s
                WHERE s.organization_id = gp.organization_id
                  AND s.branch_id = gp.branch_id
                  AND s.member_id = gp.converted_member_id
                  AND EXTRACT(EPOCH FROM s.created_at)::bigint >= EXTRACT(EPOCH FROM COALESCE(gp.converted_at, gp.created_at))
                ORDER BY s.created_at ASC
                LIMIT 1
             ) first_sub ON true
            WHERE gp.organization_id = $1
              AND gp.branch_id = $2
              AND EXTRACT(EPOCH FROM gp.created_at)::bigint >= $3
              AND gp.voided_at IS NULL
            GROUP BY gp.inviter_member_id
         )
         SELECT rb.inviter_member_id,
                inviter.name AS inviter_name,
                rb.invites_sent,
                rb.invites_used,
                rb.converted_members,
                COALESCE(rr.referral_revenue, 0)::text AS referral_revenue
           FROM referral_base rb
           LEFT JOIN referral_revenue rr
             ON rr.inviter_member_id IS NOT DISTINCT FROM rb.inviter_member_id
           LEFT JOIN members inviter
             ON inviter.id = rb.inviter_member_id
            AND inviter.organization_id = $1
            AND inviter.branch_id = $2
          ORDER BY rb.converted_members DESC, rr.referral_revenue DESC, rb.invites_sent DESC
          LIMIT 100`,
        [auth.organizationId, auth.branchId, rangeStart]
      );

      const normalized = rows.map((row) => ({
        inviterMemberId: row.inviter_member_id,
        inviterName: row.inviter_name || "Unknown",
        invitesSent: row.invites_sent,
        invitesUsed: row.invites_used,
        convertedMembers: row.converted_members,
        conversionRate: row.invites_sent > 0 ? (row.converted_members / row.invites_sent) * 100 : 0,
        referralRevenue: toNumber(row.referral_revenue),
      }));

      return ok({
        summary: {
          invitesSent: normalized.reduce((sum, row) => sum + row.invitesSent, 0),
          invitesUsed: normalized.reduce((sum, row) => sum + row.invitesUsed, 0),
          convertedMembers: normalized.reduce((sum, row) => sum + row.convertedMembers, 0),
          referralRevenue: normalized.reduce((sum, row) => sum + row.referralRevenue, 0),
        },
        rows: normalized,
      });
    }

    if (report === "weekly-digest") {
      const [riskRows, retentionRows, roiRows, atRiskRows] = await Promise.all([
        query<{ total: string | number; members: number }>(
          `SELECT COALESCE(SUM(price_paid), 0)::text AS total,
                  COUNT(*)::int AS members
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND start_date <= $3
              AND end_date > $3
              AND end_date <= $4`,
          [auth.organizationId, auth.branchId, now, now + 14 * 86400]
        ),
        query<{ active_start: number; retained_members: number }>(
          `WITH active_start AS (
             SELECT DISTINCT member_id
               FROM subscriptions
             WHERE organization_id = $1
               AND branch_id = $2
                AND start_date <= $3
                AND end_date > $3
           ),
           active_end AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND start_date <= $4
                AND end_date > $4
           )
           SELECT
             (SELECT COUNT(*)::int FROM active_start) AS active_start,
             (SELECT COUNT(*)::int FROM active_start s JOIN active_end e ON e.member_id = s.member_id) AS retained_members`,
          [auth.organizationId, auth.branchId, now - 30 * 86400, now]
        ),
        query<{ revenue_saved: string | number; renewals_won: number }>(
          `WITH sent_messages AS (
             SELECT mq.member_id,
                    COALESCE(mq.sent_at, mq.scheduled_at) AS sent_at,
                    NULLIF(mq.payload->>'subscription_id', '')::int AS source_subscription_id
               FROM message_queue mq
              WHERE mq.organization_id = $1
                AND mq.branch_id = $2
                AND mq.type = 'renewal'
                AND mq.status = 'sent'
                AND COALESCE(mq.sent_at, mq.scheduled_at) >= to_timestamp($3)
           ),
           attributed AS (
             SELECT renewal.id AS renewal_id,
                    COALESCE(renewal.price_paid, 0)::numeric(12, 2) AS revenue_saved
               FROM sent_messages sm
               LEFT JOIN LATERAL (
                 SELECT s.id, s.price_paid
                   FROM subscriptions s
                  WHERE s.organization_id = $1
                    AND s.branch_id = $2
                    AND s.member_id = sm.member_id
                    AND s.renewed_from_subscription_id IS NOT NULL
                    AND (sm.source_subscription_id IS NULL OR s.renewed_from_subscription_id = sm.source_subscription_id)
                    AND s.created_at >= sm.sent_at
                    AND s.created_at < sm.sent_at + interval '14 day'
                  ORDER BY s.created_at ASC
                  LIMIT 1
               ) renewal ON true
           )
           SELECT COALESCE(SUM(revenue_saved), 0)::text AS revenue_saved,
                  COUNT(renewal_id)::int AS renewals_won
             FROM attributed`,
          [auth.organizationId, auth.branchId, now - 7 * 86400]
        ),
        query<{ count: number }>(
          `WITH active_members AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND is_active = true
                AND start_date <= $3
                AND end_date > $3
           ),
           activity AS (
             SELECT member_id,
                    MAX(timestamp) FILTER (WHERE status = 'success') AS last_visit
               FROM logs
              WHERE organization_id = $1
                AND branch_id = $2
                AND member_id IS NOT NULL
              GROUP BY member_id
           )
           SELECT COUNT(*)::int AS count
             FROM active_members am
             LEFT JOIN activity a ON a.member_id = am.member_id
            WHERE a.last_visit IS NULL OR a.last_visit < $4`,
          [auth.organizationId, auth.branchId, now, now - 14 * 86400]
        ),
      ]);

      const activeStart = Number(retentionRows[0]?.active_start || 0);
      const retainedMembers = Number(retentionRows[0]?.retained_members || 0);
      const retentionRate = activeStart > 0 ? (retainedMembers / activeStart) * 100 : 0;
      const revenueAtRisk = toNumber(riskRows[0]?.total);
      const renewalsWon = Number(roiRows[0]?.renewals_won || 0);
      const revenueSaved = toNumber(roiRows[0]?.revenue_saved);
      const atRiskMembers = Number(atRiskRows[0]?.count || 0);
      const expiringMembers = Number(riskRows[0]?.members || 0);

      return ok({
        generatedAt: new Date().toISOString(),
        summary: {
          revenueAtRisk,
          expiringMembers,
          retentionRate,
          revenueSaved,
          renewalsWon,
          atRiskMembers,
        },
        message: `This week GymFlow shows ${expiringMembers} members with revenue at risk, retention at ${retentionRate.toFixed(1)}%, ${atRiskMembers} members showing churn signals, and ${renewalsWon} renewals influenced by WhatsApp worth ${toNumber(roiRows[0]?.revenue_saved).toFixed(2)}.`,
      });
    }

    if (report === "attendance") {
      const days = readDaysParam(url, 30);
      const limit = readLimitParam(url, 2000, 5000);
      const rangeStart = now - days * 86400;

      const rows = await query(
        `SELECT timestamp, status, reason_code, scanned_value, member_id
           FROM logs
          WHERE organization_id = $1
            AND branch_id = $2
            AND timestamp >= $3
          ORDER BY timestamp DESC
          LIMIT $4`,
        [auth.organizationId, auth.branchId, rangeStart, limit]
      );
      return ok(rows);
    }

    // ── Net membership change ──────────────────────────────────────────────
    if (report === "net-membership-change") {
      const days = readDaysParam(url, 30);
      const now7 = now - 7 * 86400;
      const now14 = now - 14 * 86400;
      const now30 = now - 30 * 86400;
      const weeksBack = Math.max(1, Math.ceil(days / 7));

      // Weekly buckets: joins and ends in each of the last N weeks
      const buckets = await query<{
        week_start: number;
        joins: string;
        ends: string;
      }>(
        `WITH weeks AS (
           SELECT generate_series(0, $3 - 1) AS w
         ),
         week_bounds AS (
           SELECT
             $1::bigint - ((w + 1) * 7 * 86400) AS week_start,
             $1::bigint - (w * 7 * 86400)        AS week_end
           FROM weeks
         )
         SELECT
           wb.week_start,
           (
             SELECT COUNT(*)::int
               FROM subscriptions s
              WHERE s.organization_id = $2
                AND s.branch_id = $4
                AND EXTRACT(EPOCH FROM s.created_at)::bigint >= wb.week_start
                AND EXTRACT(EPOCH FROM s.created_at)::bigint < wb.week_end
           ) AS joins,
           (
             SELECT COUNT(*)::int
               FROM subscriptions s
              WHERE s.organization_id = $2
                AND s.branch_id = $4
                AND s.end_date >= wb.week_start
                AND s.end_date < wb.week_end
                AND NOT EXISTS (
                  SELECT 1
                    FROM subscriptions future_sub
                   WHERE future_sub.organization_id = s.organization_id
                     AND future_sub.branch_id = s.branch_id
                     AND future_sub.member_id = s.member_id
                     AND future_sub.start_date <= wb.week_end
                     AND future_sub.end_date > wb.week_end
                )
           ) AS ends
         FROM week_bounds wb
         ORDER BY wb.week_start ASC`,
        [now, auth.organizationId, weeksBack, auth.branchId]
      );

      // Simple period summaries
      const periodRows = await query<{
        period: string;
        joins: string;
        ends: string;
        active: string;
      }>(
        `SELECT
           'thisWeek'   AS period,
           COUNT(*)     FILTER (WHERE EXTRACT(EPOCH FROM created_at)::bigint >= $3)::int AS joins,
           COUNT(*) FILTER (
             WHERE end_date >= $3
               AND end_date < $1
               AND NOT EXISTS (
                 SELECT 1
                   FROM subscriptions future_sub
                  WHERE future_sub.organization_id = subscriptions.organization_id
                    AND future_sub.branch_id = subscriptions.branch_id
                    AND future_sub.member_id = subscriptions.member_id
                    AND future_sub.start_date <= $1
                    AND future_sub.end_date > $1
               )
           )::int AS ends,
           COUNT(*)     FILTER (WHERE is_active = true)::int AS active
         FROM subscriptions
         WHERE organization_id = $2 AND branch_id = $5
         UNION ALL
         SELECT
           'lastWeek',
           COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM created_at)::bigint >= $4 AND EXTRACT(EPOCH FROM created_at)::bigint < $3)::int,
           COUNT(*) FILTER (
             WHERE end_date >= $4
               AND end_date < $3
               AND NOT EXISTS (
                 SELECT 1
                   FROM subscriptions future_sub
                  WHERE future_sub.organization_id = subscriptions.organization_id
                    AND future_sub.branch_id = subscriptions.branch_id
                    AND future_sub.member_id = subscriptions.member_id
                    AND future_sub.start_date <= $3
                    AND future_sub.end_date > $3
               )
           )::int,
           NULL
         FROM subscriptions
         WHERE organization_id = $2 AND branch_id = $5
         UNION ALL
         SELECT
           'last30Days',
           COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM created_at)::bigint >= $6)::int,
           COUNT(*) FILTER (
             WHERE end_date >= $6
               AND end_date < $1
               AND NOT EXISTS (
                 SELECT 1
                   FROM subscriptions future_sub
                  WHERE future_sub.organization_id = subscriptions.organization_id
                    AND future_sub.branch_id = subscriptions.branch_id
                    AND future_sub.member_id = subscriptions.member_id
                    AND future_sub.start_date <= $1
                    AND future_sub.end_date > $1
               )
           )::int,
           NULL
         FROM subscriptions
         WHERE organization_id = $2 AND branch_id = $5`,
        [now, auth.organizationId, now7, now14, auth.branchId, now30]
      );

      const byPeriod: Record<string, { joins: number; ends: number; net: number; active?: number }> = {};
      for (const r of periodRows) {
        const joins = Number(r.joins);
        const ends = Number(r.ends);
        byPeriod[r.period] = { joins, ends, net: joins - ends, active: r.active != null ? Number(r.active) : undefined };
      }

      return ok({
        summary: {
          thisWeek: byPeriod.thisWeek ?? { joins: 0, ends: 0, net: 0 },
          lastWeek: byPeriod.lastWeek ?? { joins: 0, ends: 0, net: 0 },
          last30Days: byPeriod.last30Days ?? { joins: 0, ends: 0, net: 0 },
          totalActive: byPeriod.thisWeek?.active ?? 0,
        },
        weeks: buckets.map((b) => ({
          weekStart: Number(b.week_start),
          joins: Number(b.joins),
          ends: Number(b.ends),
          net: Number(b.joins) - Number(b.ends),
        })),
      });
    }

    // ── Visit frequency → churn risk ──────────────────────────────────────
    if (report === "visit-frequency-risk") {
      const days = readDaysParam(url, 30);
      const rangeStart = now - days * 86400;
      // Look at the last 4 weeks for frequency calculation
      const freqWindow = now - 28 * 86400;

      const rows = await query<{
        member_id: string;
        name: string;
        phone: string | null;
        end_date: number;
        visits_in_window: string;
        weeks_active: string;
      }>(
        `WITH active_subs AS (
           SELECT DISTINCT ON (s.member_id)
                  s.member_id,
                  s.end_date
             FROM subscriptions s
            WHERE s.organization_id = $1
              AND s.branch_id = $2
              AND s.is_active = true
              AND s.end_date > $3
            ORDER BY s.member_id, s.end_date DESC
         ),
         visit_counts AS (
           SELECT l.member_id,
                  COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= $4) AS visits_in_window,
                  -- count distinct ISO weeks they visited
                  COUNT(DISTINCT date_trunc('week', to_timestamp(l.timestamp))) FILTER (WHERE l.status = 'success' AND l.timestamp >= $4) AS weeks_active
             FROM logs l
            WHERE l.organization_id = $1
              AND l.branch_id = $2
              AND l.member_id IS NOT NULL
            GROUP BY l.member_id
         )
         SELECT m.id AS member_id,
                m.name,
                m.phone,
                a.end_date,
                COALESCE(vc.visits_in_window, 0)::int AS visits_in_window,
                COALESCE(vc.weeks_active, 0)::int       AS weeks_active
           FROM active_subs a
           JOIN members m ON m.id = a.member_id AND m.organization_id = $1 AND m.branch_id = $2
           LEFT JOIN visit_counts vc ON vc.member_id = a.member_id
          WHERE m.deleted_at IS NULL
          ORDER BY visits_in_window ASC, m.name ASC
          LIMIT 500`,
        [auth.organizationId, auth.branchId, now, freqWindow]
      );

      // Bucket members by avg visits/week over the 4-week window
      const bucketMap: Record<string, {
        label: string;
        visitsPerWeekMin: number;
        visitsPerWeekMax: number | null;
        churnRisk: string;
        churnRiskPercent: number;
        members: { memberId: string; name: string; phone: string | null; endDate: number; visitsInWindow: number; weeksActive: number; avgPerWeek: number }[];
      }> = {
        zero:   { label: 'Never visited (last 4 wks)', visitsPerWeekMin: 0, visitsPerWeekMax: 0,    churnRisk: 'critical', churnRiskPercent: 75, members: [] },
        once:   { label: '1× per week',                visitsPerWeekMin: 0.01, visitsPerWeekMax: 1.49, churnRisk: 'high',     churnRiskPercent: 50, members: [] },
        twice:  { label: '2× per week',                visitsPerWeekMin: 1.5, visitsPerWeekMax: 2.49, churnRisk: 'medium',   churnRiskPercent: 25, members: [] },
        regular:{ label: '3×+ per week',               visitsPerWeekMin: 2.5, visitsPerWeekMax: null,  churnRisk: 'low',      churnRiskPercent: 5,  members: [] },
      };

      for (const row of rows) {
        const avg = Number(row.visits_in_window) / 4; // over 4 weeks
        const member = {
          memberId: row.member_id,
          name: row.name,
          phone: row.phone,
          endDate: Number(row.end_date),
          visitsInWindow: Number(row.visits_in_window),
          weeksActive: Number(row.weeks_active),
          avgPerWeek: Math.round(avg * 10) / 10,
        };
        if (avg === 0) bucketMap.zero.members.push(member);
        else if (avg < 1.5) bucketMap.once.members.push(member);
        else if (avg < 2.5) bucketMap.twice.members.push(member);
        else bucketMap.regular.members.push(member);
      }

      const segments = Object.entries(bucketMap).map(([key, b]) => ({
        key,
        label: b.label,
        churnRisk: b.churnRisk,
        churnRiskPercent: b.churnRiskPercent,
        memberCount: b.members.length,
        members: b.members,
      }));

      const atRisk = (bucketMap.zero.members.length + bucketMap.once.members.length);
      const total = rows.length;

      return ok({
        windowDays: 28,
        summary: {
          totalActive: total,
          atRiskCount: atRisk,
          atRiskPercent: total > 0 ? Math.round((atRisk / total) * 100) : 0,
          criticalCount: bucketMap.zero.members.length,
          highRiskCount: bucketMap.once.members.length,
          safeCount: bucketMap.regular.members.length,
        },
        segments,
      });
    }

    return fail(`Unsupported report: ${report}`, 404);
  } catch (error) {
    return routeError(error);
  }
}
