import * as XLSX from "xlsx";

describe("app/api/imports/template", () => {
  it("returns the import template headers that auto-map in onboarding", async () => {
    const { GET } = await import("@/app/api/imports/template/route");

    const response = await GET();
    const bytes = new Uint8Array(await response.arrayBuffer());
    const workbook = XLSX.read(bytes, { type: "array", raw: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    });

    expect(response.headers.get("content-disposition")).toContain(
      "gymflow-import-template.xlsx"
    );
    expect(rows[0]).toEqual([
      "member_name",
      "phone",
      "gender",
      "joined_at",
      "card_code",
      "subscription_start",
      "subscription_end",
      "plan_months",
      "sessions_per_month",
      "amount_paid",
      "notes",
    ]);
  });
});
