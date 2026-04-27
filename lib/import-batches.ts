import type { Queryable } from "@/lib/db";
import type { ImportPreviewRowResult } from "@/lib/imports";

const IMPORT_BATCH_SIZE = 1000;

type ImportRowResultSeed = Pick<
  ImportPreviewRowResult,
  "rowNumber" | "rawRow" | "normalizedRow" | "status" | "issues"
> & {
  matchedMemberId?: string | null;
};

type FailedImportRowSeed = {
  id: string;
  issues: Array<Record<string, unknown>>;
};

type ImportedImportRowSeed = {
  id: string;
  createdMemberId: string;
  createdSubscriptionId: number | null;
};

export type BatchedImportedMemberSeed = {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  phone: string;
  gender: "male" | "female";
  cardCode: string | null;
  notes: string | null;
  createdAt: string;
  importJobId: string;
  joinedAt: string | null;
};

export type BatchedImportedSubscriptionSeed = {
  rowId: string;
  memberId: string;
  organizationId: string;
  branchId: string;
  startDate: number;
  endDate: number;
  planMonths: number;
  amountPaid: number | null;
  sessionsPerMonth: number | null;
  importJobId: string;
};

function chunk<T>(items: T[], size = IMPORT_BATCH_SIZE) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

export async function replaceImportRowResults(
  client: Queryable,
  params: {
    artifactId: string;
    organizationId: string;
    branchId: string;
    rows: ImportRowResultSeed[];
  }
) {
  await client.query(`DELETE FROM import_row_results WHERE artifact_id = $1`, [params.artifactId]);

  if (params.rows.length === 0) return;

  for (const batch of chunk(params.rows)) {
    await client.query(
      `INSERT INTO import_row_results (
          id, artifact_id, organization_id, branch_id, row_number,
          raw_row, normalized_row, status, issues,
          matched_member_id, created_member_id, created_subscription_id
       )
       SELECT id, artifact_id, organization_id, branch_id, row_number,
              raw_row, normalized_row, status, issues,
              matched_member_id, NULL, NULL
         FROM jsonb_to_recordset($1::jsonb) AS seed(
           id uuid,
           artifact_id uuid,
           organization_id uuid,
           branch_id uuid,
           row_number integer,
           raw_row jsonb,
           normalized_row jsonb,
           status text,
           issues jsonb,
           matched_member_id uuid
         )`,
      [
        JSON.stringify(
          batch.map((row) => ({
            id: crypto.randomUUID(),
            artifact_id: params.artifactId,
            organization_id: params.organizationId,
            branch_id: params.branchId,
            row_number: row.rowNumber,
            raw_row: row.status === "valid" ? {} : row.rawRow,
            normalized_row: row.normalizedRow,
            status: row.status,
            issues: row.issues,
            matched_member_id: row.matchedMemberId ?? null,
          }))
        ),
      ]
    );
  }
}

export async function markImportRowsSkipped(client: Queryable, rowIds: string[]) {
  if (rowIds.length === 0) return;

  for (const batch of chunk(rowIds)) {
    await client.query(
      `UPDATE import_row_results
          SET status = 'skipped',
              updated_at = NOW()
        WHERE id = ANY($1::uuid[])`,
      [batch]
    );
  }
}

export async function markImportRowsFailed(client: Queryable, rows: FailedImportRowSeed[]) {
  if (rows.length === 0) return;

  for (const batch of chunk(rows)) {
    await client.query(
      `UPDATE import_row_results AS target
          SET status = 'failed',
              issues = COALESCE(target.issues, '[]'::jsonb) || seed.issues,
              updated_at = NOW()
         FROM jsonb_to_recordset($1::jsonb) AS seed(
           id uuid,
           issues jsonb
         )
        WHERE target.id = seed.id`,
      [
        JSON.stringify(
          batch.map((row) => ({
            id: row.id,
            issues: row.issues,
          }))
        ),
      ]
    );
  }
}

export async function markImportRowsImported(client: Queryable, rows: ImportedImportRowSeed[]) {
  if (rows.length === 0) return;

  for (const batch of chunk(rows)) {
    await client.query(
      `UPDATE import_row_results AS target
          SET status = 'imported',
              created_member_id = seed.created_member_id,
              created_subscription_id = seed.created_subscription_id,
              updated_at = NOW()
         FROM jsonb_to_recordset($1::jsonb) AS seed(
           id uuid,
           created_member_id uuid,
           created_subscription_id bigint
         )
        WHERE target.id = seed.id`,
      [
        JSON.stringify(
          batch.map((row) => ({
            id: row.id,
            created_member_id: row.createdMemberId,
            created_subscription_id: row.createdSubscriptionId,
          }))
        ),
      ]
    );
  }
}

export async function insertImportedMembers(
  client: Queryable,
  members: BatchedImportedMemberSeed[]
) {
  if (members.length === 0) return;

  for (const batch of chunk(members)) {
    await client.query(
      `INSERT INTO members (
          id, organization_id, branch_id, name, phone, gender, photo_path,
          access_tier, card_code, address, notes, created_at, updated_at,
          source, import_job_id, is_legacy_import, joined_at
       )
       SELECT id, organization_id, branch_id, name, phone, gender, NULL,
              'full', card_code, NULL, notes, created_at::timestamptz, created_at::timestamptz,
              'import_csv', import_job_id, true, joined_at::timestamptz
         FROM jsonb_to_recordset($1::jsonb) AS seed(
           id uuid,
           organization_id uuid,
           branch_id uuid,
           name text,
           phone text,
           gender text,
           card_code text,
           notes text,
           created_at text,
           import_job_id uuid,
           joined_at text
         )`,
      [
        JSON.stringify(
          batch.map((member) => ({
            id: member.id,
            organization_id: member.organizationId,
            branch_id: member.branchId,
            name: member.name,
            phone: member.phone,
            gender: member.gender,
            card_code: member.cardCode,
            notes: member.notes,
            created_at: member.createdAt,
            import_job_id: member.importJobId,
            joined_at: member.joinedAt,
          }))
        ),
      ]
    );
  }
}

export async function insertImportedSubscriptions(
  client: Queryable,
  subscriptions: BatchedImportedSubscriptionSeed[]
) {
  const inserted: Array<{ rowId: string; memberId: string; subscriptionId: number }> = [];
  if (subscriptions.length === 0) return inserted;

  for (const batch of chunk(subscriptions)) {
    const result = await client.query<{
      row_id: string;
      member_id: string;
      subscription_id: number;
    }>(
      `WITH seed AS (
         SELECT *
           FROM jsonb_to_recordset($1::jsonb) AS seed(
             row_id uuid,
             member_id uuid,
             organization_id uuid,
             branch_id uuid,
             start_date bigint,
             end_date bigint,
             plan_months integer,
             amount_paid numeric,
             sessions_per_month integer,
             import_job_id uuid
           )
       ),
       inserted AS (
         INSERT INTO subscriptions (
           organization_id, branch_id, member_id, renewed_from_subscription_id,
           start_date, end_date, plan_months, price_paid, payment_method,
           sessions_per_month, is_active, source, import_job_id, is_legacy_import
         )
         SELECT organization_id, branch_id, member_id, NULL,
                start_date, end_date, plan_months, amount_paid, NULL,
                sessions_per_month, true, 'import_csv', import_job_id, true
           FROM seed
          RETURNING id, member_id
       )
       SELECT seed.row_id, inserted.member_id, inserted.id AS subscription_id
         FROM inserted
         JOIN seed ON seed.member_id = inserted.member_id`,
      [
        JSON.stringify(
          batch.map((subscription) => ({
            row_id: subscription.rowId,
            member_id: subscription.memberId,
            organization_id: subscription.organizationId,
            branch_id: subscription.branchId,
            start_date: subscription.startDate,
            end_date: subscription.endDate,
            plan_months: subscription.planMonths,
            amount_paid: subscription.amountPaid,
            sessions_per_month: subscription.sessionsPerMonth,
            import_job_id: subscription.importJobId,
          }))
        ),
      ]
    );

    inserted.push(
      ...result.rows.map((row) => ({
        rowId: row.row_id,
        memberId: row.member_id,
        subscriptionId: row.subscription_id,
      }))
    );
  }

  return inserted;
}
