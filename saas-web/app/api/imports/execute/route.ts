import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { importExecuteSchema } from "@/lib/validation";
import { toUnixSeconds } from "@/lib/subscription-dates";
import type { ImportExecuteResponse } from "@/lib/imports";

export const runtime = "nodejs";

type ImportArtifactRow = {
  status: string;
};

type ImportRowResultRow = {
  id: string;
  row_number: number;
  raw_row: Record<string, string>;
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
  issues: Array<Record<string, unknown>>;
};

type ExistingMemberRef = {
  id: string;
  phone: string;
  card_code: string | null;
};

export async function POST(request: NextRequest) {
  const jobId = uuidv4();

  try {
    const auth = await requireAuth(request);
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
      `SELECT id, row_number, raw_row, normalized_row, status, issues
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

      for (const row of rowResults) {
        if (!row.normalized_row || !["valid", "warning"].includes(row.status)) {
          await client.query(
            `UPDATE import_row_results
                SET status = CASE
                    WHEN status = 'duplicate' THEN 'skipped'
                    ELSE status
                  END,
                    updated_at = NOW()
              WHERE id = $1`,
            [row.id]
          );
          if (row.status === "duplicate") skippedRows += 1;
          continue;
        }

        const member = row.normalized_row.member;
        if (!member) {
          await client.query(
            `UPDATE import_row_results
                SET status = 'failed',
                    issues = issues || $2::jsonb,
                    updated_at = NOW()
              WHERE id = $1`,
            [
              row.id,
              JSON.stringify([{ severity: "error", field: "member", message: "Normalized member payload is missing.", code: "missing_normalized_member" }])
            ]
          );
          failedRows += 1;
          continue;
        }

        const duplicateByPhone = existingPhones.has(member.phone);
        const duplicateByCardCode = member.card_code ? existingCardCodes.has(member.card_code) : false;
        if (duplicateByPhone || duplicateByCardCode) {
          await client.query(
            `UPDATE import_row_results
                SET status = 'skipped',
                    updated_at = NOW()
              WHERE id = $1`,
            [row.id]
          );
          skippedRows += 1;
          continue;
        }

        const memberId = uuidv4();
        const createdAt = new Date();
        const joinedAt = member.joined_at ? new Date(member.joined_at) : null;

        await client.query(
          `INSERT INTO members (
              id, organization_id, branch_id, name, phone, gender, photo_path,
              access_tier, card_code, address, notes, created_at, updated_at,
              source, import_job_id, is_legacy_import, joined_at
           ) VALUES (
              $1, $2, $3, $4, $5, $6, NULL,
              'full', $7, NULL, $8, $9, $9,
              'import_csv', $10, true, $11
           )`,
          [
            memberId,
            auth.organizationId,
            auth.branchId,
            member.name,
            member.phone,
            member.gender,
            member.card_code || null,
            member.notes || null,
            createdAt,
            jobId,
            joinedAt
          ]
        );

        importedMembers += 1;
        existingPhones.add(member.phone);
        if (member.card_code) existingCardCodes.add(member.card_code);

        let createdSubscriptionId: number | null = null;
        if (row.normalized_row.subscription) {
          const subscription = row.normalized_row.subscription;
          const inserted = await client.query<{ id: number }>(
            `INSERT INTO subscriptions (
                organization_id, branch_id, member_id, renewed_from_subscription_id,
                start_date, end_date, plan_months, price_paid, payment_method,
                sessions_per_month, is_active, source, import_job_id, is_legacy_import
             ) VALUES (
                $1, $2, $3, NULL,
                $4, $5, $6, $7, NULL,
                $8, true, 'import_csv', $9, true
             )
             RETURNING id`,
            [
              auth.organizationId,
              auth.branchId,
              memberId,
              toUnixSeconds(new Date(subscription.start_date)),
              toUnixSeconds(new Date(subscription.end_date)),
              subscription.plan_months,
              subscription.amount_paid ?? null,
              subscription.sessions_per_month ?? null,
              jobId
            ]
          );
          createdSubscriptionId = inserted.rows[0]?.id ?? null;
          importedSubscriptions += 1;
        }

        await client.query(
          `UPDATE import_row_results
              SET status = 'imported',
                  created_member_id = $2,
                  created_subscription_id = $3,
                  updated_at = NOW()
            WHERE id = $1`,
          [row.id, memberId, createdSubscriptionId]
        );
      }

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
          JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
        ]
      );
    } catch {
      // best effort
    }
    return routeError(error);
  }
}
