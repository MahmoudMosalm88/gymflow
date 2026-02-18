import { Pool, PoolClient } from "pg";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { mkdirSync } from "fs";
import { randomUUID } from "crypto";
import pino from "pino";
import QRCode from "qrcode";

// ── Environment ────────────────────────────────────────────────────────────

const databaseUrl = process.env.DATABASE_URL;
const organizationId = process.env.ORGANIZATION_ID;
const branchId = process.env.BRANCH_ID;
const pollMs = Number(process.env.WORKER_POLL_MS || 5000);
const connCheckMs = Number(process.env.CONN_CHECK_MS || 3000);
const dryRun = process.env.WHATSAPP_DRY_RUN === "true";
const authPath = process.env.BAILEYS_AUTH_PATH || "./baileys_auth";

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!organizationId) throw new Error("ORGANIZATION_ID is required");
if (!branchId) throw new Error("BRANCH_ID is required");

mkdirSync(authPath, { recursive: true });

// ── DB pool ─────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: databaseUrl });

async function writeStatus(value: Record<string, unknown>) {
  await pool.query(
    `INSERT INTO settings (organization_id, branch_id, key, value)
     VALUES ($1, $2, 'whatsapp_status', $3::jsonb)
     ON CONFLICT (organization_id, branch_id, key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [organizationId, branchId, JSON.stringify(value)]
  );
}

async function readStatus(): Promise<Record<string, unknown>> {
  const res = await pool.query(
    `SELECT value FROM settings
      WHERE organization_id = $1 AND branch_id = $2 AND key = 'whatsapp_status'`,
    [organizationId, branchId]
  );
  return (res.rows[0]?.value as Record<string, unknown>) || { state: "disconnected" };
}

// ── Baileys socket ──────────────────────────────────────────────────────────

let sock: WASocket | null = null;
let isReady = false;
let saveCreds: (() => Promise<void>) | null = null;
let intentionalDisconnect = false;

async function initSocket() {
  // Tear down any existing socket without logging out (preserve creds)
  if (sock) {
    try {
      sock.end(new Error('cleanup'));
    } catch {
      // ignore
    }
    sock = null;
    isReady = false;
  }

  const { state, saveCreds: sc } = await useMultiFileAuthState(authPath);
  saveCreds = sc;

  const { version } = await fetchLatestBaileysVersion();

  const s = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["GymFlow Worker", "Chrome", "1.0.0"],
  });
  sock = s;

  s.ev.on("creds.update", () => saveCreds?.());

  s.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      try {
        const buf = await QRCode.toBuffer(qr);
        await writeStatus({ state: "connecting", qrCode: buf.toString("base64") });
      } catch (err) {
        console.error("QR generation failed", err);
      }
    }

    if (connection === "open") {
      isReady = true;
      await writeStatus({ state: "connected", phone: s.user?.id, qrCode: null });
      console.log("WhatsApp connected:", s.user?.id);
    }

    if (connection === "close") {
      isReady = false;
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;

      if (loggedOut || intentionalDisconnect) {
        await writeStatus({ state: "disconnected", qrCode: null });
        sock = null;
      } else {
        console.log("Connection closed unexpectedly, reconnecting in 3 s...");
        setTimeout(() => initSocket().catch(console.error), 3000);
      }
    }
  });
}

// ── Loop 1: Connection manager ─────────────────────────────────────────────

async function connectionManagerLoop() {
  try {
    const status = await readStatus();
    const state = status.state as string;

    if (state === "connecting" && !sock) {
      console.log("Starting WhatsApp connection...");
      intentionalDisconnect = false;
      await initSocket();
    } else if (state === "disconnected" && sock) {
      console.log("Disconnecting WhatsApp...");
      intentionalDisconnect = true;
      try {
        await sock.logout();
      } catch {
        // ignore — just ensure sock is nulled
      }
      sock = null;
      isReady = false;
    }
  } catch (err) {
    console.error("Connection manager error", err);
  }
}

// ── Loop 2: Queue processor ────────────────────────────────────────────────

async function processQueue() {
  // Skip if not ready — leave messages as pending, don't mark failed
  if (!sock || !isReady) return;

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT mq.id, mq.member_id, mq.type, mq.payload,
              m.phone AS member_phone
         FROM message_queue mq
         JOIN members m ON m.id = mq.member_id
        WHERE mq.status = 'pending'
          AND mq.scheduled_at <= NOW()
          AND mq.organization_id = $1
          AND mq.branch_id = $2
        ORDER BY mq.scheduled_at ASC
        LIMIT 20
        FOR UPDATE SKIP LOCKED`,
      [organizationId, branchId]
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
        console.log(`[DRY RUN] Would send to ${row.member_phone}:`, row.payload);
        continue;
      }

      try {
        const raw = String(row.member_phone || "").replace(/[\s\-()]/g, "");
        const jid = (raw.startsWith("+") ? raw.slice(1) : raw) + "@s.whatsapp.net";
        const message =
          (row.payload as Record<string, string>)?.message ||
          (row.payload as Record<string, string>)?.text ||
          JSON.stringify(row.payload);

        await sock!.sendMessage(jid, { text: message });

        await client.query(
          `UPDATE message_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [row.id]
        );
      } catch (err) {
        await client.query(
          `UPDATE message_queue SET status = 'failed', last_error = $2 WHERE id = $1`,
          [row.id, err instanceof Error ? err.message : String(err)]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Queue loop failed", error);
  } finally {
    client.release();
  }
}

// ── Loop 3: Renewal reminder scheduler ────────────────────────────────────
// Runs every hour. Finds subscriptions expiring in 1–3 days and queues a
// renewal reminder WhatsApp message if one hasn't been sent recently.

const renewalCheckMs = Number(process.env.RENEWAL_CHECK_MS || 60 * 60 * 1000); // 1 hour

async function scheduleRenewalReminders() {
  // end_date is stored as bigint (Unix seconds) — compare as integers
  const nowSec = Math.floor(Date.now() / 1000);
  const in1DaySec = nowSec + 1 * 24 * 60 * 60;
  const in3DaysSec = nowSec + 3 * 24 * 60 * 60;

  const result = await pool.query(
    `SELECT s.member_id, s.end_date, m.name, m.phone
       FROM subscriptions s
       JOIN members m ON m.id = s.member_id
      WHERE s.is_active = true
        AND s.organization_id = $1
        AND s.branch_id = $2
        AND s.end_date >= $3
        AND s.end_date <= $4
        AND NOT EXISTS (
          SELECT 1 FROM message_queue mq
           WHERE mq.member_id = s.member_id
             AND mq.organization_id = $1
             AND mq.branch_id = $2
             AND mq.type = 'renewal'
             AND mq.status IN ('pending', 'sent', 'processing')
             AND mq.created_at >= NOW() - INTERVAL '3 days'
        )`,
    [organizationId, branchId, in1DaySec, in3DaysSec]
  );

  if (result.rows.length === 0) return;

  for (const row of result.rows) {
    if (!row.phone) continue;

    // end_date is Unix seconds — multiply by 1000 for JS Date
    const expiryDate = new Date(Number(row.end_date) * 1000).toLocaleDateString("ar-SA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const message = `عزيزي/عزيزتي ${row.name},\n\nتنتهي عضويتك في ${expiryDate}.\nيرجى تجديد اشتراكك قريباً لتجنب انقطاع الخدمة.\n\nشكراً لك!`;

    // id has no DB default — must supply a UUID
    await pool.query(
      `INSERT INTO message_queue (id, organization_id, branch_id, member_id, type, payload, status, scheduled_at)
       VALUES ($1, $2, $3, $4, 'renewal', $5::jsonb, 'pending', NOW())`,
      [randomUUID(), organizationId, branchId, row.member_id, JSON.stringify({ message, expiryDate, phone: row.phone, name: row.name })]
    );

    console.log(`Renewal reminder queued for member ${row.member_id} (expires ${expiryDate})`);
  }
}

// ── Start ───────────────────────────────────────────────────────────────────

setInterval(() => connectionManagerLoop().catch(console.error), connCheckMs);
setInterval(() => processQueue().catch(console.error), pollMs);
setInterval(() => scheduleRenewalReminders().catch(console.error), renewalCheckMs);

console.log(
  `WhatsApp worker started (dryRun=${dryRun}, pollMs=${pollMs}, connCheckMs=${connCheckMs})`
);
