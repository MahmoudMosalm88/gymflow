import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, fail, routeError } from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST /api/migration/backfill-card-codes
 *
 * One-time migration: reads the most recent desktop import artifact,
 * extracts old desktop member IDs, and writes them into card_code
 * for matching members (matched by phone number).
 *
 * This allows QR codes printed from the old desktop app to work
 * with the web app's scanner, since the check-in API matches
 * against card_code.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    // Find the most recent imported desktop artifact for this branch
    const artifactRows = await query<{ payload: unknown }>(
      `SELECT payload FROM import_artifacts
       WHERE organization_id = $1 AND branch_id = $2
         AND status = 'imported'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [auth.organizationId, auth.branchId]
    );

    if (!artifactRows[0]) {
      return ok({ updated: 0, skipped: 0, notFound: 0, noArtifact: true });
    }

    const archive = artifactRows[0].payload as {
      tables?: { members?: unknown[] };
    };

    if (!archive?.tables?.members?.length) {
      return fail("Import artifact has no member data.", 400);
    }

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    await withTransaction(async (client) => {
      for (const raw of archive.tables!.members!) {
        if (!raw || typeof raw !== "object") continue;
        const rec = raw as Record<string, unknown>;

        const oldId = String(rec.id ?? "").trim();
        const phone = String(rec.phone ?? "").trim();

        if (!oldId || !phone) {
          skipped += 1;
          continue;
        }

        // Match by phone, only update if card_code is currently empty
        const result = await client.query(
          `UPDATE members
              SET card_code = $1, updated_at = NOW()
            WHERE organization_id = $2
              AND branch_id = $3
              AND phone = $4
              AND deleted_at IS NULL
              AND (card_code IS NULL OR card_code = '')`,
          [oldId, auth.organizationId, auth.branchId, phone]
        );

        if (result.rowCount && result.rowCount > 0) {
          updated += 1;
        } else {
          notFound += 1;
        }
      }
    });

    return ok({ updated, skipped, notFound });
  } catch (error) {
    return routeError(error);
  }
}
