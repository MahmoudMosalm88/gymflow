import {
  addCalendarMonthsEpoch,
  getMonthlyCycleWindow,
} from "@/lib/billing-cycle";

const DAY = 24 * 60 * 60;

describe("lib/billing-cycle", () => {
  it("adds 30-day cycles in epoch seconds", () => {
    expect(addCalendarMonthsEpoch(1_700_000_000, 2)).toBe(
      1_700_000_000 + 60 * DAY
    );
  });

  it("keeps the first cycle when the reference is inside it", () => {
    expect(
      getMonthlyCycleWindow({
        subscriptionStart: 1_700_000_000,
        subscriptionEnd: 1_700_000_000 + 90 * DAY,
        reference: 1_700_000_000 + 10 * DAY,
      })
    ).toEqual({
      cycleStart: 1_700_000_000,
      cycleEnd: 1_700_000_000 + 30 * DAY,
    });
  });

  it("advances to the matching cycle when the reference moves forward", () => {
    expect(
      getMonthlyCycleWindow({
        subscriptionStart: 1_700_000_000,
        subscriptionEnd: 1_700_000_000 + 90 * DAY,
        reference: 1_700_000_000 + 61 * DAY,
      })
    ).toEqual({
      cycleStart: 1_700_000_000 + 60 * DAY,
      cycleEnd: 1_700_000_000 + 90 * DAY,
    });
  });

  it("clamps the cycle end to the subscription end", () => {
    expect(
      getMonthlyCycleWindow({
        subscriptionStart: 1_700_000_000,
        subscriptionEnd: 1_700_000_000 + 45 * DAY,
        reference: 1_700_000_000 + 40 * DAY,
      })
    ).toEqual({
      cycleStart: 1_700_000_000 + 30 * DAY,
      cycleEnd: 1_700_000_000 + 45 * DAY,
    });
  });
});
