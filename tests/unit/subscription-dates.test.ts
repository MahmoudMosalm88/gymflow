import {
  addCalendarMonths,
  calculateSubscriptionEndDateUnix,
  toSubscriptionAccessReferenceUnix,
  toUnixSeconds,
} from "@/lib/subscription-dates";

describe("lib/subscription-dates", () => {
  it("anchors access checks to UTC noon for the same calendar day", () => {
    const source = Math.floor(Date.UTC(2026, 0, 15, 3, 20, 0) / 1000);

    expect(toSubscriptionAccessReferenceUnix(source)).toBe(
      Math.floor(Date.UTC(2026, 0, 15, 12, 0, 0) / 1000)
    );
  });

  it("normalizes Date objects to UTC noon when converting to unix seconds", () => {
    const source = new Date(Date.UTC(2026, 4, 2, 6, 45, 0));

    expect(toUnixSeconds(source)).toBe(
      Math.floor(Date.UTC(2026, 4, 2, 12, 0, 0) / 1000)
    );
  });

  it("adds calendar months using the repo's 30-day billing model", () => {
    const source = new Date(Date.UTC(2026, 0, 1, 1, 0, 0));

    expect(addCalendarMonths(source, 1).toISOString()).toBe(
      "2026-01-31T12:00:00.000Z"
    );
  });

  it("defaults to one month when the supplied plan length is invalid", () => {
    const start = Math.floor(Date.UTC(2026, 0, 1, 12, 0, 0) / 1000);

    expect(calculateSubscriptionEndDateUnix(start, 0)).toBe(
      start + 30 * 24 * 60 * 60
    );
  });
});
