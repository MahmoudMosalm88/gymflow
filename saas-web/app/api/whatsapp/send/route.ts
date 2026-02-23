import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import {
  getDefaultWelcomeTemplate,
  getTemplateKey,
  normalizeSystemLanguage,
  parseTextSetting,
  renderWhatsappTemplate
} from "@/lib/whatsapp-automation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json();
    const memberId = String(body.memberId || "");
    const type = String(body.type || "manual");
    const payload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? body.payload
        : {};

    if (!memberId) return fail("memberId is required", 400);

    const memberRows = await query<{ id: string; name: string; card_code: string | null }>(
      `SELECT id, name, card_code
         FROM members
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND deleted_at IS NULL
        LIMIT 1`,
      [memberId, auth.organizationId, auth.branchId]
    );

    if (!memberRows[0]) return fail("Member not found", 404);
    const member = memberRows[0];

    let payloadWithDefaults: Record<string, unknown> = { ...payload };

    if (typeof payloadWithDefaults.message !== "string" || !payloadWithDefaults.message.trim()) {
      if (type === "welcome") {
        const settingsRows = await query<{ key: string; value: unknown }>(
          `SELECT key, value
             FROM settings
            WHERE organization_id = $1
              AND branch_id = $2
              AND key = ANY($3::text[])`,
          [
            auth.organizationId,
            auth.branchId,
            ["system_language", "whatsapp_template_welcome", "whatsapp_template_welcome_en", "whatsapp_template_welcome_ar"]
          ]
        );
        const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
        const systemLanguage = normalizeSystemLanguage(settings.system_language, "en");
        const templateByLanguageKey = getTemplateKey("welcome", systemLanguage);
        const byLanguage = parseTextSetting(settings[templateByLanguageKey]);
        const rawTemplate = parseTextSetting(settings.whatsapp_template_welcome);
        const legacyFallback = systemLanguage === "en" ? rawTemplate : "";
        const template = byLanguage || legacyFallback || getDefaultWelcomeTemplate(systemLanguage);
        const message = renderWhatsappTemplate(template, {
          name: member.name || "Member"
        });
        payloadWithDefaults = {
          ...payloadWithDefaults,
          message,
          template,
          placeholders: { name: member.name || "Member" },
          generated_at: new Date().toISOString()
        };
      }

      if (type === "qr_code") {
        const settingsRows = await query<{ key: string; value: unknown }>(
          `SELECT key, value
             FROM settings
            WHERE organization_id = $1
              AND branch_id = $2
              AND key = 'system_language'
            LIMIT 1`,
          [auth.organizationId, auth.branchId]
        );
        const systemLanguage = normalizeSystemLanguage(settingsRows[0]?.value, "en");
        const code = String(member.card_code || member.id);
        const message =
          systemLanguage === "ar"
            ? `مرحباً ${member.name || "عميل"}.\nرمز الدخول الخاص بك: ${code}\nقدّمه عند تسجيل الدخول في الصالة.`
            : `Hi ${member.name || "Member"}.\nYour check-in code is: ${code}\nShow it at the front desk to check in.`;
        payloadWithDefaults = {
          ...payloadWithDefaults,
          message,
          code,
          generated_at: new Date().toISOString()
        };
      }
    }

    const rows = await query(
      `INSERT INTO message_queue (
          id, organization_id, branch_id, member_id, type,
          payload, status, attempts, scheduled_at
       ) VALUES (
          $1, $2, $3, $4, $5,
          $6::jsonb, 'pending', 0, NOW()
       )
       RETURNING id, status, scheduled_at`,
      [uuidv4(), auth.organizationId, auth.branchId, memberId, type, JSON.stringify(payloadWithDefaults)]
    );

    return ok(rows[0], { status: 202 });
  } catch (error) {
    return routeError(error);
  }
}
