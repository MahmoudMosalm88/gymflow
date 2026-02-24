import { Pool, PoolClient } from "pg";
import http from "node:http";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { mkdirSync, rmSync } from "fs";
import { randomUUID } from "crypto";
import pino from "pino";
import QRCode from "qrcode";

type StatusState = "disconnected" | "connecting" | "connected";

type TenantStatusRow = {
  organization_id: string;
  branch_id: string;
  value: unknown;
};

type TenantSettingRow = {
  key: string;
  value: unknown;
};
type SystemLanguage = "en" | "ar";

type TenantRuntime = {
  key: string;
  organizationId: string;
  branchId: string;
  authPath: string;
  desiredState: StatusState;
  sock: WASocket | null;
  isReady: boolean;
  connecting: boolean;
  intentionalDisconnect: boolean;
  saveCreds: (() => Promise<void>) | null;
};

const databaseUrl = process.env.DATABASE_URL;
const pollMs = Number(process.env.WORKER_POLL_MS || 5000);
const connCheckMs = Number(process.env.CONN_CHECK_MS || 3000);
const renewalCheckMs = Number(process.env.RENEWAL_CHECK_MS || 60 * 60 * 1000);
const dryRun = process.env.WHATSAPP_DRY_RUN === "true";
const authBasePath = process.env.BAILEYS_AUTH_PATH || "./baileys_auth";
const reconnectDelayMs = Number(process.env.WHATSAPP_RECONNECT_DELAY_MS || 3000);
const port = Number(process.env.PORT || 8080);
const workerBatchLimit = Math.max(1, Number(process.env.WORKER_BATCH_LIMIT || 5));
const minSendIntervalMs = Math.max(0, Number(process.env.WHATSAPP_MIN_SEND_INTERVAL_MS || 12000));
const sendJitterMs = Math.max(0, Number(process.env.WHATSAPP_SEND_JITTER_MS || 4000));

if (!databaseUrl) throw new Error("DATABASE_URL is required");
mkdirSync(authBasePath, { recursive: true });

const pool = new Pool({ connectionString: databaseUrl });
const runtimes = new Map<string, TenantRuntime>();
const reminderDefaultDays = [7, 3, 1];
const defaultRenewalTemplateEn =
  "Hi {name}, your subscription will expire on {expiryDate} ({daysLeft} days left). Please renew to keep access active.";
const defaultRenewalTemplateAr =
  "مرحباً {name}، ينتهي اشتراكك بتاريخ {expiryDate} (متبقي {daysLeft} أيام). يرجى التجديد للحفاظ على العضوية.";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttleSend() {
  if (minSendIntervalMs <= 0 && sendJitterMs <= 0) return;
  const jitter = sendJitterMs > 0 ? Math.floor(Math.random() * (sendJitterMs + 1)) : 0;
  await sleep(minSendIntervalMs + jitter);
}

function toTenantKey(organizationId: string, branchId: string) {
  return `${organizationId}:${branchId}`;
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function toAuthPath(organizationId: string, branchId: string) {
  return `${authBasePath}/${sanitizePathSegment(organizationId)}__${sanitizePathSegment(branchId)}`;
}

function normalizePhoneToJid(rawPhone: string): string {
  let digits = String(rawPhone || "").replace(/\D/g, "");

  // Convert common local Egyptian mobile format 01XXXXXXXXX to 201XXXXXXXXX.
  if (digits.length === 11 && digits.startsWith("01")) {
    digits = `2${digits}`;
  }

  // Convert accidental +0... input (e.g. +010...) to country-prefixed form.
  if (digits.length >= 8 && digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  if (!digits) throw new Error("Missing valid phone number for WhatsApp delivery");
  return `${digits}@s.whatsapp.net`;
}

function normalizeState(value: unknown): StatusState {
  if (value === "connected") return "connected";
  if (value === "connecting") return "connecting";
  return "disconnected";
}

function normalizeSystemLanguage(value: unknown, fallback: SystemLanguage = "en"): SystemLanguage {
  if (value === "ar" || value === "en") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "ar") return "ar";
    if (normalized === "en") return "en";
  }
  return fallback;
}

function getTemplateKey(type: "renewal" | "welcome", lang: SystemLanguage) {
  return `whatsapp_template_${type}_${lang}`;
}

function parseBooleanSetting(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function parseReminderDays(value: unknown): number[] {
  const source = typeof value === "string" && value.trim() ? value : reminderDefaultDays.join(",");
  const parsed = source
    .split(",")
    .map((piece) => Number(piece.trim()))
    .filter((num) => Number.isInteger(num) && num > 0 && num <= 60);
  const unique = Array.from(new Set(parsed)).sort((a, b) => b - a);
  return unique.length > 0 ? unique : reminderDefaultDays;
}

function renderTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function getRuntime(organizationId: string, branchId: string) {
  const key = toTenantKey(organizationId, branchId);
  let runtime = runtimes.get(key);
  if (!runtime) {
    runtime = {
      key,
      organizationId,
      branchId,
      authPath: toAuthPath(organizationId, branchId),
      desiredState: "disconnected",
      sock: null,
      isReady: false,
      connecting: false,
      intentionalDisconnect: false,
      saveCreds: null,
    };
    mkdirSync(runtime.authPath, { recursive: true });
    runtimes.set(key, runtime);
  }
  return runtime;
}

async function writeStatus(
  organizationId: string,
  branchId: string,
  value: Record<string, unknown>
) {
  await pool.query(
    `INSERT INTO settings (organization_id, branch_id, key, value)
     VALUES ($1, $2, 'whatsapp_status', $3::jsonb)
     ON CONFLICT (organization_id, branch_id, key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [organizationId, branchId, JSON.stringify(value)]
  );
}

async function listTenantStatuses() {
  const res = await pool.query<TenantStatusRow>(
    `SELECT organization_id, branch_id, value
       FROM settings
      WHERE key = 'whatsapp_status'`
  );

  return res.rows.map((row) => {
    const value =
      row.value && typeof row.value === "object"
        ? (row.value as Record<string, unknown>)
        : {};

    return {
      organizationId: row.organization_id,
      branchId: row.branch_id,
      state: normalizeState(value.state),
    };
  });
}

async function readTenantSettings(organizationId: string, branchId: string) {
  const rows = await pool.query<TenantSettingRow>(
    `SELECT key, value
       FROM settings
      WHERE organization_id = $1
        AND branch_id = $2
        AND key = ANY($3::text[])`,
    [
      organizationId,
      branchId,
      [
        "whatsapp_automation_enabled",
        "system_language",
        "whatsapp_template_renewal",
        "whatsapp_template_renewal_en",
        "whatsapp_template_renewal_ar",
        "whatsapp_reminder_days",
      ],
    ]
  );

  return Object.fromEntries(rows.rows.map((row) => [row.key, row.value])) as Record<string, unknown>;
}

let cachedVersion: [number, number, number] | undefined;
let versionFetchedAt = 0;

async function getBaileysVersion() {
  const now = Date.now();
  if (!cachedVersion || now - versionFetchedAt > 6 * 60 * 60 * 1000) {
    const latest = await fetchLatestBaileysVersion();
    cachedVersion = latest.version;
    versionFetchedAt = now;
  }
  return cachedVersion;
}

async function disconnectRuntime(runtime: TenantRuntime, logout: boolean) {
  const current = runtime.sock;
  runtime.sock = null;
  runtime.isReady = false;
  runtime.connecting = false;
  runtime.saveCreds = null;

  if (!current) return;

  runtime.intentionalDisconnect = true;
  if (logout) {
    try {
      await current.logout();
    } catch {
      // Ignore logout errors.
    }
  }
  try {
    current.end(new Error("cleanup"));
  } catch {
    // Ignore socket close errors.
  }
  runtime.intentionalDisconnect = false;
}

async function ensureRuntimeSocket(runtime: TenantRuntime) {
  if (runtime.connecting || runtime.sock || runtime.desiredState === "disconnected") return;

  runtime.connecting = true;
  runtime.intentionalDisconnect = false;

  try {
    mkdirSync(runtime.authPath, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(runtime.authPath);
    runtime.saveCreds = saveCreds;

    const version = await getBaileysVersion();
    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["GymFlow Worker", "Chrome", "1.0.0"],
    });

    runtime.sock = sock;
    runtime.isReady = false;
    runtime.connecting = false;

    sock.ev.on("creds.update", () => {
      runtime.saveCreds?.().catch((error) => {
        console.error(`[${runtime.key}] failed to persist credentials`, error);
      });
    });

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        try {
          const image = await QRCode.toBuffer(qr);
          await writeStatus(runtime.organizationId, runtime.branchId, {
            state: "connecting",
            qrCode: image.toString("base64"),
            requested_at: new Date().toISOString(),
          });
          console.log(`[${runtime.key}] QR updated`);
        } catch (error) {
          console.error(`[${runtime.key}] QR generation failed`, error);
        }
      }

      if (connection === "open") {
        runtime.isReady = true;
        await writeStatus(runtime.organizationId, runtime.branchId, {
          state: "connected",
          phone: sock.user?.id,
          qrCode: null,
          connected_at: new Date().toISOString(),
        });
        console.log(`[${runtime.key}] WhatsApp connected: ${sock.user?.id}`);
      }

      if (connection === "close") {
        runtime.isReady = false;
        runtime.sock = null;

        const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        const stopRequested = runtime.desiredState === "disconnected" || runtime.intentionalDisconnect;
        const reasonText = (lastDisconnect?.error as Error | undefined)?.message || "unknown";
        console.warn(
          `[${runtime.key}] connection closed code=${code ?? "n/a"} loggedOut=${loggedOut} stopRequested=${stopRequested} reason=${reasonText}`
        );

        if (loggedOut || stopRequested) {
          if (loggedOut) {
            try {
              rmSync(runtime.authPath, { recursive: true, force: true });
              mkdirSync(runtime.authPath, { recursive: true });
              console.warn(`[${runtime.key}] cleared auth path after loggedOut`);
            } catch (error) {
              console.error(`[${runtime.key}] failed clearing auth path`, error);
            }
          }
          await writeStatus(runtime.organizationId, runtime.branchId, {
            state: "disconnected",
            qrCode: null,
            disconnected_at: new Date().toISOString(),
          });
          return;
        }

        await writeStatus(runtime.organizationId, runtime.branchId, {
          state: "connecting",
          qrCode: null,
          requested_at: new Date().toISOString(),
        });

        setTimeout(() => {
          ensureRuntimeSocket(runtime).catch((error) => {
            console.error(`[${runtime.key}] reconnect failed`, error);
          });
        }, reconnectDelayMs);
      }
    });
  } catch (error) {
    runtime.connecting = false;
    runtime.sock = null;
    runtime.isReady = false;
    console.error(`[${runtime.key}] socket init failed`, error);
  }
}

async function connectionManagerLoop() {
  try {
    const statuses = await listTenantStatuses();
    const seen = new Set<string>();

    for (const row of statuses) {
      const runtime = getRuntime(row.organizationId, row.branchId);
      runtime.desiredState = row.state;
      seen.add(runtime.key);

      if (row.state === "disconnected") {
        await disconnectRuntime(runtime, true);
        runtimes.delete(runtime.key);
        continue;
      }

      await ensureRuntimeSocket(runtime);
    }

    for (const [key, runtime] of runtimes.entries()) {
      if (seen.has(key)) continue;
      runtime.desiredState = "disconnected";
      await disconnectRuntime(runtime, false);
      runtimes.delete(key);
    }
  } catch (error) {
    console.error("Connection manager error", error);
  }
}

async function processTenantQueue(runtime: TenantRuntime) {
  if (!runtime.sock || !runtime.isReady) return;

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT mq.id, mq.member_id, mq.type, mq.payload,
              m.phone AS member_phone,
              m.card_code AS member_card_code
         FROM message_queue mq
         JOIN members m ON m.id = mq.member_id
        WHERE mq.scheduled_at <= NOW()
          AND (
            mq.status = 'pending'
            OR (mq.status = 'failed' AND mq.attempts < 3)
          )
          AND mq.organization_id = $1
          AND mq.branch_id = $2
        ORDER BY
          CASE mq.type
            WHEN 'welcome' THEN 0
            WHEN 'qr_code' THEN 1
            WHEN 'manual' THEN 2
            WHEN 'renewal' THEN 3
            ELSE 9
          END,
          mq.scheduled_at ASC
        LIMIT $3
        FOR UPDATE SKIP LOCKED`,
      [runtime.organizationId, runtime.branchId, workerBatchLimit]
    );

    for (const row of result.rows) {
      await client.query(
        `UPDATE message_queue
            SET status = 'processing', attempts = attempts + 1
          WHERE id = $1`,
        [row.id]
      );

      if (dryRun) {
        await client.query(
          `UPDATE message_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [row.id]
        );
        console.log(`[${runtime.key}] [DRY RUN] marked sent queue=${row.id} type=${row.type}`);
        continue;
      }

      try {
        const payload = row.payload as Record<string, unknown> | null;
        const rawPhone = String(
          row.member_phone || (typeof payload?.phone === "string" ? payload.phone : "")
        );
        const jid = normalizePhoneToJid(rawPhone);
        const message =
          (typeof payload?.message === "string" && payload.message) ||
          (typeof payload?.text === "string" && payload.text) ||
          JSON.stringify(row.payload);

        let sentId: string | undefined;
        if (row.type === "qr_code") {
          const code =
            (typeof payload?.code === "string" && payload.code.trim()) ||
            (typeof row.member_card_code === "string" && row.member_card_code.trim()) ||
            String(row.member_id);
          const qrImage = await QRCode.toBuffer(code, { width: 512, margin: 1 });
          const sent = await runtime.sock.sendMessage(jid, {
            image: qrImage,
            caption: message,
          });
          sentId = sent?.key?.id ?? undefined;
        } else {
          const sent = await runtime.sock.sendMessage(jid, { text: message });
          sentId = sent?.key?.id ?? undefined;
        }
        await throttleSend();

        await client.query(
          `UPDATE message_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [row.id]
        );
        console.log(
          `[${runtime.key}] sent queue=${row.id} type=${row.type} jid=${jid} waMessageId=${sentId ?? "n/a"}`
        );
      } catch (error) {
        const errText = error instanceof Error ? error.message : String(error);
        await client.query(
          `UPDATE message_queue
              SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
                  scheduled_at = CASE WHEN attempts >= 3 THEN scheduled_at ELSE NOW() + interval '2 minutes' END,
                  last_error = $2
            WHERE id = $1`,
          [row.id, errText]
        );
        console.error(`[${runtime.key}] send failed queue=${row.id} type=${row.type} error=${errText}`);
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`[${runtime.key}] queue loop failed`, error);
  } finally {
    client.release();
  }
}

async function processQueue() {
  for (const runtime of runtimes.values()) {
    await processTenantQueue(runtime);
  }
}

async function scheduleRenewalRemindersForTenant(organizationId: string, branchId: string) {
  const settings = await readTenantSettings(organizationId, branchId);
  const automationEnabled = parseBooleanSetting(settings.whatsapp_automation_enabled, true);
  if (!automationEnabled) return;

  const systemLanguage = normalizeSystemLanguage(settings.system_language, "en");
  const languageTemplateKey = getTemplateKey("renewal", systemLanguage);
  const languageTemplate =
    typeof settings[languageTemplateKey] === "string"
      ? String(settings[languageTemplateKey]).trim()
      : "";
  const fallbackTemplate =
    typeof settings.whatsapp_template_renewal === "string"
      ? settings.whatsapp_template_renewal.trim()
      : "";
  const legacyFallback = systemLanguage === "en" ? fallbackTemplate : "";
  const renewalTemplate =
    languageTemplate ||
    legacyFallback ||
    (systemLanguage === "ar" ? defaultRenewalTemplateAr : defaultRenewalTemplateEn);

  const reminderDays = parseReminderDays(settings.whatsapp_reminder_days);
  if (reminderDays.length === 0) return;

  const nowSec = Math.floor(Date.now() / 1000);
  const maxOffset = Math.max(...reminderDays);
  const maxWindowSec = nowSec + maxOffset * 24 * 60 * 60;

  const result = await pool.query(
    `SELECT s.id AS subscription_id, s.member_id, s.end_date, m.name, m.phone
       FROM subscriptions s
       JOIN members m ON m.id = s.member_id
      WHERE s.is_active = true
        AND s.organization_id = $1
        AND s.branch_id = $2
        AND s.end_date > $3
        AND s.end_date <= $4`,
    [organizationId, branchId, nowSec, maxWindowSec]
  );

  for (const row of result.rows) {
    if (!row.phone) continue;

    const daysLeft = Math.ceil((Number(row.end_date) - nowSec) / (24 * 60 * 60));
    if (!reminderDays.includes(daysLeft)) continue;

    const exists = await pool.query(
      `SELECT 1
         FROM message_queue
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND type = 'renewal'
          AND status IN ('pending', 'sent', 'processing')
          AND payload->>'subscription_id' = $4
          AND payload->>'reminder_days' = $5
        LIMIT 1`,
      [organizationId, branchId, row.member_id, String(row.subscription_id), String(daysLeft)]
    );

    if (exists.rows.length > 0) continue;

    const expiryDate = new Date(Number(row.end_date) * 1000).toLocaleDateString(
      systemLanguage === "ar" ? "ar-EG" : "en-US",
      {
      day: "2-digit",
      month: "short",
      year: "numeric",
      }
    );

    const message = renderTemplate(renewalTemplate, {
      name: row.name || "Member",
      expiryDate,
      daysLeft,
    });

    await pool.query(
      `INSERT INTO message_queue (id, organization_id, branch_id, member_id, type, payload, status, scheduled_at)
       VALUES ($1, $2, $3, $4, 'renewal', $5::jsonb, 'pending', NOW())`,
      [
        randomUUID(),
        organizationId,
        branchId,
        row.member_id,
        JSON.stringify({
          message,
          template: renewalTemplate,
          subscription_id: row.subscription_id,
          reminder_days: daysLeft,
          expiryDate,
          phone: row.phone,
          name: row.name,
          generated_at: new Date().toISOString(),
        }),
      ]
    );
  }
}

async function scheduleRenewalReminders() {
  try {
    const statuses = await listTenantStatuses();
    for (const tenant of statuses) {
      await scheduleRenewalRemindersForTenant(tenant.organizationId, tenant.branchId);
    }
  } catch (error) {
    console.error("Renewal scheduler error", error);
  }
}

async function bootstrap() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });
  server.listen(port, "0.0.0.0");

  console.log(
    `WhatsApp worker started (dryRun=${dryRun}, pollMs=${pollMs}, connCheckMs=${connCheckMs}, authBasePath=${authBasePath}, batch=${workerBatchLimit}, minSendIntervalMs=${minSendIntervalMs}, sendJitterMs=${sendJitterMs})`
  );

  await connectionManagerLoop();
  await scheduleRenewalReminders();
  await processQueue();

  setInterval(() => {
    connectionManagerLoop().catch((error) => {
      console.error("Connection manager interval error", error);
    });
  }, connCheckMs);

  setInterval(() => {
    processQueue().catch((error) => {
      console.error("Queue processor interval error", error);
    });
  }, pollMs);

  setInterval(() => {
    scheduleRenewalReminders().catch((error) => {
      console.error("Renewal scheduler interval error", error);
    });
  }, renewalCheckMs);
}

bootstrap().catch((error) => {
  console.error("Worker bootstrap failed", error);
});
