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
import {
  BRAND_RED,
  GRID_COLOR,
  axisTickStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
} from '@/components/dashboard/reports/chart-utils';
import { formatCurrencyCompact, formatCurrency, formatDate } from '@/lib/format';

interface Props {
  data: any;
  lang: string;
}

export default function RenewalVsNewStackedBar({ data, lang }: Props) {
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];

  if (rows.length === 0) return null;

  // Locale string for date formatting
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  // Map rows to recharts-friendly shape
  const chartData = rows.map((row) => ({
    day: formatDate(row.day, locale),
    renewal: Number(row.renewalRevenue ?? 0),
    new: Number(row.newRevenue ?? 0),
  }));

  const isRtl = lang === 'ar';
  const renewalLabel = isRtl ? 'تجديد' : 'Renewal';
  const newLabel = isRtl ? 'جديد' : 'New';

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((value: number, name: string) => [
            formatCurrency(value),
            name === 'renewal' ? renewalLabel : newLabel,
          ]) as any}
        />

        <Legend
          wrapperStyle={{ fontSize: 12, fontFamily: 'Space Grotesk, sans-serif', color: '#666' }}
          formatter={(value) => (value === 'renewal' ? renewalLabel : newLabel)}
        />

        {/* Renewal bar — success green via CSS variable */}
        <Bar
          dataKey="renewal"
          stackId="revenue"
          fill="hsl(var(--success))"
          radius={[0, 0, 0, 0]}
        />

        {/* New member bar — brand red, on top of renewal */}
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
