'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api-client';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { getAutomationWarningLabel } from '@/lib/whatsapp-automation';

// Load the bar chart only when this tab is visible
const WhatsAppRevenueBar = dynamic(
  () => import('@/components/dashboard/reports/charts/WhatsAppRevenueBar'),
  {
    loading: () => (
      <div className="flex h-[320px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    ),
  }
);

interface WhatsAppPerformanceTabProps {
  lang: string;
  labels: any;
  days: number;
}

export default function WhatsAppPerformanceTab({ lang, labels, days }: WhatsAppPerformanceTabProps) {
  // Three independent data sources merged into this single tab
  const [roiData, setRoiData] = useState<any>(null);
  const [perfData, setPerfData] = useState<any>(null);
  const [postExpiryData, setPostExpiryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Toggle to show/hide the post-expiry section
  const [showPostExpiry, setShowPostExpiry] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/reports/revenue-saved-whatsapp?days=${days}`),
      api.get(`/api/reports/whatsapp-performance?days=${days}`),
      api.get(`/api/reports/post-expiry-performance?days=${Math.max(days, 30)}`),
    ]).then(([roiRes, perfRes, postRes]) => {
      if (roiRes.success) setRoiData(roiRes.data);
      if (perfRes.success) setPerfData(perfRes.data);
      if (postRes.success) setPostExpiryData(postRes.data);
      setLoading(false);
    });
  }, [days]);

  const formatPercent = (v: number) => `${v.toFixed(1)}%`;

  if (loading) return <LoadingSpinner size="lg" />;

  // ── Section 1: ROI Stats (from whatsapp-saved) ──────────────────────────
  const roiSummary = roiData?.summary;
  const roiRows = Array.isArray(roiData?.rows) ? roiData.rows : [];

  // ── Section 2: Bar chart + perf table (from whatsapp-performance) ────────
  const perfRows = Array.isArray(perfData?.rows) ? perfData.rows : [];

  // ── Section 3: Post-expiry (from post-expiry-performance) ─────────────────
  const postSummary = postExpiryData?.summary;
  const postRows = Array.isArray(postExpiryData?.rows) ? postExpiryData.rows : [];

  return (
    <div className="space-y-6">

      {/* ── ROI Stat Cards ── */}
      {roiSummary ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            animate
            label={lang === 'ar' ? 'الإيراد المحفوظ' : 'Revenue Saved'}
            value={formatCurrencyCompact(roiSummary.revenueSaved ?? 0)}
            color="text-success"
            valueSize="text-2xl"
          />
          <StatCard
            animate
            label={lang === 'ar' ? 'الرسائل المرسلة' : 'Messages Sent'}
            value={roiSummary.messagesSent ?? 0}
            color="text-foreground"
            valueSize="text-2xl"
          />
          <StatCard
            animate
            label={lang === 'ar' ? 'الأعضاء الذين جددوا' : 'Renewals Won'}
            value={roiSummary.renewalsWon ?? 0}
            color="text-primary"
            valueSize="text-2xl"
          />
          <StatCard
            animate
            label={lang === 'ar' ? 'معدل التحويل' : 'Conversion Rate'}
            value={formatPercent(
              (roiSummary.messagesSent ?? 0) > 0
                ? ((roiSummary.renewalsWon ?? 0) / (roiSummary.messagesSent ?? 1)) * 100
                : 0
            )}
            color="text-warning"
            valueSize="text-2xl"
          />
        </div>
      ) : (
        <div className="border-2 border-border bg-card py-12 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            {lang === 'ar' ? 'لا بيانات واتساب بعد' : 'No WhatsApp data yet'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === 'ar'
              ? 'بعد ربط واتساب وإرسال أول تذكير ستظهر البيانات هنا.'
              : 'Once you connect WhatsApp and send your first reminder, data will appear here.'}
          </p>
        </div>
      )}

      {/* ── Bar Chart — revenue saved by message type ── */}
      {perfRows.length > 0 && <WhatsAppRevenueBar data={perfRows} lang={lang} />}

      {/* ── Performance Table — message type breakdown ── */}
      {perfRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {lang === 'ar' ? 'أداء الرسائل حسب النوع' : 'WhatsApp Message Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: 'messageType',
                  label: lang === 'ar' ? 'النوع' : 'Type',
                  render: (row: any) =>
                    getAutomationWarningLabel(row.messageType, lang === 'ar' ? 'ar' : 'en'),
                },
                { key: 'messagesSent',   label: lang === 'ar' ? 'تم الإرسال' : 'Sent' },
                { key: 'membersReached', label: lang === 'ar' ? 'الأعضاء' : 'Members' },
                { key: 'renewalsWon',    label: lang === 'ar' ? 'التجديدات' : 'Renewals' },
                {
                  key: 'revenueSaved',
                  label: lang === 'ar' ? 'الإيراد المستعاد' : 'Recovered Revenue',
                  render: (row: any) => formatCurrency(row.revenueSaved || 0),
                },
              ]}
              data={perfRows}
              emptyMessage={lang === 'ar' ? 'لا بيانات بعد.' : 'No data yet.'}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {lang === 'ar'
                ? `يتم احتساب الإيراد المنسوب خلال ${perfData?.attributionWindowDays ?? 14} يوماً لرسائل التجديد.`
                : `Renewal-linked saved revenue uses a ${perfData?.attributionWindowDays ?? 14}-day attribution window.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Post-Expiry Recovery (collapsible) ── */}
      <div className="border-2 border-border">
        {/* Toggle header */}
        <button
          onClick={() => setShowPostExpiry((v) => !v)}
          className="flex w-full items-center justify-between bg-card px-4 py-3 text-start text-sm font-semibold hover:bg-secondary/20 transition-colors"
        >
          <span>{lang === 'ar' ? 'استرداد ما بعد انتهاء الاشتراك' : 'Post-Expiry Recovery'}</span>
          <span className="text-muted-foreground text-xs">
            {showPostExpiry
              ? (lang === 'ar' ? 'إخفاء ▲' : 'Hide ▲')
              : (lang === 'ar' ? 'عرض ▼' : 'Show ▼')}
          </span>
        </button>

        {showPostExpiry && (
          <div className="p-4 space-y-4 border-t-2 border-border">
            {postSummary ? (
              <>
                {/* Post-expiry stat cards */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard
                    animate
                    label={lang === 'ar' ? 'أعضاء في التسلسل' : 'Members In Sequence'}
                    value={postSummary.membersInSequence ?? 0}
                    color="text-warning"
                    valueSize="text-2xl"
                  />
                  <StatCard
                    animate
                    label={lang === 'ar' ? 'رسائل مرسلة' : 'Messages Sent'}
                    value={postSummary.messagesSent ?? 0}
                    color="text-foreground"
                    valueSize="text-2xl"
                  />
                  <StatCard
                    animate
                    label={lang === 'ar' ? 'تجديدات ناجحة' : 'Renewals Won'}
                    value={postSummary.renewalsWon ?? 0}
                    color="text-success"
                    valueSize="text-2xl"
                  />
                  <StatCard
                    animate
                    label={lang === 'ar' ? 'إيراد محفوظ' : 'Revenue Saved'}
                    value={formatCurrencyCompact(postSummary.revenueSaved ?? 0)}
                    color="text-primary"
                    valueSize="text-2xl"
                  />
                </div>

                {/* Step-by-step table */}
                <DataTable
                  columns={[
                    {
                      key: 'step',
                      label: lang === 'ar' ? 'اليوم' : 'Day',
                      render: (row: any) => (row.step === 0 ? 'Day 0' : `Day ${row.step}`),
                    },
                    { key: 'messagesSent',   label: lang === 'ar' ? 'تم الإرسال' : 'Sent' },
                    { key: 'membersReached', label: lang === 'ar' ? 'الأعضاء' : 'Members' },
                    { key: 'renewalsWon',    label: lang === 'ar' ? 'التجديدات' : 'Renewals' },
                    {
                      key: 'revenueSaved',
                      label: lang === 'ar' ? 'الإيراد' : 'Revenue',
                      render: (row: any) => formatCurrency(row.revenueSaved ?? 0),
                    },
                  ]}
                  data={postRows}
                  emptyMessage={lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No post-expiry sequence data yet.'}
                />
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
