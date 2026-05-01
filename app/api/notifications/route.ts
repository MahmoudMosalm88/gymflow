import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import type { NotificationListItem, NotificationListResponse } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CursorPayload = {
  deliveredAt: string;
  notificationId: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(raw: string | null): CursorPayload | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as CursorPayload;
    if (!parsed?.deliveredAt || !parsed?.notificationId) return null;
    if (!isUuid(parsed.notificationId)) return null;
    if (Number.isNaN(new Date(parsed.deliveredAt).getTime())) return null;
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
    const trainerStaffUserId =
      auth.role === "trainer" ? auth.staffUserId || "00000000-0000-0000-0000-000000000000" : null;

    const rows = await query<NotificationListItem & { metadata: Record<string, unknown> }>(
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
          (
            $7::uuid IS NULL
            AND n.metadata->>'trainer_staff_user_id' IS NULL
            AND n.metadata->>'target_staff_user_id' IS NULL
          )
          OR (
            $7::uuid IS NOT NULL
            AND (
              n.metadata->>'trainer_staff_user_id' = $7::text
              OR n.metadata->>'target_staff_user_id' = $7::text
            )
          )
        )
        AND (
          $5::timestamptz IS NULL
          OR (r.delivered_at, n.id) < ($5::timestamptz, $6::uuid)
        )
      ORDER BY r.delivered_at DESC, n.id DESC
      LIMIT $8`,
      [
        auth.organizationId,
        auth.branchId,
        status,
        source,
        cursor?.deliveredAt || null,
        cursor?.notificationId || null,
        trainerStaffUserId,
        limit + 1,
      ]
    );

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];

    const response: NotificationListResponse = {
      items: data,
      nextCursor: hasMore && last
        ? encodeCursor({ deliveredAt: last.delivered_at, notificationId: last.notification_id })
        : null,
      hasMore,
    };

    return ok(response);
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code || "")
        : "";
    if (code === "42P01") {
      return ok({ items: [], nextCursor: null, hasMore: false });
    }
    return routeError(error);
  }
}
