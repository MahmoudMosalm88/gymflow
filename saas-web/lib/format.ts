/**
 * Formatting utilities for dates, currency, and time calculations.
 * All timestamps in the DB are unix seconds.
 */

/** Unix timestamp (seconds) → locale date string */
export function formatDate(unix: number, locale = "en-US"): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/** Unix timestamp (seconds) → locale date+time string */
export function formatDateTime(unix: number, locale = "en-US"): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString(locale, {
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

/** Days from now until a unix timestamp */
export function daysUntil(unix: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.ceil((unix - now) / 86400);
}

/** Days ago from a unix timestamp */
export function daysAgo(unix: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor((now - unix) / 86400);
}
