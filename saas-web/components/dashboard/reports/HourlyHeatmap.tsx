'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type HeatmapRow = { dow: number; hour: number; count: number };

type Props = {
  data: HeatmapRow[];
  lang: string;
  title: string;
};

const START_HOUR = 5;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

// Intensity scale derived from brand red via HSL darkening
const CELL_COLORS = [
  'bg-muted/20',          // 0 — empty
  'bg-destructive/10',    // <20%
  'bg-destructive/25',    // <40%
  'bg-destructive/40',    // <60%
  'bg-destructive/60',    // <80%
  'bg-destructive',       // peak
];

function getCellColor(count: number, maxCount: number) {
  if (count === 0 || maxCount === 0) return CELL_COLORS[0];
  const intensity = count / maxCount;
  if (intensity < 0.2) return CELL_COLORS[1];
  if (intensity < 0.4) return CELL_COLORS[2];
  if (intensity < 0.6) return CELL_COLORS[3];
  if (intensity < 0.8) return CELL_COLORS[4];
  return CELL_COLORS[5];
}

function formatHourLabel(h: number, lang: string) {
  if (h === 12) return lang === 'ar' ? '12م' : '12p';
  if (h > 12) return `${h - 12}${lang === 'ar' ? 'م' : 'p'}`;
  if (h === 0) return lang === 'ar' ? '12ص' : '12a';
  return `${h}${lang === 'ar' ? 'ص' : 'a'}`;
}

export default function HourlyHeatmap({ data, lang, title }: Props) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxCount = 0;
  for (const row of data) {
    const d = Number(row.dow);
    const h = Number(row.hour);
    const c = Number(row.count);
    if (d >= 0 && d < 7 && h >= 0 && h < 24) {
      grid[d][h] = c;
      if (c > maxCount) maxCount = c;
    }
  }

  const dayLabels = lang === 'ar'
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {lang === 'ar' ? 'آخر 4 أسابيع — اللون الأغمق = حركة أكثر' : 'Last 4 weeks — darker = more activity'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto relative">
          {/* Scroll hint — fade on trailing edge */}
          <div className="pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-s from-card to-transparent z-10 md:hidden" />

          <div className="flex">
            <div className="w-16 shrink-0" />
            {HOURS.map((h) => (
              <div key={h} className="flex-1 min-w-[32px] text-center text-[10px] text-muted-foreground pb-2">
                {formatHourLabel(h, lang)}
              </div>
            ))}
          </div>
          {dayLabels.map((dayLabel, dow) => (
            <div key={dow} className="flex items-center">
              <div className="w-16 shrink-0 text-xs text-muted-foreground pe-3 text-end">{dayLabel}</div>
              {HOURS.map((h) => {
                const count = grid[dow][h];
                return (
                  <div
                    key={h}
                    className={`flex-1 min-w-[32px] aspect-square m-[1px] ${getCellColor(count, maxCount)} border border-background transition-colors group relative`}
                    title={`${dayLabel} ${h}:00 — ${count} ${lang === 'ar' ? 'تسجيل' : 'check-ins'}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white z-10">
                      {count > 0 ? count : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="flex items-center justify-end gap-2 pt-4" aria-hidden="true">
            <span className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'أقل' : 'Less'}</span>
            {CELL_COLORS.map((c, i) => (
              <div key={i} className={`w-4 h-4 ${c} border border-background`} />
            ))}
            <span className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'أكثر' : 'More'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
