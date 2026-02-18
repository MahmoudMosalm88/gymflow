/**
 * Pure check-in eligibility rules — shared between server route and offline engine.
 * No DB calls, no network — just logic.
 */

import { getMonthlyCycleWindow } from "@/lib/billing-cycle";

export type MemberSnapshot = {
  id: string;
  name: string;
  phone: string;
  card_code: string | null;
  gender: "male" | "female";
  subscription: {
    id: number;
    start_date: number;
    end_date: number;
    sessions_per_month: number | null;
    is_active: boolean;
  } | null;
  quota: {
    sessions_used: number;
    sessions_cap: number;
    cycle_start: number;
    cycle_end: number;
  } | null;
  last_success_timestamp: number | null;
};

export type EligibilityResult = {
  allowed: boolean;
  reason: string;
  sessionsRemaining?: number;
};

export function getDefaultCap(gender: "male" | "female"): number {
  return gender === "male" ? 26 : 30;
}

export function isCooldownActive(
  lastSuccessTimestamp: number | null,
  now: number,
  cooldownSeconds: number
): boolean {
  if (!lastSuccessTimestamp) return false;
  return now - lastSuccessTimestamp < cooldownSeconds;
}

export function isAlreadyCheckedInToday(
  lastSuccessTimestamp: number | null,
  now: number
): boolean {
  if (!lastSuccessTimestamp) return false;
  const startOfDay = now - (now % 86400);
  return lastSuccessTimestamp >= startOfDay;
}

export function isSubscriptionActive(
  sub: { start_date: number; end_date: number; is_active: boolean } | null,
  now: number
): boolean {
  if (!sub) return false;
  return sub.is_active && sub.start_date <= now && sub.end_date > now;
}

export function isQuotaExceeded(sessionsUsed: number, sessionsCap: number): boolean {
  return sessionsUsed >= sessionsCap;
}

/**
 * Evaluate whether a member can check in right now.
 * Returns { allowed, reason, sessionsRemaining }.
 */
export function evaluateEligibility(
  member: MemberSnapshot,
  now: number,
  cooldownSeconds: number
): EligibilityResult {
  // Cooldown check
  if (isCooldownActive(member.last_success_timestamp, now, cooldownSeconds)) {
    return { allowed: false, reason: "cooldown" };
  }

  // Already checked in today
  if (isAlreadyCheckedInToday(member.last_success_timestamp, now)) {
    return { allowed: false, reason: "already_checked_in_today" };
  }

  // Active subscription
  if (!isSubscriptionActive(member.subscription, now)) {
    return { allowed: false, reason: "no_active_subscription" };
  }

  const sub = member.subscription!;
  const cap = sub.sessions_per_month || getDefaultCap(member.gender);

  // Calculate current cycle quota
  let sessionsUsed = 0;
  let sessionsCap = cap;

  if (member.quota) {
    const { cycleStart } = getMonthlyCycleWindow({
      subscriptionStart: sub.start_date,
      subscriptionEnd: sub.end_date,
      reference: now
    });
    // Only use cached quota if it matches the current cycle
    if (member.quota.cycle_start === cycleStart) {
      sessionsUsed = member.quota.sessions_used;
      sessionsCap = member.quota.sessions_cap;
    }
  }

  if (isQuotaExceeded(sessionsUsed, sessionsCap)) {
    return { allowed: false, reason: "quota_exceeded" };
  }

  return {
    allowed: true,
    reason: "ok",
    sessionsRemaining: sessionsCap - sessionsUsed - 1
  };
}
