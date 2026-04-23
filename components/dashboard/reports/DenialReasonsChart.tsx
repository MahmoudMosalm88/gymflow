'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportChartStyles } from './chart-types';

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
  styles: ReportChartStyles;
  colors: string[];
  lang?: string;
};

const REASON_LABELS: Record<string, { en: string; ar: string }> = {
  unknown_member:           { en: 'Not found',           ar: 'غير موجود' },
  cooldown:                 { en: 'Scanned too soon',    ar: 'تم المسح مؤخراً' },
  already_checked_in_today: { en: 'Already checked in',  ar: 'سجّل حضور اليوم' },
  no_active_subscription:   { en: 'No subscription',     ar: 'لا اشتراك نشط' },
  quota_exceeded:           { en: 'Sessions used up',    ar: 'نفدت الجلسات' },
  subscription_frozen:      { en: 'Subscription frozen', ar: 'الاشتراك مجمّد' },
  expired_subscription:     { en: 'Expired',             ar: 'منتهي' },
  no_subscription:          { en: 'No subscription',     ar: 'لا اشتراك' },
  access_tier_mismatch:     { en: 'Wrong access tier',   ar: 'مستوى وصول خاطئ' },
  frozen:                   { en: 'Frozen',              ar: 'مجمّد' },
  deleted:                  { en: 'Deleted member',      ar: 'عضو محذوف' },
  unknown:                  { en: 'Unknown',             ar: 'غير معروف' },
};

function humanizeReasonCode(code: string, lang = 'en'): string {
  const lbl = REASON_LABELS[code];
  if (lbl) return lbl[lang as 'en' | 'ar'] ?? lbl.en;
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DenialReasonsChart({
  data,
  labels,
  styles,
  colors,
  lang = 'en',
}: DenialReasonsChartProps) {
  const chartData = data.map((row) => ({ ...row, name: humanizeReasonCode(row.reason_code, lang) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.denial_reasons}</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
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
