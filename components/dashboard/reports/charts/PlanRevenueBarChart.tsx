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
import type { TooltipProps } from 'recharts';
import {
  BRAND_RED,
  GRID_COLOR,
  axisTickStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
} from '@/components/dashboard/reports/chart-utils';
import { formatCurrencyCompact, formatCurrency } from '@/lib/format';

type PlanRevenueRow = {
  planMonths?: number | null;
  totalRevenue?: number | string | null;
};

interface Props {
  data: PlanRevenueRow[] | null | undefined;
  lang: string;
}

function makePlanLabel(months: number, lang: string): string {
  if (months <= 0) return lang === 'ar' ? 'غير محدد' : 'Unspecified';
  if (lang === 'ar') return `${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
  return `${months} month${months === 1 ? '' : 's'}`;
}

export default function PlanRevenueBarChart({ data, lang }: Props) {
  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) return null;

  const chartData = rows.map((row) => ({
    planLabel: makePlanLabel(row.planMonths ?? 0, lang),
    totalRevenue: Number(row.totalRevenue ?? 0),
  }));

  const isRtl = lang === 'ar';
  const xLabel = isRtl ? 'الإيراد' : 'Revenue';
  const yLabel = isRtl ? 'نوع الخطة' : 'Plan Type';
  const tooltipFormatter: TooltipProps<number, string>['formatter'] = (value) => [
    formatCurrency(value ?? 0),
    xLabel,
  ];

  return (
    // dir="ltr" prevents CSS RTL from flipping the SVG — axis positions are swapped manually below
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 48 + 40)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />

          <XAxis
            type="number"
            tick={axisTickStyle}
            tickFormatter={(v) => formatCurrencyCompact(v)}
            reversed={isRtl}
            label={{ value: xLabel, position: 'insideBottom', offset: -2, fill: '#666', fontSize: 11 }}
          />

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
            formatter={tooltipFormatter}
          />

          <Bar dataKey="totalRevenue" fill={BRAND_RED} radius={[0, 0, 0, 0]} maxBarSize={36}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={BRAND_RED} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
