import { api } from "@/lib/api-client";
import { fetchAndStoreBundle } from "./offline-bundle";
import { queueMemberCreate, queueMemberUpdate, queueSubscriptionCreate, queueSubscriptionFreeze, queueSubscriptionRenew } from "./operations";

type MemberInput = {
  name: string;
  phone: string;
  gender?: "male" | "female";
  access_tier: string;
  card_code?: string | null;
  address?: string | null;
};

function isNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError")
  );
}

async function refreshOfflineBundleSafe() {
  await fetchAndStoreBundle().catch(() => false);
}

export async function saveMemberWithSubscription(input: MemberInput & {
  start_date?: number | null;
  plan_months?: number | null;
  price_paid?: number | null;
  payment_method?: "cash" | "digital" | null;
  sessions_per_month?: number | null;
  from_guest_pass_id?: string | null;
}) {
  const memberId = crypto.randomUUID();

  if (navigator.onLine) {
    try {
      const memberRes = await api.post<{ id: string }>("/api/members", {
        id: memberId,
        name: input.name,
        phone: input.phone,
        gender: input.gender,
        access_tier: input.access_tier,
        card_code: input.card_code || null,
        address: input.address || null,
        initial_subscription: input.plan_months && input.start_date
          ? {
              start_date: input.start_date,
              plan_months: input.plan_months,
              price_paid: input.price_paid ?? null,
              payment_method: input.payment_method ?? null,
              sessions_per_month: input.sessions_per_month ?? null,
            }
          : null,
        ...(input.from_guest_pass_id ? { from_guest_pass_id: input.from_guest_pass_id } : {}),
      });
      if (!memberRes.success || !memberRes.data?.id) {
        throw new Error(memberRes.message || "Failed to create member.");
      }

      await refreshOfflineBundleSafe();
      return { success: true, offline: false, memberId: memberRes.data.id };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  const queued = await queueMemberCreate({ ...input, memberId });
  return { success: true, offline: true, memberId: queued.memberId };
}

export async function saveMemberUpdate(input: {
  memberId: string;
  patch: Partial<MemberInput> & { photo_path?: string | null };
  baseUpdatedAt: number | null;
}) {
  if (navigator.onLine) {
    try {
      const response = await api.patch(`/api/members/${input.memberId}`, {
        ...input.patch,
        base_updated_at: input.baseUpdatedAt,
      });
      if (!response.success) throw new Error(response.message || "Failed to update member.");
      await refreshOfflineBundleSafe();
      return { success: true, offline: false };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  await queueMemberUpdate({
    memberId: input.memberId,
    patch: input.patch,
    baseUpdatedAt: input.baseUpdatedAt,
  });
  return { success: true, offline: true };
}

export async function saveMemberPhoto(input: {
  memberId: string;
  file: File;
  previewUrl: string;
  baseUpdatedAt: number | null;
}) {
  if (navigator.onLine) {
    try {
      const body = new FormData();
      body.append("photo", input.file);
      if (input.baseUpdatedAt !== null) {
        body.append("base_updated_at", String(input.baseUpdatedAt));
      }
      const response = await api.postFormData<{ photo_path?: string | null }>(`/api/members/${input.memberId}/photo`, body);
      if (!response.success) throw new Error(response.message || "Failed to upload member photo.");
      await refreshOfflineBundleSafe();
      return { success: true, offline: false, photoPath: response.data?.photo_path || input.previewUrl };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  const dataUrl = await input.file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `data:${input.file.type};base64,${btoa(binary)}`;
  });

  await queueMemberUpdate({
    memberId: input.memberId,
    patch: { photo_path: input.previewUrl },
    baseUpdatedAt: input.baseUpdatedAt,
    photoDataUrl: dataUrl,
  });

  return { success: true, offline: true, photoPath: input.previewUrl };
}

export async function saveSubscriptionCreate(input: {
  memberId: string;
  memberName: string | null;
  startDate: number;
  planTemplateId?: string | null;
  planMonths: number;
  pricePaid: number | null;
  paymentMethod: "cash" | "digital" | null;
  sessionsPerMonth: number | null;
  expectedActiveSubscriptionId: number | null;
}) {
  if (navigator.onLine) {
    try {
      const response = await api.post("/api/subscriptions", {
        member_id: input.memberId,
        start_date: input.startDate,
        plan_template_id: input.planTemplateId ?? null,
        plan_months: input.planMonths,
        price_paid: input.pricePaid,
        payment_method: input.paymentMethod,
        sessions_per_month: input.sessionsPerMonth,
      });
      if (!response.success) throw new Error(response.message || "Failed to create subscription.");
      await refreshOfflineBundleSafe();
      return { success: true, offline: false };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  await queueSubscriptionCreate(input);
  return { success: true, offline: true };
}

export async function saveSubscriptionRenew(input: {
  memberId: string;
  memberName: string | null;
  previousSubscriptionId: number;
  expectedPreviousEndDate: number;
  expectedPreviousIsActive: boolean;
  planTemplateId?: string | null;
  planMonths: number;
  pricePaid: number | null;
  paymentMethod: "cash" | "digital" | null;
  sessionsPerMonth: number | null;
}) {
  if (navigator.onLine) {
    try {
      // Let the server validate the source subscription directly. Client-side list
      // lookups can be stale and falsely block valid renewals on the web app.
      const response = await api.post("/api/subscriptions/renew", {
        member_id: input.memberId,
        previous_subscription_id: input.previousSubscriptionId,
        plan_template_id: input.planTemplateId ?? null,
        plan_months: input.planMonths,
        price_paid: input.pricePaid,
        payment_method: input.paymentMethod,
        sessions_per_month: input.sessionsPerMonth,
      });
      if (!response.success) throw new Error(response.message || "Failed to renew subscription.");
      await refreshOfflineBundleSafe();
      return { success: true, offline: false };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  await queueSubscriptionRenew(input);
  return { success: true, offline: true };
}

export async function saveSubscriptionFreeze(input: {
  subscriptionId: number;
  startDate: number;
  days: number;
  expectedSubscriptionEndDate: number;
}) {
  if (navigator.onLine) {
    try {
      const response = await api.post(`/api/subscriptions/${input.subscriptionId}/freeze`, {
        startDate: input.startDate,
        days: input.days,
        expected_subscription_end_date: input.expectedSubscriptionEndDate,
      });
      if (!response.success) throw new Error(response.message || "Failed to freeze subscription.");
      await refreshOfflineBundleSafe();
      return { success: true, offline: false };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  await queueSubscriptionFreeze(input);
  return { success: true, offline: true };
}
