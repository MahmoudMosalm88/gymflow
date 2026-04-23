import { z } from "zod";
import { NextRequest } from "next/server";
import { fail, ok, routeError } from "@/lib/http";
import { hasValidAdminKey } from "@/lib/admin-secret";
import { createNotification, NotificationTarget } from "@/lib/notifications";

export const runtime = "nodejs";

const targetSchema = z.object({
  organizationId: z.string().uuid(),
  branchId: z.string().uuid(),
});

const bodySchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    body: z.string().trim().min(3).max(4000),
    severity: z.enum(["info", "warning", "critical"]).default("info"),
    actionUrl: z.string().url().optional(),
    organizationIds: z.array(z.string().uuid()).max(500).optional(),
    branchTargets: z.array(targetSchema).max(2000).optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    const hasOrgTargets = (value.organizationIds?.length || 0) > 0;
    const hasBranchTargets = (value.branchTargets?.length || 0) > 0;
    if (!hasOrgTargets && !hasBranchTargets) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one target is required",
        path: ["organizationIds"],
      });
    }
  });

function dedupeTargets(
  organizationIds: string[] | undefined,
  branchTargets: { organizationId: string; branchId: string }[] | undefined
): NotificationTarget[] {
  const map = new Map<string, NotificationTarget>();

  for (const orgId of organizationIds || []) {
    const key = `${orgId}:*`;
    map.set(key, { organizationId: orgId, branchId: null });
  }

  for (const item of branchTargets || []) {
    const orgKey = `${item.organizationId}:*`;
    if (map.has(orgKey)) continue;
    const branchKey = `${item.organizationId}:${item.branchId}`;
    map.set(branchKey, { organizationId: item.organizationId, branchId: item.branchId });
  }

  return Array.from(map.values());
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidAdminKey(request)) return fail("Unauthorized", 401);

    const payload = bodySchema.parse(await request.json());
    const targets = dedupeTargets(payload.organizationIds, payload.branchTargets);

    const result = await createNotification(
      {
        source: "broadcast",
        type: "admin_broadcast",
        title: payload.title,
        body: payload.body,
        severity: payload.severity,
        actionUrl: payload.actionUrl,
        expiresAt: payload.expiresAt,
        metadata: {
          created_by: "admin_api",
          target_count: targets.length,
        },
      },
      targets
    );

    return ok({
      id: result.id,
      recipients: result.recipients,
    }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
