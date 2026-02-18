import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, routeError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  name: string | null;
  email: string | null;
  phone: string | null;
  organization_name: string | null;
  branch_name: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const rows = await query<ProfileRow>(
      `SELECT o.name, o.email, o.phone,
              org.name AS organization_name,
              b.name AS branch_name
         FROM owners o
         JOIN owner_branch_access oba ON oba.owner_id = o.id
         JOIN branches b ON b.id = oba.branch_id
         JOIN organizations org ON org.id = b.organization_id
        WHERE o.id = $1 AND oba.branch_id = $2
        LIMIT 1`,
      [auth.ownerId, auth.branchId]
    );

    if (!rows[0]) return fail("Profile not found", 404);

    return ok(rows[0]);
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();

    const { name, email, phone, organization_name, branch_name } = body;

    // Update owner fields
    await query(
      `UPDATE owners SET name = $1, email = $2, phone = $3 WHERE id = $4`,
      [name || null, email || null, phone || null, auth.ownerId]
    );

    // Update organization name
    if (organization_name !== undefined) {
      await query(
        `UPDATE organizations SET name = $1 WHERE id = $2`,
        [organization_name, auth.organizationId]
      );
    }

    // Update branch name
    if (branch_name !== undefined) {
      await query(
        `UPDATE branches SET name = $1 WHERE id = $2`,
        [branch_name, auth.branchId]
      );
    }

    return ok({ updated: true });
  } catch (error) {
    return routeError(error);
  }
}
