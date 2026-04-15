import { PoolClient } from "pg";
import { randomUUID } from "crypto";
import { query, withTransaction } from "@/lib/db";
import { toSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";
import {
  WHATSAPP_AUTOMATIONS,
  WARNING_AFFECTED_MEMBER_THRESHOLD,
  WARNING_MEMBER_MESSAGE_THRESHOLD_LONG,
  WARNING_MEMBER_MESSAGE_THRESHOLD_SHORT,
  WARNING_WINDOW_DAYS,
  WARNING_WINDOW_HOURS,
  classifyAutomationSource,
  parseBooleanSetting,
} from "@/lib/whatsapp-automation";

export type QueueStatus = "pending" | "processing" | "sent" | "failed";
export type QueueType =
  | "welcome"
  | "qr_code"
  | "manual"
  | "renewal"
  | "broadcast"
  | "pt_session_reminder"
  | "pt_low_balance"
  | "pt_package_expiry";
export type CampaignStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type QueueCounts = {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
};

export type WhatsAppWarningMember = {
  memberId: string;
  name: string | null;
  phone: string | null;
  messagesLast72h: number;
  messagesLast7d: number;
  topSources: string[];
};

export type WhatsAppWarningSummary = {
  warningActive: boolean;
  affectedMembers: number;
  membersChecked: number;
  topSources: Array<{ key: string; count: number }>;
  members: WhatsAppWarningMember[];
  thresholds: {
    shortWindowHours: number;
    shortWindowMessages: number;
    longWindowDays: number;
    longWindowMessages: number;
    affectedMemberThreshold: number;
  };
};

export type WhatsAppAutomationControlState = {
  id: string;
  enabled: boolean;
  locked: boolean;
  ownerControlled: boolean;
  status: "live" | "blocked" | "planned";
};

export type QueueItem = {
  id: string;
  type: QueueType;
  status: QueueStatus;
  attempts: number;
  scheduled_at: string;
  sent_at: string | null;
  last_error: string | null;
  member_name: string | null;
  member_phone: string | null;
  campaign_title: string | null;
  provider_message_id: string | null;
};

export type CampaignItem = {
  id: string;
  title: string;
  message: string;
  status: CampaignStatus;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string | null;
  filters: Record<string, unknown> | null;
};

export type BroadcastFilters = {
  search?: string;
  status?: "all" | "active" | "expired" | "no_sub";
  gender?: "all" | "male" | "female";
  planMonthsMin?: number | null;
  planMonthsMax?: number | null;
  daysLeftMin?: number | null;
  daysLeftMax?: number | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  sessionsRemainingMax?: number | null;
};

type RecipientRow = {
  id: string;
  name: string;
  phone: string | null;
  card_code: string | null;
  gender: string | null;
  created_at: string;
  sub_status: "active" | "expired" | "no_sub";
  plan_months: number | null;
  days_left: number | null;
  sessions_remaining: number | null;
};

type StatusRow = {
  value: unknown;
};

type WarningRow = {
  member_id: string;
  member_name: string | null;
  member_phone: string | null;
  type: string;
  sequence_kind: string | null;
  sent_last_72h: string;
  sent_last_7d: string;
};

type SettingRow = {
  key: string;
  value: unknown;
};

const AVG_SEND_SECONDS = 14;
const DEFAULT_QUEUE_LIMIT = 20;
const DEFAULT_CAMPAIGN_LIMIT = 20;

function normalizeStatusValue(value: unknown) {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    state: typeof raw.state === "string" ? raw.state : "disconnected",
    phone: typeof raw.phone === "string" ? raw.phone : undefined,
    qrCode: typeof raw.qrCode === "string" ? raw.qrCode : undefined,
    workerHeartbeatAt: typeof raw.lastWorkerHeartbeatAt === "string" ? raw.lastWorkerHeartbeatAt : null,
    lastQueueRunAt: typeof raw.lastQueueRunAt === "string" ? raw.lastQueueRunAt : null,
    lastQueueSuccessAt: typeof raw.lastQueueSuccessAt === "string" ? raw.lastQueueSuccessAt : null,
    lastQueueError: typeof raw.lastQueueError === "string" ? raw.lastQueueError : null,
  };
}

export async function getWhatsAppStatusWithQueue(organizationId: string, branchId: string) {
  const [statusRows, counts, warningSummary, automationStates] = await Promise.all([
    query<StatusRow>(
      `SELECT value
         FROM settings
        WHERE organization_id = $1
          AND branch_id = $2
          AND key = 'whatsapp_status'
        LIMIT 1`,
      [organizationId, branchId]
    ),
    getQueueCounts(organizationId, branchId),
    getWhatsAppWarningSummary(organizationId, branchId),
    getWhatsAppAutomationStates(organizationId, branchId),
  ]);

  const raw = normalizeStatusValue(statusRows[0]?.value || null);
  return {
    connected: raw.state === "connected",
    state: raw.state,
    phone: raw.phone,
    qrCode: raw.qrCode,
    queue: counts,
    workerHeartbeatAt: raw.workerHeartbeatAt,
    lastQueueRunAt: raw.lastQueueRunAt,
    lastQueueSuccessAt: raw.lastQueueSuccessAt,
    lastQueueError: raw.lastQueueError,
    warningSummary,
    automationStates,
  };
}

export async function getWhatsAppAutomationStates(
  organizationId: string,
  branchId: string
): Promise<WhatsAppAutomationControlState[]> {
  const settingKeys = WHATSAPP_AUTOMATIONS.map((item) => item.settingKey).filter(Boolean) as string[];
  if (settingKeys.length === 0) return [];
  const rows = await query<SettingRow>(
    `SELECT key, value
       FROM settings
      WHERE organization_id = $1
        AND branch_id = $2
        AND key = ANY($3::text[])`,
    [organizationId, branchId, settingKeys]
  );
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return WHATSAPP_AUTOMATIONS.map((item) => ({
    id: item.id,
    enabled: item.settingKey ? parseBooleanSetting(settings[item.settingKey], false) : item.status === "live",
    locked: item.status !== "live",
    ownerControlled: item.ownerControlled,
    status: item.status,
  }));
}

export async function getWhatsAppWarningSummary(
  organizationId: string,
  branchId: string
): Promise<WhatsAppWarningSummary> {
  const rows = await query<WarningRow>(
    `WITH recent_messages AS (
       SELECT mq.member_id,
              COALESCE(m.name, mq.target_name) AS member_name,
              COALESCE(m.phone, mq.target_phone) AS member_phone,
              mq.type,
              mq.payload->>'sequence_kind' AS sequence_kind,
              CASE WHEN mq.sent_at >= NOW() - INTERVAL '72 hours' THEN 1 ELSE 0 END AS in_short_window
         FROM message_queue mq
         LEFT JOIN members m ON m.id = mq.member_id
        WHERE mq.organization_id = $1
          AND mq.branch_id = $2
          AND mq.status = 'sent'
          AND mq.member_id IS NOT NULL
          AND mq.sent_at >= NOW() - INTERVAL '7 days'
     )
     SELECT member_id,
            member_name,
            member_phone,
            type,
            sequence_kind,
            SUM(in_short_window)::text AS sent_last_72h,
            COUNT(*)::text AS sent_last_7d
       FROM recent_messages
      GROUP BY member_id, member_name, member_phone, type, sequence_kind`,
    [organizationId, branchId]
  );

  const byMember = new Map<
    string,
    {
      memberId: string;
      name: string | null;
      phone: string | null;
      messagesLast72h: number;
      messagesLast7d: number;
      topSources: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const automationKey = classifyAutomationSource(row.type, row.sequence_kind);
    if (automationKey === "weekly_digest") continue;
    const current =
      byMember.get(row.member_id) ||
      {
        memberId: row.member_id,
        name: row.member_name,
        phone: row.member_phone,
        messagesLast72h: 0,
        messagesLast7d: 0,
        topSources: new Map<string, number>(),
      };
    current.messagesLast72h += Number(row.sent_last_72h || 0);
    current.messagesLast7d += Number(row.sent_last_7d || 0);
    current.topSources.set(
      automationKey,
      (current.topSources.get(automationKey) || 0) + Number(row.sent_last_7d || 0)
    );
    byMember.set(row.member_id, current);
  }

  const members = Array.from(byMember.values());
  const warnedMembers = members
    .filter(
      (member) =>
        member.messagesLast72h >= WARNING_MEMBER_MESSAGE_THRESHOLD_SHORT ||
        member.messagesLast7d >= WARNING_MEMBER_MESSAGE_THRESHOLD_LONG
    )
    .sort((a, b) => {
      if (b.messagesLast72h !== a.messagesLast72h) return b.messagesLast72h - a.messagesLast72h;
      return b.messagesLast7d - a.messagesLast7d;
    });

  const topSources = new Map<string, number>();
  for (const member of warnedMembers) {
    for (const [sourceKey, count] of member.topSources.entries()) {
      topSources.set(sourceKey, (topSources.get(sourceKey) || 0) + count);
    }
  }

  return {
    warningActive: warnedMembers.length >= WARNING_AFFECTED_MEMBER_THRESHOLD,
    affectedMembers: warnedMembers.length,
    membersChecked: members.length,
    topSources: Array.from(topSources.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({ key, count })),
    members: warnedMembers.slice(0, 8).map((member) => ({
      memberId: member.memberId,
      name: member.name,
      phone: member.phone,
      messagesLast72h: member.messagesLast72h,
      messagesLast7d: member.messagesLast7d,
      topSources: Array.from(member.topSources.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key]) => key),
    })),
    thresholds: {
      shortWindowHours: WARNING_WINDOW_HOURS,
      shortWindowMessages: WARNING_MEMBER_MESSAGE_THRESHOLD_SHORT,
      longWindowDays: WARNING_WINDOW_DAYS,
      longWindowMessages: WARNING_MEMBER_MESSAGE_THRESHOLD_LONG,
      affectedMemberThreshold: WARNING_AFFECTED_MEMBER_THRESHOLD,
    },
  };
}

export async function getQueueCounts(organizationId: string, branchId: string): Promise<QueueCounts> {
  const rows = await query<{ status: QueueStatus; count: string }>(
    `SELECT status, COUNT(*)::text AS count
       FROM message_queue
      WHERE organization_id = $1
        AND branch_id = $2
      GROUP BY status`,
    [organizationId, branchId]
  );

  const counts: QueueCounts = { pending: 0, processing: 0, sent: 0, failed: 0 };
  for (const row of rows) {
    counts[row.status] = Number(row.count || 0);
  }
  return counts;
}

export async function getQueueItems(
  organizationId: string,
  branchId: string,
  options: { status?: QueueStatus | "all"; limit?: number } = {}
) {
  const limit = Math.max(1, Math.min(DEFAULT_QUEUE_LIMIT, Number(options.limit || DEFAULT_QUEUE_LIMIT)));
  const params: unknown[] = [organizationId, branchId];
  let where = `mq.organization_id = $1 AND mq.branch_id = $2`;

  if (options.status && options.status !== "all") {
    params.push(options.status);
    where += ` AND mq.status = $${params.length}`;
  }

  const items = await query<QueueItem>(
    `SELECT mq.id,
            mq.type,
            mq.status,
            mq.attempts,
            mq.scheduled_at::text,
            mq.sent_at::text,
            mq.last_error,
            COALESCE(m.name, mq.target_name) AS member_name,
            COALESCE(m.phone, mq.target_phone) AS member_phone,
            wc.title AS campaign_title,
            mq.provider_message_id
       FROM message_queue mq
       LEFT JOIN members m ON m.id = mq.member_id
       LEFT JOIN whatsapp_campaigns wc ON wc.id = mq.campaign_id
      WHERE ${where}
      ORDER BY
        CASE mq.status
          WHEN 'failed' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'pending' THEN 2
          ELSE 3
        END,
        COALESCE(mq.sent_at, mq.scheduled_at) DESC
      LIMIT ${limit}`,
    params
  );

  return {
    items,
    counts: await getQueueCounts(organizationId, branchId),
  };
}

export async function retryQueueItems(
  organizationId: string,
  branchId: string,
  ids?: string[]
) {
  const params: unknown[] = [organizationId, branchId];
  let where = `organization_id = $1 AND branch_id = $2 AND status = 'failed'`;

  if (ids && ids.length > 0) {
    params.push(ids);
    where += ` AND id = ANY($${params.length}::uuid[])`;
  }

  const rows = await query<{ id: string }>(
    `UPDATE message_queue
        SET status = 'pending',
            scheduled_at = NOW(),
            last_error = NULL
      WHERE ${where}
      RETURNING id`,
    params
  );

  return { retried: rows.length, ids: rows.map((row) => row.id) };
}

function normalizeFilters(filters: BroadcastFilters): Required<BroadcastFilters> {
  return {
    search: (filters.search || "").trim().replace(/\s+/g, " ").normalize("NFKC"),
    status: filters.status || "all",
    gender: filters.gender || "all",
    planMonthsMin: filters.planMonthsMin ?? null,
    planMonthsMax: filters.planMonthsMax ?? null,
    daysLeftMin: filters.daysLeftMin ?? null,
    daysLeftMax: filters.daysLeftMax ?? null,
    createdFrom: filters.createdFrom ?? null,
    createdTo: filters.createdTo ?? null,
    sessionsRemainingMax: filters.sessionsRemainingMax ?? null,
  };
}

function normalizeSearchToken(token: string) {
  return token
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .toLowerCase();
}

function buildRecipientSql(filters: Required<BroadcastFilters>) {
  const params: unknown[] = [];
  const nowSec = toSubscriptionAccessReferenceUnix(Math.floor(Date.now() / 1000));
  const searchTokens = filters.search
    ? filters.search.split(/\s+/).map(normalizeSearchToken).filter(Boolean)
    : [];
  params.push(nowSec);
  params.push(searchTokens.length > 0 ? searchTokens.map((token) => `%${token}%`) : null);
  params.push(filters.status === "all" ? null : filters.status);
  params.push(filters.gender === "all" ? null : filters.gender);
  params.push(filters.planMonthsMin);
  params.push(filters.planMonthsMax);
  params.push(filters.daysLeftMin);
  params.push(filters.daysLeftMax);
  params.push(filters.createdFrom);
  params.push(filters.createdTo);
  params.push(filters.sessionsRemainingMax);

  const sql = `
    WITH member_context AS (
      SELECT m.id,
             m.name,
             m.phone,
             m.card_code,
             m.gender,
             m.created_at::text,
             LOWER(
               REGEXP_REPLACE(
                 TRANSLATE(COALESCE(m.name, ''), 'أإآىة', 'ااايه'),
                 '[\u064B-\u065F\u0670]',
                 '',
                 'g'
               )
             ) AS normalized_name,
             LOWER(
               REGEXP_REPLACE(
                 COALESCE(m.phone, ''),
                 '[^0-9+]',
                 '',
                 'g'
               )
             ) AS normalized_phone,
             LOWER(COALESCE(m.card_code, '')) AS normalized_card_code,
             s.id AS subscription_id,
             s.start_date,
             s.plan_months,
             s.end_date,
             s.sessions_per_month,
             q.sessions_used,
             CASE
               WHEN s.id IS NULL THEN 'no_sub'
               WHEN s.is_active = true AND s.start_date <= $1 AND s.end_date > $1 THEN 'active'
               WHEN s.is_active = true AND s.start_date > $1 THEN 'active'
               ELSE 'expired'
             END AS sub_status,
             CASE
               WHEN s.id IS NULL THEN NULL
               ELSE CEIL((s.end_date - $1)::numeric / 86400)::int
             END AS days_left,
             CASE
               WHEN s.sessions_per_month IS NULL THEN NULL
               ELSE GREATEST(s.sessions_per_month - COALESCE(q.sessions_used, 0), 0)
             END AS sessions_remaining
        FROM members m
        LEFT JOIN LATERAL (
          SELECT s.id, s.start_date, s.plan_months, s.end_date, s.sessions_per_month, s.is_active
            FROM subscriptions s
           WHERE s.member_id = m.id
             AND s.organization_id = $12
             AND s.branch_id = $13
           ORDER BY
             CASE
               WHEN s.is_active = true AND s.start_date <= $1 AND s.end_date > $1 THEN 0
               WHEN s.is_active = true AND s.start_date > $1 THEN 1
               WHEN s.is_active = true THEN 2
               ELSE 3
             END,
             s.start_date DESC,
             s.end_date DESC,
             s.created_at DESC
           LIMIT 1
        ) s ON TRUE
        LEFT JOIN quotas q ON q.subscription_id = s.id
       WHERE m.organization_id = $12
         AND m.branch_id = $13
         AND m.deleted_at IS NULL
         AND COALESCE(m.whatsapp_do_not_contact, false) = false
         AND NULLIF(BTRIM(m.phone), '') IS NOT NULL
    )
    SELECT *
      FROM member_context
     WHERE (
       $2::text[] IS NULL
       OR NOT EXISTS (
         SELECT 1
           FROM unnest($2::text[]) AS token
          WHERE normalized_name NOT LIKE token
            AND normalized_phone NOT LIKE token
            AND normalized_card_code NOT LIKE token
       )
     )
       AND ($3::text IS NULL OR sub_status = $3)
       AND ($4::text IS NULL OR gender = $4)
       AND ($5::int IS NULL OR COALESCE(plan_months, 0) >= $5)
       AND ($6::int IS NULL OR COALESCE(plan_months, 0) <= $6)
       AND ($7::int IS NULL OR COALESCE(days_left, 999999) >= $7)
       AND ($8::int IS NULL OR COALESCE(days_left, -999999) <= $8)
       AND ($9::timestamptz IS NULL OR created_at::timestamptz >= $9::timestamptz)
       AND ($10::timestamptz IS NULL OR created_at::timestamptz <= ($10::timestamptz + interval '1 day'))
       AND ($11::int IS NULL OR COALESCE(sessions_remaining, 999999) <= $11)
  `;

  return { sql, params };
}

export async function resolveBroadcastRecipients(
  organizationId: string,
  branchId: string,
  rawFilters: BroadcastFilters
): Promise<RecipientRow[]> {
  const filters = normalizeFilters(rawFilters);
  const { sql, params } = buildRecipientSql(filters);
  params.push(organizationId, branchId);

  return query<RecipientRow>(
    `${sql}
      ORDER BY name ASC`,
    params
  );
}

export async function previewBroadcast(
  organizationId: string,
  branchId: string,
  filters: BroadcastFilters
) {
  const [recipients, counts] = await Promise.all([
    resolveBroadcastRecipients(organizationId, branchId, filters),
    getQueueCounts(organizationId, branchId),
  ]);

  const queuedAhead = counts.pending + counts.processing;
  const estimatedMinutes = Math.ceil(((queuedAhead + recipients.length) * AVG_SEND_SECONDS) / 60);
  const normalized = normalizeFilters(filters);
  const filterSummary = [
    normalized.search ? `search:${normalized.search}` : null,
    normalized.status !== "all" ? `status:${normalized.status}` : null,
    normalized.gender !== "all" ? `gender:${normalized.gender}` : null,
    normalized.planMonthsMin != null ? `plan>=${normalized.planMonthsMin}` : null,
    normalized.planMonthsMax != null ? `plan<=${normalized.planMonthsMax}` : null,
    normalized.daysLeftMin != null ? `days>=${normalized.daysLeftMin}` : null,
    normalized.daysLeftMax != null ? `days<=${normalized.daysLeftMax}` : null,
    normalized.createdFrom ? `from:${normalized.createdFrom}` : null,
    normalized.createdTo ? `to:${normalized.createdTo}` : null,
    normalized.sessionsRemainingMax != null ? `sessionsRemaining<=${normalized.sessionsRemainingMax}` : null,
  ].filter(Boolean) as string[];

  return {
    recipientCount: recipients.length,
    estimatedMinutes,
    filterSummary,
    recipients: recipients.map((row) => ({ id: row.id, name: row.name, phone: row.phone })),
  };
}

async function hasActiveBroadcastCampaign(
  client: PoolClient,
  organizationId: string,
  branchId: string
) {
  const rows = await client.query<{ id: string }>(
    `SELECT id
       FROM whatsapp_campaigns
      WHERE organization_id = $1
        AND branch_id = $2
        AND status IN ('queued', 'running')
      LIMIT 1`,
    [organizationId, branchId]
  );
  return rows.rows.length > 0;
}

export async function createBroadcastCampaign(input: {
  organizationId: string;
  branchId: string;
  ownerId: string;
  title: string;
  message: string;
  filters: BroadcastFilters;
}) {
  const recipients = await resolveBroadcastRecipients(input.organizationId, input.branchId, input.filters);
  if (recipients.length === 0) {
    throw new Error("No members matched the selected filters");
  }

  return withTransaction(async (client) => {
    if (await hasActiveBroadcastCampaign(client, input.organizationId, input.branchId)) {
      const error = new Error("A broadcast campaign is already running for this branch");
      (error as Error & { code?: string }).code = "23505";
      throw error;
    }

    const campaignId = randomUUID();
    await client.query(
      `INSERT INTO whatsapp_campaigns (
          id, organization_id, branch_id, created_by_owner_id,
          title, message, filters, status, recipient_count, sent_count, failed_count
       ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7::jsonb, 'queued', $8, 0, 0
       )`,
      [
        campaignId,
        input.organizationId,
        input.branchId,
        input.ownerId,
        input.title,
        input.message,
        JSON.stringify(normalizeFilters(input.filters)),
        recipients.length,
      ]
    );

    for (const recipient of recipients) {
      await client.query(
        `INSERT INTO message_queue (
            id, organization_id, branch_id, member_id, campaign_id,
            type, payload, status, attempts, scheduled_at
         ) VALUES (
            $1, $2, $3, $4, $5,
            'broadcast', $6::jsonb, 'pending', 0, NOW()
         )`,
        [
          randomUUID(),
          input.organizationId,
          input.branchId,
          recipient.id,
          campaignId,
          JSON.stringify({
            title: input.title,
            message: input.message,
            generated_at: new Date().toISOString(),
          }),
        ]
      );
    }

    return {
      id: campaignId,
      recipientCount: recipients.length,
      estimatedMinutes: Math.ceil((recipients.length * AVG_SEND_SECONDS) / 60),
    };
  });
}

export async function getCampaignItems(
  organizationId: string,
  branchId: string,
  limit?: number
) {
  const safeLimit = Math.max(1, Math.min(DEFAULT_CAMPAIGN_LIMIT, Number(limit || DEFAULT_CAMPAIGN_LIMIT)));
  return query<CampaignItem>(
    `WITH queue_stats AS (
        SELECT campaign_id,
               COUNT(*)::int AS recipient_count,
               COUNT(*) FILTER (WHERE status = 'sent')::int AS sent_count,
               COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
               COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
               COUNT(*) FILTER (WHERE status = 'processing')::int AS processing_count
          FROM message_queue
         WHERE organization_id = $1
           AND branch_id = $2
           AND campaign_id IS NOT NULL
         GROUP BY campaign_id
      )
      SELECT wc.id,
             wc.title,
             wc.message,
             CASE
               WHEN COALESCE(qs.processing_count, 0) > 0 THEN 'running'
               WHEN COALESCE(qs.pending_count, 0) > 0 THEN 'queued'
               WHEN COALESCE(qs.recipient_count, 0) > 0 AND COALESCE(qs.failed_count, 0) = COALESCE(qs.recipient_count, 0) THEN 'failed'
               WHEN wc.status = 'cancelled' THEN 'cancelled'
               ELSE 'completed'
             END AS status,
             COALESCE(qs.recipient_count, wc.recipient_count)::int AS recipient_count,
             COALESCE(qs.sent_count, wc.sent_count)::int AS sent_count,
             COALESCE(qs.failed_count, wc.failed_count)::int AS failed_count,
             wc.created_at::text,
             wc.completed_at::text,
             wc.filters
        FROM whatsapp_campaigns wc
        LEFT JOIN queue_stats qs ON qs.campaign_id = wc.id
       WHERE wc.organization_id = $1
         AND wc.branch_id = $2
       ORDER BY wc.created_at DESC
       LIMIT ${safeLimit}`,
    [organizationId, branchId]
  );
}
