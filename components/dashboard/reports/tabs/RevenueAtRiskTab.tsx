'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { formatDate, daysUntil, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { toFiniteNumber } from '@/lib/coerce';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RevenueAtRiskAreaChart from '@/components/dashboard/reports/charts/RevenueAtRiskAreaChart';

interface Props {
  data: any;
  lang: string;
  labels: any;
  days: number;
}

// Helper used in the plan column
function planLabel(months: number, lang: string): string {
  if (months <= 0) return lang === 'ar' ? 'غير محدد' : 'Unspecified';
  if (lang === 'ar') return `${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
  return `${months} month${months === 1 ? '' : 's'}`;
}

export default function RevenueAtRiskTab({ data, lang, labels, days }: Props) {
  // Secondary fetch: expected-revenue forecast stats
  const [forecast, setForecast] = useState<any>(null);
  const [forecastOpen, setForecastOpen] = useState(false);

  useEffect(() => {
    api.get<any>('/api/reports/expected-revenue?days=30').then((r) => {
      if (r.success) setForecast(r.data?.summary);
    });
  }, []);

  const riskItems: any[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.rows)
    ? data.rows
    : [];
  const riskSummary = data?.summary ?? null;

  const hasData = riskSummary && riskItems.length > 0;

  if (!hasData) {
    return (
      <div className="border-2 border-border bg-card py-12 text-center">
        <p className="text-lg font-semibold text-success">
          {lang === 'ar' ? '✓ لا إيراد مهدد الآن' : '✓ No revenue at risk right now'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === 'ar'
            ? 'جميع الاشتراكات إما نشطة أو تم تجديدها. عد لاحقاً قبل انتهاء الاشتراكات.'
            : 'All subscriptions are active or renewed. Check back closer to renewal dates.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Main stat cards ── */}
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

      {/* ── Area chart: at-risk revenue by days_left ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'الإيراد المهدد حسب الأيام المتبقية' : 'At-Risk Revenue by Days Left'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueAtRiskAreaChart data={data} lang={lang} />
        </CardContent>
      </Card>

      {/* ── Forecast section (collapsible) — merged from expected-revenue tab ── */}
      {forecast && (
        <div className="border-2 border-border bg-card">
          {/* Toggle header */}
          <button
            onClick={() => setForecastOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-start hover:bg-secondary/20 transition-colors"
          >
            <span className="text-sm font-semibold text-foreground">
              {lang === 'ar' ? 'التوقعات — الإيراد المتوقع خلال ٣٠ يوماً' : 'Forecast — Expected Revenue Next 30 Days'}
            </span>
            <span className="text-muted-foreground text-sm">{forecastOpen ? '▲' : '▼'}</span>
          </button>

          {forecastOpen && (
            <div className="border-t border-border px-5 pb-5 pt-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label={lang === 'ar' ? 'نقد متوقع خلال ٣٠ يوم' : 'Projected Cash Next 30 Days'}
                  value={formatCurrencyCompact(forecast.projectedRevenueNext30Days ?? 0)}
                  color="text-success"
                  valueSize="text-2xl"
                />
                <StatCard
                  label={lang === 'ar' ? 'قاعدة الإيراد الحالية' : 'Current Revenue Base'}
                  value={formatCurrencyCompact(forecast.monthlyRunRate ?? 0)}
                  color="text-foreground"
                  valueSize="text-2xl"
                />
                <StatCard
                  label={lang === 'ar' ? 'تجديدات مؤكدة' : 'Confirmed Renewals'}
                  value={formatCurrencyCompact(forecast.securedRenewalValue ?? 0)}
                  color="text-success"
                  valueSize="text-2xl"
                />
                <StatCard
                  label={lang === 'ar' ? 'بحاجة لتجديد' : 'Needs Renewal'}
                  value={formatCurrencyCompact(forecast.renewalExposure ?? 0)}
                  color="text-warning"
                  valueSize="text-2xl"
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="border-2 border-border bg-secondary/20 p-4">
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'معدل الاحتفاظ المستخدم' : 'Retention used in forecast'}
                  </p>
                  <p className="text-2xl font-bold text-success">
                    {(forecast.expectedRetentionRate ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="border-2 border-border bg-secondary/20 p-4">
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'أعضاء تنتهي اشتراكاتهم قريباً' : 'Members due soon'}
                  </p>
                  <p className="text-2xl font-bold text-primary">{forecast.membersDue ?? 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main data table ── */}
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
              { key: 'name',            label: labels.name },
              { key: 'phone',           label: labels.phone },
              {
                key: 'planMonths',
                label: labels.plan,
                render: (row: any) => planLabel(row.planMonths ?? row.plan_months ?? 0, lang),
              },
              {
                key: 'end_date',
                label: labels.end_date,
                render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US'),
              },
              {
                key: 'days_left',
                label: labels.days_left,
                render: (row: any) => {
                  const d = row.days_left ?? daysUntil(row.end_date);
                  return (
                    <span className={d <= 3 ? 'font-bold text-destructive' : 'text-warning'}>
                      {d}
                    </span>
                  );
                },
              },
              {
                key: 'amountAtRisk',
                label: labels.amount_at_risk,
                render: (row: any) => formatCurrency(row.amountAtRisk ?? row.amount_at_risk ?? 0),
              },
              {
                key: 'reminder_status',
                label: labels.reminder_status,
                render: (row: any) => (
                  <span
                    className={
                      row.reminder_status === 'sent' || row.reminder_status === 'reminded'
                        ? 'font-semibold text-success'
                        : row.reminder_status === 'pending' || row.reminder_status === 'queued'
                        ? 'font-semibold text-warning'
                        : row.reminder_status === 'no_automation'
                        ? 'text-muted-foreground/50'
                        : 'text-muted-foreground'
                    }
                  >
                    {row.reminder_status === 'sent' || row.reminder_status === 'reminded'
                      ? lang === 'ar'
                        ? 'تم الإرسال ✓'
                        : 'Sent ✓'
                      : row.reminder_status === 'pending' || row.reminder_status === 'queued'
                      ? lang === 'ar'
                        ? 'مجدول — قيد الانتظار'
                        : 'Scheduled — Pending'
                      : row.reminder_status === 'no_automation'
                      ? lang === 'ar'
                        ? 'واتساب غير مفعّل'
                        : 'WhatsApp not connected'
                      : labels.not_reminded_yet}
                  </span>
                ),
              },
              {
                key: 'renewed',
                label: labels.renewal_status,
                render: (row: any) => (
                  <div className="flex flex-col gap-1">
                    <span
                      className={
                        row.renewed || row.renewal_status === 'renewed'
                          ? 'font-semibold text-success'
                          : 'font-semibold text-destructive'
                      }
                    >
                      {row.renewed || row.renewal_status === 'renewed'
                        ? labels.already_renewed
                        : labels.at_risk_status}
                    </span>
                    {(row.renewed || row.renewal_status === 'renewed') && (
                      <span
                        className={
                          row.renewed_after_whatsapp || row.whatsapp_attributed_renewal
                            ? 'text-xs font-medium text-primary'
                            : 'text-xs text-muted-foreground'
                        }
                      >
                        {labels.renewed_after_whatsapp}:{' '}
                        {row.renewed_after_whatsapp || row.whatsapp_attributed_renewal
                          ? lang === 'ar'
                            ? 'نعم'
                            : 'Yes'
                          : lang === 'ar'
                          ? 'لا'
                          : 'No'}
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
            data={riskItems}
            emptyMessage={labels.no_expiring_revenue_risk}
          />
        </CardContent>
      </Card>
    </div>
  );
}
