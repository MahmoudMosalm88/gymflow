const UTC_ANCHOR_HOUR = 12;
const SECONDS_PER_DAY = 24 * 60 * 60;
const DAYS_PER_CYCLE = 30;

function toUtcAnchorFromLocalDate(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      UTC_ANCHOR_HOUR,
      0,
      0,
      0
    )
  );
}

function toUtcAnchorFromUnixSeconds(unixSeconds: number): Date {
  const source = new Date(unixSeconds * 1000);
  return new Date(
    Date.UTC(
      source.getUTCFullYear(),
      source.getUTCMonth(),
      source.getUTCDate(),
      UTC_ANCHOR_HOUR,
      0,
      0,
      0
    )
  );
}

export function addCalendarMonths(sourceDate: Date, months: number): Date {
  const normalizedMonths = Math.max(0, Math.floor(Number(months) || 0));
  const base = toUtcAnchorFromLocalDate(sourceDate);
  return new Date(base.getTime() + normalizedMonths * DAYS_PER_CYCLE * SECONDS_PER_DAY * 1000);
}

export function toUnixSeconds(date: Date): number {
  return Math.floor(toUtcAnchorFromLocalDate(date).getTime() / 1000);
}

export function calculateSubscriptionEndDateUnix(startDateUnixSeconds: number, planMonths: number): number {
  const startDate = toUtcAnchorFromUnixSeconds(startDateUnixSeconds);
  const months = Math.max(1, Math.floor(Number(planMonths) || 1));
  return Math.floor(startDate.getTime() / 1000) + months * DAYS_PER_CYCLE * SECONDS_PER_DAY;
}
