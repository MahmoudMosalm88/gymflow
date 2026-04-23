'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { toFiniteNumber } from '@/lib/coerce';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import GrowthBarChart from '@/components/dashboard/reports/charts/GrowthBarChart';

// Maps raw subscription status keys to human-readable labels
const SUB_STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  expired:   { en: 'Expired',   ar: 'منتهي' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  frozen:    { en: 'Frozen',    ar: 'مجمّد' },
  ended:     { en: 'Ended',     ar: 'منتهي' },
};

interface Props {
  data: any;
  lang: string;
  labels: any;
  days: number;
}

export default function GrowthTab({ data, lang, labels, days }: Props) {
  // Collapsible "Ended Subscriptions" section — lazy-fetches on first expand
  const [showEnded, setShowEnded] = useState(false);
  const [endedData, setEndedData] = useState<any>(null);
  const [endedLoading, setEndedLoading] = useState(false);

  useEffect(() => {
    if (showEnded && !endedData) {
      setEndedLoading(true);
      api.get('/api/reports/ended-subscriptions?limit=200').then((r) => {
        if (r.success) setEndedData(r.data);
        setEndedLoading(false);
      });
    }
  }, [showEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // No data state
  if (!data?.summary) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}
      </p>
    );
  }

  const { summary } = data;
  const weeks: any[] = Array.isArray(data.weeks) ? data.weeks : [];

  return (
    <>
      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          animate
          label={lang === 'ar' ? 'هذا الأسبوع (صافي)' : 'This week (net)'}
          value={summary.thisWeek.net >= 0 ? `+${summary.thisWeek.net}` : `${summary.thisWeek.net}`}
          color={summary.thisWeek.net >= 0 ? 'text-success' : 'text-destructive'}
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'انضموا هذا الأسبوع' : 'Joined this week'}
          value={summary.thisWeek.joins}
          color="text-success"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'انتهت هذا الأسبوع' : 'Ended this week'}
          value={summary.thisWeek.ends}
          color="text-destructive"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'إجمالي النشطين' : 'Total active'}
          value={summary.totalActive}
          color="text-foreground"
          valueSize="text-2xl"
        />
      </div>

      {/* ── Bar chart: weekly joins vs ends ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'النمو الأسبوعي — انضمام مقابل إنهاء' : 'Weekly Growth — Joins vs Ends'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar'
              ? 'الأسبوع الماضي: +' + summary.lastWeek.joins + ' انضموا، ' + summary.lastWeek.ends + ' انتهوا (صافي: ' + (summary.lastWeek.net >= 0 ? '+' : '') + summary.lastWeek.net + ')'
              : `Last week: +${summary.lastWeek.joins} joined, ${summary.lastWeek.ends} ended (net: ${summary.lastWeek.net >= 0 ? '+' : ''}${summary.lastWeek.net})`}
          </p>
        </CardHeader>
        <CardContent>
          {weeks.length > 0 ? (
            <GrowthBarChart weeks={weeks} lang={lang} />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا بيانات بعد.' : 'No data yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Weekly table ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'تفاصيل الأسابيع' : 'Weekly Breakdown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'weekStart',
                label: lang === 'ar' ? 'الأسبوع' : 'Week',
                render: (row: any) => formatDate(row.weekStart, lang === 'ar' ? 'ar-EG' : 'en-US'),
              },
              {
                key: 'joins',
                label: lang === 'ar' ? 'انضموا' : 'Joined',
                render: (row: any) => <span className="text-success font-semibold">+{row.joins}</span>,
              },
              {
                key: 'ends',
                label: lang === 'ar' ? 'انتهوا' : 'Ended',
                render: (row: any) => <span className="text-destructive font-semibold">{row.ends}</span>,
              },
              {
                key: 'net',
                label: lang === 'ar' ? 'الصافي' : 'Net',
                render: (row: any) => (
                  <span className={row.net >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                    {row.net >= 0 ? `+${row.net}` : row.net}
                  </span>
                ),
              },
            ]}
            data={[...weeks].reverse()}
            emptyMessage={lang === 'ar' ? 'لا بيانات بعد.' : 'No data yet.'}
          />
        </CardContent>
      </Card>

      {/* ── Collapsible: Ended Subscriptions ── */}
      <div className="border-2 border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={() => setShowEnded(!showEnded)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{showEnded ? '▼' : '▶'}</span>
            {lang === 'ar' ? 'الاشتراكات المنتهية' : 'Ended Subscriptions'}
            {endedData && ` (${Array.isArray(endedData) ? endedData.length : 0})`}
          </button>
        </div>

        {showEnded && (
          <div className="p-4">
            {endedLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : Array.isArray(endedData) && endedData.length > 0 ? (
              <DataTable
                columns={[
                  { key: 'name',     label: labels.name },
                  { key: 'phone',    label: labels.phone },
                  {
                    key: 'end_date',
                    label: labels.end_date,
                    render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US'),
                  },
                  {
                    key: 'status',
                    label: labels.status,
                    render: (row: any) => {
                      const lbl = SUB_STATUS_LABELS[row.status]?.[lang as 'en' | 'ar'] ?? row.status;
                      return (
                        <span className={row.status === 'expired' ? 'text-destructive font-bold' : 'text-warning'}>
                          {lbl}
                        </span>
                      );
                    },
                  },
                ]}
                data={endedData}
              />
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {lang === 'ar' ? 'لا اشتراكات منتهية.' : 'No ended subscriptions.'}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
