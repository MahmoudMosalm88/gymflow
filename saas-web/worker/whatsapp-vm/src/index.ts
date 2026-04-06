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
  queueProcessing: boolean;
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
const postExpirySteps = [0, 3, 7, 14] as const;
const defaultRenewalTemplateEn =
  "Hi {name}, your subscription will expire on {expiryDate} ({daysLeft} days left). Please renew to keep access active.";
const defaultRenewalTemplateAr =
  "مرحباً {name}، ينتهي اشتراكك بتاريخ {expiryDate} (متبقي {daysLeft} أيام). يرجى التجديد للحفاظ على العضوية.";
const defaultPostExpiryTemplates = {
  en: {
    0: "Hi {name}, your membership expired on {expiryDate}. Reply or renew today to reactivate access.",
    3: "Hi {name}, this is a reminder that your membership expired on {expiryDate}. We can reactivate it anytime.",
    7: "Hi {name}, we miss seeing you at the gym. Your membership expired on {expiryDate}. Reply here if you want us to help you renew.",
    14: "Final reminder, {name}: your membership is still inactive since {expiryDate}. Renew now if you want to keep your progress going.",
  },
  ar: {
    0: "مرحباً {name}، انتهى اشتراكك بتاريخ {expiryDate}. يمكنك التجديد اليوم لإعادة التفعيل فوراً.",
    3: "مرحباً {name}، تذكير بأن اشتراكك انتهى بتاريخ {expiryDate}. يمكننا إعادة التفعيل في أي وقت.",
    7: "مرحباً {name}، نفتقد حضورك في الصالة. انتهى اشتراكك بتاريخ {expiryDate}. راسلنا إذا أردت المساعدة في التجديد.",
    14: "آخر تذكير يا {name}: ما زالت عضويتك غير مفعلة منذ {expiryDate}. جدّد الآن إذا أردت الاستمرار.",
  },
} as const;
const defaultOnboardingTemplates = {
  en: {
    first_visit: "Great first visit, {name}. Keep the momentum going and book your next workout this week.",
    no_return_day7: "Hi {name}, we noticed you have not been back yet. Your best results come from the first few visits. Want us to help you plan your next session?",
    low_engagement_day14: "Hi {name}, your first two weeks matter most. We can help you build a routine that fits your schedule. Reply if you want support.",
  },
  ar: {
    first_visit: "بداية ممتازة يا {name}. حافظ على الحماس وحدد تمرينك القادم هذا الأسبوع.",
    no_return_day7: "مرحباً {name}، لاحظنا أنك لم تعد بعد. أفضل النتائج تأتي من أول الزيارات. هل تريد مساعدتنا في ترتيب حصتك القادمة؟",
    low_engagement_day14: "مرحباً {name}، أول أسبوعين هم الأهم. نستطيع مساعدتك في بناء روتين مناسب لوقتك. راسلنا إذا أردت دعماً.",
  },
} as const;

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

function isStaffInvitePayload(payload: Record<string, unknown> | null | undefined) {
  return payload?.kind === "staff_invite";
}

function isStaffInvitesOnlyMode(settings: Record<string, unknown>) {
  return parseBooleanSetting(settings.whatsapp_staff_invites_only, false);
}

function renderTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function formatLocalizedDate(unixSeconds: number, lang: SystemLanguage) {
  return new Date(unixSeconds * 1000).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
      queueProcessing: false,
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
     DO UPDATE SET value = COALESCE(settings.value, '{}'::jsonb) || EXCLUDED.value, updated_at = NOW()`,
    [organizationId, branchId, JSON.stringify(value)]
  );
}

async function refreshCampaignStatus(client: PoolClient, campaignId: string | null | undefined) {
  if (!campaignId) return;

  await client.query(
    `WITH stats AS (
        SELECT COUNT(*)::int AS recipient_count,
               COUNT(*) FILTER (WHERE status = 'sent')::int AS sent_count,
               COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
               COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
               COUNT(*) FILTER (WHERE status = 'processing')::int AS processing_count
          FROM message_queue
         WHERE campaign_id = $1
      )
      UPDATE whatsapp_campaigns wc
         SET recipient_count = stats.recipient_count,
             sent_count = stats.sent_count,
             failed_count = stats.failed_count,
             status = CASE
               WHEN stats.processing_count > 0 THEN 'running'
               WHEN stats.pending_count > 0 THEN 'queued'
               WHEN stats.recipient_count > 0 AND stats.failed_count = stats.recipient_count THEN 'failed'
               ELSE 'completed'
             END,
             completed_at = CASE
               WHEN stats.pending_count = 0 AND stats.processing_count = 0 THEN NOW()
               ELSE NULL
             END
        FROM stats
       WHERE wc.id = $1`,
    [campaignId]
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

async function listQueuedTenants() {
  const res = await pool.query<{ organization_id: string; branch_id: string }>(
    `SELECT DISTINCT organization_id, branch_id
       FROM message_queue
      WHERE scheduled_at <= NOW()
        AND (
          status = 'pending'
          OR (status = 'failed' AND attempts < 3)
        )`
  );

  return res.rows.map((row) => ({
    organizationId: row.organization_id,
    branchId: row.branch_id,
  }));
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
        "whatsapp_staff_invites_only",
        "whatsapp_post_expiry_enabled",
        "whatsapp_onboarding_enabled",
        "whatsapp_weekly_digest_enabled",
        "pt_reminder_hours_before",
        "pt_expiry_warning_days",
        "pt_low_balance_threshold_sessions",
      ],
    ]
  );

  return Object.fromEntries(rows.rows.map((row) => [row.key, row.value])) as Record<string, unknown>;
}

function isLifecycleFlagEnabled(settings: Record<string, unknown>, key: string) {
  return parseBooleanSetting(settings[key], false);
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
  if (!dryRun && (!runtime.sock || !runtime.isReady)) return;
  if (runtime.queueProcessing) return;

  runtime.queueProcessing = true;
  const queueRunAt = new Date().toISOString();
  await writeStatus(runtime.organizationId, runtime.branchId, {
    lastWorkerHeartbeatAt: queueRunAt,
    lastQueueRunAt: queueRunAt,
  });
  let client: PoolClient | null = null;
  try {
    const settings = await readTenantSettings(runtime.organizationId, runtime.branchId);
    const staffInvitesOnlyMode = isStaffInvitesOnlyMode(settings);
    client = await pool.connect();
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT mq.id, mq.member_id, mq.campaign_id, mq.type, mq.payload,
              mq.target_phone,
              mq.target_name,
              m.phone AS member_phone,
              m.card_code AS member_card_code
         FROM message_queue mq
         LEFT JOIN members m ON m.id = mq.member_id
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
            WHEN 'pt_session_reminder' THEN 4
            WHEN 'pt_low_balance' THEN 5
            WHEN 'pt_package_expiry' THEN 6
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
            SET status = 'processing', attempts = attempts + 1, last_attempt_at = NOW()
          WHERE id = $1`,
        [row.id]
      );
      await refreshCampaignStatus(client, row.campaign_id);

      if (dryRun) {
        await client.query(
          `UPDATE message_queue SET status = 'sent', sent_at = NOW(), provider_message_id = $2 WHERE id = $1`,
          [row.id, `dry-run:${row.id}`]
        );
        await refreshCampaignStatus(client, row.campaign_id);
        console.log(`[${runtime.key}] [DRY RUN] marked sent queue=${row.id} type=${row.type}`);
        continue;
      }

      try {
        const payload = row.payload as Record<string, unknown> | null;
        if (staffInvitesOnlyMode && !(row.type === "manual" && isStaffInvitePayload(payload))) {
          await client.query(
            `UPDATE message_queue
                SET status = 'failed',
                    attempts = GREATEST(attempts, 3),
                    last_error = $2
              WHERE id = $1`,
            [row.id, "Suppressed by whatsapp_staff_invites_only safe mode"]
          );
          await refreshCampaignStatus(client, row.campaign_id);
          console.warn(`[${runtime.key}] suppressed queue=${row.id} type=${row.type} by safe mode`);
          continue;
        }
        const rawPhone = String(
          row.member_phone ||
            row.target_phone ||
            (typeof payload?.phone === "string" ? payload.phone : "")
        );
        const jid = normalizePhoneToJid(rawPhone);
        const message =
          (typeof payload?.message === "string" && payload.message) ||
          (typeof payload?.text === "string" && payload.text) ||
          JSON.stringify(row.payload);
        const sock = runtime.sock;
        if (!sock) {
          throw new Error("WhatsApp socket is not connected");
        }

        let sentId: string | undefined;
        if (row.type === "qr_code") {
          const code =
            (typeof payload?.code === "string" && payload.code.trim()) ||
            (typeof row.member_card_code === "string" && row.member_card_code.trim()) ||
            String(row.member_id);
          const qrImage = await QRCode.toBuffer(code, { width: 512, margin: 1 });
          const sent = await sock.sendMessage(jid, {
            image: qrImage,
            caption: message,
          });
          sentId = sent?.key?.id ?? undefined;
        } else {
          const sent = await sock.sendMessage(jid, { text: message });
          sentId = sent?.key?.id ?? undefined;
        }
        await throttleSend();

        await client.query(
          `UPDATE message_queue SET status = 'sent', sent_at = NOW(), provider_message_id = $2 WHERE id = $1`,
          [row.id, sentId ?? null]
        );
        await refreshCampaignStatus(client, row.campaign_id);
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
        await refreshCampaignStatus(client, row.campaign_id);
        console.error(`[${runtime.key}] send failed queue=${row.id} type=${row.type} error=${errText}`);
      }
    }

    await client.query("COMMIT");
    await writeStatus(runtime.organizationId, runtime.branchId, {
      lastWorkerHeartbeatAt: new Date().toISOString(),
      lastQueueSuccessAt: new Date().toISOString(),
      lastQueueError: null,
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {
        // Ignore rollback failures after a connection/query error.
      });
    }
    await writeStatus(runtime.organizationId, runtime.branchId, {
      lastWorkerHeartbeatAt: new Date().toISOString(),
      lastQueueError: error instanceof Error ? error.message : String(error),
    });
    console.error(`[${runtime.key}] queue loop failed`, error);
  } finally {
    client?.release();
    runtime.queueProcessing = false;
  }
}

async function processQueue() {
  if (dryRun) {
    const queuedTenants = await listQueuedTenants();
    for (const tenant of queuedTenants) {
      getRuntime(tenant.organizationId, tenant.branchId);
    }
  }

  for (const runtime of runtimes.values()) {
    await processTenantQueue(runtime);
  }
}

async function scheduleRenewalRemindersForTenant(organizationId: string, branchId: string) {
  const settings = await readTenantSettings(organizationId, branchId);
  const automationEnabled = parseBooleanSetting(settings.whatsapp_automation_enabled, true);
  if (!automationEnabled || isStaffInvitesOnlyMode(settings)) return;

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
    `SELECT s.id AS subscription_id, s.member_id, s.start_date, s.end_date, m.name, m.phone
       FROM subscriptions s
       JOIN members m ON m.id = s.member_id
      WHERE s.is_active = true
        AND s.organization_id = $1
        AND s.branch_id = $2
        AND s.start_date <= $3
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
          AND COALESCE(payload->>'cycle_end_date', '') = $6
        LIMIT 1`,
      [
        organizationId,
        branchId,
        row.member_id,
        String(row.subscription_id),
        String(daysLeft),
        String(row.end_date),
      ]
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
          cycle_end_date: String(row.end_date),
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

async function schedulePostExpirySequencesForTenant(organizationId: string, branchId: string) {
  const settings = await readTenantSettings(organizationId, branchId);
  const automationEnabled = parseBooleanSetting(settings.whatsapp_automation_enabled, true);
  if (!automationEnabled || isStaffInvitesOnlyMode(settings)) return;
  if (!isLifecycleFlagEnabled(settings, "whatsapp_post_expiry_enabled")) return;

  const systemLanguage = normalizeSystemLanguage(settings.system_language, "en");
  const rows = await pool.query<{
    subscription_id: number;
    member_id: string;
    end_date: number;
    name: string;
    phone: string | null;
  }>(
    `WITH latest_expired AS (
       SELECT DISTINCT ON (s.member_id)
              s.id AS subscription_id,
              s.member_id,
              s.end_date
         FROM subscriptions s
        WHERE s.organization_id = $1
          AND s.branch_id = $2
          AND s.end_date <= $3
          AND s.end_date >= $4
        ORDER BY s.member_id, s.end_date DESC, s.created_at DESC
     )
     SELECT le.subscription_id,
            le.member_id,
            le.end_date,
            m.name,
            m.phone
       FROM latest_expired le
       JOIN members m
         ON m.id = le.member_id
        AND m.organization_id = $1
        AND m.branch_id = $2
      WHERE m.deleted_at IS NULL
        AND m.phone IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
            FROM subscriptions s
           WHERE s.organization_id = $1
             AND s.branch_id = $2
             AND s.member_id = le.member_id
             AND s.renewed_from_subscription_id = le.subscription_id
        )
        AND NOT EXISTS (
          SELECT 1
            FROM subscriptions s
           WHERE s.organization_id = $1
             AND s.branch_id = $2
             AND s.member_id = le.member_id
             AND s.is_active = true
             AND s.start_date <= $3
             AND s.end_date > $3
        )`,
    [organizationId, branchId, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) - 14 * 86400]
  );

  const nowSec = Math.floor(Date.now() / 1000);
  for (const row of rows.rows) {
    const daysSinceExpiry = Math.floor((nowSec - Number(row.end_date)) / 86400);
    if (!postExpirySteps.includes(daysSinceExpiry as (typeof postExpirySteps)[number])) continue;

    const exists = await pool.query(
      `SELECT 1
         FROM message_queue
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND type = 'renewal'
          AND payload->>'sequence_kind' = 'post_expiry'
          AND payload->>'subscription_id' = $4
          AND payload->>'sequence_step' = $5
        LIMIT 1`,
      [organizationId, branchId, row.member_id, String(row.subscription_id), String(daysSinceExpiry)]
    );
    if (exists.rows.length > 0) continue;

    const template = defaultPostExpiryTemplates[systemLanguage][daysSinceExpiry as 0 | 3 | 7 | 14];
    const expiryDate = formatLocalizedDate(Number(row.end_date), systemLanguage);
    const message = renderTemplate(template, {
      name: row.name || "Member",
      expiryDate,
      daysSinceExpiry,
    });

    await pool.query(
      `INSERT INTO message_queue (
          id, organization_id, branch_id, member_id, type, payload, status, attempts, scheduled_at
       ) VALUES (
          $1, $2, $3, $4, 'renewal', $5::jsonb, 'pending', 0, NOW()
       )`,
      [
        randomUUID(),
        organizationId,
        branchId,
        row.member_id,
        JSON.stringify({
          message,
          template,
          sequence_kind: "post_expiry",
          sequence_step: daysSinceExpiry,
          subscription_id: row.subscription_id,
          cycle_end_date: String(row.end_date),
          expiryDate,
          daysSinceExpiry,
          phone: row.phone,
          name: row.name,
          generated_at: new Date().toISOString(),
        }),
      ]
    );
  }
}

async function scheduleOnboardingSequencesForTenant(organizationId: string, branchId: string) {
  const settings = await readTenantSettings(organizationId, branchId);
  const automationEnabled = parseBooleanSetting(settings.whatsapp_automation_enabled, true);
  if (!automationEnabled || isStaffInvitesOnlyMode(settings)) return;
  if (!isLifecycleFlagEnabled(settings, "whatsapp_onboarding_enabled")) return;

  const systemLanguage = normalizeSystemLanguage(settings.system_language, "en");
  const rows = await pool.query<{
    member_id: string;
    name: string;
    phone: string | null;
    joined_at: string;
    joined_sec: number;
    first_visit: number | null;
    total_visits_14d: number;
    total_visits_7d: number;
  }>(
    `WITH recent_members AS (
       SELECT m.id AS member_id,
              m.name,
              m.phone,
              m.created_at,
              EXTRACT(EPOCH FROM m.created_at)::bigint AS joined_sec
         FROM members m
        WHERE m.organization_id = $1
          AND m.branch_id = $2
          AND m.deleted_at IS NULL
          AND m.phone IS NOT NULL
          AND m.created_at >= NOW() - interval '14 day'
     ),
     activity AS (
       SELECT l.member_id,
              MIN(l.timestamp) FILTER (WHERE l.status = 'success') AS first_visit,
              COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= EXTRACT(EPOCH FROM NOW() - interval '14 day'))::int AS total_visits_14d,
              COUNT(*) FILTER (WHERE l.status = 'success' AND l.timestamp >= EXTRACT(EPOCH FROM NOW() - interval '7 day'))::int AS total_visits_7d
         FROM logs l
        WHERE l.organization_id = $1
          AND l.branch_id = $2
          AND l.member_id IS NOT NULL
        GROUP BY l.member_id
     )
     SELECT rm.member_id,
            rm.name,
            rm.phone,
            rm.created_at::text AS joined_at,
            rm.joined_sec,
            a.first_visit,
            COALESCE(a.total_visits_14d, 0)::int AS total_visits_14d,
            COALESCE(a.total_visits_7d, 0)::int AS total_visits_7d
       FROM recent_members rm
       LEFT JOIN activity a ON a.member_id = rm.member_id`,
    [organizationId, branchId]
  );

  const nowSec = Math.floor(Date.now() / 1000);
  for (const row of rows.rows) {
    if (!row.phone) continue;
    const joinedDays = Math.floor((nowSec - Number(row.joined_sec)) / 86400);
    const firstVisit = row.first_visit == null ? null : Number(row.first_visit);

    if (firstVisit) {
      const exists = await pool.query(
        `SELECT 1
           FROM message_queue
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id = $3
            AND payload->>'sequence_kind' = 'onboarding_first_visit'
          LIMIT 1`,
        [organizationId, branchId, row.member_id]
      );
      if (exists.rows.length === 0) {
        const template = defaultOnboardingTemplates[systemLanguage].first_visit;
        const message = renderTemplate(template, { name: row.name || "Member" });
        await pool.query(
          `INSERT INTO message_queue (
              id, organization_id, branch_id, member_id, type, payload, status, attempts, scheduled_at
           ) VALUES (
              $1, $2, $3, $4, 'welcome', $5::jsonb, 'pending', 0, NOW()
           )`,
          [
            randomUUID(),
            organizationId,
            branchId,
            row.member_id,
            JSON.stringify({
              message,
              template,
              sequence_kind: "onboarding_first_visit",
              phone: row.phone,
              name: row.name,
              generated_at: new Date().toISOString(),
            }),
          ]
        );
      }
    }

    if (joinedDays >= 7 && row.total_visits_14d <= 1) {
      const exists = await pool.query(
        `SELECT 1
           FROM message_queue
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id = $3
            AND payload->>'sequence_kind' = 'onboarding_no_return_day7'
          LIMIT 1`,
        [organizationId, branchId, row.member_id]
      );
      if (exists.rows.length === 0) {
        const template = defaultOnboardingTemplates[systemLanguage].no_return_day7;
        const message = renderTemplate(template, { name: row.name || "Member" });
        await pool.query(
          `INSERT INTO message_queue (
              id, organization_id, branch_id, member_id, type, payload, status, attempts, scheduled_at
           ) VALUES (
              $1, $2, $3, $4, 'welcome', $5::jsonb, 'pending', 0, NOW()
           )`,
          [
            randomUUID(),
            organizationId,
            branchId,
            row.member_id,
            JSON.stringify({
              message,
              template,
              sequence_kind: "onboarding_no_return_day7",
              phone: row.phone,
              name: row.name,
              generated_at: new Date().toISOString(),
            }),
          ]
        );
      }
    }

    if (joinedDays >= 14 && row.total_visits_14d < 3) {
      const exists = await pool.query(
        `SELECT 1
           FROM message_queue
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id = $3
            AND payload->>'sequence_kind' = 'onboarding_low_engagement_day14'
          LIMIT 1`,
        [organizationId, branchId, row.member_id]
      );
      if (exists.rows.length === 0) {
        const template = defaultOnboardingTemplates[systemLanguage].low_engagement_day14;
        const message = renderTemplate(template, { name: row.name || "Member" });
        await pool.query(
          `INSERT INTO message_queue (
              id, organization_id, branch_id, member_id, type, payload, status, attempts, scheduled_at
           ) VALUES (
              $1, $2, $3, $4, 'welcome', $5::jsonb, 'pending', 0, NOW()
           )`,
          [
            randomUUID(),
            organizationId,
            branchId,
            row.member_id,
            JSON.stringify({
              message,
              template,
              sequence_kind: "onboarding_low_engagement_day14",
              phone: row.phone,
              name: row.name,
              generated_at: new Date().toISOString(),
            }),
          ]
        );
      }
    }
  }
}

async function scheduleWeeklyDigestForTenant(organizationId: string, branchId: string) {
  const settings = await readTenantSettings(organizationId, branchId);
  const automationEnabled = parseBooleanSetting(settings.whatsapp_automation_enabled, true);
  if (!automationEnabled || isStaffInvitesOnlyMode(settings)) return;
  if (!isLifecycleFlagEnabled(settings, "whatsapp_weekly_digest_enabled")) return;

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const hour = now.getUTCHours();
  if (dayOfWeek !== 1 || hour < 8) return;

  const alreadyQueued = await pool.query(
    `SELECT 1
       FROM message_queue
      WHERE organization_id = $1
        AND branch_id = $2
        AND payload->>'sequence_kind' = 'weekly_digest'
        AND created_at >= NOW() - interval '7 day'
      LIMIT 1`,
    [organizationId, branchId]
  );
  if (alreadyQueued.rows.length > 0) return;

  const ownerRows = await pool.query<{ owner_id: string; owner_name: string | null; owner_phone: string | null }>(
    `SELECT o.id AS owner_id, o.name AS owner_name, o.phone AS owner_phone
       FROM owner_branch_access oba
       JOIN owners o ON o.id = oba.owner_id
      WHERE oba.branch_id = $1
        AND o.phone IS NOT NULL`,
    [branchId]
  );
  if (ownerRows.rows.length === 0) return;

  const [riskRows, retentionRows, roiRows, atRiskRows] = await Promise.all([
    pool.query<{ total: string | number; members: number }>(
      `SELECT COALESCE(SUM(price_paid), 0)::text AS total,
              COUNT(*)::int AS members
         FROM subscriptions
        WHERE organization_id = $1
          AND branch_id = $2
          AND is_active = true
          AND start_date <= $3
          AND end_date > $3
          AND end_date <= $4`,
      [organizationId, branchId, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) + 14 * 86400]
    ),
    pool.query<{ active_start: number; retained_members: number }>(
      `WITH active_start AS (
         SELECT DISTINCT member_id
           FROM subscriptions
          WHERE organization_id = $1
            AND branch_id = $2
            AND is_active = true
            AND start_date <= $3
            AND end_date > $3
       ),
       active_end AS (
         SELECT DISTINCT member_id
           FROM subscriptions
          WHERE organization_id = $1
            AND branch_id = $2
            AND is_active = true
            AND start_date <= $4
            AND end_date > $4
       )
       SELECT
         (SELECT COUNT(*)::int FROM active_start) AS active_start,
         (SELECT COUNT(*)::int FROM active_start s JOIN active_end e ON e.member_id = s.member_id) AS retained_members`,
      [organizationId, branchId, Math.floor(Date.now() / 1000) - 30 * 86400, Math.floor(Date.now() / 1000)]
    ),
    pool.query<{ revenue_saved: string | number; renewals_won: number }>(
      `WITH sent_messages AS (
         SELECT mq.member_id,
                COALESCE(mq.sent_at, mq.scheduled_at) AS sent_at,
                NULLIF(mq.payload->>'subscription_id', '')::int AS source_subscription_id
           FROM message_queue mq
          WHERE mq.organization_id = $1
            AND mq.branch_id = $2
            AND mq.type = 'renewal'
            AND mq.status = 'sent'
            AND COALESCE(mq.sent_at, mq.scheduled_at) >= NOW() - interval '7 day'
       ),
       attributed AS (
         SELECT renewal.id AS renewal_id,
                COALESCE(renewal.price_paid, 0)::numeric(12, 2) AS revenue_saved
           FROM sent_messages sm
           LEFT JOIN LATERAL (
             SELECT s.id, s.price_paid
               FROM subscriptions s
              WHERE s.organization_id = $1
                AND s.branch_id = $2
                AND s.member_id = sm.member_id
                AND s.renewed_from_subscription_id IS NOT NULL
                AND (sm.source_subscription_id IS NULL OR s.renewed_from_subscription_id = sm.source_subscription_id)
                AND s.created_at >= sm.sent_at
                AND s.created_at < sm.sent_at + interval '14 day'
              ORDER BY s.created_at ASC
              LIMIT 1
           ) renewal ON true
       )
       SELECT COALESCE(SUM(revenue_saved), 0)::text AS revenue_saved,
              COUNT(renewal_id)::int AS renewals_won
         FROM attributed`,
      [organizationId, branchId]
    ),
    pool.query<{ count: number }>(
      `WITH active_members AS (
         SELECT DISTINCT member_id
           FROM subscriptions
          WHERE organization_id = $1
            AND branch_id = $2
            AND is_active = true
            AND start_date <= $3
            AND end_date > $3
       ),
       activity AS (
         SELECT member_id,
                MAX(timestamp) FILTER (WHERE status = 'success') AS last_visit
           FROM logs
          WHERE organization_id = $1
            AND branch_id = $2
            AND member_id IS NOT NULL
          GROUP BY member_id
       )
       SELECT COUNT(*)::int AS count
         FROM active_members am
         LEFT JOIN activity a ON a.member_id = am.member_id
        WHERE a.last_visit IS NULL OR a.last_visit < $4`,
      [organizationId, branchId, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000) - 14 * 86400]
    ),
  ]);

  const activeStart = Number(retentionRows.rows[0]?.active_start || 0);
  const retainedMembers = Number(retentionRows.rows[0]?.retained_members || 0);
  const retentionRate = activeStart > 0 ? (retainedMembers / activeStart) * 100 : 0;
  const summary = {
    revenueAtRisk: Number(riskRows.rows[0]?.total || 0),
    expiringMembers: Number(riskRows.rows[0]?.members || 0),
    retentionRate,
    revenueSaved: Number(roiRows.rows[0]?.revenue_saved || 0),
    renewalsWon: Number(roiRows.rows[0]?.renewals_won || 0),
    atRiskMembers: Number(atRiskRows.rows[0]?.count || 0),
  };

  for (const owner of ownerRows.rows) {
    const message = [
      `Weekly GymFlow digest`,
      `Revenue at risk: EGP ${summary.revenueAtRisk.toFixed(0)}`,
      `Expiring members: ${summary.expiringMembers}`,
      `Retention: ${summary.retentionRate.toFixed(1)}%`,
      `WhatsApp-saved revenue: EGP ${summary.revenueSaved.toFixed(0)}`,
      `Renewals influenced: ${summary.renewalsWon}`,
      `At-risk members: ${summary.atRiskMembers}`,
    ].join("\n");

    await pool.query(
      `INSERT INTO message_queue (
          id, organization_id, branch_id, member_id, target_phone, target_name, type, payload, status, attempts, scheduled_at
       ) VALUES (
          $1, $2, $3, NULL, $4, $5, 'manual', $6::jsonb, 'pending', 0, NOW()
       )`,
      [
        randomUUID(),
        organizationId,
        branchId,
        owner.owner_phone,
        owner.owner_name || "Owner",
        JSON.stringify({
          message,
          sequence_kind: "weekly_digest",
          generated_at: new Date().toISOString(),
          summary,
        }),
      ]
    );
  }
}

async function scheduleLifecycleAutomations() {
  try {
    const statuses = await listTenantStatuses();
    for (const tenant of statuses) {
      await schedulePostExpirySequencesForTenant(tenant.organizationId, tenant.branchId);
      await scheduleOnboardingSequencesForTenant(tenant.organizationId, tenant.branchId);
      await scheduleWeeklyDigestForTenant(tenant.organizationId, tenant.branchId);
      await schedulePtAutomationsForTenant(tenant.organizationId, tenant.branchId);
    }
  } catch (error) {
    console.error("Lifecycle scheduler error", error);
  }
}

async function schedulePtAutomationsForTenant(organizationId: string, branchId: string) {
  const settings = await readTenantSettings(organizationId, branchId);
  const automationEnabled = parseBooleanSetting(settings.whatsapp_automation_enabled, true);
  if (!automationEnabled || isStaffInvitesOnlyMode(settings)) return;

  const reminderHours = Number(settings.pt_reminder_hours_before ?? 24);
  const expiryDays = Number(settings.pt_expiry_warning_days ?? 3);
  const lowBalanceThreshold = Number(settings.pt_low_balance_threshold_sessions ?? 2);
  const now = new Date();
  const reminderStart = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
  const reminderEnd = new Date(reminderStart.getTime() + 60 * 60 * 1000);

  const sessionRows = await pool.query<{
    session_id: string;
    package_id: string;
    member_id: string;
    member_name: string;
    phone: string | null;
    scheduled_start: string;
    package_title: string;
  }>(
    `SELECT s.id AS session_id,
            s.package_id,
            s.member_id,
            m.name AS member_name,
            m.phone,
            s.scheduled_start::text,
            p.title AS package_title
       FROM pt_sessions s
       JOIN pt_packages p ON p.id = s.package_id
       JOIN members m ON m.id = s.member_id
      WHERE s.organization_id = $1
        AND s.branch_id = $2
        AND s.status = 'scheduled'
        AND m.phone IS NOT NULL
        AND s.scheduled_start >= $3::timestamptz
        AND s.scheduled_start < $4::timestamptz`,
    [organizationId, branchId, reminderStart.toISOString(), reminderEnd.toISOString()]
  );

  for (const row of sessionRows.rows) {
    const exists = await pool.query(
      `SELECT 1
         FROM message_queue
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND type = 'pt_session_reminder'
          AND payload->>'session_id' = $4
        LIMIT 1`,
      [organizationId, branchId, row.member_id, row.session_id]
    );
    if (exists.rows[0]) continue;

    await pool.query(
      `INSERT INTO message_queue (
          id, organization_id, branch_id, member_id, type, target_phone, target_name, payload, status, attempts, scheduled_at
       ) VALUES (
          $1, $2, $3, $4, 'pt_session_reminder', $5, $6, $7::jsonb, 'pending', 0, NOW()
       )`,
      [
        randomUUID(),
        organizationId,
        branchId,
        row.member_id,
        row.phone,
        row.member_name,
        JSON.stringify({
          message: `Hi ${row.member_name}, this is a reminder for your PT session "${row.package_title}" on ${new Date(row.scheduled_start).toLocaleString("en-US")}.`,
          session_id: row.session_id,
          package_id: row.package_id,
          package_title: row.package_title,
          phone: row.phone,
          name: row.member_name,
          generated_at: new Date().toISOString(),
        }),
      ]
    );
  }

  const expiryWindowStart = now;
  const expiryWindowEnd = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
  const packageRows = await pool.query<{
    package_id: string;
    member_id: string;
    member_name: string;
    phone: string | null;
    title: string;
    valid_until: string;
    sessions_remaining: number;
  }>(
    `SELECT p.id AS package_id,
            p.member_id,
            m.name AS member_name,
            m.phone,
            p.title,
            p.valid_until::text,
            GREATEST(p.total_sessions - p.sessions_used, 0)::int AS sessions_remaining
       FROM pt_packages p
       JOIN members m ON m.id = p.member_id
      WHERE p.organization_id = $1
        AND p.branch_id = $2
        AND p.status = 'active'
        AND m.phone IS NOT NULL
        AND p.valid_until >= $3::timestamptz
        AND p.valid_until <= $4::timestamptz`,
    [organizationId, branchId, expiryWindowStart.toISOString(), expiryWindowEnd.toISOString()]
  );

  for (const row of packageRows.rows) {
    const exists = await pool.query(
      `SELECT 1
         FROM message_queue
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND type = 'pt_package_expiry'
          AND payload->>'package_id' = $4
        LIMIT 1`,
      [organizationId, branchId, row.member_id, row.package_id]
    );
    if (exists.rows[0]) continue;

    await pool.query(
      `INSERT INTO message_queue (
          id, organization_id, branch_id, member_id, type, target_phone, target_name, payload, status, attempts, scheduled_at
       ) VALUES (
          $1, $2, $3, $4, 'pt_package_expiry', $5, $6, $7::jsonb, 'pending', 0, NOW()
       )`,
      [
        randomUUID(),
        organizationId,
        branchId,
        row.member_id,
        row.phone,
        row.member_name,
        JSON.stringify({
          message: `Hi ${row.member_name}, your PT package "${row.title}" expires on ${new Date(row.valid_until).toLocaleDateString("en-US")}. You still have ${row.sessions_remaining} session(s) left.`,
          package_id: row.package_id,
          package_title: row.title,
          sessions_remaining: row.sessions_remaining,
          phone: row.phone,
          name: row.member_name,
          generated_at: new Date().toISOString(),
        }),
      ]
    );
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
  await scheduleLifecycleAutomations();
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

  setInterval(() => {
    scheduleLifecycleAutomations().catch((error) => {
      console.error("Lifecycle scheduler interval error", error);
    });
  }, renewalCheckMs);
}

bootstrap().catch((error) => {
  console.error("Worker bootstrap failed", error);
});
