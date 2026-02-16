import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pollMs = Number(process.env.WORKER_POLL_MS || 5000);
const dryRun = process.env.WHATSAPP_DRY_RUN !== "false";

const pool = new Pool({ connectionString: databaseUrl });

async function processQueue() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, member_id, type, payload
         FROM message_queue
        WHERE status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
        LIMIT 20
        FOR UPDATE SKIP LOCKED`
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
          `UPDATE message_queue
              SET status = 'sent', sent_at = NOW()
            WHERE id = $1`,
          [row.id]
        );
        continue;
      }

      await client.query(
        `UPDATE message_queue
            SET status = 'failed', last_error = $2
          WHERE id = $1`,
        [row.id, "Real whatsapp-web.js send not implemented in baseline scaffold"]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Queue loop failed", error);
  } finally {
    client.release();
  }
}

setInterval(() => {
  processQueue().catch((error) => console.error(error));
}, pollMs);

console.log(`WhatsApp worker started (dryRun=${dryRun}) pollMs=${pollMs}`);
