'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BRAND_RED,
  GRID_COLOR,
  axisTickStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
} from '@/components/dashboard/reports/chart-utils';
import { formatCurrencyCompact, formatCurrency } from '@/lib/format';

interface Props {
  data: any;
  lang: string;
}

// Build plan label from planMonths
function makePlanLabel(months: number, lang: string): string {
  if (months <= 0) return lang === 'ar' ? 'غير محدد' : 'Unspecified';
  if (lang === 'ar') return `${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
  return `${months} month${months === 1 ? '' : 's'}`;
}

export default function PlanRevenueBarChart({ data, lang }: Props) {
  const rows: any[] = Array.isArray(data) ? data : [];

  if (rows.length === 0) return null;

  // Map each row to { planLabel, totalRevenue }
  const chartData = rows.map((row) => ({
    planLabel: makePlanLabel(row.planMonths ?? 0, lang),
    totalRevenue: Number(row.totalRevenue ?? 0),
  }));

  const isRtl = lang === 'ar';
  const xLabel = isRtl ? 'الإيراد' : 'Revenue';
  const yLabel = isRtl ? 'نوع الخطة' : 'Plan Type';

  return (
    // dir="ltr" prevents CSS RTL from flipping the SVG — axis positions are swapped manually below
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 48 + 40)}>
        {/* layout="vertical" makes bars grow left-to-right (horizontal bars) */}
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />

          {/* XAxis is the value axis for horizontal layout */}
          <XAxis
            type="number"
            tick={axisTickStyle}
            tickFormatter={(v) => formatCurrencyCompact(v)}
            reversed={isRtl}
            label={{ value: xLabel, position: 'insideBottom', offset: -2, fill: '#666', fontSize: 11 }}
          />

          {/* YAxis shows the plan labels */}
          <YAxis
            type="category"
            dataKey="planLabel"
            orientation={isRtl ? 'right' : 'left'}
            tick={{ ...axisTickStyle, textAnchor: isRtl ? 'start' : 'end' }}
            width={80}
            label={{ value: yLabel, angle: -90, position: isRtl ? 'insideRight' : 'insideLeft', fill: '#666', fontSize: 11 }}
          />

          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number) => [formatCurrency(value), xLabel]) as any}
          />

          <Bar dataKey="totalRevenue" fill={BRAND_RED} radius={[0, 0, 0, 0]} maxBarSize={36}>
            {/* All bars same color — the brand red */}
            {chartData.map((_, i) => (
              <Cell key={i} fill={BRAND_RED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
