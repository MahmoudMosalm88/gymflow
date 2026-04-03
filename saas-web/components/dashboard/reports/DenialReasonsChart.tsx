'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RechartStyles = {
  gridStroke: string;
  tooltipContent: { backgroundColor: string; border: string; borderRadius: number };
  tooltipLabel: { color: string };
  tooltipItem: { color: string };
  legendItem: { color: string };
};

type Labels = {
  denial_reasons: string;
};

type DenialReasonRow = {
  reason_code: string;
  count: number;
};

type DenialReasonsChartProps = {
  data: DenialReasonRow[];
  labels: Labels;
  styles: RechartStyles;
  colors: string[];
};

export default function DenialReasonsChart({
  data,
  labels,
  styles,
  colors,
}: DenialReasonsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.denial_reasons}</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="reason_code"
              cx="50%"
              cy="50%"
              outerRadius={140}
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              labelLine={{ stroke: styles.gridStroke }}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={styles.tooltipContent}
              labelStyle={styles.tooltipLabel}
              itemStyle={styles.tooltipItem}
            />
            <Legend
              wrapperStyle={{ color: styles.legendItem.color }}
              formatter={(value: string) => <span style={{ color: styles.legendItem.color }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
