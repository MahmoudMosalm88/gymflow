'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BRAND_RED,
  GRID_COLOR,
  axisTickStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  gradientId,
} from '@/components/dashboard/reports/chart-utils';
import { formatCurrencyCompact } from '@/lib/format';

interface Props {
  data: any;
  lang: string;
}

// Group items by days_left and sum amountAtRisk
function buildChartData(data: any): { day: number; amount: number }[] {
  const items: any[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.rows)
    ? data.rows
    : [];

  const map = new Map<number, number>();
  for (const row of items) {
    const day = row.days_left ?? 0;
    const amount = Number(row.amountAtRisk ?? row.amount_at_risk ?? 0);
    map.set(day, (map.get(day) ?? 0) + amount);
  }

  // Sort ascending by days_left so the chart reads left-to-right
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, amount]) => ({ day, amount }));
}

const GRAD_ID = gradientId('rar');

export default function RevenueAtRiskAreaChart({ data, lang }: Props) {
  const chartData = buildChartData(data);

  if (chartData.length === 0) return null;

  const isRtl = lang === 'ar';
  const xLabel = isRtl ? 'الأيام المتبقية' : 'Days Left';
  const yLabel = isRtl ? 'المبلغ المهدد' : 'Amount At Risk';

  return (
    // dir="ltr" prevents CSS RTL from flipping the SVG — axis positions are swapped manually below
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          {/* Gradient fill for the area — uses native SVG defs inside the recharts SVG */}
          <defs>
            <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BRAND_RED} stopOpacity={0.4} />
              <stop offset="95%" stopColor={BRAND_RED} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />

          <XAxis
            dataKey="day"
            tick={axisTickStyle}
            reversed={isRtl}
            label={{ value: xLabel, position: 'insideBottom', offset: -2, fill: '#666', fontSize: 11 }}
          />
          <YAxis
            orientation={isRtl ? 'right' : 'left'}
            tick={axisTickStyle}
            tickFormatter={(v) => formatCurrencyCompact(v)}
            label={{ value: yLabel, angle: -90, position: isRtl ? 'insideRight' : 'insideLeft', fill: '#666', fontSize: 11 }}
          />

          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number) => [formatCurrencyCompact(value), yLabel]) as any}
            labelFormatter={(label) => `${xLabel}: ${label}`}
          />

          <Area
            type="monotone"
            dataKey="amount"
            stroke={BRAND_RED}
            strokeWidth={2}
            fill={`url(#${GRAD_ID})`}
            dot={false}
            activeDot={{ r: 4, fill: BRAND_RED, stroke: '#fff', strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
