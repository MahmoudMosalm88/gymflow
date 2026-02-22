import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";
import { buildBranchArchive, countArchiveRows } from "@/lib/archive-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function isWithinWindow(hour: number, start: number, end: number) {
  if (end === 24) return hour >= start;
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const settingsRows = await query<{ key: string; value: unknown }>(
      `SELECT key, value
         FROM settings
        WHERE organization_id = $1
          AND branch_id = $2
          AND key IN (
            'backup_auto_enabled',
            'backup_auto_interval_hours',
            'backup_auto_window_start',
            'backup_auto_window_end'
          )`,
      [auth.organizationId, auth.branchId]
    );
    const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));

    const enabled = toBool(settings.backup_auto_enabled, false);
    const intervalHours = Math.max(1, Math.min(168, toNumber(settings.backup_auto_interval_hours, 24)));
    const windowStart = Math.max(0, Math.min(23, Math.trunc(toNumber(settings.backup_auto_window_start, 0))));
    const windowEnd = Math.max(1, Math.min(24, Math.trunc(toNumber(settings.backup_auto_window_end, 24))));

    if (!enabled) return ok({ ran: false, reason: "disabled" });

    const now = new Date();
    const hour = now.getUTCHours();
    if (!isWithinWindow(hour, windowStart, windowEnd)) {
      return ok({ ran: false, reason: "outside_window", hour, windowStart, windowEnd });
    }

    const lastRows = await query<{ created_at: string }>(
      `SELECT created_at
         FROM backups
        WHERE organization_id = $1
          AND branch_id = $2
          AND source = 'scheduled'
          AND status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1`,
      [auth.organizationId, auth.branchId]
    );

    const lastAt = lastRows[0] ? new Date(lastRows[0].created_at) : null;
    const nextDue = lastAt ? lastAt.getTime() + intervalHours * 3600 * 1000 : 0;
    if (lastAt && Date.now() < nextDue) {
      return ok({ ran: false, reason: "not_due", nextDue });
    }

    const backupId = uuidv4();
    const artifactId = uuidv4();
    let rowCounts: Record<string, number> = {};

    await withTransaction(async (client) => {
      const generated = await buildBranchArchive(client, auth.organizationId, auth.branchId);
      rowCounts = countArchiveRows(generated);

      await client.query(
        `INSERT INTO backups (
            id, organization_id, branch_id, source, status, storage_path, metadata
         ) VALUES (
            $1, $2, $3, 'scheduled', 'completed', $4, $5::jsonb
         )`,
        [backupId, auth.organizationId, auth.branchId, `scheduled/${backupId}.json`, JSON.stringify({ rowCounts })]
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

    return ok({ ran: true, backupId, artifactId, rowCounts });
  } catch (error) {
    return routeError(error);
  }
}
