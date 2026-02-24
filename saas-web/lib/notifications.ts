import { randomUUID } from "crypto";
import { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db";

export type NotificationSource = "system" | "broadcast";
export type NotificationSeverity = "info" | "warning" | "critical";

export type NotificationTarget = {
  organizationId: string;
  branchId: string | null;
};

export type CreateNotificationInput = {
  source: NotificationSource;
  type: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
};

export type CreateNotificationResult = {
  id: string;
  recipients: number;
};

function asJson(value: Record<string, unknown> | undefined) {
  return JSON.stringify(value ?? {});
}

async function insertNotification(client: PoolClient, input: CreateNotificationInput) {
  const id = randomUUID();
  await client.query(
    `INSERT INTO notifications (
        id, source, type, title, body, severity, action_url, metadata, expires_at
     ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz
     )`,
    [
      id,
      input.source,
      input.type,
      input.title,
      input.body,
      input.severity,
      input.actionUrl || null,
      asJson(input.metadata),
      input.expiresAt || null,
    ]
  );
  return id;
}

async function insertRecipients(client: PoolClient, notificationId: string, targets: NotificationTarget[]) {
  if (targets.length === 0) return 0;

  const values: string[] = [];
  const params: unknown[] = [];
  let index = 1;

  for (const target of targets) {
    values.push(`($${index++}::uuid, $${index++}::uuid, $${index++}::uuid, $${index++}::uuid, NOW())`);
    params.push(randomUUID(), notificationId, target.organizationId, target.branchId);
  }

  await client.query(
    `INSERT INTO notification_recipients (
      id, notification_id, organization_id, branch_id, delivered_at
    ) VALUES ${values.join(", ")}
    ON CONFLICT (
      notification_id,
      organization_id,
      COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) DO NOTHING`,
    params
  );

  return targets.length;
}

export async function createNotification(
  input: CreateNotificationInput,
  targets: NotificationTarget[]
): Promise<CreateNotificationResult> {
  return withTransaction(async (client) => {
    const id = await insertNotification(client, input);
    const recipients = await insertRecipients(client, id, targets);
    return { id, recipients };
  });
}

export async function listOrganizationBranchTargets(organizationId: string) {
  const rows = await query<{ branch_id: string }>(
    `SELECT id AS branch_id
       FROM branches
      WHERE organization_id = $1`,
    [organizationId]
  );

  return rows.map((row) => ({ organizationId, branchId: row.branch_id }));
}

export async function maybeCreateDedupedSystemNotification(
  input: Omit<CreateNotificationInput, "source"> & {
    dedupeKey: string;
    dedupeWindowMinutes?: number;
  },
  targets: NotificationTarget[]
): Promise<CreateNotificationResult | null> {
  const dedupeWindowMinutes = input.dedupeWindowMinutes ?? 30;

  const existing = await query<{ id: string }>(
    `SELECT n.id
       FROM notifications n
      WHERE n.source = 'system'
        AND n.type = $1
        AND n.metadata->>'dedupe_key' = $2
        AND n.created_at >= NOW() - make_interval(mins => $3)
      LIMIT 1`,
    [input.type, input.dedupeKey, dedupeWindowMinutes]
  );

  if (existing[0]) return null;

  return createNotification(
    {
      source: "system",
      type: input.type,
      title: input.title,
      body: input.body,
      severity: input.severity,
      actionUrl: input.actionUrl,
      metadata: {
        ...(input.metadata || {}),
        dedupe_key: input.dedupeKey,
        dedupe_window_minutes: dedupeWindowMinutes,
      },
      expiresAt: input.expiresAt,
    },
    targets
  );
}
