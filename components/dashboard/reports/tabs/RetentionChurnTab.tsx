'use client';

import { api } from '@/lib/api-client';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

interface RetentionChurnTabProps {
  data: any;
  lang: string;
  labels: any;
}

export default function RetentionChurnTab({ data, lang, labels }: RetentionChurnTabProps) {
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // No data state
  if (!data?.summary || !Array.isArray(data.rows)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}
      </p>
    );
  }

  return (
    <>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          animate
          label={lang === 'ar' ? 'الاحتفاظ' : 'Retention Rate'}
          value={formatPercent(data.summary.retentionRate ?? 0)}
          color="text-success"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'التسرب' : 'Churn Rate'}
          value={formatPercent(data.summary.churnRate ?? 0)}
          color="text-destructive"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'أعضاء خسرتهم' : 'Members You Lost'}
          value={data.summary.churnedMembers ?? 0}
          color="text-destructive"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'إيراد ضائع' : 'Revenue Lost'}
          value={formatCurrencyCompact(data.summary.lostRevenue ?? 0)}
          color="text-destructive"
          valueSize="text-2xl"
        />
      </div>

      {/* Members lost table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'الأعضاء الذين فقدتهم' : 'Members Lost In This Window'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'name',      label: labels.name },
              { key: 'phone',     label: labels.phone },
              { key: 'endDate',   label: labels.end_date, render: (row: any) => formatDate(row.endDate, lang === 'ar' ? 'ar-EG' : 'en-US') },
              { key: 'lostValue', label: lang === 'ar' ? 'القيمة' : 'Lost Value', render: (row: any) => formatCurrency(row.lostValue || 0) },
            ]}
            data={data.rows}
            emptyMessage={lang === 'ar' ? 'لم تخسر أعضاء في هذه الفترة.' : 'No members lost in this window.'}
          />
        </CardContent>
      </Card>
    </>
  );
}
