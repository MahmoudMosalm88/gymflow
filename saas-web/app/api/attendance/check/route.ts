import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getMonthlyCycleWindow } from "@/lib/billing-cycle";
import { ok, fail, routeError } from "@/lib/http";
import { attendanceSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Member = {
  id: string;
  name: string;
  gender: "male" | "female";
};

type Subscription = {
  id: number;
  start_date: number;
  end_date: number;
  sessions_per_month: number | null;
};

type ExistingLog = {
  id: number;
  status: string;
  reason_code: string;
  member_id: string | null;
};

function normalizeScan(input: string) {
  return input.trim();
}

const MAX_OFFLINE_AGE_SECONDS = 72 * 3600; // 72 hours default

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = attendanceSchema.parse(await request.json());
    const now = Math.floor(Date.now() / 1000);
    const scannedValue = normalizeScan(payload.scannedValue);
    const source = payload.source || "online";
    const operationId = payload.operationId || null;
    const deviceId = payload.deviceId || null;
    const offlineRecordedAt = payload.offlineTimestamp || null;

    // Offline sync requires operationId
    if (source === "offline_sync" && !operationId) {
      return fail("operationId is required for offline sync.", 400);
    }

    // Validate offline timestamp isn't too old
    if (source === "offline_sync" && offlineRecordedAt) {
      // Check branch setting for max age, fall back to default
      const maxAgeRows = await query<{ value: unknown }>(
        `SELECT value FROM settings
         WHERE organization_id = $1 AND branch_id = $2 AND key = 'offline_max_age_hours'
         LIMIT 1`,
        [auth.organizationId, auth.branchId]
      );
      const maxAgeHours = typeof maxAgeRows[0]?.value === "number" ? maxAgeRows[0].value : 72;
      const maxAgeSeconds = maxAgeHours * 3600;

      if (now - offlineRecordedAt > maxAgeSeconds) {
        return fail("Offline check-in is too old to sync.", 400);
      }
    }

    // Idempotency: if operationId already exists, return the prior result
    if (operationId) {
      const existing = await query<ExistingLog>(
        `SELECT id, status, reason_code, member_id
         FROM logs
         WHERE organization_id = $1 AND branch_id = $2 AND operation_id = $3
         LIMIT 1`,
        [auth.organizationId, auth.branchId, operationId]
      );

      if (existing[0]) {
        // Return the same result as before — idempotent replay
        return ok({
          success: existing[0].status === "success",
          reason: existing[0].reason_code,
          idempotent: true
        });
      }
    }

    // Use offline timestamp for eligibility checks if provided, otherwise server time
    const checkTime = (source === "offline_sync" && offlineRecordedAt) ? offlineRecordedAt : now;

    const settingRows = await query<{ value: unknown }>(
      `SELECT value
         FROM settings
        WHERE organization_id = $1
          AND branch_id = $2
          AND key = 'scan_cooldown_seconds'
        LIMIT 1`,
      [auth.organizationId, auth.branchId]
    );
    const rawCooldown = settingRows[0]?.value;
    const cooldown =
      typeof rawCooldown === "number"
        ? rawCooldown
        : typeof rawCooldown === "string"
          ? Number(rawCooldown) || 30
          : 30;

    const memberRows = await query<Member>(
      `SELECT id, name, gender
         FROM members
        WHERE organization_id = $1
          AND branch_id = $2
          AND deleted_at IS NULL
          AND (id = $3 OR phone = $3 OR COALESCE(card_code, '') = $3)
        LIMIT 1`,
      [auth.organizationId, auth.branchId, scannedValue]
    );

    if (!memberRows[0]) {
      await query(
        `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code, operation_id, source, client_device_id, offline_recorded_at)
         VALUES ($1, $2, NULL, $3, $4, $5, 'failure', 'unknown_member', $6, $7, $8, $9)`,
        [auth.organizationId, auth.branchId, scannedValue, payload.method, now, operationId, source, deviceId, offlineRecordedAt]
      );
      return ok({ success: false, reason: "unknown_member" });
    }

    const member = memberRows[0];

    const cooldownRows = await query<{ id: number }>(
      `SELECT id
         FROM logs
        WHERE organization_id = $1
          AND branch_id = $2
          AND scanned_value = $3
          AND status = 'success'
          AND timestamp >= $4
        LIMIT 1`,
      [auth.organizationId, auth.branchId, scannedValue, checkTime - cooldown]
    );

    if (cooldownRows[0]) {
      return ok({ success: false, reason: "cooldown" });
    }

    const startOfDay = checkTime - (checkTime % 86400);
    const alreadyRows = await query<{ id: number }>(
      `SELECT id
         FROM logs
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND status = 'success'
          AND timestamp >= $4
        LIMIT 1`,
      [auth.organizationId, auth.branchId, member.id, startOfDay]
    );

    if (alreadyRows[0]) {
      return ok({ success: false, reason: "already_checked_in_today" });
    }

    const subscriptionRows = await query<Subscription>(
      `SELECT id, start_date, end_date, sessions_per_month
         FROM subscriptions
        WHERE organization_id = $1
          AND branch_id = $2
          AND member_id = $3
          AND is_active = true
          AND start_date <= $4
          AND end_date > $4
        LIMIT 1`,
      [auth.organizationId, auth.branchId, member.id, checkTime]
    );

    if (!subscriptionRows[0]) {
      await query(
        `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code, operation_id, source, client_device_id, offline_recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'failure', 'no_active_subscription', $7, $8, $9, $10)`,
        [auth.organizationId, auth.branchId, member.id, scannedValue, payload.method, now, operationId, source, deviceId, offlineRecordedAt]
      );
      return ok({ success: false, reason: "no_active_subscription" });
    }

    const subscription = subscriptionRows[0];

    // Check if subscription is currently frozen
    const frozenRows = await query<{ id: number }>(
      `SELECT id FROM subscription_freezes
       WHERE subscription_id = $1 AND organization_id = $2 AND branch_id = $3
         AND start_date <= $4 AND end_date > $4
       LIMIT 1`,
      [subscription.id, auth.organizationId, auth.branchId, checkTime]
    );

    if (frozenRows[0]) {
      await query(
        `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code, operation_id, source, client_device_id, offline_recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'failure', 'subscription_frozen', $7, $8, $9, $10)`,
        [auth.organizationId, auth.branchId, member.id, scannedValue, payload.method, now, operationId, source, deviceId, offlineRecordedAt]
      );
      return ok({ success: false, reason: "subscription_frozen" });
    }

    const { cycleStart, cycleEnd } = getMonthlyCycleWindow({
      subscriptionStart: subscription.start_date,
      subscriptionEnd: subscription.end_date,
      reference: checkTime
    });
    const defaultCap = member.gender === "male" ? 26 : 30;
    const cap = subscription.sessions_per_month || defaultCap;

    const checkInResult = await withTransaction(async (client) => {
      const quotaRows = await client.query(
        `SELECT id, sessions_used, sessions_cap
           FROM quotas
          WHERE organization_id = $1
            AND branch_id = $2
            AND subscription_id = $3
            AND cycle_start = $4
          LIMIT 1`,
        [auth.organizationId, auth.branchId, subscription.id, cycleStart]
      );

      let quotaId: number;
      let sessionsUsed: number;
      let sessionsCap: number;

      if (!quotaRows.rows[0]) {
        const inserted = await client.query(
          `INSERT INTO quotas (
              organization_id, branch_id, member_id, subscription_id,
              cycle_start, cycle_end, sessions_used, sessions_cap
           ) VALUES (
              $1, $2, $3, $4,
              $5, $6, 0, $7
           )
           RETURNING id, sessions_used, sessions_cap`,
          [auth.organizationId, auth.branchId, member.id, subscription.id, cycleStart, cycleEnd, cap]
        );
        quotaId = inserted.rows[0].id;
        sessionsUsed = inserted.rows[0].sessions_used;
        sessionsCap = inserted.rows[0].sessions_cap;
      } else {
        quotaId = quotaRows.rows[0].id;
        sessionsUsed = quotaRows.rows[0].sessions_used;
        sessionsCap = quotaRows.rows[0].sessions_cap;
      }

      if (sessionsUsed >= sessionsCap) {
        await client.query(
          `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code, operation_id, source, client_device_id, offline_recorded_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'failure', 'quota_exceeded', $7, $8, $9, $10)`,
          [auth.organizationId, auth.branchId, member.id, scannedValue, payload.method, now, operationId, source, deviceId, offlineRecordedAt]
        );
        return { success: false, reason: "quota_exceeded" };
      }

      await client.query(
        `UPDATE quotas
            SET sessions_used = sessions_used + 1
          WHERE id = $1`,
        [quotaId]
      );

      await client.query(
        `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code, operation_id, source, client_device_id, offline_recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'success', 'ok', $7, $8, $9, $10)`,
        [auth.organizationId, auth.branchId, member.id, scannedValue, payload.method, now, operationId, source, deviceId, offlineRecordedAt]
      );

      return {
        success: true,
        member,
        subscriptionId: subscription.id,
        sessionsRemaining: sessionsCap - sessionsUsed - 1
      };
    });

    return ok(checkInResult);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("validation") || error.message.includes("parse")) {
        return fail("Invalid check-in data. Please make sure you're scanning a valid member ID, phone, or card code.", 400);
      }
      if (error.message.includes("connection") || error.message.includes("timeout")) {
        return fail("We're having trouble connecting to our system. Please check your internet and try again.", 503);
      }
      // Handle idempotency constraint violation gracefully
      if (error.message.includes("idx_logs_operation_id_unique")) {
        return ok({ success: true, reason: "ok", idempotent: true });
      }
    }
    return routeError(error);
  }
}
