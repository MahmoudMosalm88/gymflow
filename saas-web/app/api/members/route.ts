import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { memberSchema } from "@/lib/validation";
import {
  getDefaultWelcomeTemplate,
  getTemplateKey,
  normalizeSystemLanguage,
  parseBooleanSetting,
  renderWhatsappTemplate
} from "@/lib/whatsapp-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (!q) {
      const rows = await query(
        `SELECT m.*,
           CASE
             WHEN s.id IS NULL THEN 'no_sub'
             WHEN s.end_date < EXTRACT(EPOCH FROM NOW())::bigint THEN 'expired'
             ELSE 'active'
           END AS sub_status
           FROM members m
           LEFT JOIN LATERAL (
             SELECT id, end_date FROM subscriptions
              WHERE member_id = m.id
                AND organization_id = m.organization_id
                AND branch_id = m.branch_id
              ORDER BY created_at DESC LIMIT 1
           ) s ON true
          WHERE m.organization_id = $1
            AND m.branch_id = $2
            AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT 500`,
        [auth.organizationId, auth.branchId]
      );
      return ok(rows);
    }

    const rows = await query(
      `SELECT m.*,
         CASE
           WHEN s.id IS NULL THEN 'no_sub'
           WHEN s.end_date < EXTRACT(EPOCH FROM NOW())::bigint THEN 'expired'
           ELSE 'active'
         END AS sub_status
         FROM members m
         LEFT JOIN LATERAL (
           SELECT id, end_date FROM subscriptions
            WHERE member_id = m.id
              AND organization_id = m.organization_id
              AND branch_id = m.branch_id
            ORDER BY created_at DESC LIMIT 1
         ) s ON true
        WHERE m.organization_id = $1
          AND m.branch_id = $2
          AND m.deleted_at IS NULL
          AND (m.name ILIKE $3 OR m.phone ILIKE $3 OR COALESCE(m.card_code, '') ILIKE $3)
        ORDER BY m.created_at DESC
        LIMIT 500`,
      [auth.organizationId, auth.branchId, `%${q}%`]
    );

    return ok(rows);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const payload = memberSchema.parse(await request.json());
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
        const byLanguage =
          typeof settings[templateByLanguageKey] === "string"
            ? String(settings[templateByLanguageKey]).trim()
            : "";
        const rawTemplate =
          typeof settings.whatsapp_template_welcome === "string"
            ? settings.whatsapp_template_welcome.trim()
            : "";
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
              placeholders: { name: member.name || "Member" },
              generated_at: new Date().toISOString()
            })
          ]
        );
      }

      return member;
    });

    return ok(output, { status: 201 });
  } catch (error) {
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
