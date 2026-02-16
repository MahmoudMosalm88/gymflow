import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { buildBranchArchive, countArchiveRows, type BranchArchive } from "@/lib/archive-engine";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const backupId = uuidv4();
    const artifactId = uuidv4();

    let archive: BranchArchive | null = null;
    let rowCounts: Record<string, number> = {};

    await withTransaction(async (client) => {
      const generated = await buildBranchArchive(client, auth.organizationId, auth.branchId);
      archive = generated;
      rowCounts = countArchiveRows(generated);

      await client.query(
        `INSERT INTO backups (
            id, organization_id, branch_id, source, status,
            storage_path, metadata
         ) VALUES (
            $1, $2, $3, 'manual', 'completed',
            $4, $5::jsonb
         )`,
        [
          backupId,
          auth.organizationId,
          auth.branchId,
          `manual/${backupId}.json`,
          JSON.stringify({ rowCounts })
        ]
      );

      await client.query(
        `INSERT INTO backup_artifacts (
            id, backup_id, organization_id, branch_id, archive
         ) VALUES (
            $1, $2, $3, $4, $5::jsonb
         )`,
        [artifactId, backupId, auth.organizationId, auth.branchId, JSON.stringify(generated)]
      );
    });

    return ok({ backupId, artifactId, rowCounts, archive });
  } catch (error) {
    return routeError(error);
  }
}
