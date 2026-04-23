import {
  evaluateEligibility,
  type MemberSnapshot,
} from "@/lib/check-in/rules";

const DAY = 24 * 60 * 60;

function atUtcNoon(year: number, month: number, day: number) {
  return Math.floor(Date.UTC(year, month - 1, day, 12, 0, 0) / 1000);
}

function buildMember(
  overrides: Partial<MemberSnapshot> = {}
): MemberSnapshot {
  const start = atUtcNoon(2026, 1, 1);
  const end = start + 90 * DAY;

  return {
    id: "member-1",
    name: "Alice",
    phone: "+201111111111",
    card_code: "CARD-1",
    gender: "female",
    subscription: {
      id: 1,
      start_date: start,
      end_date: end,
      sessions_per_month: 8,
      is_active: true,
    },
    quota: null,
    last_success_timestamp: null,
    ...overrides,
  };
}

describe("lib/check-in/rules", () => {
  it("blocks check-in during the cooldown window", () => {
    const now = atUtcNoon(2026, 1, 10);
    const member = buildMember({
      last_success_timestamp: now - 30,
    });

    expect(evaluateEligibility(member, now, 60)).toEqual({
      allowed: false,
      reason: "cooldown",
    });
  });

  it("blocks a second successful check-in on the same day", () => {
    const now = atUtcNoon(2026, 1, 10);
    const member = buildMember({
      last_success_timestamp: now - 5 * 60,
    });

    expect(evaluateEligibility(member, now, 60)).toEqual({
      allowed: false,
      reason: "already_checked_in_today",
    });
  });

  it("rejects members without an active subscription", () => {
    const now = atUtcNoon(2026, 1, 10);
    const member = buildMember({
      subscription: {
        id: 1,
        start_date: atUtcNoon(2025, 10, 1),
        end_date: atUtcNoon(2025, 12, 1),
        sessions_per_month: 8,
        is_active: true,
      },
    });

    expect(evaluateEligibility(member, now, 60)).toEqual({
      allowed: false,
      reason: "no_active_subscription",
    });
  });

  it("uses the current cycle quota when it matches the computed cycle", () => {
    const start = atUtcNoon(2026, 1, 1);
    const now = atUtcNoon(2026, 1, 10);
    const member = buildMember({
      quota: {
        sessions_used: 4,
        sessions_cap: 10,
        cycle_start: start,
        cycle_end: start + 30 * DAY,
      },
    });

    expect(evaluateEligibility(member, now, 60)).toEqual({
      allowed: true,
      reason: "ok",
      sessionsRemaining: 5,
    });
  });

  it("ignores stale quota rows from a previous cycle", () => {
    const now = atUtcNoon(2026, 2, 5);
    const member = buildMember({
      quota: {
        sessions_used: 8,
        sessions_cap: 8,
        cycle_start: atUtcNoon(2026, 1, 1),
        cycle_end: atUtcNoon(2026, 1, 31),
      },
    });

    expect(evaluateEligibility(member, now, 60)).toEqual({
      allowed: true,
      reason: "ok",
      sessionsRemaining: 7,
    });
  });

  it("blocks access when the active cycle quota is exhausted", () => {
    const start = atUtcNoon(2026, 1, 1);
    const now = atUtcNoon(2026, 1, 20);
    const member = buildMember({
      quota: {
        sessions_used: 8,
        sessions_cap: 8,
        cycle_start: start,
        cycle_end: start + 30 * DAY,
      },
    });

    expect(evaluateEligibility(member, now, 60)).toEqual({
      allowed: false,
      reason: "quota_exceeded",
    });
  });
});
