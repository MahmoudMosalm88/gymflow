'use client';

import { useState } from 'react';
import { MiniArea } from '@derpdaderp/chartkit';
import { getCairoHour } from '@/lib/cairo-time';

type Bar = { hour: number; count: number };

type Props = {
  bars: Bar[];
  lang: string;
  todayStats?: { allowed: number; warning: number; denied: number };
};

function formatHour(h: number, lang: string) {
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = lang === 'ar'
    ? (h >= 12 ? 'م' : 'ص')
    : (h >= 12 ? 'pm' : 'am');
  return `${h12}${suffix}`;
}

const LABEL_HOURS = [6, 9, 12, 15, 18, 21];

export default function HourlyChart({ bars, lang, todayStats }: Props) {
  const nowHour = getCairoHour();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Crop to 5am–23pm
  const visible = bars.filter(b => b.hour >= 5 && b.hour <= 23);
  const totalToday = todayStats
    ? (todayStats.allowed + todayStats.warning + todayStats.denied)
    : visible.reduce((s, b) => s + b.count, 0);

  // Find peak
  const peak = visible.reduce((best, b) => b.count > best.count ? b : best, visible[0]);

  // Data for MiniArea — just the counts array
  const chartData = visible.map(b => b.count);

  // Hovered bar info
  const hoveredBar = hoveredIdx !== null ? visible[hoveredIdx] : null;

  return (
    <div className="space-y-3">
      {/* Summary line */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="font-stat text-2xl text-foreground">{totalToday}</span>
        <span className="text-xs text-muted-foreground">
          {lang === 'ar' ? 'تسجيل دخول اليوم' : 'check-ins today'}
        </span>
        {todayStats && (todayStats.warning > 0 || todayStats.denied > 0) && (
          <span className="text-xs text-muted-foreground ms-1">
            {'· '}
            {todayStats.warning > 0 && (
              <span className="text-warning">{todayStats.warning} {lang === 'ar' ? 'تحذير' : 'warning'}{todayStats.warning !== 1 && lang !== 'ar' ? 's' : ''}</span>
            )}
            {todayStats.warning > 0 && todayStats.denied > 0 && ' · '}
            {todayStats.denied > 0 && (
              <span className="text-destructive">{todayStats.denied} {lang === 'ar' ? 'رفض' : 'denied'}</span>
            )}
          </span>
        )}
      </div>

      {/* MiniArea chart */}
      <div className="relative">
        {/* Count box — always visible, top-end corner, lights up on hover */}
        <div className="absolute z-10 -top-12 end-0 px-3 py-1.5 pointer-events-none">
          <span className={`font-stat text-3xl leading-none ${hoveredBar ? 'text-foreground' : 'text-muted-foreground/30'}`}>
            {hoveredBar ? hoveredBar.count : '—'}
          </span>
          <span className={`text-xs block mt-0.5 ${hoveredBar ? 'text-muted-foreground' : 'text-muted-foreground/20'}`}>
            {hoveredBar ? formatHour(hoveredBar.hour, lang) : (lang === 'ar' ? 'مرر للتفاصيل' : 'hover for details')}
          </span>
        </div>

        {/* Invisible hover zones layered on top */}
        <div className="relative" style={{ height: 210 }}>
          <div className="absolute inset-0">
            <MiniArea
              data={chartData}
              theme="midnight"
              color="#e63946"
              height={210}
            />
          </div>
          {/* Hover hit zones */}
          <div
            className="absolute inset-0 flex"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {visible.map((b, i) => (
              <div
                key={b.hour}
                className="flex-1 cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(i)}
                onClick={() => setHoveredIdx(hoveredIdx === i ? null : i)}
              />
            ))}
          </div>
        </div>

        {/* Hour labels + now indicator */}
        <div className="flex mt-1" dir="ltr">
          {visible.map(b => {
            const isCurrent = b.hour === nowHour;
            return (
              <div key={b.hour} className="flex-1 text-center">
                {isCurrent ? (
                  <span className="text-[10px] text-destructive font-bold">{formatHour(b.hour, lang)}</span>
                ) : LABEL_HOURS.includes(b.hour) ? (
                  <span className="text-[10px] text-muted-foreground">{formatHour(b.hour, lang)}</span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Context line */}
        {peak && peak.count > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {lang === 'ar'
              ? `الذروة ${formatHour(peak.hour, lang)} · ${peak.count} تسجيل`
              : `Peak at ${formatHour(peak.hour, lang)} · ${peak.count} check-ins`}
          </p>
        )}
      </div>
    </div>
  );
}
