import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";

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
    const report = params.report;
    const url = new URL(request.url);
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = now - (now % 86400);

    if (report === "overview") {
      const [members, activeSubs, expiredSubs, revenue, today] = await Promise.all([
        query<NumberRow>(
          `SELECT COUNT(*)::text AS count
             FROM members
            WHERE organization_id = $1
              AND branch_id = $2
              AND deleted_at IS NULL`,
          [auth.organizationId, auth.branchId]
        ),
        query<NumberRow>(
          `SELECT COUNT(*)::text AS count
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true`,
          [auth.organizationId, auth.branchId]
        ),
        query<NumberRow>(
          `SELECT COUNT(*)::text AS count
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
              AND is_active = true
              AND end_date < $3`,
          [auth.organizationId, auth.branchId, now]
        ),
        query<NumberRow>(
          `SELECT COALESCE(SUM(price_paid), 0)::text AS total
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2`,
          [auth.organizationId, auth.branchId]
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
        )
      ]);

      return ok({
        totalMembers: toNumber(members[0]?.count),
        memberCount: toNumber(members[0]?.count),
        activeSubscriptions: toNumber(activeSubs[0]?.count),
        expiredSubscriptions: toNumber(expiredSubs[0]?.count),
        totalRevenue: toNumber(revenue[0]?.total),
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

    if (report === "hourly-distribution") {
      const rows = await query(
        `SELECT EXTRACT(HOUR FROM to_timestamp(timestamp))::int AS hour,
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
            AND s.end_date > $3
            AND s.end_date <= $4
          ORDER BY s.end_date ASC`,
        [auth.organizationId, auth.branchId, now, cutoff]
      );

      return ok(rows);
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
