import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getMonthlyCycleWindow } from "@/lib/billing-cycle";
import { ok, routeError } from "@/lib/http";
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

function normalizeScan(input: string) {
  return input.trim();
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = attendanceSchema.parse(await request.json());
    const now = Math.floor(Date.now() / 1000);
    const scannedValue = normalizeScan(payload.scannedValue);

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
        `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code)
         VALUES ($1, $2, NULL, $3, $4, $5, 'failure', 'unknown_member')`,
        [auth.organizationId, auth.branchId, scannedValue, payload.method, now]
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
      [auth.organizationId, auth.branchId, scannedValue, now - cooldown]
    );

    if (cooldownRows[0]) {
      return ok({ success: false, reason: "cooldown" });
    }

    const startOfDay = now - (now % 86400);
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
      [auth.organizationId, auth.branchId, member.id, now]
    );

    if (!subscriptionRows[0]) {
      await query(
        `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code)
         VALUES ($1, $2, $3, $4, $5, $6, 'failure', 'no_active_subscription')`,
        [auth.organizationId, auth.branchId, member.id, scannedValue, payload.method, now]
      );
      return ok({ success: false, reason: "no_active_subscription" });
    }

    const subscription = subscriptionRows[0];

    const { cycleStart, cycleEnd } = getMonthlyCycleWindow({
      subscriptionStart: subscription.start_date,
      subscriptionEnd: subscription.end_date,
      reference: now
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
          `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code)
           VALUES ($1, $2, $3, $4, $5, $6, 'failure', 'quota_exceeded')`,
          [auth.organizationId, auth.branchId, member.id, scannedValue, payload.method, now]
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
        `INSERT INTO logs (organization_id, branch_id, member_id, scanned_value, method, timestamp, status, reason_code)
         VALUES ($1, $2, $3, $4, $5, $6, 'success', 'ok')`,
        [auth.organizationId, auth.branchId, member.id, scannedValue, payload.method, now]
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
      // Handle validation errors
      if (error.message.includes("validation") || error.message.includes("parse")) {
        return fail("Invalid check-in data. Please make sure you're scanning a valid member ID, phone, or card code.", 400);
      }
      // Handle database connection errors
      if (error.message.includes("connection") || error.message.includes("timeout")) {
        return fail("We're having trouble connecting to our system. Please check your internet and try again.", 503);
      }
    }
    return routeError(error);
  }
}
