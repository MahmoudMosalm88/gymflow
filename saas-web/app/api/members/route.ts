import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { memberSchema } from "@/lib/validation";
import { deactivateExpiredSubscriptions } from "@/lib/subscription-status";
import { calculateSubscriptionEndDateUnix, getCurrentSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";
import {
  getDefaultWelcomeTemplate,
  getTemplateKey,
  normalizeSystemLanguage,
  parseTextSetting,
  parseBooleanSetting,
  renderWhatsappTemplate
} from "@/lib/whatsapp-automation";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const initialSubscriptionSchema = z.object({
  start_date: z.number().int().positive(),
  plan_months: z.number().int().positive(),
  price_paid: z.number().min(0).nullable().optional(),
  payment_method: z.enum(["cash", "digital"]).nullable().optional(),
  sessions_per_month: z.number().int().positive().nullable().optional(),
}).nullable().optional();

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const accessNow = getCurrentSubscriptionAccessReferenceUnix();
    await deactivateExpiredSubscriptions(auth.organizationId, auth.branchId, accessNow);

    if (!q) {
      const rows = await query(
        `SELECT m.*,
           ta.trainer_staff_user_id,
           ta.trainer_name,
           CASE
             WHEN s.id IS NULL THEN 'no_sub'
             WHEN s.start_date <= $3 AND s.end_date > $3 AND s.is_active = true THEN 'active'
             WHEN s.is_active = true AND s.start_date > $3 THEN 'active'
             ELSE 'expired'
           END AS sub_status
           FROM members m
           LEFT JOIN LATERAL (
             SELECT id, start_date, end_date, is_active
               FROM subscriptions
              WHERE member_id = m.id
                AND organization_id = m.organization_id
                AND branch_id = m.branch_id
              ORDER BY
                CASE
                  WHEN is_active = true AND start_date <= $3 AND end_date > $3 THEN 0
                  WHEN is_active = true AND start_date > $3 THEN 1
                  WHEN is_active = true THEN 2
                  ELSE 3
                END,
                start_date DESC,
                end_date DESC,
                created_at DESC
              LIMIT 1
           ) s ON true
           LEFT JOIN LATERAL (
             SELECT mta.trainer_staff_user_id,
                    su.name AS trainer_name
               FROM member_trainer_assignments mta
               JOIN staff_users su ON su.id = mta.trainer_staff_user_id
              WHERE mta.member_id = m.id
                AND mta.organization_id = m.organization_id
                AND mta.branch_id = m.branch_id
                AND mta.is_active = true
              ORDER BY mta.assigned_at DESC
              LIMIT 1
           ) ta ON true
          WHERE m.organization_id = $1
            AND m.branch_id = $2
            AND m.deleted_at IS NULL
            AND ($4::uuid IS NULL OR ta.trainer_staff_user_id = $4::uuid)
          ORDER BY m.created_at DESC
          LIMIT 500`,
        [auth.organizationId, auth.branchId, accessNow, null]
      );
      return ok(rows);
    }

    const rows = await query(
      `SELECT m.*,
         ta.trainer_staff_user_id,
         ta.trainer_name,
         CASE
           WHEN s.id IS NULL THEN 'no_sub'
           WHEN s.start_date <= $3 AND s.end_date > $3 AND s.is_active = true THEN 'active'
           WHEN s.is_active = true AND s.start_date > $3 THEN 'active'
           ELSE 'expired'
         END AS sub_status
         FROM members m
         LEFT JOIN LATERAL (
           SELECT id, start_date, end_date, is_active
             FROM subscriptions
            WHERE member_id = m.id
              AND organization_id = m.organization_id
              AND branch_id = m.branch_id
            ORDER BY
              CASE
                WHEN is_active = true AND start_date <= $3 AND end_date > $3 THEN 0
                WHEN is_active = true AND start_date > $3 THEN 1
                WHEN is_active = true THEN 2
                ELSE 3
              END,
              start_date DESC,
              end_date DESC,
              created_at DESC
            LIMIT 1
         ) s ON true
         LEFT JOIN LATERAL (
           SELECT mta.trainer_staff_user_id,
                  su.name AS trainer_name
             FROM member_trainer_assignments mta
             JOIN staff_users su ON su.id = mta.trainer_staff_user_id
            WHERE mta.member_id = m.id
              AND mta.organization_id = m.organization_id
              AND mta.branch_id = m.branch_id
              AND mta.is_active = true
            ORDER BY mta.assigned_at DESC
            LIMIT 1
         ) ta ON true
        WHERE m.organization_id = $1
          AND m.branch_id = $2
          AND m.deleted_at IS NULL
          AND ($4::uuid IS NULL OR ta.trainer_staff_user_id = $4::uuid)
          AND (m.name ILIKE $5 OR m.phone ILIKE $5 OR COALESCE(m.card_code, '') ILIKE $5)
        ORDER BY m.created_at DESC
        LIMIT 500`,
      [auth.organizationId, auth.branchId, accessNow, null, `%${q}%`]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const payload = memberSchema.parse(body);
    const initialSubscription = initialSubscriptionSchema.parse((body as { initial_subscription?: unknown }).initial_subscription);
    const now = new Date();
    const id = payload.id || uuidv4();
    const requestedCardCode = (payload.card_code || "").trim();

    const output = await withTransaction(async (client) => {
      if (requestedCardCode) {
        // Release card codes from soft-deleted members so codes are reusable.
        await client.query(
          `UPDATE members
              SET card_code = NULL, updated_at = NOW()
            WHERE organization_id = $1
              AND branch_id = $2
              AND deleted_at IS NOT NULL
              AND card_code = $3`,
          [auth.organizationId, auth.branchId, requestedCardCode]
        );
      }

      const inserted = await client.query(
        `INSERT INTO members (
            id, organization_id, branch_id, name, phone, gender, photo_path,
            access_tier, card_code, address, created_at, updated_at
         ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $11
         )
         RETURNING *`,
        [
          id,
          auth.organizationId,
          auth.branchId,
          payload.name,
          payload.phone,
          payload.gender,
          payload.photo_path || null,
          payload.access_tier,
          payload.card_code || null,
          payload.address || null,
          now
        ]
      );

      const member = inserted.rows[0];

      if (initialSubscription) {
        const endDate = calculateSubscriptionEndDateUnix(initialSubscription.start_date, initialSubscription.plan_months);
        await client.query(
          `INSERT INTO subscriptions (
              organization_id, branch_id, member_id, start_date, end_date,
              plan_months, price_paid, payment_method, sessions_per_month, is_active
           ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, true
           )`,
          [
            auth.organizationId,
            auth.branchId,
            member.id,
            initialSubscription.start_date,
            endDate,
            initialSubscription.plan_months,
            initialSubscription.price_paid ?? null,
            initialSubscription.payment_method ?? null,
            initialSubscription.sessions_per_month ?? null,
          ]
        );
      }

      if (payload.from_guest_pass_id) {
        const guestPassRows = await client.query<{ id: string }>(
          `UPDATE guest_passes
              SET converted_member_id = $4,
                  converted_at = COALESCE(converted_at, NOW()),
                  used_at = COALESCE(used_at, NOW())
            WHERE id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND voided_at IS NULL
          RETURNING id`,
          [payload.from_guest_pass_id, auth.organizationId, auth.branchId, member.id]
        );

        if (!guestPassRows.rows[0]) {
          throw new Error("Guest pass not found");
        }
      }

      const settingsRows = await client.query<{ key: string; value: unknown }>(
        `SELECT key, value
           FROM settings
          WHERE organization_id = $1
            AND branch_id = $2
            AND key = ANY($3::text[])`,
        [
          auth.organizationId,
          auth.branchId,
          [
            "whatsapp_automation_enabled",
            "system_language",
            "whatsapp_template_welcome",
            "whatsapp_template_welcome_en",
            "whatsapp_template_welcome_ar"
          ]
        ]
      );

      const settings = Object.fromEntries(settingsRows.rows.map((row) => [row.key, row.value]));
      const automationEnabled = parseBooleanSetting(settings.whatsapp_automation_enabled, true);
      const systemLanguage = normalizeSystemLanguage(settings.system_language, "en");

      if (automationEnabled) {
        const templateByLanguageKey = getTemplateKey("welcome", systemLanguage);
        const byLanguage = parseTextSetting(settings[templateByLanguageKey]);
        const rawTemplate = parseTextSetting(settings.whatsapp_template_welcome);
        const legacyFallback = systemLanguage === "en" ? rawTemplate : "";
        const template = byLanguage || legacyFallback || getDefaultWelcomeTemplate(systemLanguage);

        const message = renderWhatsappTemplate(template, {
          name: member.name || "Member"
        });

        await client.query(
          `INSERT INTO message_queue (
              id, organization_id, branch_id, member_id, type, payload, status, attempts, scheduled_at
           ) VALUES (
              $1, $2, $3, $4, 'welcome', $5::jsonb, 'pending', 0, NOW()
           )`,
          [
            uuidv4(),
            auth.organizationId,
            auth.branchId,
            member.id,
            JSON.stringify({
              message,
              template,
              sequence_kind: "onboarding_welcome",
              placeholders: { name: member.name || "Member" },
              generated_at: new Date().toISOString()
            })
          ]
        );

        const qrCodeValue = String(member.card_code || member.id);
        const qrMessage =
          systemLanguage === "ar"
            ? `مرحباً ${member.name || "عميل"}.\nهذا رمز الدخول الخاص بك. يرجى إبرازه عند تسجيل الدخول.`
            : `Hi ${member.name || "Member"}.\nThis is your check-in QR code. Please show it at the front desk.`;

        await client.query(
          `INSERT INTO message_queue (
              id, organization_id, branch_id, member_id, type, payload, status, attempts, scheduled_at
           ) VALUES (
              $1, $2, $3, $4, 'qr_code', $5::jsonb, 'pending', 0, NOW()
           )`,
          [
            uuidv4(),
            auth.organizationId,
            auth.branchId,
            member.id,
            JSON.stringify({
              message: qrMessage,
              code: qrCodeValue,
              generated_at: new Date().toISOString()
            })
          ]
        );
      }

      return { member, systemLanguage };
    });

    const isAr = output.systemLanguage === 'ar';
    const member = output.member;

    createNotification(
      {
        source: "system",
        type: "member_created",
        title: isAr ? "تمت إضافة عميل جديد" : "New client added",
        body: isAr ? `تمت إضافة ${member.name || "عميل"} إلى قائمة العملاء.` : `${member.name || "A client"} was added to your client list.`,
        severity: "info",
        actionUrl: `/dashboard/members/${member.id}`,
        metadata: {
          memberId: member.id,
          memberName: member.name || null,
        },
      },
      [{ organizationId: auth.organizationId, branchId: auth.branchId }]
    ).catch(() => {
      // Non-blocking: member creation should not fail if notification insert fails.
    });

    return ok(member, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Guest pass not found") {
      return fail(error.message, 404);
    }
    // Handle duplicate key errors specifically for user-friendly feedback
    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return fail("This member already exists. Please check the phone number or card code and try again.", 409);
    }
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return fail("Member id is required", 400);

    const payload = memberSchema.partial().parse(body);

    const requestedCardCode = (payload.card_code || "").trim();
    if (requestedCardCode) {
      await query(
        `UPDATE members
            SET card_code = NULL, updated_at = NOW()
          WHERE organization_id = $1
            AND branch_id = $2
            AND deleted_at IS NOT NULL
            AND card_code = $3`,
        [auth.organizationId, auth.branchId, requestedCardCode]
      );
    }

    const rows = await query(
      `UPDATE members
          SET name = COALESCE($4, name),
              phone = COALESCE($5, phone),
              gender = COALESCE($6, gender),
              photo_path = COALESCE($7, photo_path),
              access_tier = COALESCE($8, access_tier),
              card_code = COALESCE($9, card_code),
              address = COALESCE($10, address),
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND deleted_at IS NULL
      RETURNING *`,
      [
        id,
        auth.organizationId,
        auth.branchId,
        payload.name || null,
        payload.phone || null,
        payload.gender || null,
        payload.photo_path || null,
        payload.access_tier || null,
        payload.card_code || null,
        payload.address || null
      ]
    );

    if (!rows[0]) return fail("This member could not be found. They may have already been deleted.", 404);
    return ok(rows[0]);
  } catch (error) {
    if (error instanceof Error && (error.message.includes("duplicate") || error.message.includes("unique"))) {
      return fail("This phone number or card code is already in use. Please use unique values.", 409);
    }
    return routeError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return fail("Member id is required", 400);

    const rows = await query(
      `UPDATE members
          SET deleted_at = NOW(),
              card_code = NULL,
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND deleted_at IS NULL
      RETURNING id`,
      [id, auth.organizationId, auth.branchId]
    );

    if (!rows[0]) return fail("This member could not be found. They may have already been deleted.", 404);
    return ok({ id, deleted: true });
  } catch (error) {
    return routeError(error);
  }
}
