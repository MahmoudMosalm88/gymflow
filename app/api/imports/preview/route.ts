import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import {
  buildImportPreview,
  type ImportPreviewResponse,
  type SpreadsheetImportArtifactPayload
} from "@/lib/imports";
import { importPreviewSchema } from "@/lib/validation";

export const runtime = "nodejs";

type ImportArtifactRow = {
  payload: unknown;
  kind: string;
};

type ExistingMemberRef = {
  id: string;
  phone: string;
  card_code: string | null;
};

function isSpreadsheetPayload(value: unknown): value is SpreadsheetImportArtifactPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as SpreadsheetImportArtifactPayload;
  return (
    candidate.kind === "spreadsheet" &&
    (candidate.fileFormat === "csv" || candidate.fileFormat === "xlsx") &&
    Array.isArray(candidate.headers) &&
    Array.isArray(candidate.rows)
  );
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const body = importPreviewSchema.parse(await request.json());

    const artifactRows = await query<ImportArtifactRow>(
      `SELECT payload, kind
         FROM import_artifacts
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
        LIMIT 1`,
      [body.artifactId, auth.organizationId, auth.branchId]
    );

    const artifact = artifactRows[0];
    if (!artifact) return fail("Import artifact not found", 404);
    if (artifact.kind !== "spreadsheet") {
      return fail("This import artifact is not a spreadsheet upload", 409);
    }
    if (!isSpreadsheetPayload(artifact.payload)) {
      return fail("Import artifact payload is invalid or unreadable", 409);
    }

    const existingMembers = await query<ExistingMemberRef>(
      `SELECT id, phone, card_code
         FROM members
        WHERE organization_id = $1
          AND branch_id = $2
          AND deleted_at IS NULL`,
      [auth.organizationId, auth.branchId]
    );

    const existingRefs = {
      phones: new Set(existingMembers.map((row) => row.phone)),
      cardCodes: new Set(existingMembers.map((row) => row.card_code).filter((value): value is string => Boolean(value)))
    };

    const { rowResults, summary } = buildImportPreview(
      artifact.payload,
      body.mapping,
      body.defaults || {},
      existingRefs
    );

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM import_row_results WHERE artifact_id = $1`, [body.artifactId]);

      for (const row of rowResults) {
        await client.query(
          `INSERT INTO import_row_results (
              id, artifact_id, organization_id, branch_id, row_number,
              raw_row, normalized_row, status, issues,
              matched_member_id, created_member_id, created_subscription_id
           ) VALUES (
              $1, $2, $3, $4, $5,
              $6::jsonb, $7::jsonb, $8, $9::jsonb,
              $10, NULL, NULL
           )`,
          [
            uuidv4(),
            body.artifactId,
            auth.organizationId,
            auth.branchId,
            row.rowNumber,
            JSON.stringify(row.rawRow),
            row.normalizedRow ? JSON.stringify(row.normalizedRow) : null,
            row.status,
            JSON.stringify(row.issues),
            null
          ]
        );
      }

      await client.query(
        `UPDATE import_artifacts
            SET status = $4,
                mapping = $5::jsonb,
                preview_summary = $6::jsonb,
                validation_report = $7::jsonb,
                updated_at = NOW()
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3`,
        [
          body.artifactId,
          auth.organizationId,
          auth.branchId,
          summary.invalidRows > 0 ? "invalid" : "validated",
          JSON.stringify(body.mapping),
          JSON.stringify(summary),
          JSON.stringify({
            summary,
            defaults: body.defaults || {},
            duplicateMode: body.defaults?.duplicate_mode || "skip_duplicates"
          })
        ]
      );
    });

    const response: ImportPreviewResponse = {
      artifactId: body.artifactId,
      summary,
      rows: rowResults.slice(0, 100)
    };

    return ok(response);
  } catch (error) {
    return routeError(error);
  }
}
