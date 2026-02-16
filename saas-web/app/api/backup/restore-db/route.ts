import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { createSnapshotBackup, replaceBranchFromArchive } from "@/lib/archive-engine";
import { parseDesktopDbToArchive } from "@/lib/desktop-db-to-archive";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const jobId = uuidv4();

  try {
    const auth = await requireAuth(request);
    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File)) {
      return fail("Attach a .db file in `file` field.", 400);
    }

    if (!uploaded.name.toLowerCase().endsWith(".db")) {
      return fail("Only .db files are supported for restore.", 400);
    }

    const dbBytes = new Uint8Array(await uploaded.arrayBuffer());
    if (!dbBytes.byteLength) {
      return fail("Uploaded database file is empty.", 400);
    }

    const sourceArchive = await parseDesktopDbToArchive(dbBytes);

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
        JSON.stringify({
          source: "restore_db",
          fileName: uploaded.name,
          fileSize: uploaded.size
        })
      ]
    );

    const preRestoreSnapshot = await withTransaction(async (client) =>
      createSnapshotBackup(client, {
        organizationId: auth.organizationId,
        branchId: auth.branchId,
        source: "pre_restore",
        storagePath: `pre_restore/restore_db_${jobId}.json`,
        metadata: {
          trigger: "restore_db",
          jobId,
          fileName: uploaded.name
        }
      })
    );

    const replay = await withTransaction(async (client) =>
      replaceBranchFromArchive(client, {
        organizationId: auth.organizationId,
        branchId: auth.branchId,
        sourceArchive,
        mode: "desktop_import"
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
        jobId,
        auth.organizationId,
        auth.branchId,
        JSON.stringify({
          source: "restore_db",
          preRestoreBackupId: preRestoreSnapshot.backupId,
          preRestoreArtifactId: preRestoreSnapshot.artifactId,
          report: replay.report
        })
      ]
    );

    return ok({
      restoreJobId: jobId,
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
        [jobId, auth.organizationId, auth.branchId, JSON.stringify({ source: "restore_db", error: message })]
      );
    } catch {
      // Best effort.
    }

    return routeError(error);
  }
}
