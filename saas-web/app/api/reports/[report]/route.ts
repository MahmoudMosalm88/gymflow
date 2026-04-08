import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte } from "@/lib/income-events";

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

function getTimeZoneOffsetSeconds(timeZone: string, referenceDate: Date) {
  const zoneLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(referenceDate)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = zoneLabel?.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 3600 + minutes * 60);
}

function getZonedDayStartUnix(timeZone: string, referenceDate: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const utcMidnightMs = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetSeconds = getTimeZoneOffsetSeconds(timeZone, new Date(utcMidnightMs));
  return Math.floor(utcMidnightMs / 1000) - offsetSeconds;
}

export async function GET(request: NextRequest, { params }: { params: { report: string } }) {
  try {
    const auth = await requireAuth(request);
    await ensurePaymentsTable();
    const report = params.report;
    const url = new URL(request.url);
    const nowDate = new Date();
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = getZonedDayStartUnix("Africa/Cairo", nowDate);
    const startOfMonth = Math.floor(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1) / 1000);
    const startOfPreviousMonth = Math.floor(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() - 1, 1) / 1000);

    if (report === "overview") {
      const [members, activeSubs, expiredSubs, revenue, currentMonthRevenue, previousMonthRevenue, today, revenueAtRisk, revenueSaved, atRiskMembers, newMembersThisMonth, churnedThisMonth, inGymNow, expiringThisWeek] = await Promise.all([
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
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND start_date <= $3
              AND end_date > $3
              AND end_date <= $4`,
          [auth.organizationId, auth.branchId, now, now + 14 * 86400]
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
                AND is_active = true
                AND start_date <= $3
                AND end_date > $3
           ),
           active_end AS (
             SELECT DISTINCT member_id
               FROM subscriptions
              WHERE organization_id = $1
                AND branch_id = $2
                AND is_active = true
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
        }
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

    return fail(`Unsupported report: ${report}`, 404);
  } catch (error) {
    return routeError(error);
  }
}
