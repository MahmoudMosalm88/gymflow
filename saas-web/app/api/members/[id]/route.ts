import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { memberSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toUnixSeconds(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    const rows = await query(
      `SELECT m.*,
              ta.trainer_staff_user_id,
              ta.trainer_name,
              ta.trainer_phone,
              ta.trainer_email,
              ta.assigned_at AS trainer_assigned_at
         FROM members m
         LEFT JOIN LATERAL (
           SELECT mta.trainer_staff_user_id,
                  su.name AS trainer_name,
                  su.phone AS trainer_phone,
                  su.email AS trainer_email,
                  mta.assigned_at::text AS assigned_at
             FROM member_trainer_assignments mta
             JOIN staff_users su ON su.id = mta.trainer_staff_user_id
            WHERE mta.member_id = m.id
              AND mta.organization_id = m.organization_id
              AND mta.branch_id = m.branch_id
              AND mta.is_active = true
            ORDER BY mta.assigned_at DESC
            LIMIT 1
         ) ta ON true
        WHERE m.id = $1
          AND m.organization_id = $2
          AND m.branch_id = $3
          AND m.deleted_at IS NULL`,
      [params.id, auth.organizationId, auth.branchId]
    );
    if (!rows[0]) return fail("Member not found", 404);
    return ok(rows[0]);
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const payload = memberSchema.partial().parse(body);
    const baseUpdatedAt = toUnixSeconds((body as { base_updated_at?: unknown })?.base_updated_at);
    const id = params.id;
    const requestedCardCode = (payload.card_code || "").trim();

    if (baseUpdatedAt !== null) {
      const currentRows = await query<{ updated_at_unix: number }>(
        `SELECT EXTRACT(EPOCH FROM updated_at)::bigint AS updated_at_unix
           FROM members
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
            AND deleted_at IS NULL
          LIMIT 1`,
        [id, auth.organizationId, auth.branchId]
      );

      if (!currentRows[0]) return fail("Member not found", 404);
      if (Number(currentRows[0].updated_at_unix) !== baseUpdatedAt) {
        return fail("This member was changed on another device. Review and try again.", 409, {
          code: "offline_conflict",
        });
      }
    }

    if (requestedCardCode) {
      await query(
        `UPDATE members
            SET card_code = NULL, updated_at = NOW()
          WHERE organization_id = $1
            AND branch_id = $2
            AND deleted_at IS NOT NULL
            AND card_code = $3`,
        [auth.organizationId, auth.branchId, requestedCardCode]
      );
    }

    const rows = await query(
      `UPDATE members
          SET name = COALESCE($4, name),
              phone = COALESCE($5, phone),
              gender = COALESCE($6, gender),
              photo_path = COALESCE($7, photo_path),
              access_tier = COALESCE($8, access_tier),
              card_code = COALESCE($9, card_code),
              address = COALESCE($10, address),
              whatsapp_do_not_contact = COALESCE($11, whatsapp_do_not_contact),
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND deleted_at IS NULL
      RETURNING *`,
      [
        id,
        auth.organizationId,
        auth.branchId,
        payload.name || null,
        payload.phone || null,
        payload.gender || null,
        payload.photo_path || null,
        payload.access_tier || null,
        payload.card_code || null,
        payload.address || null,
        payload.whatsapp_do_not_contact ?? null
      ]
    );

    if (!rows[0]) return fail("Member not found", 404);
    return ok(rows[0]);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    const rows = await query(
      `UPDATE members
          SET deleted_at = NOW(),
              card_code = NULL,
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND deleted_at IS NULL
      RETURNING id`,
      [params.id, auth.organizationId, auth.branchId]
    );

    if (!rows[0]) return fail("Member not found", 404);
    return ok({ id: params.id, deleted: true });
  } catch (error) {
    return routeError(error);
  }
}
