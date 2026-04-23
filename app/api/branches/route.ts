import { NextRequest } from "next/server";
import { requireRoles } from "@/lib/auth";
import { query } from "@/lib/db";
import { ok, routeError } from "@/lib/http";
import type { EntityRef } from "@/lib/entities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BranchRow = EntityRef & {
  timezone: string;
  currency: string;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);

    const rows = await query<BranchRow>(
      `SELECT b.id, b.name, b.timezone, b.currency, b.created_at::text
         FROM branches b
         JOIN owner_branch_access oba ON oba.branch_id = b.id
        WHERE oba.owner_id = (
          SELECT id FROM owners
           WHERE organization_id = $1
             AND firebase_uid = (
               SELECT firebase_uid FROM owners WHERE id = (
                 SELECT owner_id FROM owner_branch_access WHERE branch_id = $2 LIMIT 1
               )
             )
           LIMIT 1
        )
        ORDER BY b.created_at ASC`,
      [auth.organizationId, auth.branchId]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}
