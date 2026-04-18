'use client';

import { tooltipContentStyle, tooltipLabelStyle, tooltipItemStyle } from '../chart-utils';

type Props = {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
};

export default function ChartTooltip({ active, payload, label, formatter, labelFormatter }: Props) {
  if (!active || !payload?.length) return null;

  return (
    <div style={tooltipContentStyle}>
      {label != null && (
        <p style={tooltipLabelStyle}>
          {labelFormatter ? labelFormatter(String(label)) : label}
        </p>
      )}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ ...tooltipItemStyle, color: entry.color || '#ccc' }}>
          {entry.name}: {formatter ? formatter(entry.value, entry.name) : entry.value}
        </p>
      ))}
    </div>
  );
}
