'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api-client';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

// DenialReasonsChart renders a recharts PieChart — load dynamically
const DenialReasonsChart = dynamic(
  () => import('@/components/dashboard/reports/DenialReasonsChart'),
  {
    loading: () => (
      <div className="flex h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    ),
  }
);

// Brutalist chart color palette matching the design system
const PIE_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--chart-1) / 0.6)',
];

// Human-readable labels for every known denial reason code
const DENIAL_LABELS: Record<string, { en: string; ar: string }> = {
  unknown_member:           { en: 'Not found',           ar: 'غير موجود' },
  cooldown:                 { en: 'Scanned too soon',    ar: 'تم المسح مؤخراً' },
  already_checked_in_today: { en: 'Already checked in',  ar: 'سجّل حضور اليوم' },
  no_active_subscription:   { en: 'No subscription',     ar: 'لا اشتراك نشط' },
  quota_exceeded:           { en: 'Sessions used up',    ar: 'نفدت الجلسات' },
  subscription_frozen:      { en: 'Subscription frozen', ar: 'الاشتراك مجمّد' },
};

// Minimal recharts style object required by DenialReasonsChart
const CHART_STYLES = {
  axis:           { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
  gridStroke:     'hsl(var(--border))',
  tooltipContent: { backgroundColor: 'hsl(var(--background))', border: '2px solid hsl(var(--border))', borderRadius: 0 },
  tooltipLabel:   { color: 'hsl(var(--foreground))' },
  tooltipItem:    { color: 'hsl(var(--foreground))' },
  legendItem:     { color: 'hsl(var(--muted-foreground))' },
};

interface AccessDenialsTabProps {
  lang: string;
  labels: any;
  days: number;
}

export default function AccessDenialsTab({ lang, labels, days }: AccessDenialsTabProps) {
  const [reasonsData, setReasonsData] = useState<any>(null);
  const [entriesData, setEntriesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/reports/denial-reasons?days=${days}`),
      api.get(`/api/reports/denied-entries?days=${days}`),
    ]).then(([reasonsRes, entriesRes]) => {
      if (reasonsRes.success) setReasonsData(reasonsRes.data);
      if (entriesRes.success) setEntriesData(entriesRes.data);
      setLoading(false);
    });
  }, [days]);

  if (loading) return <LoadingSpinner size="lg" />;

  const hasReasons = Array.isArray(reasonsData) && reasonsData.length > 0;
  const hasEntries = Array.isArray(entriesData) && entriesData.length > 0;

  return (
    <div className="space-y-6">

      {/* ── Denial Reasons Pie Chart ── */}
      {hasReasons ? (
        <DenialReasonsChart
          data={reasonsData}
          labels={labels}
          styles={CHART_STYLES}
          colors={PIE_COLORS}
          lang={lang}
        />
      ) : (
        <div className="border-2 border-border bg-card py-12 text-center">
          <p className="text-lg font-semibold text-success">
            {lang === 'ar' ? '✓ لا رفضات في هذه الفترة' : '✓ No denials in this window'}
          </p>
        </div>
      )}

      {/* ── Denied Entries Log Table ── */}
      {hasEntries ? (
        <Card>
          <CardHeader>
            <CardTitle>{labels.denied_entries}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'name',        label: labels.name },
                {
                  key: 'timestamp',
                  label: labels.time,
                  render: (row: any) =>
                    formatDateTime(row.timestamp, lang === 'ar' ? 'ar-EG' : 'en-US'),
                },
                {
                  key: 'reason_code',
                  label: labels.reason,
                  render: (row: any) => {
                    const lbl = DENIAL_LABELS[row.reason_code];
                    return lbl ? lbl[lang as 'en' | 'ar'] : row.reason_code;
                  },
                },
              ]}
              data={entriesData}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-border bg-card py-12 text-center">
          <p className="text-lg font-semibold text-success">
            {lang === 'ar' ? '✓ لا سجلات رفض في هذه الفترة' : '✓ No denied entries in this window'}
          </p>
        </div>
      )}

    </div>
  );
}
