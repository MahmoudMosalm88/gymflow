'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatDate } from '@/lib/format';
import StatCard from '@/components/dashboard/StatCard';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import MonthCalendarDialog from '@/components/dashboard/MonthCalendarDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Summary = { totalRevenue: number; expectedMonthly: number };
type MonthlyRow = {
  month: string;
  revenue: number;
  subscriptionRevenue: number;
  guestRevenue: number;
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
};
type PaymentsResponse = {
  data: Payment[];
  hasMore: boolean;
};

async function fetchWithoutBranch<T>(url: string): Promise<T | null> {
  try {
    const token = localStorage.getItem('session_token');
    if (!token) return null;
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const payload = await res.json().catch(() => null);
    if (!payload || typeof payload !== 'object') return null;
    if ((payload as { success?: boolean }).success !== true) return null;
    return ((payload as { data?: T }).data ?? null) as T | null;
  } catch {
    return null;
  }
}

export default function IncomePage() {
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [recent, setRecent] = useState<Payment[]>([]);
  const [recentError, setRecentError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [s, m, p] = await Promise.allSettled([
        api.get<Summary>('/api/income/summary'),
        api.get<MonthlyRow[]>('/api/income/monthly'),
        api.get<PaymentsResponse>('/api/income/payments?limit=10&offset=0'),
      ]);

      const recentFallback = await api.get<Payment[]>('/api/income/recent?limit=10').catch(() => null);

      if (!mounted) return;

      if (s.status === 'fulfilled' && s.value.data) {
        setSummary(s.value.data);
      }
      if (m.status === 'fulfilled' && m.value.data) {
        setMonthly(m.value.data);
      }
      const paymentsData = p.status === 'fulfilled' ? p.value.data : undefined;
      const paymentsRows = Array.isArray((paymentsData as unknown as { data?: unknown })?.data)
        ? ((paymentsData as unknown as { data: Payment[] }).data)
        : Array.isArray(paymentsData)
          ? (paymentsData as unknown as Payment[])
          : [];

      const fallbackRows = recentFallback?.data && Array.isArray(recentFallback.data)
        ? recentFallback.data
        : [];

      let mergedRecent = paymentsRows.length > 0 ? paymentsRows : fallbackRows;

      // Last-resort retry without x-branch-id header to recover from stale local branch context.
      if (mergedRecent.length === 0) {
        const noBranchPayments = await fetchWithoutBranch<PaymentsResponse>('/api/income/payments?limit=10&offset=0');
        if (noBranchPayments?.data && Array.isArray(noBranchPayments.data) && noBranchPayments.data.length > 0) {
          mergedRecent = noBranchPayments.data;
        } else {
          const noBranchRecent = await fetchWithoutBranch<Payment[]>('/api/income/recent?limit=10');
          if (Array.isArray(noBranchRecent) && noBranchRecent.length > 0) {
            mergedRecent = noBranchRecent;
          }
        }
      }

      if (mergedRecent.length > 0) {
        setRecent(mergedRecent);
        setRecentError(false);
      } else {
        const paymentsFailed = p.status !== 'fulfilled' || !p.value.success;
        const fallbackFailed = !recentFallback || !recentFallback.success;
        setRecentError(paymentsFailed && fallbackFailed);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const fmt = (n: number) => formatCurrency(n);
  const fmtMonth = (m: string) =>
    new Date(m + '-01').toLocaleDateString(locale, { year: 'numeric', month: 'long' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{labels.income}</h1>
        <p className="text-sm text-muted-foreground">{labels.income_subtitle}</p>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label={labels.total_revenue} value={fmt(summary.totalRevenue)} color="text-success" />
          <StatCard label={labels.expected_monthly} value={fmt(summary.expectedMonthly)} color="text-info" />
        </div>
      )}

      {/* Monthly breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.monthly_breakdown}</CardTitle>
          <CardDescription>{labels.monthly_breakdown_hint}</CardDescription>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{labels.no_income_yet}</p>
          ) : (
            <div className="overflow-auto border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-2.5 font-medium">{labels.month_col}</th>
                    <th className="text-end px-4 py-2.5 font-medium">{labels.revenue_col}</th>
                    <th className="text-end px-4 py-2.5 font-medium hidden sm:table-cell">{labels.subscriptions_col}</th>
                    <th className="text-end px-4 py-2.5 font-medium hidden sm:table-cell">{labels.guest_passes_col}</th>
                    <th className="text-end px-4 py-2.5 font-medium">{labels.payments_count}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row) => (
                    <tr key={row.month} className="border-t border-border hover:bg-card cursor-pointer" onClick={() => setSelectedMonth(row.month)}>
                      <td className="px-4 py-2.5 font-medium text-foreground">{fmtMonth(row.month)}</td>
                      <td className="px-4 py-2.5 text-end font-semibold text-foreground">{fmt(row.revenue)}</td>
                      <td className="px-4 py-2.5 text-end text-muted-foreground hidden sm:table-cell">{fmt(row.subscriptionRevenue)}</td>
                      <td className="px-4 py-2.5 text-end text-muted-foreground hidden sm:table-cell">{fmt(row.guestRevenue)}</td>
                      <td className="px-4 py-2.5 text-end text-muted-foreground">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent payments */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.recent_payments}</CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>{labels.recent_payments_hint}</span>
            <Link href="/dashboard/income/payments" className="text-destructive text-xs font-medium hover:underline">
              {labels.view_all_payments}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentError && (
            <p className="text-xs text-destructive mb-3">
              {lang === 'ar'
                ? 'تعذّر تحميل آخر المدفوعات الآن. حاول تحديث الصفحة.'
                : 'Could not load recent payments right now. Please refresh the page.'}
            </p>
          )}
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{labels.no_income_yet}</p>
          ) : (
            <div className="overflow-auto border border-border">
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
                    <tr key={p.id} className="border-t border-border hover:bg-card">
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.date, locale)}</td>
                      <td className="px-4 py-2.5 text-foreground">
                        {p.name}
                        {p.type === 'guest_pass' && (
                          <span className="ml-2 inline-block text-[10px] font-bold tracking-wide px-1.5 py-0.5 bg-muted text-muted-foreground border border-border">
                            {labels.guest_tag}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-end font-semibold text-foreground">{fmt(p.amount)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                        {p.type === 'guest_pass'
                          ? labels.guest_passes
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

      {/* Month detail dialog */}
      <MonthCalendarDialog
        month={selectedMonth}
        open={!!selectedMonth}
        onOpenChange={(open) => { if (!open) setSelectedMonth(null); }}
      />
    </div>
  );
}
