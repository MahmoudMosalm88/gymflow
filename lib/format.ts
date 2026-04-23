/**
 * Formatting utilities for dates, currency, and time calculations.
 * Accepts Unix seconds, Unix milliseconds, ISO strings, or Date objects.
 */

type TimestampInput = number | string | Date | null | undefined;

function parseTimestamp(value: TimestampInput): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const fromNumber = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return null;
    const ms = n >= 1_000_000_000_000 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  if (typeof value === "number") {
    return fromNumber(value);
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const maybeNumber = Number(trimmed);
  if (Number.isFinite(maybeNumber)) {
    return fromNumber(maybeNumber);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Timestamp → locale date string */
export function formatDate(value: TimestampInput, locale = "en-US"): string {
  const date = parseTimestamp(value);
  if (!date) return "—";

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/** Timestamp → locale date+time string */
export function formatDateTime(value: TimestampInput, locale = "en-US"): string {
  const date = parseTimestamp(value);
  if (!date) return "—";

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Format number as currency */
export function formatCurrency(amount: number, currency = "EGP"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/** Compact currency — e.g. EGP 12.4K, EGP 1.2M — for tight spaces like stat cards */
export function formatCurrencyCompact(amount: number, currency = "EGP"): string {
  if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${currency} ${(amount / 1_000).toFixed(1)}K`;
  return `${currency} ${amount}`;
}

/** Days from now until a unix timestamp */
export function daysUntil(value: TimestampInput): number {
  const date = parseTimestamp(value);
  if (!date) return 0;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

/** Days ago from a unix timestamp */
export function daysAgo(value: TimestampInput): number {
  const date = parseTimestamp(value);
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}
