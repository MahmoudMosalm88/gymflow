import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { memberSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    const payload = memberSchema.partial().parse(await request.json());
    const id = params.id;

    const rows = await query(
      `UPDATE members
          SET name = COALESCE($4, name),
              phone = COALESCE($5, phone),
              gender = COALESCE($6, gender),
              photo_path = COALESCE($7, photo_path),
              access_tier = COALESCE($8, access_tier),
              card_code = COALESCE($9, card_code),
              address = COALESCE($10, address),
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
        payload.address || null
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
          SET deleted_at = NOW(), updated_at = NOW()
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
