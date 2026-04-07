import { api } from "@/lib/api-client";
import { toSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";
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

type SubscriptionSnapshot = {
  id: number;
  member_id: string;
  start_date: number;
  end_date: number;
  is_active: boolean;
  sessions_per_month: number | null;
};

async function fetchLatestMemberSubscriptions(memberId: string) {
  const response = await api.get<SubscriptionSnapshot[]>(`/api/subscriptions?member_id=${encodeURIComponent(memberId)}`);
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error(response.message || "Failed to load the latest subscription state.");
  }
  return response.data;
}

export async function saveMemberWithSubscription(input: MemberInput & {
  start_date?: number | null;
  plan_months?: number | null;
  price_paid?: number | null;
  payment_method?: "cash" | "digital" | null;
  sessions_per_month?: number | null;
  from_guest_pass_id?: string | null;
}) {
  if (navigator.onLine) {
    try {
      const memberRes = await api.post<{ id: string }>("/api/members", {
        name: input.name,
        phone: input.phone,
        gender: input.gender,
        access_tier: input.access_tier,
        card_code: input.card_code || null,
        address: input.address || null,
        ...(input.from_guest_pass_id ? { from_guest_pass_id: input.from_guest_pass_id } : {}),
      });
      if (!memberRes.success || !memberRes.data?.id) {
        throw new Error(memberRes.message || "Failed to create member.");
      }

      if (input.plan_months && input.start_date) {
        const subRes = await api.post("/api/subscriptions", {
          member_id: memberRes.data.id,
          start_date: input.start_date,
          plan_months: input.plan_months,
          price_paid: input.price_paid ?? null,
          payment_method: input.payment_method ?? null,
          sessions_per_month: input.sessions_per_month ?? null,
        });
        if (!subRes.success) throw new Error(subRes.message || "Failed to create subscription.");
      }

      await refreshOfflineBundleSafe();
      return { success: true, offline: false, memberId: memberRes.data.id };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  const queued = await queueMemberCreate(input);
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
  planMonths: number;
  pricePaid: number | null;
  paymentMethod: "cash" | "digital" | null;
  sessionsPerMonth: number | null;
  expectedActiveSubscriptionId: number | null;
}) {
  if (navigator.onLine) {
    try {
      const latest = await fetchLatestMemberSubscriptions(input.memberId);
      const now = toSubscriptionAccessReferenceUnix(Math.floor(Date.now() / 1000));
      const current =
        latest.find((item) => item.is_active && item.start_date <= now && item.end_date > now) ||
        latest.find((item) => item.is_active && item.start_date > now) ||
        latest.find((item) => item.is_active) ||
        null;

      const response = await api.post("/api/subscriptions", {
        member_id: input.memberId,
        start_date: input.startDate,
        plan_months: input.planMonths,
        price_paid: input.pricePaid,
        payment_method: input.paymentMethod,
        sessions_per_month: input.sessionsPerMonth,
        expected_active_subscription_id: current?.id ?? null,
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
  planMonths: number;
  pricePaid: number | null;
  paymentMethod: "cash" | "digital" | null;
  sessionsPerMonth: number | null;
}) {
  if (navigator.onLine) {
    try {
      const latest = await fetchLatestMemberSubscriptions(input.memberId);
      const previous = latest.find((item) => item.id === input.previousSubscriptionId) || null;
      if (!previous) {
        throw new Error("The original subscription no longer exists.");
      }

      const response = await api.post("/api/subscriptions/renew", {
        member_id: input.memberId,
        previous_subscription_id: input.previousSubscriptionId,
        plan_months: input.planMonths,
        price_paid: input.pricePaid,
        payment_method: input.paymentMethod,
        sessions_per_month: input.sessionsPerMonth ?? previous.sessions_per_month ?? null,
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
      const latest = await api.get<SubscriptionSnapshot[]>("/api/subscriptions?include_history=1");
      const current = latest.success && Array.isArray(latest.data)
        ? latest.data.find((item) => item.id === input.subscriptionId) || null
        : null;
      if (!current) {
        throw new Error("The latest subscription state could not be found.");
      }

      const response = await api.post(`/api/subscriptions/${input.subscriptionId}/freeze`, {
        startDate: input.startDate,
        days: input.days,
        expected_subscription_end_date: current.end_date,
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
