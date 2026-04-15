'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MiniArea } from '@derpdaderp/chartkit';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@/lib/format';
import { getCachedIncomeSummary, getCachedMonthlyIncome, getCachedRecentPayments } from '@/lib/offline/read-model';
import StatCard from '@/components/dashboard/StatCard';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const MonthCalendarDialog = dynamic(() => import('@/components/dashboard/MonthCalendarDialog'));

type Summary = {
  totalRevenue: number;
  expectedMonthly: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  ptRevenueThisMonth: number;
  activeSubscriptionCount: number;
};
type MonthlyRow = {
  month: string;
  revenue: number;
  subscriptionRevenue: number;
  guestRevenue: number;
  ptRevenue: number;
  count: number;
};
type Payment = {
  id: number | string;
  date: string;
  type: string;
  name: string;
  amount: number;
  planMonths: number;
  sessionsPerMonth: number | null;
  packageTitle?: string | null;
};

export default function IncomePage() {
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [recent, setRecent] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [s, m, r] = await Promise.all([
          api.get<Summary>('/api/income/summary'),
          api.get<MonthlyRow[]>('/api/income/monthly'),
          api.get<Payment[]>('/api/income/recent?limit=10'),
        ]);
        if (!mounted) return;
        if (s.data) setSummary(s.data);
        if (m.data) setMonthly(m.data);
        if (r.data) setRecent(r.data);
      } catch (error) {
        if (!mounted) return;
        console.error('Failed to load income data from API', error);
        // Offline fallback
        try {
          const [summaryData, monthlyData, recentData] = await Promise.all([
            getCachedIncomeSummary(),
            getCachedMonthlyIncome(),
            getCachedRecentPayments(10),
          ]);
          setSummary(summaryData as Summary);
          setMonthly(monthlyData as MonthlyRow[]);
          setRecent(recentData as Payment[]);
        } catch (error) {
          console.error('Failed to load cached income data', error);
        }
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const fmt = (n: number) => formatCurrency(n);
  const fmtMonth = (m: string) =>
    new Date(m + '-01').toLocaleDateString(locale, { year: 'numeric', month: 'long' });

  // Revenue trend data for the chart (last 6 months, oldest first)
  const chartData = [...monthly].reverse().slice(-6).map(r => r.revenue);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><LoadingSpinner /></div>;
  }

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">{labels.income}</h1>
        <p className="text-sm text-muted-foreground">{labels.income_subtitle}</p>
      </div>

      {/* ── Stat Cards ── */}
      {summary && (
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label={lang === 'ar' ? 'إيراد هذا الشهر' : 'This Month'}
            value={formatCurrencyCompact(summary.thisMonthRevenue)}
            color="text-success"
            previousValue={summary.lastMonthRevenue}
            compareLabel={lang === 'ar' ? 'مقارنة بالشهر الماضي' : 'vs last month'}
          />
          <StatCard
            label={lang === 'ar' ? 'الشهر الماضي' : 'Last Month'}
            value={formatCurrencyCompact(summary.lastMonthRevenue)}
            color="text-foreground"
          />
          <StatCard
            label={lang === 'ar' ? 'إيراد التدريب الشخصي' : 'PT Revenue'}
            value={formatCurrencyCompact(summary.ptRevenueThisMonth)}
            color={summary.ptRevenueThisMonth > 0 ? 'text-warning' : 'text-foreground'}
          />
          <StatCard
            label={lang === 'ar' ? 'المتوقع شهرياً' : 'Expected Monthly'}
            value={formatCurrencyCompact(summary.expectedMonthly)}
            color="text-info"
            subtitle={lang === 'ar'
              ? `من ${summary.activeSubscriptionCount} اشتراك نشط`
              : `From ${summary.activeSubscriptionCount} active subscriptions`}
          />
        </div>
      )}

      {/* ── Revenue Trend Chart ── */}
      {chartData.length >= 2 && (
        <div className="mt-6">
          <Card className="shadow-[6px_6px_0_#000000]">
            <CardHeader className="pb-2">
              <CardTitle>{lang === 'ar' ? 'اتجاه الإيراد' : 'Revenue Trend'}</CardTitle>
              <CardDescription>
                {lang === 'ar' ? 'آخر ٦ أشهر' : 'Last 6 months'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: 160 }}>
                <MiniArea
                  data={chartData}
                  theme="midnight"
                  color="#e63946"
                  height={160}
                />
              </div>
              {/* Month labels under chart */}
              <div className="flex justify-between mt-2" dir="ltr">
                {[...monthly].reverse().slice(-6).map(r => (
                  <span key={r.month} className="text-[10px] text-muted-foreground">
                    {new Date(r.month + '-01').toLocaleDateString(locale, { month: 'short' })}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Monthly Breakdown ── */}
      <div className="mt-6">
        <Card className="shadow-[6px_6px_0_#000000]">
          <CardHeader>
            <CardTitle>{labels.monthly_breakdown}</CardTitle>
            <CardDescription>{labels.monthly_breakdown_hint}</CardDescription>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{labels.no_income_yet}</p>
            ) : (
              <div className="overflow-auto border-2 border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      <th className="text-start px-4 py-2.5 font-medium">{labels.month_col}</th>
                      <th className="text-end px-4 py-2.5 font-medium">{labels.revenue_col}</th>
                      <th className="text-end px-4 py-2.5 font-medium hidden sm:table-cell">{labels.subscriptions_col}</th>
                      <th className="text-end px-4 py-2.5 font-medium hidden sm:table-cell">{labels.guest_passes_col}</th>
                      <th className="text-end px-4 py-2.5 font-medium hidden sm:table-cell">{labels.pt_packages}</th>
                      <th className="text-end px-4 py-2.5 font-medium">{labels.payments_count}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((row, i) => {
                      const prevRow = monthly[i + 1];
                      const delta = prevRow && prevRow.revenue > 0
                        ? Math.round(((row.revenue - prevRow.revenue) / prevRow.revenue) * 100)
                        : null;
                      return (
                        <tr
                          key={row.month}
                          className="border-t border-border hover:bg-card cursor-pointer transition-colors"
                          tabIndex={0}
                          role="button"
                          onClick={() => setSelectedMonth(row.month)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setSelectedMonth(row.month); }}
                        >
                          <td className="px-4 py-2.5 font-medium text-foreground">{fmtMonth(row.month)}</td>
                          <td className="px-4 py-2.5 text-end tabular-nums">
                            <div className="font-semibold text-foreground">{fmt(row.revenue)}</div>
                            {delta !== null && delta !== 0 && (
                              <div className={`text-[10px] font-semibold mt-0.5 ${delta > 0 ? 'text-success' : 'text-destructive'}`}>
                                {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}%{' '}
                                <span className="text-muted-foreground/50 font-normal">{lang === 'ar' ? 'عن الشهر السابق' : 'vs prior month'}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-end text-muted-foreground hidden sm:table-cell tabular-nums">{fmt(row.subscriptionRevenue)}</td>
                          <td className="px-4 py-2.5 text-end text-muted-foreground hidden sm:table-cell tabular-nums">{fmt(row.guestRevenue)}</td>
                          <td className="px-4 py-2.5 text-end text-muted-foreground hidden sm:table-cell tabular-nums">{fmt(row.ptRevenue || 0)}</td>
                          <td className="px-4 py-2.5 text-end text-muted-foreground tabular-nums">{row.count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Payments ── */}
      <div className="mt-6">
        <Card className="shadow-[6px_6px_0_#000000]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{labels.recent_payments}</CardTitle>
              <Link href="/dashboard/income/payments" className="text-destructive text-xs font-medium hover:underline">
                {labels.view_all_payments}
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{labels.no_income_yet}</p>
            ) : (
              <div className="overflow-auto border-2 border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      <th className="text-start px-4 py-2.5 font-medium">{labels.date_col}</th>
                      <th className="text-start px-4 py-2.5 font-medium">{labels.name_col}</th>
                      <th className="text-end px-4 py-2.5 font-medium">{labels.amount_col}</th>
                      <th className="text-start px-4 py-2.5 font-medium hidden sm:table-cell">{labels.details_col}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-card transition-colors">
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.date, locale)}</td>
                        <td className="px-4 py-2.5 text-foreground">
                          {p.name}
                          {(p.type === 'guest_pass' || p.type === 'pt_package') && (
                            <span className="ms-2 inline-block text-[10px] font-bold tracking-wide px-1.5 py-0.5 bg-muted text-muted-foreground border border-border">
                              {p.type === 'guest_pass' ? labels.guest_tag : labels.pt_package_tag}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-end font-semibold text-foreground tabular-nums">{fmt(p.amount)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                          {p.type === 'guest_pass'
                            ? labels.guest_passes
                            : p.type === 'pt_package'
                              ? p.packageTitle || labels.pt_package_payment
                            : p.type === 'renewal'
                              ? labels.renewal_payment
                              : <>
                                {p.planMonths} {labels.months_label}
                                {p.sessionsPerMonth != null && `, ${p.sessionsPerMonth} ${labels.sessions_per_month_label}`}
                              </>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month detail dialog */}
      {selectedMonth && (
        <MonthCalendarDialog
          month={selectedMonth}
          open={!!selectedMonth}
          onOpenChange={(open) => { if (!open) setSelectedMonth(null); }}
        />
      )}
    </div>
  );
}
