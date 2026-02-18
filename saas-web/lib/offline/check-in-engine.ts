/**
 * Offline check-in engine.
 * Runs check-in eligibility locally using IndexedDB data + shared rules.
 */

import { getOfflineDb, type OfflineMember } from "./db";
import { getDeviceId } from "./device-id";
import { getServerTimeOffset } from "./offline-bundle";
import { enqueue } from "./sync-queue";
import { evaluateEligibility, type EligibilityResult } from "@/lib/check-in/rules";

export type OfflineCheckInResult = EligibilityResult & {
  member?: { id: string; name: string; gender: string };
  offline: true;
  operationId?: string;
};

async function findMember(scannedValue: string): Promise<OfflineMember | null> {
  const db = await getOfflineDb();

  // Try direct ID lookup
  const byId = await db.get("members", scannedValue);
  if (byId) return byId;

  // Try phone index
  const byPhone = await db.getFromIndex("members", "by_phone", scannedValue);
  if (byPhone) return byPhone;

  // Try card_code index
  const byCard = await db.getFromIndex("members", "by_card_code", scannedValue);
  if (byCard) return byCard;

  return null;
}

async function getCooldownSeconds(): Promise<number> {
  const db = await getOfflineDb();
  const setting = await db.get("settings", "scan_cooldown_seconds");
  if (setting && typeof setting.value === "number") return setting.value;
  return 30; // default
}

export async function offlineCheckIn(
  scannedValue: string,
  method: "scan" | "manual" = "scan"
): Promise<OfflineCheckInResult> {
  const member = await findMember(scannedValue.trim());

  if (!member) {
    return { allowed: false, reason: "unknown_member", offline: true };
  }

  const offset = await getServerTimeOffset();
  const now = Math.floor(Date.now() / 1000) + offset;
  const cooldown = await getCooldownSeconds();

  const result = evaluateEligibility(member, now, cooldown);

  if (!result.allowed) {
    return {
      ...result,
      member: { id: member.id, name: member.name, gender: member.gender },
      offline: true
    };
  }

  // Success — generate operation and enqueue for later sync
  const operationId = crypto.randomUUID();
  const deviceId = getDeviceId();
  const branchId = localStorage.getItem("branch_id") || "";

  await enqueue({
    operationId,
    branchId,
    scannedValue: scannedValue.trim(),
    method,
    offlineTimestamp: now,
    deviceId,
    memberId: member.id,
    memberName: member.name,
    status: "pending",
    retries: 0,
    createdAt: now,
    updatedAt: now
  });

  // Update local quota so next scan reflects the used session
  if (member.quota) {
    const db = await getOfflineDb();
    member.quota.sessions_used += 1;
    member.last_success_timestamp = now;
    await db.put("members", member);
  }

  return {
    ...result,
    member: { id: member.id, name: member.name, gender: member.gender },
    offline: true,
    operationId
  };
}
