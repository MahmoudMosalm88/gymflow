import { describe, expect, it } from "vitest";

import { getMemberCheckInCode } from "@/lib/check-in-code";

describe("getMemberCheckInCode", () => {
  it("uses the trimmed physical card code when one exists", () => {
    expect(getMemberCheckInCode({ id: "member-1", card_code: " CARD-123 " })).toBe("CARD-123");
  });

  it("falls back to the member id for digital-only clients", () => {
    expect(getMemberCheckInCode({ id: "member-1", card_code: null })).toBe("member-1");
    expect(getMemberCheckInCode({ id: "member-2", card_code: "" })).toBe("member-2");
    expect(getMemberCheckInCode({ id: "member-3", card_code: "   " })).toBe("member-3");
  });
});
