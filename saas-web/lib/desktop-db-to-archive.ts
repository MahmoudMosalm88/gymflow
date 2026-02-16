import { join } from "node:path";
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from "sql.js";
import { BranchArchive } from "@/lib/archive-engine";

type PlainRow = Record<string, unknown>;

let sqlRuntime: Promise<SqlJsStatic> | null = null;

function getSqlRuntime() {
  if (!sqlRuntime) {
    sqlRuntime = initSqlJs({
      locateFile: (file) => join(process.cwd(), "node_modules", "sql.js", "dist", file)
    });
  }
  return sqlRuntime;
}

function toInteger(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRows(db: SqlJsDatabase, table: string): PlainRow[] {
  const existsResult = db.exec(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table.replace(/'/g, "''")}'`
  );
  if (!existsResult[0]?.values?.length) return [];

  const statement = db.prepare(`SELECT * FROM ${table}`);
  const rows: PlainRow[] = [];

  try {
    while (statement.step()) {
      rows.push(statement.getAsObject() as PlainRow);
    }
  } finally {
    statement.free();
  }

  return rows;
}

function normalizeLogStatus(status: unknown) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "allowed" || value === "success") return "success";
  return "failure";
}

function normalizeLogReason(status: unknown, reason: unknown) {
  const provided = String(reason || "").trim();
  if (provided) return provided;

  const statusValue = String(status || "").trim().toLowerCase();
  if (statusValue === "warning") return "already_checked_in_today";
  if (statusValue === "denied") return "unknown_member";
  return "unknown";
}

function parseJsonSafe(value: unknown) {
  if (typeof value !== "string") return value ?? {};
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    return { raw: value };
  }
}

function normalizeAccessTier(value: unknown) {
  const tier = String(value || "").trim().toUpperCase();
  if (tier === "A") return "full";
  if (tier === "B") return "limited";
  if (tier) return tier.toLowerCase();
  return "full";
}

export async function parseDesktopDbToArchive(dbBytes: Uint8Array): Promise<BranchArchive> {
  const SQL = await getSqlRuntime();
  const db = new SQL.Database(dbBytes);

  try {
    const members = readRows(db, "members").map((row) => ({
      id: row.id ? String(row.id) : undefined,
      name: row.name ? String(row.name) : "Unknown Member",
      phone: row.phone ? String(row.phone) : "",
      gender: row.gender ? String(row.gender) : "male",
      photo_path: row.photo_path ? String(row.photo_path) : null,
      access_tier: normalizeAccessTier(row.access_tier),
      card_code: row.card_code ? String(row.card_code) : null,
      address: row.address ? String(row.address) : null,
      created_at: toInteger(row.created_at),
      updated_at: toInteger(row.updated_at)
    }));

    const subscriptions = readRows(db, "subscriptions").map((row) => ({
      id: row.id ? String(row.id) : undefined,
      member_id: row.member_id ? String(row.member_id) : "",
      start_date: toInteger(row.start_date),
      end_date: toInteger(row.end_date),
      plan_months: Math.max(1, toInteger(row.plan_months, 1)),
      price_paid: toNullableNumber(row.price_paid),
      sessions_per_month: toNullableNumber(row.sessions_per_month),
      is_active: toInteger(row.is_active, 1) === 1,
      created_at: toInteger(row.created_at)
    }));

    const subscriptionFreezes = readRows(db, "subscription_freezes").map((row) => ({
      id: row.id ? String(row.id) : undefined,
      subscription_id: row.subscription_id ? String(row.subscription_id) : "",
      start_date: toInteger(row.start_date),
      end_date: toInteger(row.end_date),
      days: Math.max(1, toInteger(row.days, 1)),
      created_at: toInteger(row.created_at)
    }));

    const quotas = readRows(db, "quotas").map((row) => ({
      id: row.id ? String(row.id) : undefined,
      member_id: row.member_id ? String(row.member_id) : "",
      subscription_id: row.subscription_id ? String(row.subscription_id) : "",
      cycle_start: toInteger(row.cycle_start),
      cycle_end: toInteger(row.cycle_end),
      sessions_used: Math.max(0, toInteger(row.sessions_used)),
      sessions_cap: Math.max(1, toInteger(row.sessions_cap, 1))
    }));

    const logs = readRows(db, "logs").map((row) => ({
      id: row.id ? String(row.id) : undefined,
      member_id: row.member_id ? String(row.member_id) : null,
      scanned_value: row.scanned_value ? String(row.scanned_value) : "",
      method: row.method ? String(row.method) : "scan",
      timestamp: toInteger(row.timestamp),
      status: normalizeLogStatus(row.status),
      reason_code: normalizeLogReason(row.status, row.reason_code),
      created_at: toInteger(row.timestamp)
    }));

    const guestPasses = readRows(db, "guest_passes").map((row) => ({
      id: row.id ? String(row.id) : undefined,
      code: row.code ? String(row.code) : "",
      member_name: row.member_name ? String(row.member_name) : row.name ? String(row.name) : "Guest",
      phone: row.phone ? String(row.phone) : null,
      created_at: toInteger(row.created_at),
      expires_at: toInteger(row.expires_at),
      used_at: row.used_at ? toInteger(row.used_at) : null
    }));

    const settings = readRows(db, "settings").map((row) => ({
      key: row.key ? String(row.key) : "",
      value: parseJsonSafe(row.value),
      updated_at: row.updated_at ? toInteger(row.updated_at) : undefined
    }));

    const messageQueue = readRows(db, "message_queue").map((row) => ({
      id: row.id ? String(row.id) : undefined,
      member_id: row.member_id ? String(row.member_id) : "",
      type: row.type ? String(row.type) : row.message_type ? String(row.message_type) : "manual",
      payload: parseJsonSafe(row.payload ?? row.payload_json),
      status: row.status ? String(row.status) : "pending",
      attempts: Math.max(0, toInteger(row.attempts)),
      scheduled_at: toInteger(row.scheduled_at),
      sent_at: row.sent_at ? toInteger(row.sent_at) : null,
      last_error: row.last_error ? String(row.last_error) : null,
      created_at: row.created_at ? toInteger(row.created_at) : toInteger(row.scheduled_at)
    }));

    return {
      version: "desktop-sqlite-v1",
      generated_at: new Date().toISOString(),
      tables: {
        members,
        subscriptions,
        subscription_freezes: subscriptionFreezes,
        quotas,
        logs,
        guest_passes: guestPasses,
        settings,
        message_queue: messageQueue
      }
    };
  } finally {
    db.close();
  }
}
