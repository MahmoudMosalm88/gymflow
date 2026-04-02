import { api } from "@/lib/api-client";
import { offlineCheckIn } from "@/lib/offline/check-in-engine";

export type CheckInMethod = "scan" | "manual" | "camera";

export type ClientCheckInResult = {
  success: boolean;
  memberName?: string;
  sessionsRemaining?: number;
  reason?: string;
  memberPhoto?: string;
  offline?: boolean;
};

type ApiCheckInResponse = {
  success: boolean;
  member?: {
    name: string;
    photo_path?: string | null;
  };
  sessionsRemaining?: number;
  reason?: string;
};

export async function submitCheckIn(
  scannedValue: string,
  method: CheckInMethod,
  reasonLabels: Record<string, string>,
  fallbackError: string,
  offlineSuffix: string
): Promise<ClientCheckInResult> {
  const value = scannedValue.trim();

  try {
    const res = await api.post<ApiCheckInResponse>("/api/attendance/check", {
      scannedValue: value,
      method
    });

    const payload = res.data ?? { success: false, reason: fallbackError };
    return {
      success: payload.success,
      memberName: payload.member?.name,
      memberPhoto: payload.member?.photo_path ?? undefined,
      sessionsRemaining: payload.sessionsRemaining,
      reason: payload.success
        ? payload.reason
        : (payload.reason ? (reasonLabels[payload.reason] ?? payload.reason) : fallbackError)
    };
  } catch {
    try {
      const offlineResult = await offlineCheckIn(value, method);
      return {
        success: offlineResult.allowed,
        memberName: offlineResult.member?.name,
        memberPhoto: offlineResult.member?.photoPath ?? undefined,
        sessionsRemaining: offlineResult.sessionsRemaining,
        reason: offlineResult.allowed
          ? `${offlineResult.member?.name} (${offlineSuffix})`
          : (reasonLabels[offlineResult.reason] ?? offlineResult.reason),
        offline: true
      };
    } catch {
      return { success: false, reason: fallbackError };
    }
  }
}
