import * as XLSX from "xlsx";

export type SpreadsheetFileFormat = "csv" | "xlsx";

export type SpreadsheetImportArtifactPayload = {
  kind: "spreadsheet";
  fileFormat: SpreadsheetFileFormat;
  sheetName: string | null;
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
};

export type ImportMapping = {
  member_name: string;
  phone: string;
  gender?: string;
  joined_at?: string;
  date_of_birth?: string;
  notes?: string;
  card_code?: string;
  subscription_start?: string;
  subscription_end?: string;
  plan_months?: string;
  sessions_per_month?: string;
  amount_paid?: string;
};

export type ImportPreviewDefaults = {
  gender_default?: "male" | "female";
  duplicate_mode?: "skip_duplicates" | "new_only";
};

export type ImportPreviewIssue = {
  severity: "warning" | "error" | "duplicate";
  field: string;
  message: string;
  code: string;
};

export type ImportPreviewRowResult = {
  rowNumber: number;
  rawRow: Record<string, string>;
  normalizedRow: Record<string, unknown> | null;
  status: "valid" | "warning" | "invalid" | "duplicate";
  issues: ImportPreviewIssue[];
  duplicateMatch?: {
    type: "existing_phone" | "existing_card_code" | "file_phone" | "file_card_code";
    value: string;
  };
};

export type ImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  duplicateRows: number;
  estimatedMembersToCreate: number;
  estimatedSubscriptionsToCreate: number;
  sampleIssues: ImportPreviewRowResult[];
};

export type ExistingImportRefs = {
  phones: Set<string>;
  cardCodes: Set<string>;
};

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePhoneForImport(value: string) {
  let normalized = normalizeDigits(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()\-]/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  return normalized;
}

function normalizeCardCode(value: string) {
  return normalizeWhitespace(normalizeDigits(value));
}

function normalizeGender(value: string) {
  const normalized = normalizeWhitespace(normalizeDigits(value)).toLowerCase();
  if (!normalized) return null;
  if (["male", "m", "man", "ذكر", "ذكرى", "ولد", "رجل", "boy"].includes(normalized)) return "male";
  if (["female", "f", "woman", "أنثى", "انثى", "بنت", "سيدة", "girl"].includes(normalized)) return "female";
  return null;
}

function parseDateValue(value: string) {
  const normalized = normalizeWhitespace(normalizeDigits(value));
  if (!normalized) return null;

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  const slashMatch = normalized.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})$/);
  if (!slashMatch) return null;

  const [, a, b, c] = slashMatch;
  const parts = [a, b, c].map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;

  const [p1, p2, p3] = parts;
  const candidates = [
    new Date(Date.UTC(p1 > 31 ? p1 : p3, p1 > 31 ? p2 - 1 : p2 - 1, p1 > 31 ? p3 : p1)),
    new Date(Date.UTC(p3, p2 - 1, p1))
  ];

  for (const candidate of candidates) {
    if (!Number.isNaN(candidate.getTime())) return candidate.toISOString();
  }
  return null;
}

function parsePositiveInteger(value: string) {
  const normalized = normalizeDigits(value).replace(/[^\d]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseMoneyValue(value: string) {
  const normalized = normalizeDigits(value).replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function inferFileFormat(fileName: string): SpreadsheetFileFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx")) return "xlsx";
  throw new Error("Unsupported file format. Use CSV or XLSX.");
}

export function parseSpreadsheetArtifact(fileName: string, bytes: Uint8Array): SpreadsheetImportArtifactPayload {
  const fileFormat = inferFileFormat(fileName);
  const workbook = XLSX.read(bytes, { type: "array", raw: false, dense: true });
  const sheetName = workbook.SheetNames[0] || null;
  if (!sheetName) throw new Error("The file does not contain any readable sheet.");

  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    raw: false,
    defval: ""
  });

  const rows = matrix
    .map((row) => row.map((cell) => normalizeWhitespace(String(cell ?? ""))))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (rows.length === 0) throw new Error("The file does not contain any data rows.");

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((header, index) => header || `column_${index + 1}`);
  const bodyRows = rows.slice(1).map((cells) => {
    const output: Record<string, string> = {};
    headers.forEach((header, index) => {
      output[header] = normalizeWhitespace(String(cells[index] ?? ""));
    });
    return output;
  });

  return {
    kind: "spreadsheet",
    fileFormat,
    sheetName,
    headers,
    rows: bodyRows,
    totalRows: bodyRows.length
  };
}

function hasSubscriptionSignals(row: Record<string, unknown>) {
  return Boolean(
    row.subscription_start ||
      row.subscription_end ||
      row.plan_months ||
      row.sessions_per_month ||
      row.amount_paid
  );
}

export function buildImportPreview(
  payload: SpreadsheetImportArtifactPayload,
  mapping: ImportMapping,
  defaults: ImportPreviewDefaults,
  existingRefs: ExistingImportRefs
): { rowResults: ImportPreviewRowResult[]; summary: ImportPreviewSummary } {
  const seenPhones = new Set<string>();
  const seenCardCodes = new Set<string>();
  const rowResults: ImportPreviewRowResult[] = [];

  for (const [index, rawRow] of payload.rows.entries()) {
    const rowNumber = index + 2;
    const issues: ImportPreviewIssue[] = [];

    const name = normalizeWhitespace(rawRow[mapping.member_name] || "");
    const phoneRaw = rawRow[mapping.phone] || "";
    const phone = normalizePhoneForImport(phoneRaw);
    const genderRaw = mapping.gender ? rawRow[mapping.gender] || "" : "";
    const gender = normalizeGender(genderRaw) || defaults.gender_default || null;
    const joinedAt = mapping.joined_at ? parseDateValue(rawRow[mapping.joined_at] || "") : null;
    const dateOfBirth = mapping.date_of_birth ? parseDateValue(rawRow[mapping.date_of_birth] || "") : null;
    const notes = mapping.notes ? normalizeWhitespace(rawRow[mapping.notes] || "") : "";
    const cardCode = mapping.card_code ? normalizeCardCode(rawRow[mapping.card_code] || "") : "";

    const subscriptionStart = mapping.subscription_start ? parseDateValue(rawRow[mapping.subscription_start] || "") : null;
    const subscriptionEnd = mapping.subscription_end ? parseDateValue(rawRow[mapping.subscription_end] || "") : null;
    const planMonths = mapping.plan_months ? parsePositiveInteger(rawRow[mapping.plan_months] || "") : null;
    const sessionsPerMonth = mapping.sessions_per_month ? parsePositiveInteger(rawRow[mapping.sessions_per_month] || "") : null;
    const amountPaid = mapping.amount_paid ? parseMoneyValue(rawRow[mapping.amount_paid] || "") : null;

    if (!name) {
      issues.push({ severity: "error", field: "member_name", message: "Member name is required.", code: "missing_name" });
    }

    if (!phone) {
      issues.push({ severity: "error", field: "phone", message: "Phone number is required.", code: "missing_phone" });
    } else if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      issues.push({
        severity: "error",
        field: "phone",
        message: "Phone number must be in E.164 format like +15551234567.",
        code: "invalid_phone"
      });
    }

    if (!gender) {
      issues.push({ severity: "error", field: "gender", message: "Gender is required for import.", code: "missing_gender" });
    }

    if (mapping.joined_at && rawRow[mapping.joined_at] && !joinedAt) {
      issues.push({ severity: "warning", field: "joined_at", message: "Join date could not be parsed and will be skipped.", code: "invalid_joined_at" });
    }

    if (mapping.date_of_birth && rawRow[mapping.date_of_birth] && !dateOfBirth) {
      issues.push({ severity: "warning", field: "date_of_birth", message: "Date of birth could not be parsed and will be skipped.", code: "invalid_date_of_birth" });
    }

    const subscriptionSignals = hasSubscriptionSignals({
      subscription_start: mapping.subscription_start ? rawRow[mapping.subscription_start] : null,
      subscription_end: mapping.subscription_end ? rawRow[mapping.subscription_end] : null,
      plan_months: mapping.plan_months ? rawRow[mapping.plan_months] : null,
      sessions_per_month: mapping.sessions_per_month ? rawRow[mapping.sessions_per_month] : null,
      amount_paid: mapping.amount_paid ? rawRow[mapping.amount_paid] : null
    });

    let normalizedSubscription: Record<string, unknown> | null = null;
    if (subscriptionSignals) {
      if (!subscriptionStart || !subscriptionEnd || !planMonths) {
        issues.push({
          severity: "warning",
          field: "subscription",
          message: "Subscription data is incomplete and will be skipped for this row.",
          code: "incomplete_subscription"
        });
      } else if (new Date(subscriptionEnd).getTime() <= new Date(subscriptionStart).getTime()) {
        issues.push({
          severity: "warning",
          field: "subscription_end",
          message: "Subscription end date must be after the start date. Subscription will be skipped.",
          code: "invalid_subscription_range"
        });
      } else {
        normalizedSubscription = {
          start_date: subscriptionStart,
          end_date: subscriptionEnd,
          plan_months: planMonths,
          sessions_per_month: sessionsPerMonth,
          amount_paid: amountPaid
        };
      }
    }

    if (mapping.amount_paid && rawRow[mapping.amount_paid] && amountPaid === null) {
      issues.push({
        severity: "warning",
        field: "amount_paid",
        message: "Amount paid could not be parsed and will be skipped.",
        code: "invalid_amount_paid"
      });
    }

    if (phone) {
      if (existingRefs.phones.has(phone)) {
        issues.push({
          severity: "duplicate",
          field: "phone",
          message: "A member with this phone number already exists in this branch.",
          code: "duplicate_existing_phone"
        });
      } else if (seenPhones.has(phone)) {
        issues.push({
          severity: "duplicate",
          field: "phone",
          message: "This phone number appears more than once in the file.",
          code: "duplicate_file_phone"
        });
      }
    }

    if (cardCode) {
      if (existingRefs.cardCodes.has(cardCode)) {
        issues.push({
          severity: "duplicate",
          field: "card_code",
          message: "A member with this card code already exists in this branch.",
          code: "duplicate_existing_card_code"
        });
      } else if (seenCardCodes.has(cardCode)) {
        issues.push({
          severity: "duplicate",
          field: "card_code",
          message: "This card code appears more than once in the file.",
          code: "duplicate_file_card_code"
        });
      }
    }

    if (phone) seenPhones.add(phone);
    if (cardCode) seenCardCodes.add(cardCode);

    const normalizedRow = issues.some((issue) => issue.severity === "error")
      ? null
      : {
          member: {
            name,
            phone,
            gender,
            joined_at: joinedAt,
            date_of_birth: dateOfBirth,
            notes: notes || null,
            card_code: cardCode || null
          },
          subscription: normalizedSubscription
        };

    const duplicateIssue = issues.find((issue) => issue.severity === "duplicate");
    const status: ImportPreviewRowResult["status"] = issues.some((issue) => issue.severity === "error")
      ? "invalid"
      : duplicateIssue
        ? "duplicate"
        : issues.some((issue) => issue.severity === "warning")
          ? "warning"
          : "valid";

    rowResults.push({
      rowNumber,
      rawRow,
      normalizedRow,
      status,
      issues,
      duplicateMatch: duplicateIssue
        ? {
            type:
              duplicateIssue.code === "duplicate_existing_phone"
                ? "existing_phone"
                : duplicateIssue.code === "duplicate_existing_card_code"
                  ? "existing_card_code"
                  : duplicateIssue.code === "duplicate_file_phone"
                    ? "file_phone"
                    : "file_card_code",
            value:
              duplicateIssue.field === "phone"
                ? phone
                : cardCode
          }
        : undefined
    });
  }

  const summary: ImportPreviewSummary = {
    totalRows: rowResults.length,
    validRows: rowResults.filter((row) => row.status === "valid").length,
    warningRows: rowResults.filter((row) => row.status === "warning").length,
    invalidRows: rowResults.filter((row) => row.status === "invalid").length,
    duplicateRows: rowResults.filter((row) => row.status === "duplicate").length,
    estimatedMembersToCreate: rowResults.filter((row) => row.status === "valid" || row.status === "warning").length,
    estimatedSubscriptionsToCreate: rowResults.filter(
      (row) =>
        (row.status === "valid" || row.status === "warning") &&
        Boolean((row.normalizedRow as { subscription?: unknown } | null)?.subscription)
    ).length,
    sampleIssues: rowResults.filter((row) => row.status !== "valid").slice(0, 20)
  };

  return { rowResults, summary };
}
