import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { parseSpreadsheetArtifact } from "@/lib/imports";
import type { ImportUploadResponse } from "@/lib/imports";

type ImportUploadRow = Pick<ImportUploadResponse, "id" | "file_name" | "status" | "created_at">;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return fail("No file uploaded", 400);
    }

    const fileName = file instanceof File ? file.name : "upload";
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length === 0) {
      return fail("File is empty", 400);
    }

    const artifact = parseSpreadsheetArtifact(fileName, bytes);
    const artifactId = uuidv4();

    const rows = await query<ImportUploadRow>(
      `INSERT INTO import_artifacts (
          id, organization_id, branch_id, file_name, kind, file_format, payload, status
       ) VALUES (
          $1, $2, $3, $4, 'spreadsheet', $5, $6::jsonb, 'parsed'
       )
       RETURNING id, file_name, status, created_at`,
      [
        artifactId,
        auth.organizationId,
        auth.branchId,
        fileName,
        artifact.fileFormat,
        JSON.stringify(artifact)
      ]
    );

    const response: ImportUploadResponse = {
      ...rows[0],
      fileFormat: artifact.fileFormat,
      headers: artifact.headers,
      totalRows: artifact.totalRows,
      sheetName: artifact.sheetName
    };

    return ok(response, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
