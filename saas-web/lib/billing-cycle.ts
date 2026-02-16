export type BillingCycleWindow = {
  cycleStart: number;
  cycleEnd: number;
};

function daysInMonthUtc(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addMonthsFromAnchor(base: Date, months: number, anchorDay: number): Date {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const totalMonths = month + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(anchorDay, daysInMonthUtc(targetYear, targetMonth));

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds(),
      base.getUTCMilliseconds()
    )
  );
}

export function addCalendarMonthsEpoch(anchorEpoch: number, months: number): number {
  const base = new Date(Math.floor(anchorEpoch) * 1000);
  const anchorDay = base.getUTCDate();
  return Math.floor(addMonthsFromAnchor(base, months, anchorDay).getTime() / 1000);
}

export function getMonthlyCycleWindow(params: {
  subscriptionStart: number;
  subscriptionEnd: number;
  reference: number;
}): BillingCycleWindow {
  const start = Math.floor(params.subscriptionStart);
  const end = Math.max(Math.floor(params.subscriptionEnd), start + 1);
  const reference = Math.max(Math.floor(params.reference), start);

  const anchorDate = new Date(start * 1000);
  const anchorDay = anchorDate.getUTCDate();

  let cycleIndex = 0;
  let cycleStart = start;
  let cycleEnd = Math.min(
    Math.floor(addMonthsFromAnchor(anchorDate, cycleIndex + 1, anchorDay).getTime() / 1000),
    end
  );

  while (cycleEnd <= reference && cycleEnd < end) {
    cycleIndex += 1;
    cycleStart = Math.floor(addMonthsFromAnchor(anchorDate, cycleIndex, anchorDay).getTime() / 1000);
    cycleEnd = Math.min(
      Math.floor(addMonthsFromAnchor(anchorDate, cycleIndex + 1, anchorDay).getTime() / 1000),
      end
    );
  }

  if (cycleEnd <= cycleStart) {
    cycleEnd = Math.min(cycleStart + 86400, end);
  }

  return { cycleStart, cycleEnd };
}
