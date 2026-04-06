'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatDateTime, daysUntil, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import DataTable from '@/components/dashboard/DataTable';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAYMENT_METHOD_UI_ENABLED } from '@/lib/payment-method-ui';

// Load chart code only when a chart tab is actually opened.
const DailyStatsChart = dynamic(() => import('@/components/dashboard/reports/DailyStatsChart'), {
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const DenialReasonsChart = dynamic(() => import('@/components/dashboard/reports/DenialReasonsChart'), {
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

// Drill-down tabs — Overview is always pinned above as a stats bar
const TABS = [
  { key: 'revenue-at-risk', label: { en: 'Revenue At Risk', ar: 'الإيراد المعرّض للخطر' } },
  { key: 'whatsapp-saved', label: { en: 'WhatsApp ROI', ar: 'عائد واتساب' } },
  { key: 'plan-revenue', label: { en: 'Plan Revenue', ar: 'إيراد الخطط' } },
  { key: 'retention-churn', label: { en: 'Retention', ar: 'الاحتفاظ' } },
  { key: 'at-risk-members', label: { en: 'At-Risk', ar: 'المعرّضون للخطر' } },
  { key: 'cohort-retention', label: { en: 'Cohorts', ar: 'المجموعات' } },
  { key: 'whatsapp-performance', label: { en: 'WhatsApp Perf', ar: 'أداء واتساب' } },
  { key: 'failed-payments', label: { en: 'Payment Recovery', ar: 'استرداد المدفوعات' } },
  { key: 'ghost-members', label: { en: 'Ghost Members', ar: 'الأعضاء الغائبون' } },
  { key: 'attendance-decline', label: { en: 'Attendance Decline', ar: 'تراجع الحضور' } },
  { key: 'expected-revenue', label: { en: 'Expected Revenue', ar: 'الإيراد المتوقع' } },
  { key: 'renewal-vs-new', label: { en: 'Renewal vs New', ar: 'تجديد مقابل جديد' } },
  { key: 'cash-vs-digital', label: { en: 'Cash vs Digital', ar: 'نقدي مقابل رقمي' } },
  { key: 'referral-funnel', label: { en: 'Referral Funnel', ar: 'مسار الإحالة' } },
  { key: 'post-expiry-performance', label: { en: 'Post-Expiry', ar: 'ما بعد الانتهاء' } },
  { key: 'onboarding-performance', label: { en: 'Onboarding', ar: 'التهيئة' } },
  { key: 'weekly-digest', label: { en: 'Weekly Digest', ar: 'الملخص الأسبوعي' } },
  { key: 'daily-stats',    label: { en: 'Daily Stats',  ar: 'إحصائيات يومية' } },
  { key: 'hourly',         label: { en: 'Hourly',        ar: 'بالساعة' } },
  { key: 'top-members',    label: { en: 'Top Clients',   ar: 'أفضل العملاء' } },
  { key: 'expiring-subs',  label: { en: 'Expiring',      ar: 'تنتهي قريباً' } },
  { key: 'ended-subs',     label: { en: 'Ended Subs',    ar: 'اشتراكات منتهية' } },
  { key: 'denial-reasons', label: { en: 'Denials',       ar: 'أسباب الرفض' } },
  { key: 'denied-entries', label: { en: 'Denied Log',    ar: 'سجل الرفض' } },
] as const;

type TabKey = typeof TABS[number]['key'];
const REPORT_TABS = PAYMENT_METHOD_UI_ENABLED ? TABS : TABS.filter((tab) => tab.key !== 'cash-vs-digital');

// Which tabs show the days period filter
const DAYS_TABS: TabKey[] = [
  'revenue-at-risk',
  'whatsapp-saved',
  'plan-revenue',
  'retention-churn',
  'at-risk-members',
  'failed-payments',
  'ghost-members',
  'attendance-decline',
  'expected-revenue',
  'renewal-vs-new',
  'referral-funnel',
  'post-expiry-performance',
  'onboarding-performance',
  'whatsapp-performance',
  'daily-stats',
  'top-members',
  'denial-reasons',
  'denied-entries',
  'expiring-subs',
];
const DAYS_OPTIONS = [7, 14, 30, 60, 90];

const PIE_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))",
  "hsl(var(--chart-1) / 0.6)",
];

export default function ReportsPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const [tab, setTab] = useState<TabKey>('revenue-at-risk');
  const [days, setDays] = useState(30);

  // Overview stats — always fetched on mount, always visible
  const [overviewData, setOverviewData] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Drill-down tab data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const planLabel = (months: number) => {
    if (months <= 0) return lang === 'ar' ? 'غير محدد' : 'Unspecified';
    if (lang === 'ar') return `${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
    return `${months} month${months === 1 ? '' : 's'}`;
  };
  const toNumber = (value: unknown, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };
  const riskItems = Array.isArray(data?.items) ? data.items : Array.isArray(data?.rows) ? data.rows : [];
  const riskSummary = data?.summary ?? null;

  // Fetch overview once on mount (independent of tab state)
  useEffect(() => {
    let cancelled = false;
    setOverviewLoading(true);
    api.get('/api/reports/overview').then((res) => {
      if (cancelled) return;
      if (res.success) setOverviewData(res.data);
      setOverviewLoading(false);
    }).catch(() => { if (!cancelled) setOverviewLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const buildUrl = useCallback((activeTab: TabKey, d: number) => {
    switch (activeTab) {
      case 'revenue-at-risk': return `/api/reports/revenue-at-risk?days=${d}`;
      case 'whatsapp-saved': return `/api/reports/revenue-saved-whatsapp?days=${d}`;
      case 'plan-revenue':   return `/api/reports/revenue-by-plan?days=${d}`;
      case 'retention-churn': return `/api/reports/retention-churn?days=${d}`;
      case 'at-risk-members': return `/api/reports/at-risk-members?days=${d}`;
      case 'cohort-retention': return '/api/reports/cohort-retention';
      case 'whatsapp-performance': return `/api/reports/whatsapp-performance?days=${d}`;
      case 'failed-payments': return `/api/reports/failed-payments?days=${d}`;
      case 'ghost-members': return `/api/reports/ghost-members?days=${Math.max(d, 30)}`;
      case 'attendance-decline': return `/api/reports/attendance-decline?days=${Math.max(d, 14)}`;
      case 'expected-revenue': return `/api/reports/expected-revenue?days=${Math.max(d, 30)}`;
      case 'renewal-vs-new': return `/api/reports/renewal-vs-new?days=${d}`;
      case 'cash-vs-digital': return '/api/reports/cash-vs-digital';
      case 'referral-funnel': return `/api/reports/referral-funnel?days=${Math.max(d, 30)}`;
      case 'post-expiry-performance': return `/api/reports/post-expiry-performance?days=${Math.max(d, 30)}`;
      case 'onboarding-performance': return `/api/reports/onboarding-performance?days=${Math.max(d, 30)}`;
      case 'weekly-digest': return '/api/reports/weekly-digest';
      case 'daily-stats':    return `/api/reports/daily-stats?days=${d}`;
      case 'hourly':         return '/api/reports/hourly-distribution';
      case 'top-members':    return `/api/reports/top-members?days=${d}&limit=10`;
      case 'denial-reasons': return `/api/reports/denial-reasons?days=${d}`;
      case 'denied-entries': return `/api/reports/denied-entries?days=${d}`;
      case 'expiring-subs':  return `/api/reports/expiring-subscriptions?days=${d}`;
      case 'ended-subs':     return '/api/reports/ended-subscriptions?limit=200';
    }
  }, []);

  const loadTabData = useCallback(async (activeTab: TabKey, d: number) => {
    const url = buildUrl(activeTab, d);
    if (!url) return null;

    const res = await api.get(url);
    if (!res.success) {
      throw new Error(res.message || labels.error);
    }
    const payload = res.data as any;

    return payload;
  }, [buildUrl, labels.error]);

  // Fetch tab data when tab or days changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    loadTabData(tab, days).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    }).catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : labels.error);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tab, days, labels.error, loadTabData]);

  const getRechartStyles = () => {
    const fg = "hsl(var(--foreground))";
    const muted = "hsl(var(--muted-foreground))";
    const bg = "hsl(var(--background))";
    const border = "hsl(var(--border))";
    return {
      axis: { fill: muted, fontSize: 12 },
      gridStroke: border,
      tooltipContent: { backgroundColor: bg, border: `2px solid ${border}`, borderRadius: 0 },
      tooltipLabel: { color: fg },
      tooltipItem: { color: fg },
      legendItem: { color: muted },
    };
  };
  const rs = getRechartStyles();

  const showDaysFilter = DAYS_TABS.includes(tab);
  const failedPaymentsRows = tab === 'failed-payments' && Array.isArray(data?.rows) ? data.rows : [];
  const failedPaymentsSummary = tab === 'failed-payments' ? data?.summary : null;
  const ghostRows = tab === 'ghost-members' && data?.rows ? data.rows : [];
  const ghostSummary = tab === 'ghost-members' ? data?.summary : null;
  const declineRows = tab === 'attendance-decline' && data?.rows ? data.rows : [];
  const declineSummary = tab === 'attendance-decline' ? data?.summary : null;
  const expectedRevenueSummary = tab === 'expected-revenue' ? data?.summary : null;
  const renewalRows = tab === 'renewal-vs-new' && Array.isArray(data?.rows) ? data.rows : [];
  const renewalSummary = tab === 'renewal-vs-new' ? data?.summary : null;
  const referralRows = tab === 'referral-funnel' && Array.isArray(data?.rows) ? data.rows : [];
  const referralSummary = tab === 'referral-funnel' ? data?.summary : null;
  const postExpiryRows = tab === 'post-expiry-performance' && Array.isArray(data?.rows) ? data.rows : [];
  const postExpirySummary = tab === 'post-expiry-performance' ? data?.summary : null;
  const onboardingRows = tab === 'onboarding-performance' && Array.isArray(data?.rows) ? data.rows : [];
  const onboardingSummary = tab === 'onboarding-performance' ? data?.summary : null;
  const digest = tab === 'weekly-digest' ? data : null;
  const oldestFailedDue: number | null = failedPaymentsRows.reduce((oldest: number | null, row: any) => {
    const parsed = Number(row.dueDate);
    if (!Number.isFinite(parsed)) return oldest;
    return oldest === null || parsed < oldest ? parsed : oldest;
  }, null as number | null);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold">{labels.reports}</h1>

      {/* ── Always-visible overview stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {overviewLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-2 border-border bg-card h-[80px] animate-pulse" />
          ))
        ) : overviewData ? (
          <>
            <StatCard label={labels.total_members} value={overviewData.totalMembers ?? 0} color="text-foreground" />
            <StatCard label={labels.active_subscriptions} value={overviewData.activeSubscriptions ?? 0} color="text-success" />
            <StatCard label={labels.expired_subscriptions} value={overviewData.expiredSubscriptions ?? 0} color="text-destructive" />
            <StatCard label={labels.total_revenue} value={formatCurrencyCompact(overviewData.totalRevenue ?? 0)} color="text-primary" valueSize="text-2xl" />
            <StatCard label={labels.allowed_today} value={overviewData.todayStats?.allowed ?? 0} color="text-success" />
            <StatCard label={labels.denied_today} value={overviewData.todayStats?.denied ?? 0} color="text-destructive" subtitle={`${labels.warning}: ${overviewData.todayStats?.warning ?? 0}`} />
          </>
        ) : null}
      </div>

      {/* ── Horizontal command bar ── */}
      <div className="flex flex-col">
        <div className="flex items-stretch border-b border-border overflow-x-auto no-scrollbar">
          {REPORT_TABS.map((item, i) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                borderBottom: `3px solid ${tab === item.key ? '#e63946' : 'transparent'}`,
                marginBottom: '-1px',
              }}
              className={cn(
                'px-4 py-3 text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors',
                i < REPORT_TABS.length - 1 && 'border-e border-border',
                tab === item.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label[lang]}
            </button>
          ))}
        </div>

        {/* Period filter — below the tab row so it's always reachable */}
        {showDaysFilter && (
          <div className="flex items-center justify-end px-1 py-2 border-b border-border bg-background">
            <Select value={days.toString()} onValueChange={(v) => setDays(Number(v))} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d.toString()}>{d} {labels.days}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Drill-down content ── */}
      {loading ? (
        <LoadingSpinner size="lg" />
      ) : error ? (
        <Alert variant="destructive">
          <Terminal className={cn("h-4 w-4 me-2")} />
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">

          {tab === 'revenue-at-risk' && (riskSummary && riskItems.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label={labels.revenue_at_risk}
                  value={formatCurrencyCompact(riskSummary.revenueAtRisk ?? riskSummary.totalValue ?? 0)}
                  color="text-destructive"
                  valueSize="text-2xl"
                />
                <StatCard
                  label={labels.members_in_window}
                  value={riskSummary.membersInWindow ?? riskSummary.memberCount ?? 0}
                  color="text-foreground"
                  valueSize="text-2xl"
                />
                <StatCard
                  label={labels.already_reminded}
                  value={formatCurrencyCompact(riskSummary.remindedValue ?? 0)}
                  color="text-warning"
                  valueSize="text-2xl"
                />
                <StatCard
                  label={labels.revenue_secured}
                  value={formatCurrencyCompact(riskSummary.revenueSecured ?? riskSummary.renewedValue ?? 0)}
                  color="text-success"
                  valueSize="text-2xl"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{labels.revenue_at_risk}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'الأعضاء الذين تنتهي اشتراكاتهم قريباً مع حالة التذكير والتجديد'
                      : 'Members with subscriptions ending soon, plus reminder and renewal status'}
                  </p>
                </CardHeader>
                <CardContent>
                  <DataTable
                    searchable
                    columns={[
                      { key: 'name', label: labels.name },
                      { key: 'phone', label: labels.phone },
                      { key: 'planMonths', label: labels.plan, render: (row: any) => planLabel(row.planMonths ?? row.plan_months ?? 0) },
                      { key: 'end_date', label: labels.end_date, render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US') },
                      { key: 'days_left', label: labels.days_left, render: (row: any) => {
                        const d = row.days_left ?? daysUntil(row.end_date);
                        return <span className={d <= 3 ? 'font-bold text-destructive' : 'text-warning'}>{d}</span>;
                      } },
                      { key: 'amountAtRisk', label: labels.amount_at_risk, render: (row: any) => formatCurrency(row.amountAtRisk ?? row.amount_at_risk ?? 0) },
                      {
                        key: 'reminder_status',
                        label: labels.reminder_status,
                        render: (row: any) => (
                          <span className={row.reminder_status === 'sent' || row.reminder_status === 'reminded' ? 'font-semibold text-warning' : 'text-muted-foreground'}>
                            {row.reminder_status === 'sent' || row.reminder_status === 'reminded'
                              ? labels.already_reminded
                              : row.reminder_status === 'queued'
                                ? (lang === 'ar' ? 'مجدول' : 'Queued')
                                : labels.not_reminded_yet}
                          </span>
                        ),
                      },
                      {
                        key: 'renewed',
                        label: labels.renewal_status,
                        render: (row: any) => (
                          <span className={row.renewed || row.renewal_status === 'renewed' ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                            {row.renewed || row.renewal_status === 'renewed' ? labels.already_renewed : labels.at_risk_status}
                          </span>
                        ),
                      },
                    ]}
                    data={riskItems}
                    emptyMessage={labels.no_expiring_revenue_risk}
                  />
                </CardContent>
              </Card>
            </>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات لهذا التبويب بعد.' : 'No data available for this report yet.'}</p>)}

          {tab === 'whatsapp-saved' && (data?.summary && Array.isArray(data.rows) ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'الإيراد المحفوظ' : 'Revenue Saved'} value={formatCurrencyCompact(data.summary.revenueSaved ?? 0)} color="text-success" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الرسائل المرسلة' : 'Messages Sent'} value={data.summary.messagesSent ?? 0} color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الأعضاء الذين جددوا' : 'Renewals Won'} value={data.summary.renewalsWon ?? 0} color="text-primary" valueSize="text-2xl" />
                <StatCard
                  label={lang === 'ar' ? 'معدل التحويل' : 'Conversion Rate'}
                  value={formatPercent((data.summary.messagesSent ?? 0) > 0 ? ((data.summary.renewalsWon ?? 0) / (data.summary.messagesSent ?? 1)) * 100 : 0)}
                  color="text-warning"
                  valueSize="text-2xl"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'أداء تذكيرات واتساب' : 'WhatsApp Reminder Performance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'reminderDays', label: lang === 'ar' ? 'التوقيت' : 'Timing', render: (row: any) => lang === 'ar' ? `قبل ${row.reminderDays} يوم` : `${row.reminderDays} days before` },
                      { key: 'messagesSent', label: lang === 'ar' ? 'تم الإرسال' : 'Sent' },
                      { key: 'membersReached', label: lang === 'ar' ? 'الأعضاء' : 'Members' },
                      { key: 'renewalsWon', label: lang === 'ar' ? 'التجديدات' : 'Renewals' },
                      { key: 'conversion', label: lang === 'ar' ? 'التحويل' : 'Conversion', render: (row: any) => formatPercent(row.messagesSent > 0 ? (row.renewalsWon / row.messagesSent) * 100 : 0) },
                      { key: 'revenueSaved', label: lang === 'ar' ? 'الإيراد المحفوظ' : 'Revenue Saved', render: (row: any) => formatCurrency(row.revenueSaved || 0) },
                    ]}
                    data={data.rows}
                  />
                  <p className="mt-3 text-xs text-muted-foreground">
                    {lang === 'ar'
                      ? `يتم احتساب الإيراد المحفوظ إذا تم التجديد خلال ${data.attributionWindowDays ?? 14} يوماً من الرسالة.`
                      : `Revenue is counted as saved only when renewal happens within ${data.attributionWindowDays ?? 14} days of the reminder.`}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات لهذا التبويب بعد.' : 'No data available for this report yet.'}</p>)}

          {tab === 'plan-revenue' && Array.isArray(data) && (
            <Card>
              <CardHeader>
                <CardTitle>{lang === 'ar' ? 'الإيراد حسب نوع الخطة' : 'Revenue by Plan Type'}</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'planMonths', label: labels.plan, render: (row: any) => planLabel(row.planMonths) },
                    { key: 'activeMembers', label: lang === 'ar' ? 'الأعضاء النشطون' : 'Active Members' },
                    { key: 'totalRevenue', label: lang === 'ar' ? 'إجمالي الإيراد' : 'Total Revenue', render: (row: any) => formatCurrency(row.totalRevenue || 0) },
                    { key: 'renewalCount', label: lang === 'ar' ? 'التجديدات' : 'Renewals' },
                    { key: 'averageValue', label: lang === 'ar' ? 'متوسط القيمة' : 'Average Value', render: (row: any) => formatCurrency(row.averageValue || 0) },
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          )}

          {tab === 'retention-churn' && data?.summary && Array.isArray(data.rows) && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'الاحتفاظ' : 'Retention Rate'} value={formatPercent(data.summary.retentionRate ?? 0)} color="text-success" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'التسرب' : 'Churn Rate'} value={formatPercent(data.summary.churnRate ?? 0)} color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الأعضاء المفقودون' : 'Members Lost'} value={data.summary.churnedMembers ?? 0} color="text-warning" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الإيراد المفقود' : 'Lost Revenue'} value={formatCurrencyCompact(data.summary.lostRevenue ?? 0)} color="text-primary" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الأعضاء الذين فقدتهم' : 'Members Lost In This Window'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name', label: labels.name },
                      { key: 'phone', label: labels.phone },
                      { key: 'endDate', label: labels.end_date, render: (row: any) => formatDate(row.endDate, lang === 'ar' ? 'ar-EG' : 'en-US') },
                      { key: 'lostValue', label: lang === 'ar' ? 'القيمة' : 'Lost Value', render: (row: any) => formatCurrency(row.lostValue || 0) },
                    ]}
                    data={data.rows}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'at-risk-members' && data?.summary && Array.isArray(data.rows) && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard label={lang === 'ar' ? 'أعضاء معرضون للخطر' : 'At-Risk Members'} value={data.summary.memberCount ?? 0} color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'خطر مرتفع' : 'High Risk'} value={data.summary.highRiskCount ?? 0} color="text-warning" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'حد الخمول' : 'Inactivity Threshold'} value={`${data.thresholdDays ?? days} ${labels.days}`} color="text-foreground" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الأعضاء الأكثر عرضة للتسرب' : 'Members Most Likely To Churn'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name', label: labels.name },
                      { key: 'phone', label: labels.phone },
                      { key: 'lastVisit', label: lang === 'ar' ? 'آخر زيارة' : 'Last Visit', render: (row: any) => row.lastVisit ? formatDate(row.lastVisit, lang === 'ar' ? 'ar-EG' : 'en-US') : '—' },
                      { key: 'recentVisits', label: lang === 'ar' ? 'زيارات حديثة' : 'Recent Visits' },
                      { key: 'previousVisits', label: lang === 'ar' ? 'قبلها' : 'Previous Visits' },
                      { key: 'riskLevel', label: lang === 'ar' ? 'الخطورة' : 'Risk', render: (row: any) => (
                        <span className={row.riskLevel === 'high' ? 'text-destructive font-bold' : row.riskLevel === 'medium' ? 'text-warning font-bold' : 'text-muted-foreground'}>
                          {row.riskLevel}
                        </span>
                      )},
                      { key: 'riskReason', label: lang === 'ar' ? 'السبب' : 'Reason' },
                    ]}
                    data={data.rows}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'cohort-retention' && Array.isArray(data) && (
            <Card>
              <CardHeader>
                <CardTitle>{lang === 'ar' ? 'الاحتفاظ حسب شهر الانضمام' : 'Cohort Retention'}</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'cohortMonth', label: lang === 'ar' ? 'شهر الانضمام' : 'Cohort' },
                    { key: 'joinedMembers', label: lang === 'ar' ? 'المنضمون' : 'Joined' },
                    { key: 'stillActive', label: lang === 'ar' ? 'ما زالوا نشطين' : 'Still Active' },
                    { key: 'retentionRate', label: lang === 'ar' ? 'الاحتفاظ' : 'Retention', render: (row: any) => formatPercent(row.retentionRate || 0) },
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          )}

          {tab === 'whatsapp-performance' && data?.rows && Array.isArray(data.rows) && (
            <Card>
              <CardHeader>
                <CardTitle>{lang === 'ar' ? 'أداء الرسائل حسب النوع' : 'WhatsApp Message Performance'}</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'messageType', label: lang === 'ar' ? 'النوع' : 'Type' },
                    { key: 'messagesSent', label: lang === 'ar' ? 'تم الإرسال' : 'Sent' },
                    { key: 'membersReached', label: lang === 'ar' ? 'الأعضاء' : 'Members' },
                    { key: 'renewalsWon', label: lang === 'ar' ? 'التجديدات' : 'Renewals' },
                    { key: 'revenueSaved', label: lang === 'ar' ? 'الإيراد المحفوظ' : 'Revenue Saved', render: (row: any) => formatCurrency(row.revenueSaved || 0) },
                  ]}
                  data={data.rows}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {lang === 'ar'
                    ? `يتم احتساب الإيراد المنسوب خلال ${data.attributionWindowDays ?? 14} يوماً لرسائل التجديد.`
                    : `Renewal-linked saved revenue uses a ${data.attributionWindowDays ?? 14}-day attribution window.`}
                </p>
              </CardContent>
            </Card>
          )}

          {tab === 'failed-payments' && Array.isArray(failedPaymentsRows) && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'القيمة المعرضة' : 'Recovery Queue Value'} value={formatCurrencyCompact(failedPaymentsSummary?.failedPaymentValue ?? 0)} color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الحالات المفتوحة' : 'Open Cases'} value={failedPaymentsSummary?.unresolvedCount ?? failedPaymentsRows.length} color="text-warning" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'أقدم استحقاق' : 'Oldest Due'} value={oldestFailedDue ? formatDate(oldestFailedDue, lang === 'ar' ? 'ar-EG' : 'en-US') : (lang === 'ar' ? 'غير متاح' : 'N/A')} color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تم استرداده' : 'Recovered Value'} value={formatCurrencyCompact(failedPaymentsSummary?.recoveredValue ?? 0)} color="text-success" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'استرداد المدفوعات المتأخرة' : 'Payment Recovery Queue'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'تستخدم GymFlow الرصيد المتأخر كقائمة مراجعة مؤقتة إلى أن يتم تتبع حالات فشل الدفع بشكل منفصل.'
                      : 'GymFlow uses overdue balances as the recovery queue until explicit failed-payment events are tracked.'}
                  </p>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name', label: labels.name },
                      { key: 'phone', label: labels.phone },
                      { key: 'amountDue', label: labels.amount_due, render: (row: any) => formatCurrency(toNumber(row.amountDue)) },
                      { key: 'daysOverdue', label: lang === 'ar' ? 'أيام التأخير' : 'Days Overdue' },
                      { key: 'reminderStatus', label: lang === 'ar' ? 'التذكير' : 'Reminder' },
                      { key: 'dueDate', label: labels.due_date, render: (row: any) => formatDate(row.dueDate, lang === 'ar' ? 'ar-EG' : 'en-US') },
                    ]}
                    data={failedPaymentsRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد مدفوعات متأخرة الآن.' : 'No overdue payments right now.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'ghost-members' && Array.isArray(ghostRows) && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard label={lang === 'ar' ? 'أعضاء غائبون' : 'Ghost Members'} value={ghostSummary?.ghostMembers ?? ghostRows.length} color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'حد الغياب' : 'Inactivity Threshold'} value={`${days} ${labels.days}`} color="text-warning" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'أطول غياب' : 'Longest Absence'} value={`${ghostSummary?.longestAbsenceDays ?? 0} ${labels.days}`} color="text-foreground" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الأعضاء النشطون الذين توقفوا عن الحضور' : 'Active Members Who Stopped Showing Up'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name', label: labels.name },
                      { key: 'phone', label: labels.phone },
                      { key: 'lastVisit', label: lang === 'ar' ? 'آخر زيارة' : 'Last Visit', render: (row: any) => row.lastVisit ? formatDate(row.lastVisit, lang === 'ar' ? 'ar-EG' : 'en-US') : '—' },
                      { key: 'daysSinceLastVisit', label: lang === 'ar' ? 'أيام منذ آخر حضور' : 'Days Since Last Visit', render: (row: any) => row.daysSinceLastVisit ?? '—' },
                      { key: 'recentVisits', label: lang === 'ar' ? 'زيارات حديثة' : 'Recent Visits' },
                    ]}
                    data={ghostRows}
                    emptyMessage={lang === 'ar' ? 'لا يوجد أعضاء غائبون ضمن هذه الفترة.' : 'No ghost members in this window.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'attendance-decline' && Array.isArray(declineRows) && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard label={lang === 'ar' ? 'تراجع الحضور' : 'Attendance Declines'} value={declineSummary?.memberCount ?? declineRows.length} color="text-warning" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تراجع حاد' : 'Sharp Drops'} value={declineSummary?.highSeverityCount ?? declineRows.filter((row: any) => row.severity === 'high').length} color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'آخر 14 يوم' : 'Last 14 Days'} value={`${days} ${labels.days}`} color="text-foreground" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الأعضاء الذين انخفض حضورهم' : 'Members With Declining Attendance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name', label: labels.name },
                      { key: 'phone', label: labels.phone },
                      { key: 'previousVisits', label: lang === 'ar' ? 'الفترة السابقة' : 'Previous Visits' },
                      { key: 'recentVisits', label: lang === 'ar' ? 'الفترة الحالية' : 'Recent Visits' },
                      { key: 'declinePercent', label: lang === 'ar' ? 'نسبة التراجع' : 'Decline', render: (row: any) => formatPercent(row.declinePercent ?? 0) },
                      { key: 'severity', label: lang === 'ar' ? 'الحدة' : 'Severity' },
                    ]}
                    data={declineRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد حالات تراجع واضحة حالياً.' : 'No attendance drops are flagged right now.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'expected-revenue' && expectedRevenueSummary && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'الإيراد المتوقع' : 'Projected 30 Days'} value={formatCurrencyCompact(expectedRevenueSummary.projectedRevenueNext30Days ?? 0)} color="text-success" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الأساس الشهري' : 'Monthly Run Rate'} value={formatCurrencyCompact(expectedRevenueSummary.monthlyRunRate ?? 0)} color="text-primary" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تجديدات مضمونة' : 'Secured Renewals'} value={formatCurrencyCompact(expectedRevenueSummary.securedRenewalValue ?? 0)} color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'المعرّض للتجديد' : 'Renewal Exposure'} value={formatCurrencyCompact(expectedRevenueSummary.renewalExposure ?? 0)} color="text-warning" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'نظرة على الإيراد المتوقع' : 'Expected Revenue Overview'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'يعرض هذا التبويب توقع الدخل القادم من الاشتراكات النشطة والإيرادات الحالية.'
                      : 'This forecast combines current monthly run rate with renewals expected in the next 30 days.'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="border-2 border-border bg-secondary/20 p-4">
                      <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'معدل الاحتفاظ المستخدم' : 'Retention used in forecast'}</p>
                      <p className="text-2xl font-bold text-success">{formatPercent(expectedRevenueSummary.expectedRetentionRate ?? 0)}</p>
                    </div>
                    <div className="border-2 border-border bg-secondary/20 p-4">
                      <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'أعضاء تنتهي اشتراكاتهم قريباً' : 'Members due soon'}</p>
                      <p className="text-2xl font-bold text-primary">{expectedRevenueSummary.membersDue ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'renewal-vs-new' && renewalSummary && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'تجديدات' : 'Renewal Revenue'} value={formatCurrencyCompact(renewalSummary.renewalRevenue ?? 0)} color="text-success" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'اشتراكات جديدة' : 'New Revenue'} value={formatCurrencyCompact(renewalSummary.newRevenue ?? 0)} color="text-primary" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إجمالي الإيراد' : 'Total Revenue'} value={formatCurrencyCompact((renewalSummary.renewalRevenue ?? 0) + (renewalSummary.newRevenue ?? 0))} color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'عدد العمليات' : 'Events'} value={(renewalSummary.renewalCount ?? 0) + (renewalSummary.newCount ?? 0)} color="text-warning" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'التجديد مقابل الاشتراك الجديد' : 'Renewal vs New Revenue'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'day', label: labels.date, render: (row: any) => formatDate(row.day, lang === 'ar' ? 'ar-EG' : 'en-US') },
                      { key: 'newRevenue', label: lang === 'ar' ? 'جديد' : 'New Revenue', render: (row: any) => formatCurrency(toNumber(row.newRevenue)) },
                      { key: 'renewalRevenue', label: lang === 'ar' ? 'تجديد' : 'Renewal Revenue', render: (row: any) => formatCurrency(toNumber(row.renewalRevenue)) },
                      { key: 'newCount', label: lang === 'ar' ? 'عدد الجديد' : 'New Count' },
                      { key: 'renewalCount', label: lang === 'ar' ? 'عدد التجديد' : 'Renewal Count' },
                    ]}
                    data={renewalRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد معاملات كافية لعرض هذا التبويب.' : 'Not enough recent transactions to show this tab.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {PAYMENT_METHOD_UI_ENABLED && tab === 'cash-vs-digital' && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={labels.cash_payment_method} value={formatCurrencyCompact(data?.summary?.cashRevenue ?? 0)} color="text-success" valueSize="text-2xl" />
                <StatCard label={labels.digital_payment_method} value={formatCurrencyCompact(data?.summary?.digitalRevenue ?? 0)} color="text-primary" valueSize="text-2xl" />
                <StatCard label={labels.unknown_payment_method} value={formatCurrencyCompact(data?.summary?.unknownRevenue ?? 0)} color="text-warning" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إجمالي الإيراد' : 'Total Revenue'} value={formatCurrencyCompact(data?.summary?.totalRevenue ?? 0)} color="text-foreground" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'النقدي مقابل الرقمي' : 'Cash vs Digital Split'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'يعرض هذا التبويب الإيراد حسب طريقة الدفع. ستظهر العمليات القديمة بدون طريقة محددة ضمن فئة "غير معروف".'
                      : 'This tab splits revenue by payment method. Older records without a stored method remain under "Unknown".'}
                  </p>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      {
                        key: 'method',
                        label: labels.payment_method_label,
                        render: (row: any) =>
                          row.method === 'cash'
                            ? labels.cash_payment_method
                            : row.method === 'digital'
                              ? labels.digital_payment_method
                              : labels.unknown_payment_method,
                      },
                      { key: 'revenue', label: lang === 'ar' ? 'الإيراد' : 'Revenue', render: (row: any) => formatCurrency(toNumber(row.revenue)) },
                      { key: 'count', label: lang === 'ar' ? 'عدد العمليات' : 'Transactions' },
                    ]}
                    data={Array.isArray(data?.rows) ? data.rows : []}
                    emptyMessage={lang === 'ar' ? 'لا توجد معاملات مالية كافية لهذا التبويب.' : 'Not enough payment records for this tab yet.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'referral-funnel' && Array.isArray(referralRows) && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'دعوات مرسلة' : 'Invites Sent'} value={referralSummary?.invitesSent ?? 0} color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'دعوات مستخدمة' : 'Invites Used'} value={referralSummary?.invitesUsed ?? 0} color="text-warning" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تحويلات' : 'Conversions'} value={referralSummary?.convertedMembers ?? 0} color="text-success" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إيراد الإحالات' : 'Referral Revenue'} value={formatCurrencyCompact(referralSummary?.referralRevenue ?? 0)} color="text-primary" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'مسار الإحالة من الدعوة إلى العضوية' : 'Invite to Member Conversion Funnel'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'inviterName', label: lang === 'ar' ? 'العضو الداعي' : 'Inviter' },
                      { key: 'invitesSent', label: lang === 'ar' ? 'الدعوات' : 'Invites' },
                      { key: 'invitesUsed', label: lang === 'ar' ? 'المستخدمة' : 'Used' },
                      { key: 'convertedMembers', label: lang === 'ar' ? 'التحويلات' : 'Converted' },
                      { key: 'conversionRate', label: lang === 'ar' ? 'التحويل' : 'Conversion', render: (row: any) => formatPercent(row.conversionRate ?? 0) },
                      { key: 'referralRevenue', label: lang === 'ar' ? 'الإيراد' : 'Revenue', render: (row: any) => formatCurrency(toNumber(row.referralRevenue)) },
                    ]}
                    data={referralRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد دعوات مرتبطة حالياً.' : 'No linked invites yet.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'post-expiry-performance' && postExpirySummary && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'أعضاء في التسلسل' : 'Members In Sequence'} value={postExpirySummary.membersInSequence ?? 0} color="text-warning" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'رسائل مرسلة' : 'Messages Sent'} value={postExpirySummary.messagesSent ?? 0} color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تجديدات ناجحة' : 'Renewals Won'} value={postExpirySummary.renewalsWon ?? 0} color="text-success" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إيراد محفوظ' : 'Revenue Saved'} value={formatCurrencyCompact(postExpirySummary.revenueSaved ?? 0)} color="text-primary" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'أداء تسلسل ما بعد انتهاء الاشتراك' : 'Post-Expiry Recovery Performance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'step', label: lang === 'ar' ? 'اليوم' : 'Day', render: (row: any) => row.step === 0 ? 'Day 0' : `Day ${row.step}` },
                      { key: 'messagesSent', label: lang === 'ar' ? 'تم الإرسال' : 'Sent' },
                      { key: 'membersReached', label: lang === 'ar' ? 'الأعضاء' : 'Members' },
                      { key: 'renewalsWon', label: lang === 'ar' ? 'التجديدات' : 'Renewals' },
                      { key: 'revenueSaved', label: lang === 'ar' ? 'الإيراد' : 'Revenue', render: (row: any) => formatCurrency(row.revenueSaved ?? 0) },
                    ]}
                    data={postExpiryRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد بيانات لتسلسل ما بعد الانتهاء بعد.' : 'No post-expiry sequence data yet.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'onboarding-performance' && onboardingSummary && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'أعضاء جدد' : 'New Members'} value={onboardingSummary.joinedMembers ?? 0} color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'أول زيارة' : 'First Visits'} value={onboardingSummary.firstVisitMembers ?? 0} color="text-success" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? '٣ زيارات خلال ١٤ يوم' : '3 Visits In 14 Days'} value={onboardingSummary.completedThreeVisits14d ?? 0} color="text-primary" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تنبيه عدم العودة' : 'No-Return Alerts'} value={onboardingSummary.noReturnAlerts ?? 0} color="text-warning" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'أداء تهيئة أول ٧٢ ساعة' : 'Early Onboarding Performance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'stage', label: lang === 'ar' ? 'المرحلة' : 'Stage' },
                      { key: 'count', label: lang === 'ar' ? 'العدد' : 'Count' },
                    ]}
                    data={onboardingRows.map((row: any) => ({
                      ...row,
                      stage:
                        row.stage === 'welcome' ? (lang === 'ar' ? 'ترحيب' : 'Welcome') :
                        row.stage === 'first_visit' ? (lang === 'ar' ? 'أول زيارة' : 'First Visit') :
                        row.stage === 'first_visit_recognition' ? (lang === 'ar' ? 'رسالة أول زيارة' : 'First Visit Recognition') :
                        row.stage === 'completed_3_visits_14d' ? (lang === 'ar' ? '٣ زيارات خلال ١٤ يوم' : '3 Visits In 14 Days') :
                        row.stage === 'no_return_alert' ? (lang === 'ar' ? 'تنبيه عدم العودة' : 'No-Return Alert') :
                        (lang === 'ar' ? 'انخفاض التفاعل ١٤ يوم' : 'Low Engagement Day 14'),
                    }))}
                    emptyMessage={lang === 'ar' ? 'لا توجد بيانات تهيئة بعد.' : 'No onboarding data yet.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'weekly-digest' && digest && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'إيراد مهدد' : 'Revenue At Risk'} value={formatCurrencyCompact(digest.summary?.revenueAtRisk ?? 0)} color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الاحتفاظ' : 'Retention'} value={formatPercent(digest.summary?.retentionRate ?? 0)} color="text-success" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'رسائل واتساب' : 'WhatsApp Saved'} value={formatCurrencyCompact(digest.summary?.revenueSaved ?? 0)} color="text-primary" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'أعضاء معرضون للخطر' : 'At-Risk Members'} value={digest.summary?.atRiskMembers ?? 0} color="text-warning" valueSize="text-2xl" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'ملخص أسبوعي جاهز للإرسال' : 'Weekly Digest Preview'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'هذا هو الشكل المختصر الذي يمكن إرساله لمالك الصالة كل أسبوع.'
                      : 'This is the short-form summary an owner can receive every week.'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="border-2 border-border bg-secondary/20 p-4">
                      <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'أهم خطر' : 'Top risk'}</p>
                      <p className="font-semibold">{lang === 'ar' ? 'أعضاء يوشكون على انتهاء اشتراكاتهم' : 'Members are nearing subscription expiry'}</p>
                    </div>
                    <div className="border-2 border-border bg-secondary/20 p-4">
                      <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'تأثير واتساب' : 'WhatsApp effect'}</p>
                      <p className="font-semibold">{lang === 'ar' ? 'تذكيرات واتساب تستمر في حماية الإيراد' : 'WhatsApp reminders continue to protect revenue'}</p>
                    </div>
                  </div>
                  <div className="border-2 border-border bg-card p-4">
                    <p className="text-sm leading-7">{digest.message}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Daily Stats — stacked bar chart */}
          {tab === 'daily-stats' && Array.isArray(data) && (
            <DailyStatsChart data={data} labels={labels} styles={rs} />
          )}

          {/* Hourly Distribution — heat map */}
          {tab === 'hourly' && Array.isArray(data) && (() => {
            // Build a 7×24 grid from API data (dow 0=Sun..6=Sat, hour 0..23)
            const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
            let maxCount = 0;
            for (const row of data as { dow: number; hour: number; count: number }[]) {
              const d = Number(row.dow);
              const h = Number(row.hour);
              const c = Number(row.count);
              if (d >= 0 && d < 7 && h >= 0 && h < 24) {
                grid[d][h] = c;
                if (c > maxCount) maxCount = c;
              }
            }

            const dayLabels = lang === 'ar'
              ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
              : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            // Color intensity: transparent → accent red
            const getCellColor = (count: number) => {
              if (count === 0 || maxCount === 0) return 'bg-[#1a1a1a]';
              const intensity = count / maxCount;
              if (intensity < 0.2) return 'bg-[#2b1215]';
              if (intensity < 0.4) return 'bg-[#3d1519]';
              if (intensity < 0.6) return 'bg-[#5c1a1f]';
              if (intensity < 0.8) return 'bg-[#8b2029]';
              return 'bg-[#e63946]';
            };

            // Only show hours 5 AM – 11 PM (typical gym hours)
            const startHour = 5;
            const endHour = 23;
            const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

            return (
              <Card>
                <CardHeader>
                  <CardTitle>{labels.hourly_distribution}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar' ? 'آخر 4 أسابيع — اللون الأغمق = حركة أكثر' : 'Last 4 weeks — darker = more activity'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {/* Hour labels row */}
                    <div className="flex">
                      <div className="w-16 shrink-0" />
                      {hours.map((h) => (
                        <div key={h} className="flex-1 min-w-[32px] text-center text-[10px] text-muted-foreground pb-2">
                          {h === 12 ? (lang === 'ar' ? '12م' : '12p')
                            : h > 12 ? `${h - 12}${lang === 'ar' ? 'م' : 'p'}`
                            : h === 0 ? (lang === 'ar' ? '12ص' : '12a')
                            : `${h}${lang === 'ar' ? 'ص' : 'a'}`}
                        </div>
                      ))}
                    </div>

                    {/* Grid rows */}
                    {dayLabels.map((dayLabel, dow) => (
                      <div key={dow} className="flex items-center">
                        <div className="w-16 shrink-0 text-xs text-muted-foreground pe-3 text-end">{dayLabel}</div>
                        {hours.map((h) => {
                          const count = grid[dow][h];
                          return (
                            <div
                              key={h}
                              className={`flex-1 min-w-[32px] aspect-square m-[1px] ${getCellColor(count)} border border-[#0a0a0a] transition-colors group relative`}
                              title={`${dayLabel} ${h}:00 — ${count} ${lang === 'ar' ? 'تسجيل' : 'check-ins'}`}
                            >
                              {/* Show count on hover */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white z-10">
                                {count > 0 ? count : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-2 pt-4">
                      <span className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'أقل' : 'Less'}</span>
                      {['bg-[#1a1a1a]', 'bg-[#2b1215]', 'bg-[#3d1519]', 'bg-[#5c1a1f]', 'bg-[#8b2029]', 'bg-[#e63946]'].map((c, i) => (
                        <div key={i} className={`w-4 h-4 ${c} border border-[#0a0a0a]`} />
                      ))}
                      <span className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'أكثر' : 'More'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Top Members — data table */}
          {tab === 'top-members' && Array.isArray(data) && (
            <Card>
              <CardHeader><CardTitle>{labels.top_members}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'rank', label: labels.rank },
                    { key: 'name', label: labels.name },
                    { key: 'visits', label: labels.visits },
                  ]}
                  data={data.map((m: any, i: number) => ({ ...m, rank: i + 1 }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Expiring Subscriptions — data table */}
          {tab === 'expiring-subs' && Array.isArray(data) && (
            <Card>
              <CardHeader><CardTitle>{labels.expiring_subscriptions}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: labels.name },
                    { key: 'phone', label: labels.phone },
                    { key: 'end_date', label: labels.end_date, render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US') },
                    { key: 'days_left', label: labels.days_left, render: (row: any) => {
                      const d = daysUntil(row.end_date);
                      return <span className={d <= 2 ? 'text-destructive font-bold' : 'text-warning'}>{d}</span>;
                    }},
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          )}

          {/* Ended Subscriptions — data table */}
          {tab === 'ended-subs' && Array.isArray(data) && (
            <Card>
              <CardHeader><CardTitle>{labels.expired_subscriptions}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: labels.name },
                    { key: 'phone', label: labels.phone },
                    { key: 'end_date', label: labels.end_date, render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US') },
                    { key: 'status', label: labels.status, render: (row: any) => (
                      <span className={row.status === 'expired' ? 'text-destructive font-bold' : 'text-warning'}>
                        {row.status}
                      </span>
                    ) },
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          )}

          {/* Denial Reasons — pie chart */}
          {tab === 'denial-reasons' && Array.isArray(data) && (
            <DenialReasonsChart data={data} labels={labels} styles={rs} colors={PIE_COLORS} />
          )}

          {/* Denied Entries — data table */}
          {tab === 'denied-entries' && Array.isArray(data) && (
            <Card>
              <CardHeader><CardTitle>{labels.denied_entries}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: labels.name },
                    { key: 'timestamp', label: labels.time, render: (row: any) => formatDateTime(row.timestamp, lang === 'ar' ? 'ar-EG' : 'en-US') },
                    { key: 'reason_code', label: labels.reason },
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          )}

          {/* Fallback empty state for tabs that need summary data but have none */}
          {(['retention-churn', 'at-risk-members', 'expected-revenue', 'renewal-vs-new', 'post-expiry-performance', 'onboarding-performance', 'weekly-digest'] as TabKey[]).includes(tab) && !data?.summary && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد بيانات كافية لهذا التبويب بعد.' : 'Not enough data for this report yet.'}
            </p>
          )}

        </div>
      )}
    </div>
  );
}
