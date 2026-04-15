import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { fail, ok, routeError } from "@/lib/http";
import { upsertSetting } from "@/lib/tenant";
import {
  isManualStopActive,
  parseManualStopRecords,
  upsertManualStopRecord,
  WHATSAPP_SEQUENCE_MANUAL_STOPS_KEY,
  type WhatsAppManualStopRecord,
  type WhatsAppSequenceControlAutomationId,
} from "@/lib/whatsapp-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SequenceRow = {
  automation_id: WhatsAppSequenceControlAutomationId;
  member_id: string;
  member_name: string | null;
  member_phone: string | null;
  sequence_scope: string | null;
  sequence_kind: string;
  status: string;
  last_error: string | null;
  latest_event_at: string;
};

type SettingRow = {
  value: unknown;
};

const stopSequenceSchema = z.object({
  memberId: z.string().uuid(),
  automationId: z.enum(["post_expiry", "onboarding"]),
  scope: z.string().trim().optional().nullable(),
});

function isSchemaDrift(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";
  return code === "42P01" || code === "42703";
}

async function loadManualStops(organizationId: string, branchId: string) {
  const rows = await query<SettingRow>(
    `SELECT value
       FROM settings
      WHERE organization_id = $1
        AND branch_id = $2
        AND key = $3
      LIMIT 1`,
    [organizationId, branchId, WHATSAPP_SEQUENCE_MANUAL_STOPS_KEY]
  );
  return parseManualStopRecords(rows[0]?.value);
}

async function listSequences(organizationId: string, branchId: string, limit: number) {
  const rows = await query<SequenceRow>(
    `WITH sequence_rows AS (
       SELECT CASE
                WHEN mq.payload->>'sequence_kind' = 'post_expiry' THEN 'post_expiry'
                ELSE 'onboarding'
              END AS automation_id,
              mq.member_id,
              COALESCE(m.name, mq.target_name) AS member_name,
              COALESCE(m.phone, mq.target_phone) AS member_phone,
              CASE
                WHEN mq.payload->>'sequence_kind' = 'post_expiry'
                  THEN NULLIF(mq.payload->>'subscription_id', '')
                ELSE NULL
              END AS sequence_scope,
              COALESCE(NULLIF(mq.payload->>'sequence_kind', ''), mq.type) AS sequence_kind,
              mq.status,
              mq.last_error,
              COALESCE(mq.sent_at, mq.last_attempt_at, mq.scheduled_at, mq.created_at)::text AS latest_event_at,
              ROW_NUMBER() OVER (
                PARTITION BY
                  mq.member_id,
                  CASE
                    WHEN mq.payload->>'sequence_kind' = 'post_expiry' THEN 'post_expiry'
                    ELSE 'onboarding'
                  END,
                  CASE
                    WHEN mq.payload->>'sequence_kind' = 'post_expiry'
                      THEN COALESCE(mq.payload->>'subscription_id', '')
                    ELSE ''
                  END
                ORDER BY COALESCE(mq.sent_at, mq.last_attempt_at, mq.scheduled_at, mq.created_at) DESC, mq.created_at DESC
              ) AS row_num
         FROM message_queue mq
         LEFT JOIN members m ON m.id = mq.member_id
        WHERE mq.organization_id = $1
          AND mq.branch_id = $2
          AND mq.member_id IS NOT NULL
          AND (
            mq.payload->>'sequence_kind' = 'post_expiry'
            OR mq.payload->>'sequence_kind' IN (
              'onboarding_welcome',
              'onboarding_first_visit',
              'onboarding_no_return_day7',
              'onboarding_low_engagement_day14'
            )
          )
          AND COALESCE(mq.sent_at, mq.scheduled_at, mq.created_at) >= NOW() - interval '30 days'
     )
     SELECT automation_id,
            member_id,
            member_name,
            member_phone,
            sequence_scope,
            sequence_kind,
            status,
            last_error,
            latest_event_at
       FROM sequence_rows
      WHERE row_num = 1
      ORDER BY latest_event_at DESC
      LIMIT $3`,
    [organizationId, branchId, limit]
  );

  const manualStops = await loadManualStops(organizationId, branchId);

  return rows.map((row) => {
    const stoppedManually = isManualStopActive(manualStops, {
      memberId: row.member_id,
      automationId: row.automation_id,
      scope: row.sequence_scope,
    });

    const derivedStatus =
      stoppedManually || row.last_error === "stopped_manual"
        ? "stopped_manual"
        : row.last_error === "stopped_not_eligible" ||
            row.last_error === "stopped_renewed" ||
            row.last_error === "stopped_goal_met"
          ? row.last_error
          : row.status;

    return {
      automationId: row.automation_id,
      memberId: row.member_id,
      memberName: row.member_name,
      memberPhone: row.member_phone,
      scope: row.sequence_scope,
      sequenceKind: row.sequence_kind,
      status: derivedStatus,
      latestEventAt: row.latest_event_at,
      canStop:
        derivedStatus !== "stopped_manual" &&
        derivedStatus !== "stopped_not_eligible" &&
        derivedStatus !== "stopped_renewed" &&
        derivedStatus !== "stopped_goal_met",
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(30, Number(url.searchParams.get("limit") || 12)));
    return ok({ items: await listSequences(auth.organizationId, auth.branchId, limit) });
  } catch (error) {
    if (isSchemaDrift(error)) {
      return ok({ items: [] });
    }
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const payload = stopSequenceSchema.parse(await request.json());
    const scope = payload.scope?.trim() || null;

    const updated = await withTransaction(async (client) => {
      const rows = await client.query<SettingRow>(
        `SELECT value
           FROM settings
          WHERE organization_id = $1
            AND branch_id = $2
            AND key = $3
          LIMIT 1`,
        [auth.organizationId, auth.branchId, WHATSAPP_SEQUENCE_MANUAL_STOPS_KEY]
      );

      const nextRecord: WhatsAppManualStopRecord = {
        memberId: payload.memberId,
        automationId: payload.automationId,
        scope,
        stoppedAt: new Date().toISOString(),
        stoppedBy: auth.ownerId,
        reason: "manual",
      };

      const records = upsertManualStopRecord(parseManualStopRecords(rows.rows[0]?.value), nextRecord);
      await upsertSetting(
        client,
        auth.organizationId,
        auth.branchId,
        WHATSAPP_SEQUENCE_MANUAL_STOPS_KEY,
        records
      );

      const whereSequence =
        payload.automationId === "post_expiry"
          ? `mq.payload->>'sequence_kind' = 'post_expiry'
             AND ($4::text IS NULL OR mq.payload->>'subscription_id' = $4::text)`
          : `mq.payload->>'sequence_kind' IN (
               'onboarding_welcome',
               'onboarding_first_visit',
               'onboarding_no_return_day7',
               'onboarding_low_engagement_day14'
             )`;

      await client.query(
        `UPDATE message_queue mq
            SET status = 'failed',
                attempts = GREATEST(mq.attempts, 3),
                last_error = 'stopped_manual'
          WHERE mq.organization_id = $1
            AND mq.branch_id = $2
            AND mq.member_id = $3
            AND mq.status IN ('pending', 'processing')
            AND ${whereSequence}`,
        [auth.organizationId, auth.branchId, payload.memberId, scope]
      );

      return nextRecord;
    });

    return ok(updated, { status: 201 });
  } catch (error) {
    if (isSchemaDrift(error)) {
      return fail("WhatsApp sequence controls are not available on this branch yet.", 409);
    }
    return routeError(error);
  }
}
