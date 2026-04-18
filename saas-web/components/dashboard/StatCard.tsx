'use client';

import { useLang } from '@/lib/i18n';
import { Sparkline } from '@derpdaderp/chartkit';
import CountUp from 'react-countup';

type Props = {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  valueSize?: string;
  rawValue?: number;
  previousValue?: number;
  targetValue?: number; // when set, shows collection rate (X% collected) instead of vs-previous delta
  compareLabel?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  accent?: string;
  animate?: boolean;
};

function computeDelta(current: number, previous: number): { pct: string; up: boolean; neutral: boolean } {
  if (previous === 0) return { pct: '—', up: true, neutral: true };
  const change = ((current - previous) / previous) * 100;
  return {
    pct: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`,
    up: change >= 0,
    neutral: Math.abs(change) < 1,
  };
}

function computeCollection(current: number, target: number): { pct: number; classes: string } | null {
  if (target <= 0) return null;
  const pct = Math.round((current / target) * 100);
  const classes = pct >= 80
    ? 'text-success border-success/30 bg-success/10'
    : pct >= 60
      ? 'text-warning border-warning/30 bg-warning/10'
      : 'text-destructive border-destructive/30 bg-destructive/10';
  return { pct, classes };
}

export default function StatCard({ label, value, subtitle, color = 'text-brand', valueSize, rawValue, previousValue, targetValue, compareLabel, sparklineData, sparklineColor, accent, animate = true }: Props) {
  const { lang } = useLang();
  const isRtl = lang === 'ar';

  const autoSize = valueSize ?? (() => {
    const len = String(value).length;
    if (len <= 3) return 'text-3xl md:text-4xl';
    if (len <= 6) return 'text-2xl md:text-3xl';
    return 'text-xl md:text-2xl';
  })();

  const numericValue = rawValue ?? (typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')));

  // Parse prefix (e.g. "SAR ", "$") and suffix (e.g. "%") from string values for CountUp animation.
  // If the value isn't a parseable number, animatedValue stays null and we fall back to plain rendering.
  const animatedValue = (() => {
    if (!animate) return null;
    const str = String(value);
    const match = str.match(/^([^0-9]*)([0-9,]+\.?[0-9]*)([^0-9]*)$/);
    if (!match) return null;
    const [, prefix, numStr, suffix] = match;
    const parsed = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(parsed)) return null;
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
    return { prefix, suffix, parsed, decimals };
  })();

  const collection = targetValue !== undefined ? computeCollection(numericValue, targetValue) : null;
  const hasDelta = !collection && previousValue !== undefined && !isNaN(numericValue);
  const delta = hasDelta ? computeDelta(numericValue, previousValue) : null;
  const hasSparkline = sparklineData && sparklineData.length >= 2;

  return (
    <div
      className={`flex flex-col h-full border-2 border-border bg-card shadow-[6px_6px_0_#000000] overflow-hidden ${accent ? `border-s-[3px] ${accent}` : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col justify-between p-4 pb-2 flex-1">
        {/* Label — top start */}
        <p className="text-xs text-muted-foreground text-start">
          {label}
        </p>

        {/* Value — bottom end */}
        <div className="flex flex-col items-end mt-auto">
          <p className={`font-stat ${autoSize} leading-none tracking-wide tabular-nums ${color}`}>
            {animatedValue ? (
              <>
                {animatedValue.prefix}
                <CountUp end={animatedValue.parsed} duration={1.2} separator="," decimals={animatedValue.decimals} />
                {animatedValue.suffix}
              </>
            ) : value}
          </p>

          {/* Collection rate badge (when targetValue is set) */}
          {collection && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-semibold border ${collection.classes}`}>
                {collection.pct}%
              </span>
              {compareLabel && (
                <span className="text-[11px] text-muted-foreground/50 hidden sm:inline">{compareLabel}</span>
              )}
            </div>
          )}

          {/* Delta pill + compare label — directly under the value */}
          {delta && !delta.neutral && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-semibold border ${
                delta.up
                  ? 'text-success border-success/30 bg-success/10'
                  : 'text-destructive border-destructive/30 bg-destructive/10'
              }`}>
                {delta.up ? '↑' : '↓'} {delta.pct}
              </span>
              {compareLabel && (
                <span className="text-[11px] text-muted-foreground/50 hidden sm:inline">{compareLabel}</span>
              )}
            </div>
          )}

          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>

      {hasSparkline ? (
        <div className="h-[32px]">
          <Sparkline
            data={sparklineData}
            theme="midnight"
            height={32}
            color={sparklineColor || 'hsl(var(--foreground))'}
            fill
          />
        </div>
      ) : (
        <div className="h-[8px]" />
      )}
    </div>
  );
}
