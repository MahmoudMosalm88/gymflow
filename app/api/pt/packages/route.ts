import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { createPtPackage, listBranchPtPackages, listMemberPtPackages, listTrainerPtPackages } from "@/lib/pt";
import { ptPackageCreateSchema } from "@/lib/validation";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const url = new URL(request.url);
    const memberId = url.searchParams.get("member_id");
    const trainerId = url.searchParams.get("trainer_id");
    const effectiveTrainerId = auth.role === "trainer" ? auth.staffUserId : trainerId;
    if (memberId && auth.role === "trainer") {
      const allowedPackages = await listTrainerPtPackages(auth.organizationId, auth.branchId, auth.staffUserId || "");
      const ownsMember = allowedPackages.some((item) => item.member_id === memberId);
      if (!ownsMember) return fail("You do not have access to this client.", 403);
    }

    const data = memberId
      ? await listMemberPtPackages(auth.organizationId, auth.branchId, memberId)
      : effectiveTrainerId
        ? await listTrainerPtPackages(auth.organizationId, auth.branchId, effectiveTrainerId || "")
        : await listBranchPtPackages(auth.organizationId, auth.branchId);
    return ok(data);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.role === "trainer") {
      return fail("Trainers cannot sell PT packages.", 403);
    }

    const payload = ptPackageCreateSchema.parse(await request.json());
    const data = await createPtPackage({
      organizationId: auth.organizationId,
      branchId: auth.branchId,
      memberId: payload.member_id,
      assignedTrainerStaffUserId: payload.assigned_trainer_staff_user_id,
      soldByActorType: auth.actorType,
      soldByActorId: auth.actorId,
      title: payload.title,
      totalSessions: payload.total_sessions,
      pricePaid: payload.price_paid,
      paymentMethod: payload.payment_method ?? null,
      validFrom: payload.valid_from,
      validUntil: payload.valid_until,
      notes: payload.notes ?? null,
    });
    await createNotification(
      {
        source: "system",
        type: "pt_package_assigned",
        title: "New PT package assigned",
        body: `${data.title || "A PT package"} was assigned to you.`,
        severity: "info",
        actionUrl: `/dashboard/members/${payload.member_id}`,
        metadata: {
          member_id: payload.member_id,
          pt_package_id: data.id,
          trainer_staff_user_id: payload.assigned_trainer_staff_user_id,
        },
      },
      [{ organizationId: auth.organizationId, branchId: auth.branchId }]
    ).catch(() => undefined);
    return ok(data, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
