'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { getAutomationWarningLabel } from '@/lib/whatsapp-automation';

type WhatsAppRevenueRow = {
  messageType: string;
  revenueSaved?: number | string | null;
};

interface WhatsAppRevenueBarProps {
  data: WhatsAppRevenueRow[];
  lang: string;
}

export default function WhatsAppRevenueBar({ data, lang }: WhatsAppRevenueBarProps) {
  const chartData = data.map((row) => ({
    ...row,
    revenueSaved: Number(row.revenueSaved ?? 0),
    label: getAutomationWarningLabel(row.messageType, lang === 'ar' ? 'ar' : 'en'),
  }));

  const isRtl = lang === 'ar';
  const tooltipFormatter: TooltipProps<number, string>['formatter'] = (value) => [
    formatCurrency(value ?? 0),
    lang === 'ar' ? 'الإيراد المحفوظ' : 'Revenue Saved',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isRtl ? 'الإيراد المحفوظ حسب نوع الرسالة' : 'Revenue Saved by Message Type'}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        {/* dir="ltr" prevents CSS RTL from flipping the SVG — axis positions are swapped manually below */}
        <div dir="ltr" style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v)}
              reversed={isRtl}
            />
            <YAxis
              type="category"
              dataKey="label"
              orientation={isRtl ? 'right' : 'left'}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, textAnchor: isRtl ? 'start' : 'end' }}
              tickLine={false}
              axisLine={false}
              width={140}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '2px solid hsl(var(--border))',
                borderRadius: 0,
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={tooltipFormatter}
            />
            <Bar dataKey="revenueSaved" fill="#e63946" radius={0} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
