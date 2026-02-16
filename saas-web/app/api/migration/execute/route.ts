import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { createSnapshotBackup, replaceBranchFromArchive } from "@/lib/archive-engine";

export const runtime = "nodejs";

type ImportArtifactRow = {
  payload: unknown;
  status: string;
  file_name: string;
};

export async function POST(request: NextRequest) {
  const jobId = uuidv4();
  let artifactId = "";

  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    artifactId = String(body.artifactId || "");
    if (!artifactId) return fail("artifactId is required", 400);

    const artifactRows = await query<ImportArtifactRow>(
      `SELECT payload, status, file_name
         FROM import_artifacts
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
        LIMIT 1`,
      [artifactId, auth.organizationId, auth.branchId]
    );

    const artifact = artifactRows[0];
    if (!artifact) return fail("Artifact not found", 404);
    if (!["uploaded", "validated"].includes(artifact.status)) {
      return fail(`Artifact status '${artifact.status}' cannot be imported`, 409);
    }

    await query(
      `INSERT INTO migration_jobs (
          id, organization_id, branch_id, type, status, payload, started_at
       ) VALUES (
          $1, $2, $3, 'desktop_import', 'running', $4::jsonb, NOW()
       )`,
      [
        jobId,
        auth.organizationId,
        auth.branchId,
        JSON.stringify({ artifactId, fileName: artifact.file_name })
      ]
    );

    const preImportSnapshot = await withTransaction(async (client) =>
      createSnapshotBackup(client, {
        organizationId: auth.organizationId,
        branchId: auth.branchId,
        source: "pre_restore",
        storagePath: `pre_restore/desktop_import_${jobId}.json`,
        metadata: {
          trigger: "desktop_import",
          jobId,
          artifactId
        }
      })
    );

    const replay = await withTransaction(async (client) =>
      replaceBranchFromArchive(client, {
        organizationId: auth.organizationId,
        branchId: auth.branchId,
        sourceArchive: artifact.payload,
        mode: "desktop_import"
      })
    );

    await query(
      `UPDATE import_artifacts
          SET status = 'imported',
              validation_report = $4::jsonb,
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3`,
      [
        artifactId,
        auth.organizationId,
        auth.branchId,
        JSON.stringify({ importJobId: jobId, report: replay.report })
      ]
    );

    await query(
      `UPDATE migration_jobs
          SET status = 'completed',
              result = $4::jsonb,
              finished_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3`,
      [
        jobId,
        auth.organizationId,
        auth.branchId,
        JSON.stringify({
          artifactId,
          preImportBackupId: preImportSnapshot.backupId,
          preImportArtifactId: preImportSnapshot.artifactId,
          report: replay.report
        })
      ]
    );

    return ok({
      jobId,
      status: "completed",
      artifactId,
      preImportBackupId: preImportSnapshot.backupId,
      preImportArtifactId: preImportSnapshot.artifactId,
      report: replay.report
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      const auth = await requireAuth(request);
      await query(
        `UPDATE migration_jobs
            SET status = 'failed',
                result = $4::jsonb,
                finished_at = NOW()
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3`,
        [
          jobId,
          auth.organizationId,
          auth.branchId,
          JSON.stringify({ artifactId: artifactId || null, error: message })
        ]
      );

      if (artifactId) {
        await query(
          `UPDATE import_artifacts
              SET status = 'failed',
                  validation_report = $4::jsonb,
                  updated_at = NOW()
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3`,
          [
            artifactId,
            auth.organizationId,
            auth.branchId,
            JSON.stringify({ importJobId: jobId, error: message })
          ]
        );
      }
    } catch {
      // Best effort only.
    }

    return routeError(error);
  }
}
