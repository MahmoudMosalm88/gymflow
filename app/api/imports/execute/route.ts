import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireRoles } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import {
  insertImportedMembers,
  insertImportedSubscriptions,
  markImportRowsFailed,
  markImportRowsImported,
  markImportRowsSkipped,
  type BatchedImportedMemberSeed,
  type BatchedImportedSubscriptionSeed,
} from "@/lib/import-batches";
import { importExecuteSchema } from "@/lib/validation";
import { toUnixSeconds } from "@/lib/subscription-dates";
import type { ImportExecuteResponse } from "@/lib/imports";

export const runtime = "nodejs";

type ImportArtifactRow = {
  status: string;
};

type ImportRowResultRow = {
  id: string;
  normalized_row: {
    member?: {
      name: string;
      phone: string;
      gender: "male" | "female";
      joined_at?: string | null;
      date_of_birth?: string | null;
      notes?: string | null;
      card_code?: string | null;
    };
    subscription?: {
      start_date: string;
      end_date: string;
      plan_months: number;
      sessions_per_month?: number | null;
      amount_paid?: number | null;
    } | null;
  } | null;
  status: "valid" | "warning" | "invalid" | "duplicate" | "imported" | "skipped" | "failed";
};

type ExistingMemberRef = {
  id: string;
  phone: string;
  card_code: string | null;
};

export async function POST(request: NextRequest) {
  const jobId = uuidv4();

  try {
    const auth = await requireRoles(request, ["owner"]);
    const body = importExecuteSchema.parse(await request.json());

    const artifactRows = await query<ImportArtifactRow>(
      `SELECT status
         FROM import_artifacts
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
        LIMIT 1`,
      [body.artifactId, auth.organizationId, auth.branchId]
    );

    const artifact = artifactRows[0];
    if (!artifact) return fail("Import artifact not found", 404);
    if (!["validated", "invalid"].includes(artifact.status)) {
      return fail("Run import preview before executing the import.", 409);
    }

    const rowResults = await query<ImportRowResultRow>(
      `SELECT id, normalized_row, status
         FROM import_row_results
        WHERE artifact_id = $1
          AND organization_id = $2
          AND branch_id = $3
        ORDER BY row_number ASC`,
      [body.artifactId, auth.organizationId, auth.branchId]
    );

    if (rowResults.length === 0) {
      return fail("No preview rows found for this artifact. Run preview first.", 409);
    }

    const output = await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO migration_jobs (
            id, organization_id, branch_id, type, status, payload, started_at
         ) VALUES (
            $1, $2, $3, 'spreadsheet_import', 'running', $4::jsonb, NOW()
         )`,
        [
          jobId,
          auth.organizationId,
          auth.branchId,
          JSON.stringify({
            artifactId: body.artifactId,
            duplicate_mode: body.duplicate_mode || "skip_duplicates",
            suppressImportedAutomations: body.suppressImportedAutomations ?? true
          })
        ]
      );

      const existingMembers = await client.query<ExistingMemberRef>(
        `SELECT id, phone, card_code
           FROM members
          WHERE organization_id = $1
            AND branch_id = $2
            AND deleted_at IS NULL`,
        [auth.organizationId, auth.branchId]
      );

      const existingPhones = new Set(existingMembers.rows.map((row) => row.phone));
      const existingCardCodes = new Set(
        existingMembers.rows.map((row) => row.card_code).filter((value): value is string => Boolean(value))
      );

      let importedMembers = 0;
      let importedSubscriptions = 0;
      let skippedRows = 0;
      let failedRows = 0;
      const createdAt = new Date().toISOString();
      const duplicateRowIds: string[] = [];
      const failedRowUpdates: Array<{ id: string; issues: Array<Record<string, unknown>> }> = [];
      const importedMembersPayload: BatchedImportedMemberSeed[] = [];
      const importedSubscriptionsPayload: BatchedImportedSubscriptionSeed[] = [];
      const importedRowUpdates: Array<{ id: string; createdMemberId: string }> = [];

      for (const row of rowResults) {
        if (!row.normalized_row || !["valid", "warning"].includes(row.status)) {
          if (row.status === "duplicate") {
            duplicateRowIds.push(row.id);
            skippedRows += 1;
          }
          continue;
        }

        const member = row.normalized_row.member;
        if (!member) {
          failedRowUpdates.push({
            id: row.id,
            issues: [{ severity: "error", field: "member", message: "Normalized member payload is missing.", code: "missing_normalized_member" }],
          });
          failedRows += 1;
          continue;
        }

        const duplicateByPhone = existingPhones.has(member.phone);
        const duplicateByCardCode = member.card_code ? existingCardCodes.has(member.card_code) : false;
        if (duplicateByPhone || duplicateByCardCode) {
          duplicateRowIds.push(row.id);
          skippedRows += 1;
          continue;
        }

        const memberId = uuidv4();
        const joinedAt = member.joined_at ? new Date(member.joined_at) : null;

        importedMembers += 1;
        existingPhones.add(member.phone);
        if (member.card_code) existingCardCodes.add(member.card_code);

        importedMembersPayload.push({
          id: memberId,
          organizationId: auth.organizationId,
          branchId: auth.branchId,
          name: member.name,
          phone: member.phone,
          gender: member.gender,
          cardCode: member.card_code || null,
          notes: member.notes || null,
          createdAt,
          importJobId: jobId,
          joinedAt: joinedAt ? joinedAt.toISOString() : null,
        });
        importedRowUpdates.push({
          id: row.id,
          createdMemberId: memberId,
        });

        if (row.normalized_row.subscription) {
          const subscription = row.normalized_row.subscription;
          importedSubscriptionsPayload.push({
            rowId: row.id,
            memberId,
            organizationId: auth.organizationId,
            branchId: auth.branchId,
            startDate: toUnixSeconds(new Date(subscription.start_date)),
            endDate: toUnixSeconds(new Date(subscription.end_date)),
            planMonths: subscription.plan_months,
            amountPaid: subscription.amount_paid ?? null,
            sessionsPerMonth: subscription.sessions_per_month ?? null,
            importJobId: jobId,
          });
        }
      }

      await insertImportedMembers(client, importedMembersPayload);
      const insertedSubscriptions = await insertImportedSubscriptions(client, importedSubscriptionsPayload);
      importedSubscriptions = insertedSubscriptions.length;

      await markImportRowsSkipped(client, duplicateRowIds);
      await markImportRowsFailed(client, failedRowUpdates);

      const subscriptionIdsByRowId = new Map(
        insertedSubscriptions.map((row) => [row.rowId, row.subscriptionId])
      );
      await markImportRowsImported(
        client,
        importedRowUpdates.map((row) => ({
          id: row.id,
          createdMemberId: row.createdMemberId,
          createdSubscriptionId: subscriptionIdsByRowId.get(row.id) ?? null,
        }))
      );

      const result = {
        artifactId: body.artifactId,
        importedMembers,
        importedSubscriptions,
        skippedRows,
        failedRows
      };

      await client.query(
        `UPDATE import_artifacts
            SET status = 'imported',
                validation_report = COALESCE(validation_report, '{}'::jsonb) || $4::jsonb,
                updated_at = NOW()
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3`,
        [
          body.artifactId,
          auth.organizationId,
          auth.branchId,
          JSON.stringify({ execution: result })
        ]
      );

      await client.query(
        `UPDATE migration_jobs
            SET status = 'completed',
                result = $4::jsonb,
                finished_at = NOW()
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3`,
        [jobId, auth.organizationId, auth.branchId, JSON.stringify(result)]
      );

      return result;
    });

    const response: ImportExecuteResponse = { jobId, ...output };
    return ok(response, { status: 201 });
  } catch (error) {
    try {
      const auth = await requireRoles(request, ["owner"]);
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
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        ]
      );
    } catch {
      // best effort
    }
    return routeError(error);
  }
}
