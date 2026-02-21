import { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import { addCalendarMonthsEpoch } from "./billing-cycle";

export const BRANCH_TABLES = [
  "members",
  "subscriptions",
  "subscription_freezes",
  "quotas",
  "logs",
  "guest_passes",
  "settings",
  "message_queue"
] as const;

type BranchTableName = (typeof BRANCH_TABLES)[number];

type BranchTablesRecord = Record<BranchTableName, unknown[]>;

type SerializableError = {
  table: BranchTableName;
  index: number;
  reason: string;
};

export type ReplayMode = "desktop_import" | "backup_restore";

export type ReplayReport = {
  mode: ReplayMode;
  inserted: Record<BranchTableName, number>;
  skipped: Record<BranchTableName, number>;
  sourceRowCounts: Record<BranchTableName, number>;
  errors: SerializableError[];
  memberMappings: number;
  subscriptionMappings: number;
};

export type BranchArchive = {
  version: string;
  generated_at: string;
  organization_id?: string;
  branch_id?: string;
  tables: BranchTablesRecord;
};

const MAX_ERROR_ITEMS = 250;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return isObject(value) ? value : null;
}

function makeEmptyTables(): BranchTablesRecord {
  return {
    members: [],
    subscriptions: [],
    subscription_freezes: [],
    quotas: [],
    logs: [],
    guest_passes: [],
    settings: [],
    message_queue: []
  };
}

function makeTableCounter(): Record<BranchTableName, number> {
  return Object.fromEntries(BRANCH_TABLES.map((table) => [table, 0])) as Record<BranchTableName, number>;
}

function isUuid(value: unknown): boolean {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

function ensureUuid(value: unknown): string {
  if (isUuid(value)) return String(value).trim();
  return uuidv4();
}

function toInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const num = Number(value.trim());
    if (Number.isFinite(num)) return Math.trunc(num);
  }
  return fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return fallback;
}

function toDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        const ms = num > 1_000_000_000_000 ? num : num * 1000;
        const date = new Date(ms);
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function toDate(value: unknown, fallback: Date): Date {
  return toDateOrNull(value) || fallback;
}

function toEpochSeconds(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Math.floor(value.getTime() / 1000);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        return num > 1_000_000_000_000 ? Math.floor(num / 1000) : Math.floor(num);
      }
    }

    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return Math.floor(parsed / 1000);
  }

  return fallback;
}

function normalizeGender(value: unknown): "male" | "female" {
  const normalized = String(value || "").trim().toLowerCase();
  if (["male", "m", "man", "ذكر"].includes(normalized)) return "male";
  if (["female", "f", "woman", "انثى", "أنثى"].includes(normalized)) return "female";
  return "male";
}

function normalizeLogMethod(value: unknown): "scan" | "manual" {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "manual" ? "manual" : "scan";
}

function normalizeLogStatus(value: unknown): "success" | "failure" {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "success" ? "success" : "failure";
}

function normalizeQueueStatus(value: unknown): "pending" | "processing" | "sent" | "failed" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "processing") return "processing";
  if (normalized === "sent") return "sent";
  if (normalized === "failed") return "failed";
  return "pending";
}

function parseJsonLike(value: unknown): unknown {
  if (typeof value !== "string") return value ?? null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function toBranchArchive(source: unknown): BranchArchive {
  const root = asObject(source) || {};
  const nestedArchive = asObject(root.archive);
  const archiveRoot = nestedArchive || root;

  const tablesSource = asObject(archiveRoot.tables) || archiveRoot;
  const tables = makeEmptyTables();

  for (const table of BRANCH_TABLES) {
    const value = tablesSource[table];
    if (Array.isArray(value)) {
      tables[table] = value;
    }
  }

  if (tables.settings.length === 0 && isObject(tablesSource.settings)) {
    tables.settings = Object.entries(tablesSource.settings).map(([key, value]) => ({ key, value }));
  }

  return {
    version: typeof archiveRoot.version === "string" ? archiveRoot.version : "import-v1",
    generated_at:
      typeof archiveRoot.generated_at === "string"
        ? archiveRoot.generated_at
        : new Date().toISOString(),
    organization_id:
      typeof archiveRoot.organization_id === "string" ? archiveRoot.organization_id : undefined,
    branch_id: typeof archiveRoot.branch_id === "string" ? archiveRoot.branch_id : undefined,
    tables
  };
}

export function countArchiveRows(archive: BranchArchive): Record<BranchTableName, number> {
  const output = makeTableCounter();
  for (const table of BRANCH_TABLES) {
    output[table] = archive.tables[table].length;
  }
  return output;
}

function recordError(
  report: ReplayReport,
  table: BranchTableName,
  index: number,
  error: unknown,
  skipIncrement = true
) {
  if (skipIncrement) {
    report.skipped[table] += 1;
  }

  if (report.errors.length >= MAX_ERROR_ITEMS) return;

  const reason = error instanceof Error ? error.message : String(error);
  report.errors.push({ table, index, reason });
}

async function runWithSavepoint<T>(
  client: PoolClient,
  savepointName: string,
  operation: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  await client.query(`SAVEPOINT ${savepointName}`);
  try {
    const value = await operation();
    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
    return { ok: true, value };
  } catch (error) {
    try {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
    } finally {
      await client.query(`RELEASE SAVEPOINT ${savepointName}`);
    }
    return { ok: false, error };
  }
}

export async function buildBranchArchive(
  client: PoolClient,
  organizationId: string,
  branchId: string
): Promise<BranchArchive> {
  const tables = makeEmptyTables();

  for (const table of BRANCH_TABLES) {
    const result = await client.query(
      `SELECT * FROM ${table} WHERE organization_id = $1 AND branch_id = $2`,
      [organizationId, branchId]
    );
    tables[table] = result.rows;
  }

  return {
    version: "saas-backup-v1",
    generated_at: new Date().toISOString(),
    organization_id: organizationId,
    branch_id: branchId,
    tables
  };
}

export async function clearBranchData(client: PoolClient, organizationId: string, branchId: string) {
  const deleteOrder = [
    "message_queue",
    "logs",
    "quotas",
    "subscription_freezes",
    "subscriptions",
    "guest_passes",
    "settings",
    "members"
  ] as const;

  for (const table of deleteOrder) {
    await client.query(`DELETE FROM ${table} WHERE organization_id = $1 AND branch_id = $2`, [
      organizationId,
      branchId
    ]);
  }
}

export async function replaceBranchFromArchive(
  client: PoolClient,
  params: {
    organizationId: string;
    branchId: string;
    sourceArchive: unknown;
    mode: ReplayMode;
  }
): Promise<{ archive: BranchArchive; report: ReplayReport }> {
  const { organizationId, branchId, sourceArchive, mode } = params;
  const archive = toBranchArchive(sourceArchive);

  const report: ReplayReport = {
    mode,
    inserted: makeTableCounter(),
    skipped: makeTableCounter(),
    sourceRowCounts: countArchiveRows(archive),
    errors: [],
    memberMappings: 0,
    subscriptionMappings: 0
  };

  const now = new Date();
  const nowEpoch = Math.floor(now.getTime() / 1000);
  let savepointCounter = 0;
  const nextSavepoint = () => `import_row_${savepointCounter += 1}`;

  await clearBranchData(client, organizationId, branchId);

  const memberIdMap = new Map<string, string>();
  const subscriptionIdMap = new Map<string, number>();

  for (let i = 0; i < archive.tables.members.length; i += 1) {
    const raw = asObject(archive.tables.members[i]);
    if (!raw) {
      recordError(report, "members", i, "Invalid member row shape");
      continue;
    }

    const sourceId = String(raw.id ?? `member-${i}`);
    const mappedId =
      memberIdMap.get(sourceId) ||
      (mode === "desktop_import" ? uuidv4() : ensureUuid(raw.id));

    const insertResult = await runWithSavepoint(client, nextSavepoint(), () =>
      client.query(
        `INSERT INTO members (
            id, organization_id, branch_id, name, phone, gender, photo_path,
            access_tier, card_code, address, created_at, updated_at, deleted_at
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13
         )`,
        [
          mappedId,
          organizationId,
          branchId,
          String(raw.name || "Unknown Member"),
          String(raw.phone || ""),
          normalizeGender(raw.gender),
          raw.photo_path ? String(raw.photo_path) : null,
          raw.access_tier ? String(raw.access_tier) : "full",
          raw.card_code ? String(raw.card_code) : (mode === "desktop_import" ? sourceId : null),
          raw.address ? String(raw.address) : null,
          toDate(raw.created_at, now),
          toDate(raw.updated_at, now),
          toDateOrNull(raw.deleted_at)
        ]
      )
    );

    if (!insertResult.ok) {
      recordError(report, "members", i, insertResult.error);
      continue;
    }

    memberIdMap.set(sourceId, mappedId);
    report.inserted.members += 1;
  }

  for (let i = 0; i < archive.tables.subscriptions.length; i += 1) {
    const raw = asObject(archive.tables.subscriptions[i]);
    if (!raw) {
      recordError(report, "subscriptions", i, "Invalid subscription row shape");
      continue;
    }

    const sourceMemberId = String(raw.member_id ?? "");
    const mappedMemberId = memberIdMap.get(sourceMemberId);
    if (!mappedMemberId) {
      recordError(report, "subscriptions", i, `Missing mapped member for ${sourceMemberId}`);
      continue;
    }

    const startDate = toEpochSeconds(raw.start_date, nowEpoch);
    const defaultEnd = addCalendarMonthsEpoch(startDate, 1);
    const candidateEnd = toEpochSeconds(raw.end_date, defaultEnd);
    const endDate = candidateEnd > startDate ? candidateEnd : defaultEnd;

    const insertResult = await runWithSavepoint(client, nextSavepoint(), () =>
      client.query<{ id: number }>(
        `INSERT INTO subscriptions (
            organization_id, branch_id, member_id, start_date, end_date,
            plan_months, price_paid, sessions_per_month, is_active, created_at
         ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10
         )
         RETURNING id`,
        [
          organizationId,
          branchId,
          mappedMemberId,
          startDate,
          endDate,
          Math.max(1, toInteger(raw.plan_months, 1)),
          toNullableNumber(raw.price_paid),
          toNullableNumber(raw.sessions_per_month),
          toBoolean(raw.is_active, true),
          toDate(raw.created_at, now)
        ]
      )
    );

    if (!insertResult.ok) {
      recordError(report, "subscriptions", i, insertResult.error);
      continue;
    }

    const sourceSubscriptionId = String(raw.id ?? `subscription-${i}`);
    subscriptionIdMap.set(sourceSubscriptionId, insertResult.value.rows[0].id);
    report.inserted.subscriptions += 1;
  }

  for (let i = 0; i < archive.tables.subscription_freezes.length; i += 1) {
    const raw = asObject(archive.tables.subscription_freezes[i]);
    if (!raw) {
      recordError(report, "subscription_freezes", i, "Invalid freeze row shape");
      continue;
    }

    const mappedSubscriptionId = subscriptionIdMap.get(String(raw.subscription_id ?? ""));
    if (!mappedSubscriptionId) {
      recordError(
        report,
        "subscription_freezes",
        i,
        `Missing mapped subscription for ${String(raw.subscription_id ?? "")}`
      );
      continue;
    }

    const insertResult = await runWithSavepoint(client, nextSavepoint(), () =>
      client.query(
        `INSERT INTO subscription_freezes (
            organization_id, branch_id, subscription_id, start_date, end_date, days, created_at
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
         )`,
        [
          organizationId,
          branchId,
          mappedSubscriptionId,
          toEpochSeconds(raw.start_date, nowEpoch),
          toEpochSeconds(raw.end_date, nowEpoch + 7 * 86400),
          Math.max(1, toInteger(raw.days, 1)),
          toDate(raw.created_at, now)
        ]
      )
    );

    if (!insertResult.ok) {
      recordError(report, "subscription_freezes", i, insertResult.error);
      continue;
    }

    report.inserted.subscription_freezes += 1;
  }

  for (let i = 0; i < archive.tables.quotas.length; i += 1) {
    const raw = asObject(archive.tables.quotas[i]);
    if (!raw) {
      recordError(report, "quotas", i, "Invalid quota row shape");
      continue;
    }

    const mappedMemberId = memberIdMap.get(String(raw.member_id ?? ""));
    const mappedSubscriptionId = subscriptionIdMap.get(String(raw.subscription_id ?? ""));

    if (!mappedMemberId || !mappedSubscriptionId) {
      recordError(report, "quotas", i, "Missing mapped member/subscription for quota row");
      continue;
    }

    const insertResult = await runWithSavepoint(client, nextSavepoint(), () =>
      client.query(
        `INSERT INTO quotas (
            organization_id, branch_id, member_id, subscription_id,
            cycle_start, cycle_end, sessions_used, sessions_cap,
            created_at, updated_at
         ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10
         )
         ON CONFLICT (organization_id, branch_id, subscription_id, cycle_start)
         DO UPDATE SET
           cycle_end = EXCLUDED.cycle_end,
           sessions_used = EXCLUDED.sessions_used,
           sessions_cap = EXCLUDED.sessions_cap,
           updated_at = EXCLUDED.updated_at`,
        [
          organizationId,
          branchId,
          mappedMemberId,
          mappedSubscriptionId,
          toEpochSeconds(raw.cycle_start, nowEpoch),
          toEpochSeconds(raw.cycle_end, addCalendarMonthsEpoch(toEpochSeconds(raw.cycle_start, nowEpoch), 1)),
          Math.max(0, toInteger(raw.sessions_used, 0)),
          Math.max(1, toInteger(raw.sessions_cap, 1)),
          toDate(raw.created_at, now),
          toDate(raw.updated_at, now)
        ]
      )
    );

    if (!insertResult.ok) {
      recordError(report, "quotas", i, insertResult.error);
      continue;
    }

    report.inserted.quotas += 1;
  }

  for (let i = 0; i < archive.tables.logs.length; i += 1) {
    const raw = asObject(archive.tables.logs[i]);
    if (!raw) {
      recordError(report, "logs", i, "Invalid log row shape");
      continue;
    }

    const sourceMemberId = raw.member_id;
    const mappedMemberId = sourceMemberId ? memberIdMap.get(String(sourceMemberId)) || null : null;

    const insertResult = await runWithSavepoint(client, nextSavepoint(), () =>
      client.query(
        `INSERT INTO logs (
            organization_id, branch_id, member_id, scanned_value,
            method, timestamp, status, reason_code, created_at
         ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9
         )`,
        [
          organizationId,
          branchId,
          mappedMemberId,
          String(raw.scanned_value || ""),
          normalizeLogMethod(raw.method),
          toEpochSeconds(raw.timestamp, nowEpoch),
          normalizeLogStatus(raw.status),
          String(raw.reason_code || "unknown"),
          toDate(raw.created_at, now)
        ]
      )
    );

    if (!insertResult.ok) {
      recordError(report, "logs", i, insertResult.error);
      continue;
    }

    report.inserted.logs += 1;
  }

  for (let i = 0; i < archive.tables.guest_passes.length; i += 1) {
    const raw = asObject(archive.tables.guest_passes[i]);
    if (!raw) {
      recordError(report, "guest_passes", i, "Invalid guest pass row shape");
      continue;
    }

    const expiresAt = toDateOrNull(raw.expires_at);
    if (!expiresAt) {
      recordError(report, "guest_passes", i, "Missing/invalid expires_at");
      continue;
    }

    const insertResult = await runWithSavepoint(client, nextSavepoint(), () =>
      client.query(
        `INSERT INTO guest_passes (
            id, organization_id, branch_id, code, member_name,
            phone, expires_at, used_at, created_at
         ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9
         )`,
        [
          ensureUuid(raw.id),
          organizationId,
          branchId,
          String(raw.code || ""),
          String(raw.member_name || "Guest"),
          raw.phone ? String(raw.phone) : null,
          expiresAt,
          toDateOrNull(raw.used_at),
          toDate(raw.created_at, now)
        ]
      )
    );

    if (!insertResult.ok) {
      recordError(report, "guest_passes", i, insertResult.error);
      continue;
    }

    report.inserted.guest_passes += 1;
  }

  for (let i = 0; i < archive.tables.settings.length; i += 1) {
    const raw = asObject(archive.tables.settings[i]);
    if (!raw) {
      recordError(report, "settings", i, "Invalid settings row shape");
      continue;
    }

    const key = raw.key ? String(raw.key) : "";
    if (!key) {
      recordError(report, "settings", i, "Missing settings key");
      continue;
    }

    const insertResult = await runWithSavepoint(client, nextSavepoint(), () =>
      client.query(
        `INSERT INTO settings (organization_id, branch_id, key, value, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5)
         ON CONFLICT (organization_id, branch_id, key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [organizationId, branchId, key, JSON.stringify(parseJsonLike(raw.value)), toDate(raw.updated_at, now)]
      )
    );

    if (!insertResult.ok) {
      recordError(report, "settings", i, insertResult.error);
      continue;
    }

    report.inserted.settings += 1;
  }

  for (let i = 0; i < archive.tables.message_queue.length; i += 1) {
    const raw = asObject(archive.tables.message_queue[i]);
    if (!raw) {
      recordError(report, "message_queue", i, "Invalid queue row shape");
      continue;
    }

    const mappedMemberId = memberIdMap.get(String(raw.member_id ?? ""));
    if (!mappedMemberId) {
      recordError(report, "message_queue", i, "Missing mapped member for queue row");
      continue;
    }

    const insertResult = await runWithSavepoint(client, nextSavepoint(), () =>
      client.query(
        `INSERT INTO message_queue (
            id, organization_id, branch_id, member_id, type,
            payload, status, attempts, scheduled_at, sent_at,
            last_error, created_at
         ) VALUES (
            $1, $2, $3, $4, $5,
            $6::jsonb, $7, $8, $9, $10,
            $11, $12
         )`,
        [
          ensureUuid(raw.id),
          organizationId,
          branchId,
          mappedMemberId,
          String(raw.type || "manual"),
          JSON.stringify(parseJsonLike(raw.payload) || {}),
          normalizeQueueStatus(raw.status),
          Math.max(0, toInteger(raw.attempts, 0)),
          toDate(raw.scheduled_at, now),
          toDateOrNull(raw.sent_at),
          raw.last_error ? String(raw.last_error) : null,
          toDate(raw.created_at, now)
        ]
      )
    );

    if (!insertResult.ok) {
      recordError(report, "message_queue", i, insertResult.error);
      continue;
    }

    report.inserted.message_queue += 1;
  }

  report.memberMappings = memberIdMap.size;
  report.subscriptionMappings = subscriptionIdMap.size;

  return { archive, report };
}

export type BackupSource = "manual" | "scheduled" | "pre_restore";

export async function createSnapshotBackup(
  client: PoolClient,
  params: {
    organizationId: string;
    branchId: string;
    source: BackupSource;
    storagePath: string;
    metadata?: Record<string, unknown>;
    backupId?: string;
    artifactId?: string;
  }
): Promise<{
  backupId: string;
  artifactId: string;
  archive: BranchArchive;
  rowCounts: Record<BranchTableName, number>;
}> {
  const backupId = params.backupId || uuidv4();
  const artifactId = params.artifactId || uuidv4();

  const archive = await buildBranchArchive(client, params.organizationId, params.branchId);
  const rowCounts = countArchiveRows(archive);

  await client.query(
    `INSERT INTO backups (
        id, organization_id, branch_id, source, status,
        storage_path, metadata
     ) VALUES (
        $1, $2, $3, $4, 'completed',
        $5, $6::jsonb
     )`,
    [
      backupId,
      params.organizationId,
      params.branchId,
      params.source,
      params.storagePath,
      JSON.stringify({ ...(params.metadata || {}), rowCounts })
    ]
  );

  await client.query(
    `INSERT INTO backup_artifacts (
        id, backup_id, organization_id, branch_id, archive
     ) VALUES (
        $1, $2, $3, $4, $5::jsonb
     )`,
    [artifactId, backupId, params.organizationId, params.branchId, JSON.stringify(archive)]
  );

  return { backupId, artifactId, archive, rowCounts };
}
