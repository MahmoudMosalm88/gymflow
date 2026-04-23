'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportChartStyles } from './chart-types';

type Labels = {
  daily_checkins_stats: string;
  allowed: string;
  warning: string;
  denied: string;
};

type DailyStatRow = {
  date: string;
  allowed: number;
  warning: number;
  denied: number;
};

type DailyStatsChartProps = {
  data: DailyStatRow[];
  labels: Labels;
  styles: ReportChartStyles;
};

export default function DailyStatsChart({ data, labels, styles }: DailyStatsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.daily_checkins_stats}</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={styles.gridStroke} />
            <XAxis dataKey="date" tick={styles.axis} tickFormatter={(value: string) => {
              try { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
              catch { return value; }
            }} />
            <YAxis tick={styles.axis} />
            <Tooltip
              contentStyle={styles.tooltipContent}
              labelStyle={styles.tooltipLabel}
              itemStyle={styles.tooltipItem}
            />
            <Legend wrapperStyle={{ color: styles.legendItem.color }} />
            <Bar dataKey="allowed" stackId="a" fill="hsl(var(--success))" name={labels.allowed} />
            <Bar dataKey="warning" stackId="a" fill="hsl(var(--warning))" name={labels.warning} />
            <Bar dataKey="denied" stackId="a" fill="hsl(var(--destructive))" name={labels.denied} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
