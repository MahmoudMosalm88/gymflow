import { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { assignPackageMemberToTrainer, syncPtPackageState } from "@/lib/pt";
import { ptPackagePatchSchema } from "@/lib/validation";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth.role === "trainer") {
      return fail("Trainers cannot edit PT packages.", 403);
    }

    const { id } = await context.params;
    const payload = ptPackagePatchSchema.parse(await request.json());
    let previousTrainerStaffUserId: string | null = null;
    const data = await withTransaction(async (client) => {
      const currentRows = await client.query<{
        id: string;
        organization_id: string;
        branch_id: string;
        member_id: string;
        assigned_trainer_staff_user_id: string;
      }>(
        `SELECT id, organization_id, branch_id, member_id, assigned_trainer_staff_user_id
           FROM pt_packages
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3
          LIMIT 1
          FOR UPDATE`,
        [id, auth.organizationId, auth.branchId]
      );
      if (!currentRows.rows[0]) throw new Error("PT package not found");
      const current = currentRows.rows[0];
      previousTrainerStaffUserId = current.assigned_trainer_staff_user_id;

      await client.query(
        `UPDATE pt_packages
            SET assigned_trainer_staff_user_id = COALESCE($4, assigned_trainer_staff_user_id),
                title = COALESCE($5, title),
                total_sessions = COALESCE($6, total_sessions),
                price_paid = COALESCE($7, price_paid),
                valid_from = COALESCE($8::timestamptz, valid_from),
                valid_until = COALESCE($9::timestamptz, valid_until),
                status = COALESCE($10, status),
                notes = COALESCE($11, notes),
                cancelled_reason = COALESCE($12, cancelled_reason),
                cancelled_at = CASE WHEN COALESCE($10, status) = 'cancelled' THEN COALESCE(cancelled_at, NOW()) ELSE cancelled_at END,
                updated_at = NOW()
          WHERE id = $1
            AND organization_id = $2
            AND branch_id = $3`,
        [
          id,
          auth.organizationId,
          auth.branchId,
          payload.assigned_trainer_staff_user_id ?? null,
          payload.title ?? null,
          payload.total_sessions ?? null,
          payload.price_paid ?? null,
          payload.valid_from ?? null,
          payload.valid_until ?? null,
          payload.status ?? null,
          payload.notes ?? null,
          payload.cancelled_reason ?? null,
        ]
      );

      if (payload.assigned_trainer_staff_user_id) {
        await assignPackageMemberToTrainer(client, {
          organizationId: auth.organizationId,
          branchId: auth.branchId,
          memberId: current.member_id,
          trainerStaffUserId: payload.assigned_trainer_staff_user_id,
          assignedByActorType: auth.actorType,
          assignedByActorId: auth.actorId,
        });

        await client.query(
          `UPDATE pt_sessions
              SET trainer_staff_user_id = $4,
                  updated_at = NOW()
            WHERE package_id = $1
              AND organization_id = $2
              AND branch_id = $3
              AND status = 'scheduled'
              AND scheduled_start >= NOW()`,
          [id, auth.organizationId, auth.branchId, payload.assigned_trainer_staff_user_id]
        );
      }

      return syncPtPackageState(client, id, auth.organizationId, auth.branchId);
    });

    if (
      payload.assigned_trainer_staff_user_id &&
      payload.assigned_trainer_staff_user_id !== previousTrainerStaffUserId
    ) {
      await createNotification(
        {
          source: "system",
          type: "pt_package_assigned",
          title: "PT package reassigned",
          body: `${data.title || "A PT package"} was assigned to you.`,
          severity: "info",
          actionUrl: `/dashboard/members/${data.member_id}`,
          metadata: {
            member_id: data.member_id,
            pt_package_id: data.id,
            trainer_staff_user_id: payload.assigned_trainer_staff_user_id,
          },
        },
        [{ organizationId: auth.organizationId, branchId: auth.branchId }]
      ).catch(() => undefined);
    }

    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth.role === "trainer") {
      return fail("Trainers cannot cancel PT packages.", 403);
    }

    const { id } = await context.params;
    const rows = await query(
      `UPDATE pt_packages
          SET status = 'cancelled',
              cancelled_at = COALESCE(cancelled_at, NOW()),
              updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
          AND branch_id = $3
      RETURNING id`,
      [id, auth.organizationId, auth.branchId]
    );
    if (!rows[0]) return fail("PT package not found.", 404);
    return ok({ id, cancelled: true });
  } catch (error) {
    return routeError(error);
  }
}
