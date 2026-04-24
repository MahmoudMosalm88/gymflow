import {
  classifyAutomationSource,
  getAutomationSettingKey,
  getBehaviorTemplateKey,
  normalizeSystemLanguage,
  parseManualStopRecords,
  parseReminderDays,
  renderWhatsappTemplate,
  upsertManualStopRecord,
  isManualStopActive,
} from "@/lib/whatsapp-automation";

describe("lib/whatsapp-automation", () => {
  it("normalizes supported system languages and falls back safely", () => {
    expect(normalizeSystemLanguage("AR")).toBe("ar");
    expect(normalizeSystemLanguage("unknown", "ar")).toBe("ar");
  });

  it("parses reminder days, removes duplicates, and sorts descending", () => {
    expect(parseReminderDays("1, 7, 3, 7, 99, nope")).toEqual([7, 3, 1]);
  });

  it("renders templates by replacing known placeholders and blanking missing values", () => {
    expect(
      renderWhatsappTemplate("Hi {name}, {daysLeft} days left for {missing}.", {
        name: "Alice",
        daysLeft: 3,
      })
    ).toBe("Hi Alice, 3 days left for .");
  });

  it("parses manual stop records from stored JSON and ignores invalid rows", () => {
    expect(
      parseManualStopRecords(
        JSON.stringify([
          {
            memberId: "member-1",
            automationId: "post_expiry",
            scope: "branch-a",
            stoppedAt: "2026-01-01T00:00:00.000Z",
            stoppedBy: "owner-1",
          },
          { bad: true },
        ])
      )
    ).toEqual([
      {
        memberId: "member-1",
        automationId: "post_expiry",
        scope: "branch-a",
        stoppedAt: "2026-01-01T00:00:00.000Z",
        stoppedBy: "owner-1",
        reason: null,
      },
    ]);
  });

  it("upserts manual stop records by member, automation, and normalized scope", () => {
    const records = upsertManualStopRecord(
      [
        {
          memberId: "member-1",
          automationId: "post_expiry",
          scope: " branch-a ",
          stoppedAt: "2026-01-01T00:00:00.000Z",
          stoppedBy: null,
          reason: null,
        },
      ],
      {
        memberId: "member-1",
        automationId: "post_expiry",
        scope: "branch-a",
        stoppedAt: "2026-01-02T00:00:00.000Z",
        stoppedBy: "owner-2",
        reason: "manual",
      }
    );

    expect(records).toEqual([
      {
        memberId: "member-1",
        automationId: "post_expiry",
        scope: "branch-a",
        stoppedAt: "2026-01-02T00:00:00.000Z",
        stoppedBy: "owner-2",
        reason: "manual",
      },
    ]);

    expect(
      isManualStopActive(records, {
        memberId: "member-1",
        automationId: "post_expiry",
        scope: " branch-a ",
      })
    ).toBe(true);
  });

  it("maps automation metadata consistently", () => {
    expect(classifyAutomationSource("broadcast")).toBe("broadcast");
    expect(classifyAutomationSource("manual", "streak")).toBe("streaks");
    expect(getAutomationSettingKey("post_expiry")).toBe(
      "whatsapp_post_expiry_enabled"
    );
    expect(getBehaviorTemplateKey("habit_break", "ar")).toBe(
      "whatsapp_template_habit_break_ar"
    );
  });
});
