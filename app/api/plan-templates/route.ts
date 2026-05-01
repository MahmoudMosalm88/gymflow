import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { requireRoles } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { fail, ok, routeError } from "@/lib/http";
import { ensurePlanTemplateSchema, normalizePlanTemplate, type PlanTemplateRow } from "@/lib/plan-templates";
import { planTemplateCreateSchema, planTemplatePatchSchema, planTemplateReorderSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner", "manager", "staff"]);
    const includeArchived = request.nextUrl.searchParams.get("include_archived") === "1" && auth.role === "owner";
    await ensurePlanTemplateSchema({ query: async (text, values = []) => ({ rows: await query(text, values as unknown[]) }) });

    const rows = await query<PlanTemplateRow>(
      `SELECT *
         FROM plan_templates
        WHERE organization_id = $1
          AND branch_id = $2
          AND ($3::boolean = true OR is_archived = false)
        ORDER BY is_archived ASC, sort_order ASC, created_at ASC`,
      [auth.organizationId, auth.branchId, includeArchived]
    );

    return ok(rows.map(normalizePlanTemplate));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const payload = planTemplateCreateSchema.parse(await request.json());

    const created = await withTransaction(async (client) => {
      await ensurePlanTemplateSchema(client);
      const maxRows = await client.query<{ max_sort: number | null }>(
        `SELECT MAX(sort_order)::int AS max_sort
           FROM plan_templates
          WHERE organization_id = $1
            AND branch_id = $2`,
        [auth.organizationId, auth.branchId]
      );
      const sortOrder = Number(maxRows.rows[0]?.max_sort ?? -1) + 1;
      const rows = await client.query<PlanTemplateRow>(
        `INSERT INTO plan_templates (
            id, organization_id, branch_id, name, duration_months, price,
            sessions_per_month, perks, freeze_days_per_cycle,
            guest_invites_per_cycle, sort_order
         ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8::jsonb, $9, $10, $11
         )
         RETURNING *`,
        [
          uuidv4(),
          auth.organizationId,
          auth.branchId,
          payload.name,
          payload.duration_months,
          payload.price,
          payload.sessions_per_month ?? null,
          JSON.stringify(payload.perks),
          payload.freeze_days_per_cycle,
          payload.guest_invites_per_cycle,
          sortOrder
        ]
      );
      return normalizePlanTemplate(rows.rows[0]);
    });

    return ok(created, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["owner"]);
    const body = await request.json();

    const reordered = planTemplateReorderSchema.safeParse(body);
    if (reordered.success) {
      const rows = await withTransaction(async (client) => {
        await ensurePlanTemplateSchema(client);
        for (const item of reordered.data.reorder) {
          await client.query(
            `UPDATE plan_templates
                SET sort_order = $1,
                    updated_at = NOW()
              WHERE id = $2
                AND organization_id = $3
                AND branch_id = $4`,
            [item.sort_order, item.id, auth.organizationId, auth.branchId]
          );
        }
        const result = await client.query<PlanTemplateRow>(
          `SELECT *
             FROM plan_templates
            WHERE organization_id = $1
              AND branch_id = $2
            ORDER BY is_archived ASC, sort_order ASC, created_at ASC`,
          [auth.organizationId, auth.branchId]
        );
        return result.rows.map(normalizePlanTemplate);
      });
      return ok(rows);
    }

    const payload = planTemplatePatchSchema.parse(body);
    const hasEditableFields = [
      payload.name,
      payload.duration_months,
      payload.price,
      payload.sessions_per_month,
      payload.perks,
      payload.freeze_days_per_cycle,
      payload.guest_invites_per_cycle,
      payload.is_archived,
      payload.sort_order
    ].some((value) => value !== undefined);
    if (!hasEditableFields) return fail("No plan template changes were provided.", 400);

    const updated = await withTransaction(async (client) => {
      await ensurePlanTemplateSchema(client);
      const rows = await client.query<PlanTemplateRow>(
        `UPDATE plan_templates
            SET name = COALESCE($4::text, name),
                duration_months = COALESCE($5::integer, duration_months),
                price = COALESCE($6::numeric, price),
                sessions_per_month = CASE WHEN $7::boolean THEN $8::int ELSE sessions_per_month END,
                perks = CASE WHEN $9::boolean THEN $10::jsonb ELSE perks END,
                freeze_days_per_cycle = COALESCE($11::integer, freeze_days_per_cycle),
                guest_invites_per_cycle = COALESCE($12::integer, guest_invites_per_cycle),
                is_archived = COALESCE($13::boolean, is_archived),
                sort_order = COALESCE($14::integer, sort_order),
                updated_at = NOW()
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
          RETURNING *`,
        [
          payload.id,
          auth.organizationId,
          auth.branchId,
          payload.name ?? null,
          payload.duration_months ?? null,
          payload.price ?? null,
          payload.sessions_per_month !== undefined,
          payload.sessions_per_month ?? null,
          payload.perks !== undefined,
          JSON.stringify(payload.perks ?? []),
          payload.freeze_days_per_cycle ?? null,
          payload.guest_invites_per_cycle ?? null,
          payload.is_archived ?? null,
          payload.sort_order ?? null
        ]
      );
      if (!rows.rows[0]) throw Object.assign(new Error("Plan template not found."), { statusCode: 404 });
      return normalizePlanTemplate(rows.rows[0]);
    });

    return ok(updated);
  } catch (error) {
    return routeError(error);
  }
}
