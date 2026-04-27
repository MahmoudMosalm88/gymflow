import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { ensurePaymentsTable, incomeEventsCte } from "@/lib/income-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayRow = { day: string; revenue: string; count: string };
type RevenueRow = { revenue: string };

function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { organizationId, branchId } = await requireRoles(request, ["owner"]);
    await ensurePaymentsTable();
    const { month } = await params;

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return ok({ days: [], prevMonthRevenue: 0 });
    }

    const [dayRows, prevRows] = await Promise.all([
      query<DayRow>(
        `${incomeEventsCte}
         SELECT DATE(effective_at AT TIME ZONE 'UTC')::text AS day,
                COALESCE(SUM(amount), 0)::text AS revenue,
                COUNT(*)::text AS count
           FROM income_events
          WHERE to_char(effective_at AT TIME ZONE 'UTC', 'YYYY-MM') = $3
          GROUP BY day
          ORDER BY day`,
        [organizationId, branchId, month]
      ),
      query<RevenueRow>(
        `${incomeEventsCte}
         SELECT COALESCE(SUM(amount), 0)::text AS revenue
           FROM income_events
          WHERE to_char(effective_at AT TIME ZONE 'UTC', 'YYYY-MM') = $3`,
        [organizationId, branchId, prevMonth(month)]
      ),
    ]);

    const days = dayRows.map((r) => ({
      day: r.day,
      revenue: Number(r.revenue),
      count: Number(r.count),
    }));

    return ok({
      days,
      prevMonthRevenue: Number(prevRows[0]?.revenue ?? 0),
    });
  } catch (error) {
    return routeError(error);
  }
}
