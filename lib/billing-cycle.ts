export type BillingCycleWindow = {
  cycleStart: number;
  cycleEnd: number;
};

const SECONDS_PER_DAY = 24 * 60 * 60;
const DAYS_PER_CYCLE = 30;
const CYCLE_SECONDS = DAYS_PER_CYCLE * SECONDS_PER_DAY;

export function addCalendarMonthsEpoch(anchorEpoch: number, months: number): number {
  const start = Math.floor(anchorEpoch);
  const count = Math.max(0, Math.floor(Number(months) || 0));
  return start + count * CYCLE_SECONDS;
}

export function getMonthlyCycleWindow(params: {
  subscriptionStart: number;
  subscriptionEnd: number;
  reference: number;
}): BillingCycleWindow {
  const start = Math.floor(params.subscriptionStart);
  const end = Math.max(Math.floor(params.subscriptionEnd), start + 1);
  const reference = Math.max(Math.floor(params.reference), start);

  let cycleIndex = 0;
  let cycleStart = start;
  let cycleEnd = Math.min(addCalendarMonthsEpoch(start, cycleIndex + 1), end);

  while (cycleEnd <= reference && cycleEnd < end) {
    cycleIndex += 1;
    cycleStart = addCalendarMonthsEpoch(start, cycleIndex);
    cycleEnd = Math.min(addCalendarMonthsEpoch(start, cycleIndex + 1), end);
  }

  if (cycleEnd <= cycleStart) {
    cycleEnd = Math.min(cycleStart + 86400, end);
  }

  return { cycleStart, cycleEnd };
}
