const CAIRO_TIME_ZONE = "Africa/Cairo";

function getTimeZoneOffsetSeconds(timeZone: string, referenceDate: Date) {
  const offsetValue = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(referenceDate)
    .find((part) => part.type === "timeZoneName")
    ?.value;

  if (!offsetValue || offsetValue === "GMT") return 0;

  const match = offsetValue.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 3600 + minutes * 60);
}

export function getZonedDayStartUnix(timeZone: string, referenceDate: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const utcMidnightMs = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetSeconds = getTimeZoneOffsetSeconds(timeZone, new Date(utcMidnightMs));
  return Math.floor(utcMidnightMs / 1000) - offsetSeconds;
}

export function getCairoDayStartUnix(referenceDate = new Date()) {
  return getZonedDayStartUnix(CAIRO_TIME_ZONE, referenceDate);
}

export function getCairoHour(referenceDate = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: CAIRO_TIME_ZONE,
      hour: "numeric",
      hour12: false,
    }).format(referenceDate),
  );
}
