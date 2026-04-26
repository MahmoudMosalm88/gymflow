'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
import { formatCurrencyCompact, formatCurrency, formatDate } from '@/lib/format';

type RenewalVsNewRow = {
  day?: number | string | Date | null;
  renewalRevenue?: number | string | null;
  newRevenue?: number | string | null;
};

interface Props {
  data: { rows?: RenewalVsNewRow[] } | null | undefined;
  lang: string;
}

export default function RenewalVsNewStackedBar({ data, lang }: Props) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  if (rows.length === 0) return null;

  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const chartData = rows.map((row) => ({
    day: formatDate(row.day, locale),
    renewal: Number(row.renewalRevenue ?? 0),
    new: Number(row.newRevenue ?? 0),
  }));

  const isRtl = lang === 'ar';
  const renewalLabel = isRtl ? 'تجديد' : 'Renewal';
  const newLabel = isRtl ? 'جديد' : 'New';
  const tooltipFormatter: TooltipProps<number, string>['formatter'] = (value, name) => [
    formatCurrency(value ?? 0),
    name === 'renewal' ? renewalLabel : newLabel,
  ];

  return (
    // dir="ltr" prevents CSS RTL from flipping the SVG — axis positions are swapped manually below
    <div dir="ltr">
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />

        <XAxis
          dataKey="day"
          tick={{ ...axisTickStyle, fontSize: 10 }}
          interval="preserveStartEnd"
          reversed={isRtl}
        />
        <YAxis
          orientation={isRtl ? 'right' : 'left'}
          tick={axisTickStyle}
          tickFormatter={(v) => formatCurrencyCompact(v)}
        />

        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={tooltipFormatter}
        />

        <Legend
          wrapperStyle={{ fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', color: '#666' }}
          formatter={(value) => (value === 'renewal' ? renewalLabel : newLabel)}
        />

        <Bar
          dataKey="renewal"
          stackId="revenue"
          fill="hsl(var(--success))"
          radius={[0, 0, 0, 0]}
        />

        <Bar
          dataKey="new"
          stackId="revenue"
          fill={BRAND_RED}
          radius={[0, 0, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
