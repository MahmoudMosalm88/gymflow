const UTC_ANCHOR_HOUR = 12;

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
  const result = toUtcAnchorFromLocalDate(sourceDate);
  const originalDay = result.getUTCDate();

  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() < originalDay) {
    result.setUTCDate(0);
  }

  return result;
}

export function toUnixSeconds(date: Date): number {
  return Math.floor(toUtcAnchorFromLocalDate(date).getTime() / 1000);
}

export function calculateSubscriptionEndDateUnix(startDateUnixSeconds: number, planMonths: number): number {
  const startDate = toUtcAnchorFromUnixSeconds(startDateUnixSeconds);
  return toUnixSeconds(addCalendarMonths(startDate, planMonths));
}
