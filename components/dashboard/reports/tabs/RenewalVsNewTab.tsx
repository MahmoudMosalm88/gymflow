'use client';

import { formatDate, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { toFiniteNumber } from '@/lib/coerce';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RenewalVsNewStackedBar from '@/components/dashboard/reports/charts/RenewalVsNewStackedBar';

interface Props {
  data: any;
  lang: string;
  labels: any;
}

export default function RenewalVsNewTab({ data, lang, labels }: Props) {
  const renewalRows: any[] = Array.isArray(data?.rows) ? data.rows : [];
  const renewalSummary = data?.summary ?? null;

  if (!renewalSummary) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={lang === 'ar' ? 'تجديدات' : 'Renewal Revenue'}
          value={formatCurrencyCompact(renewalSummary.renewalRevenue ?? 0)}
          color="text-success"
          valueSize="text-2xl"
        />
        <StatCard
          label={lang === 'ar' ? 'اشتراكات جديدة' : 'New Revenue'}
          value={formatCurrencyCompact(renewalSummary.newRevenue ?? 0)}
          color="text-primary"
          valueSize="text-2xl"
        />
        <StatCard
          label={lang === 'ar' ? 'إجمالي الإيراد' : 'Total Revenue'}
          value={formatCurrencyCompact(
            (renewalSummary.renewalRevenue ?? 0) + (renewalSummary.newRevenue ?? 0)
          )}
          color="text-foreground"
          valueSize="text-2xl"
        />
        <StatCard
          label={lang === 'ar' ? 'عدد المعاملات' : 'Transactions'}
          value={(renewalSummary.renewalCount ?? 0) + (renewalSummary.newCount ?? 0)}
          color="text-foreground"
          valueSize="text-2xl"
        />
      </div>

      {/* ── Stacked bar chart: daily renewal vs new ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'الإيراد اليومي — تجديد مقابل جديد' : 'Daily Revenue — Renewal vs New'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RenewalVsNewStackedBar data={data} lang={lang} />
        </CardContent>
      </Card>

      {/* ── Detail table ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'التجديد مقابل الاشتراك الجديد' : 'Renewal vs New Revenue'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'day',
                label: labels.date,
                render: (row: any) => formatDate(row.day, lang === 'ar' ? 'ar-EG' : 'en-US'),
              },
              {
                key: 'newRevenue',
                label: lang === 'ar' ? 'جديد' : 'New Revenue',
                render: (row: any) => formatCurrency(toFiniteNumber(row.newRevenue)),
              },
              {
                key: 'renewalRevenue',
                label: lang === 'ar' ? 'تجديد' : 'Renewal Revenue',
                render: (row: any) => formatCurrency(toFiniteNumber(row.renewalRevenue)),
              },
              {
                key: 'newCount',
                label: lang === 'ar' ? 'عدد الجديد' : 'New Count',
              },
              {
                key: 'renewalCount',
                label: lang === 'ar' ? 'عدد التجديد' : 'Renewal Count',
              },
            ]}
            data={renewalRows}
            emptyMessage={lang === 'ar' ? 'لا توجد معاملات كافية.' : 'Not enough recent transactions.'}
          />
        </CardContent>
      </Card>
    </div>
  );
}
