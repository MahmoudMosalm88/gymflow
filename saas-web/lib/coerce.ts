function unwrapSettingValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if ("raw" in record) return unwrapSettingValue(record.raw);
  if ("value" in record) return unwrapSettingValue(record.value);
  return value;
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const unwrapped = unwrapSettingValue(value);

  if (typeof unwrapped === "number" && Number.isFinite(unwrapped)) return unwrapped;
  if (typeof unwrapped === "string") {
    const parsed = Number(unwrapped.trim());
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

export function toInteger(value: unknown, fallback = 0): number {
  return Math.trunc(toFiniteNumber(value, fallback));
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toBoolean(value: unknown, fallback = false): boolean {
  const unwrapped = unwrapSettingValue(value);

  if (typeof unwrapped === "boolean") return unwrapped;
  if (typeof unwrapped === "string") {
    const normalized = unwrapped.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    if (normalized === "1" || normalized === "yes" || normalized === "y") return true;
    if (normalized === "0" || normalized === "no" || normalized === "n") return false;
  }
  if (typeof unwrapped === "number") return unwrapped !== 0;

  return fallback;
}

export function toNullablePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = toFiniteNumber(value, Number.NaN);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function toNullableUnixSeconds(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    const unix = Math.floor(value.getTime() / 1000);
    return Number.isFinite(unix) ? unix : null;
  }

  const parsed = toFiniteNumber(value, Number.NaN);
  if (Number.isFinite(parsed)) {
    return parsed > 1_000_000_000_000 ? Math.floor(parsed / 1000) : Math.floor(parsed);
  }

  if (typeof value === "string") {
    const dateParsed = Date.parse(value.trim());
    if (Number.isFinite(dateParsed)) return Math.floor(dateParsed / 1000);
  }

  return null;
}

export function toUnixSeconds(value: unknown, fallback = 0): number {
  return toNullableUnixSeconds(value) ?? fallback;
}

export function toMillis(value: unknown, fallback = 0): number {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : fallback;
  }

  const parsed = toFiniteNumber(value, Number.NaN);
  if (Number.isFinite(parsed)) {
    return parsed > 1_000_000_000_000 ? Math.floor(parsed) : Math.floor(parsed * 1000);
  }

  if (typeof value === "string") {
    const dateParsed = Date.parse(value.trim());
    if (Number.isFinite(dateParsed)) return dateParsed;
  }

  return fallback;
}

export function toIsoString(value: unknown): string {
  const ms = toMillis(value);
  return new Date(ms || 0).toISOString();
}

export function parseJsonSafe(value: unknown): unknown {
  if (typeof value !== "string") return value ?? {};
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    return { raw: value };
  }
}
