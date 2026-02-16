import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { createSnapshotBackup, replaceBranchFromArchive } from "@/lib/archive-engine";

export const runtime = "nodejs";

type BackupArtifactRow = {
  archive: unknown;
};

export async function POST(request: NextRequest) {
  const restoreJobId = uuidv4();

  try {
    const auth = await requireAuth(request);
    const payload = await request.json();

    let archivePayload: unknown = payload?.archive;

    const artifactId = typeof payload?.artifactId === "string" ? payload.artifactId : "";
    if (!archivePayload && artifactId) {
      const artifactRows = await query<BackupArtifactRow>(
        `SELECT archive
           FROM backup_artifacts
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
          LIMIT 1`,
        [artifactId, auth.organizationId, auth.branchId]
      );
      archivePayload = artifactRows[0]?.archive;
    }

    if (!archivePayload || typeof archivePayload !== "object") {
      return fail("Invalid archive payload. Provide `archive` or a valid `artifactId`.", 400);
    }

    await query(
      `INSERT INTO migration_jobs (
          id, organization_id, branch_id, type, status, payload, started_at
       ) VALUES (
          $1, $2, $3, 'backup_restore', 'running', $4::jsonb, NOW()
       )`,
      [
        restoreJobId,
        auth.organizationId,
        auth.branchId,
        JSON.stringify({ requested_at: new Date().toISOString(), source: "api", artifactId: artifactId || null })
      ]
    );

    const preRestoreSnapshot = await withTransaction(async (client) =>
      createSnapshotBackup(client, {
        organizationId: auth.organizationId,
        branchId: auth.branchId,
        source: "pre_restore",
        storagePath: `pre_restore/${restoreJobId}.json`,
        metadata: {
          trigger: "backup_restore",
          restoreJobId
        }
      })
    );

    const replay = await withTransaction(async (client) =>
      replaceBranchFromArchive(client, {
        organizationId: auth.organizationId,
        branchId: auth.branchId,
        sourceArchive: archivePayload,
        mode: "backup_restore"
      })
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
        restoreJobId,
        auth.organizationId,
        auth.branchId,
        JSON.stringify({
          preRestoreBackupId: preRestoreSnapshot.backupId,
          preRestoreArtifactId: preRestoreSnapshot.artifactId,
          report: replay.report
        })
      ]
    );

    return ok({
      restoreJobId,
      status: "completed",
      preRestoreBackupId: preRestoreSnapshot.backupId,
      preRestoreArtifactId: preRestoreSnapshot.artifactId,
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
          restoreJobId,
          auth.organizationId,
          auth.branchId,
          JSON.stringify({ error: message })
        ]
      );
    } catch {
      // Best effort only.
    }

    return routeError(error);
  }
}
