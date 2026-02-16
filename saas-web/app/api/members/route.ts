import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { memberSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (!q) {
      const rows = await query(
        `SELECT *
           FROM members
          WHERE organization_id = $1
            AND branch_id = $2
            AND deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 500`,
        [auth.organizationId, auth.branchId]
      );
      return ok(rows);
    }

    const rows = await query(
      `SELECT *
         FROM members
        WHERE organization_id = $1
          AND branch_id = $2
          AND deleted_at IS NULL
          AND (name ILIKE $3 OR phone ILIKE $3 OR COALESCE(card_code, '') ILIKE $3)
        ORDER BY created_at DESC
        LIMIT 500`,
      [auth.organizationId, auth.branchId, `%${q}%`]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = memberSchema.parse(await request.json());
    const now = new Date();
    const id = payload.id || uuidv4();

    const rows = await query(
      `INSERT INTO members (
          id, organization_id, branch_id, name, phone, gender, photo_path,
          access_tier, card_code, address, created_at, updated_at
       ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $11
       )
       RETURNING *`,
      [
        id,
        auth.organizationId,
        auth.branchId,
        payload.name,
        payload.phone,
        payload.gender,
        payload.photo_path || null,
        payload.access_tier,
        payload.card_code || null,
        payload.address || null,
        now
      ]
    );

    return ok(rows[0], { status: 201 });
  } catch (error) {
    // Handle duplicate key errors specifically for user-friendly feedback
    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return fail("This member already exists. Please check the phone number or card code and try again.", 409);
    }
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return fail("Member id is required", 400);

    const payload = memberSchema.partial().parse(body);

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

    if (!rows[0]) return fail("This member could not be found. They may have already been deleted.", 404);
    return ok(rows[0]);
  } catch (error) {
    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return fail("This phone number or card code is already in use. Please use unique values.", 409);
    }
    return routeError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return fail("Member id is required", 400);

    const rows = await query(
      `UPDATE members
          SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND deleted_at IS NULL
      RETURNING id`,
      [id, auth.organizationId, auth.branchId]
    );

    if (!rows[0]) return fail("This member could not be found. They may have already been deleted.", 404);
    return ok({ id, deleted: true });
  } catch (error) {
    return routeError(error);
  }
}
