import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotificationRow = {
  notification_id: string;
  source: "system" | "broadcast";
  type: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  action_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  delivered_at: string;
  read_at: string | null;
};

type CursorPayload = {
  deliveredAt: string;
  notificationId: string;
};

function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(raw: string | null): CursorPayload | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as CursorPayload;
    if (!parsed?.deliveredAt || !parsed?.notificationId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);

    const status = (url.searchParams.get("status") || "all").trim();
    const source = (url.searchParams.get("source") || "all").trim();
    const limitRaw = Number(url.searchParams.get("limit") || 20);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.trunc(limitRaw))) : 20;

    if (!["all", "unread"].includes(status)) return fail("Invalid status filter", 400);
    if (!["all", "system", "broadcast"].includes(source)) return fail("Invalid source filter", 400);

    const cursor = decodeCursor(url.searchParams.get("cursor"));

    const rows = await query<NotificationRow>(
      `SELECT
          n.id AS notification_id,
          n.source,
          n.type,
          n.title,
          n.body,
          n.severity,
          n.action_url,
          n.metadata,
          n.created_at,
          r.delivered_at,
          r.read_at
       FROM notification_recipients r
       JOIN notifications n ON n.id = r.notification_id
      WHERE r.organization_id = $1
        AND (r.branch_id = $2 OR r.branch_id IS NULL)
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND ($3::text = 'all' OR ($3::text = 'unread' AND r.read_at IS NULL))
        AND ($4::text = 'all' OR n.source = $4)
        AND (
          $5::timestamptz IS NULL
          OR (r.delivered_at, n.id) < ($5::timestamptz, $6::uuid)
        )
      ORDER BY r.delivered_at DESC, n.id DESC
      LIMIT $7`,
      [
        auth.organizationId,
        auth.branchId,
        status,
        source,
        cursor?.deliveredAt || null,
        cursor?.notificationId || null,
        limit + 1,
      ]
    );

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];

    return ok({
      items: data,
      nextCursor: hasMore && last
        ? encodeCursor({ deliveredAt: last.delivered_at, notificationId: last.notification_id })
        : null,
      hasMore,
    });
  } catch (error) {
    return routeError(error);
  }
}
