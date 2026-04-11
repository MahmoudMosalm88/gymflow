'use client';

type Slot = {
  weekday: number;
  start_minute: number;
  end_minute: number;
  is_active: boolean;
};

type Props = {
  slots: Slot[];
  lang: string;
};

const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function formatMinute(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h >= 12 ? 'pm' : 'am';
  return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

export default function AvailabilityGrid({ slots, lang }: Props) {
  const days = lang === 'ar' ? DAY_LABELS_AR : DAY_LABELS_EN;
  const activeSlots = slots.filter(s => s.is_active);

  // Group by weekday
  const byDay = new Map<number, Slot[]>();
  for (const slot of activeSlots) {
    const existing = byDay.get(slot.weekday) ?? [];
    existing.push(slot);
    byDay.set(slot.weekday, existing);
  }

  if (activeSlots.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {lang === 'ar' ? 'لم يتم تحديد مواعيد بعد' : 'No availability set'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((label, i) => {
        const daySlots = byDay.get(i) ?? [];
        const hasSlots = daySlots.length > 0;
        return (
          <div key={i} className="text-center">
            <p className={`text-[10px] font-semibold mb-1 ${hasSlots ? 'text-foreground' : 'text-muted-foreground/40'}`}>
              {label}
            </p>
            {hasSlots ? (
              <div className="space-y-0.5">
                {daySlots.map((slot, j) => (
                  <div key={j} className="bg-success/15 border border-success/20 px-0.5 py-0.5">
                    <p className="text-[9px] text-success leading-tight">
                      {formatMinute(slot.start_minute)}
                    </p>
                    <p className="text-[9px] text-success/60 leading-tight">
                      {formatMinute(slot.end_minute)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-8 bg-muted/10 border border-border/30" />
            )}
          </div>
        );
      })}
    </div>
  );
}
