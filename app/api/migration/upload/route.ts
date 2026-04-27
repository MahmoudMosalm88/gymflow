import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { ok, fail, routeError } from "@/lib/http";
import { parseDesktopDbToArchive } from "@/lib/desktop-db-to-archive";
import type { DesktopImportUploadResponse } from "@/lib/migration-contracts";

type DesktopImportUploadRow = Pick<DesktopImportUploadResponse, "id" | "file_name" | "status" | "created_at">;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);

    // Read the uploaded .db file from FormData
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return fail("No file uploaded", 400);
    }

    const fileName = file instanceof File ? file.name : "upload.db";
    const arrayBuffer = await file.arrayBuffer();
    const dbBytes = new Uint8Array(arrayBuffer);

    if (dbBytes.length === 0) {
      return fail("File is empty", 400);
    }

    // Parse SQLite .db file into BranchArchive using existing converter
    let archive;
    try {
      archive = await parseDesktopDbToArchive(dbBytes);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return fail(`Could not read database file: ${msg}`, 400);
    }

    // Store the archive JSON in import_artifacts (same as before)
    const artifactId = uuidv4();
    const rows = await query<DesktopImportUploadRow>(
      `INSERT INTO import_artifacts (
          id, organization_id, branch_id, file_name, payload, status
       ) VALUES (
          $1, $2, $3, $4, $5::jsonb, 'uploaded'
       )
       RETURNING id, file_name, status, created_at`,
      [artifactId, auth.organizationId, auth.branchId, fileName, JSON.stringify(archive)]
    );

    const response: DesktopImportUploadResponse = rows[0];
    return ok(response, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
