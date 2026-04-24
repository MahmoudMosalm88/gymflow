import * as XLSX from "xlsx";
import {
  buildImportPreview,
  normalizePhoneForImport,
  parseSpreadsheetArtifact,
  type SpreadsheetImportArtifactPayload,
} from "@/lib/imports";

describe("lib/imports", () => {
  it("normalizes Arabic digits, spaces, and 00-prefixed phone numbers", () => {
    expect(normalizePhoneForImport(" ٠٠٢٠١٢٣٤٥٦٧٨٩٠ ")).toBe("+201234567890");
  });

  it("parses spreadsheet uploads into normalized rows", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      [" Name ", " Phone "],
      [" Alice ", " +201111111111 "],
      ["Bob", "+201222222222"],
    ]);

    XLSX.utils.book_append_sheet(workbook, sheet, "Members");

    const bytes = new Uint8Array(
      XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    );

    expect(parseSpreadsheetArtifact("members.xlsx", bytes)).toEqual({
      kind: "spreadsheet",
      fileFormat: "xlsx",
      sheetName: "Members",
      headers: ["Name", "Phone"],
      rows: [
        { Name: "Alice", Phone: "+201111111111" },
        { Name: "Bob", Phone: "+201222222222" },
      ],
      totalRows: 2,
    });
  });

  it("summarizes valid, warning, invalid, and duplicate rows", () => {
    const payload: SpreadsheetImportArtifactPayload = {
      kind: "spreadsheet",
      fileFormat: "csv",
      sheetName: "Members",
      headers: [
        "Name",
        "Phone",
        "Joined",
        "Start",
        "End",
        "Plan",
        "Paid",
      ],
      rows: [
        {
          Name: "Alice",
          Phone: "+201111111111",
          Joined: "2026-01-01",
          Start: "2026-01-01",
          End: "2026-01-31",
          Plan: "1",
          Paid: "500",
        },
        {
          Name: "Alice Duplicate",
          Phone: "+201111111111",
          Joined: "2026-01-02",
          Start: "",
          End: "",
          Plan: "",
          Paid: "",
        },
        {
          Name: "Broken Phone",
          Phone: "1234",
          Joined: "2026-01-03",
          Start: "",
          End: "",
          Plan: "",
          Paid: "",
        },
        {
          Name: "Warning Row",
          Phone: "+201333333333",
          Joined: "not-a-date",
          Start: "",
          End: "",
          Plan: "",
          Paid: "",
        },
      ],
      totalRows: 4,
    };

    const { rowResults, summary } = buildImportPreview(
      payload,
      {
        member_name: "Name",
        phone: "Phone",
        joined_at: "Joined",
        subscription_start: "Start",
        subscription_end: "End",
        plan_months: "Plan",
        amount_paid: "Paid",
      },
      { gender_default: "female" },
      { phones: new Set(), cardCodes: new Set() }
    );

    expect(summary).toMatchObject({
      totalRows: 4,
      validRows: 1,
      warningRows: 1,
      invalidRows: 1,
      duplicateRows: 1,
      estimatedMembersToCreate: 2,
      estimatedSubscriptionsToCreate: 1,
    });

    expect(rowResults[1]).toMatchObject({
      status: "duplicate",
      duplicateMatch: {
        type: "file_phone",
        value: "+201111111111",
      },
    });
  });
});
