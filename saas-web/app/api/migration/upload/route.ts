import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { migrationUploadSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = migrationUploadSchema.parse(await request.json());
    const artifactId = uuidv4();

    const rows = await query(
      `INSERT INTO import_artifacts (
          id, organization_id, branch_id, file_name, payload, status
       ) VALUES (
          $1, $2, $3, $4, $5::jsonb, 'uploaded'
       )
       RETURNING id, file_name, status, created_at`,
      [artifactId, auth.organizationId, auth.branchId, payload.fileName, JSON.stringify(payload.payload)]
    );

    return ok(rows[0], { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
