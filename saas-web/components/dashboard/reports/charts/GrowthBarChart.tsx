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
  GRID_COLOR,
  axisTickStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
} from '@/components/dashboard/reports/chart-utils';
import { formatDate } from '@/lib/format';

// Joins = success green, Ends = brand red
const JOIN_COLOR = 'hsl(142 76% 36%)';
const END_COLOR = '#e63946';

interface Props {
  weeks: Array<{ weekStart: string; joins: number; ends: number; net: number }>;
  lang: string;
}

export default function GrowthBarChart({ weeks, lang }: Props) {
  if (!Array.isArray(weeks) || weeks.length === 0) return null;

  // Chronological order for the chart (oldest → newest)
  const chartData = [...weeks].reverse().map((w) => ({
    ...w,
    weekLabel: formatDate(w.weekStart, lang === 'ar' ? 'ar-EG' : 'en-US'),
  }));

  const isRtl = lang === 'ar';

  return (
    // dir="ltr" prevents CSS RTL from flipping the SVG — axis positions are swapped manually below
    <div dir="ltr">
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        barCategoryGap="30%"
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />

        <XAxis
          dataKey="weekLabel"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          reversed={isRtl}
        />

        <YAxis
          orientation={isRtl ? 'right' : 'left'}
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />

        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />

        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, color: '#999' }}
        />

        {/* Two bars side by side — NOT stacked */}
        <Bar
          dataKey="joins"
          name={lang === 'ar' ? 'انضموا' : 'Joined'}
          fill={JOIN_COLOR}
          radius={0}
          maxBarSize={32}
        />
        <Bar
          dataKey="ends"
          name={lang === 'ar' ? 'انتهوا' : 'Ended'}
          fill={END_COLOR}
          radius={0}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
