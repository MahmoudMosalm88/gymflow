'use client';

import { formatCurrency } from '@/lib/format';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlanRevenueBarChart from '@/components/dashboard/reports/charts/PlanRevenueBarChart';

interface Props {
  data: any;
  lang: string;
  labels: any;
}

// Human-readable plan label
const planLabel = (months: number, lang: string): string => {
  if (months <= 0) return lang === 'ar' ? 'غير محدد' : 'Unspecified';
  if (lang === 'ar') return `${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
  return `${months} month${months === 1 ? '' : 's'}`;
};

export default function PlanRevenueTab({ data, lang, labels }: Props) {
  const rows: any[] = Array.isArray(data) ? data : [];
  const hasData = rows.length > 0;

  if (!hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Horizontal bar chart: revenue per plan ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'الإيراد حسب نوع الخطة' : 'Revenue by Plan Type'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlanRevenueBarChart data={data} lang={lang} />
        </CardContent>
      </Card>

      {/* ── Detail table ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'تفاصيل الإيراد حسب الخطة' : 'Plan Revenue Breakdown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'planMonths',
                label: labels.plan,
                render: (row: any) => planLabel(row.planMonths, lang),
              },
              {
                key: 'activeMembers',
                label: lang === 'ar' ? 'الأعضاء النشطون' : 'Active Members',
              },
              {
                key: 'totalRevenue',
                label: lang === 'ar' ? 'إجمالي الإيراد' : 'Total Revenue',
                render: (row: any) => formatCurrency(row.totalRevenue || 0),
              },
              {
                key: 'renewalCount',
                label: lang === 'ar' ? 'التجديدات' : 'Renewals',
              },
              {
                key: 'averageValue',
                label: lang === 'ar' ? 'متوسط القيمة' : 'Average Value',
                render: (row: any) => formatCurrency(row.averageValue || 0),
              },
            ]}
            data={rows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
