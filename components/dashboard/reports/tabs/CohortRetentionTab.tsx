'use client';

import { api } from '@/lib/api-client';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import CohortRetentionBar from '@/components/dashboard/reports/charts/CohortRetentionBar';

interface CohortRetentionTabProps {
  data: any;
  lang: string;
  labels: any;
}

export default function CohortRetentionTab({ data, lang, labels }: CohortRetentionTabProps) {
  const formatPercent = (v: number) => `${v.toFixed(1)}%`;

  // data is expected to be an array of cohort objects
  const rows = Array.isArray(data) ? data : [];

  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}
      </p>
    );
  }

  return (
    <>
      {/* Bar chart — retention rate per cohort */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'معدل الاحتفاظ حسب شهر الانضمام' : 'Retention Rate by Cohort Month'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CohortRetentionBar data={rows} lang={lang} />
        </CardContent>
      </Card>

      {/* Detailed cohort table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'الاحتفاظ حسب شهر الانضمام' : 'Cohort Retention'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'cohortMonth',   label: lang === 'ar' ? 'شهر الانضمام'   : 'Cohort' },
              { key: 'joinedMembers', label: lang === 'ar' ? 'المنضمون'        : 'Joined' },
              { key: 'stillActive',   label: lang === 'ar' ? 'ما زالوا نشطين' : 'Still Active' },
              { key: 'retentionRate', label: lang === 'ar' ? 'الاحتفاظ'        : 'Retention', render: (row: any) => formatPercent(row.retentionRate || 0) },
            ]}
            data={rows}
          />
        </CardContent>
      </Card>
    </>
  );
}
