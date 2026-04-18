'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CHART_STROKE_WIDTH,
  GRID_COLOR,
  AXIS_COLOR,
  axisTickStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  gradientId,
} from '@/components/dashboard/reports/chart-utils';
import { formatCurrencyCompact } from '@/lib/format';

// Revenue stream colors
const COLORS = {
  subscription: '#e63946',
  pt: '#22c55e',
  guest: '#3b82f6',
};

type MonthlyRow = {
  month: string;
  revenue: number;
  subscriptionRevenue: number;
  guestRevenue: number;
  ptRevenue: number;
  count: number;
};

interface Props {
  monthly: MonthlyRow[];
  lang: string;
}

export default function IncomeAreaChart({ monthly, lang }: Props) {
  const isRtl = lang === 'ar';

  // Last 6 months, oldest first
  const chartData = [...monthly].reverse().slice(-6).map(r => ({
    month: new Date(r.month + '-01').toLocaleDateString(
      isRtl ? 'ar-EG' : 'en-US',
      { month: 'short' }
    ),
    subscription: r.subscriptionRevenue,
    pt: r.ptRevenue,
    guest: r.guestRevenue,
  }));

  // Labels for legend and tooltip
  const nameMap: Record<string, string> = isRtl
    ? { subscription: 'اشتراكات', pt: 'تدريب شخصي', guest: 'زيارات' }
    : { subscription: 'Subscriptions', pt: 'PT', guest: 'Guest' };

  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          {/* Gradient fills */}
          <defs>
            <linearGradient id={gradientId('inc-sub')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.subscription} stopOpacity={0.35} />
              <stop offset="95%" stopColor={COLORS.subscription} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={gradientId('inc-pt')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.pt} stopOpacity={0.35} />
              <stop offset="95%" stopColor={COLORS.pt} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={gradientId('inc-guest')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.guest} stopOpacity={0.35} />
              <stop offset="95%" stopColor={COLORS.guest} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="month"
            tick={axisTickStyle}
            stroke={AXIS_COLOR}
            reversed={isRtl}
          />
          <YAxis
            orientation={isRtl ? 'right' : 'left'}
            tick={axisTickStyle}
            stroke={AXIS_COLOR}
            tickFormatter={(v: number) => formatCurrencyCompact(v)}
            width={60}
          />

          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(value, name) => [
              formatCurrencyCompact(Number(value ?? 0)),
              nameMap[String(name)] || String(name),
            ]}
          />

          <Legend
            wrapperStyle={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 12 }}
            formatter={(value: string) => nameMap[value] || value}
          />

          {/* Stacked areas — subscription on bottom, guest on top */}
          <Area
            type="monotone"
            dataKey="subscription"
            stackId="revenue"
            stroke={COLORS.subscription}
            strokeWidth={CHART_STROKE_WIDTH}
            fill={`url(#${gradientId('inc-sub')})`}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="pt"
            stackId="revenue"
            stroke={COLORS.pt}
            strokeWidth={CHART_STROKE_WIDTH}
            fill={`url(#${gradientId('inc-pt')})`}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="guest"
            stackId="revenue"
            stroke={COLORS.guest}
            strokeWidth={CHART_STROKE_WIDTH}
            fill={`url(#${gradientId('inc-guest')})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
