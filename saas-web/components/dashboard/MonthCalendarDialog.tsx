'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import DayPaymentsSheet from '@/components/dashboard/DayPaymentsSheet';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

type DayData = { day: string; revenue: number; count: number };
type MonthData = { days: DayData[]; prevMonthRevenue: number };

type Props = {
  month: string | null; // YYYY-MM
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthCalendarDialog({ month, open, onOpenChange }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [currentMonth, setCurrentMonth] = useState(month || '');
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (month && open) setCurrentMonth(month);
  }, [month, open]);

  useEffect(() => {
    if (!currentMonth || !open) return;
    setLoading(true);
    api.get<MonthData>(`/api/income/monthly/${currentMonth}`)
      .then((res) => { if (res.data) setData(res.data); })
      .catch((error) => {
        console.error(`Failed to load month income data for ${currentMonth}`, error);
      })
      .finally(() => setLoading(false));
  }, [currentMonth, open]);

  const stats = useMemo(() => {
    if (!data || data.days.length === 0) return null;
    const totalRevenue = data.days.reduce((s, d) => s + d.revenue, 0);
    const totalCount = data.days.reduce((s, d) => s + d.count, 0);
    const topDay = data.days.reduce((best, d) => (d.revenue > best.revenue ? d : best), data.days[0]);
    const avgDaily = totalRevenue / data.days.length;
    const prevRev = data.prevMonthRevenue;
    const pctChange = prevRev > 0 ? ((totalRevenue - prevRev) / prevRev) * 100 : null;
    return { totalRevenue, totalCount, topDay, avgDaily, pctChange };
  }, [data]);

  const paymentDays = useMemo(() => {
    if (!data) return [];
    return data.days.map((d) => new Date(d.day + 'T00:00:00'));
  }, [data]);

  const dayMap = useMemo(() => {
    if (!data) return new Map<string, DayData>();
    return new Map(data.days.map((d) => [d.day, d]));
  }, [data]);

  const monthDate = currentMonth ? new Date(currentMonth + '-01T00:00:00') : new Date();
  const monthLabel = monthDate.toLocaleDateString(locale, { year: 'numeric', month: 'long' });

  const handleDayClick = (day: Date) => {
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    if (dayMap.has(iso)) {
      setSelectedDay(iso);
    }
  };

  const topDayFormatted = stats?.topDay
    ? new Date(stats.topDay.day + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    : '—';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-2 border-border"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-foreground">
              <button
                onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))}
                className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={lang === 'ar' ? 'rotate-180' : ''}>
                  <path d="M10 3l-5 5 5 5" />
                </svg>
              </button>
              <span className="text-lg font-bold">{monthLabel}</span>
              <button
                onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))}
                className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={lang === 'ar' ? 'rotate-180' : ''}>
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <>
              {/* Stats row */}
              {stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div className="bg-card border-2 border-border p-3">
                    <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'إجمالي الشهر' : 'Month Total'}</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="bg-card border-2 border-border p-3">
                    <p className="text-xs text-muted-foreground">{labels.payments_count}</p>
                    <p className="text-sm font-bold text-foreground">{stats.totalCount}</p>
                  </div>
                  <div className="bg-card border-2 border-border p-3">
                    <p className="text-xs text-muted-foreground">{labels.top_earning_day}</p>
                    <p className="text-sm font-bold text-destructive">{topDayFormatted}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(stats.topDay.revenue)}</p>
                  </div>
                  <div className="bg-card border-2 border-border p-3">
                    <p className="text-xs text-muted-foreground">{labels.avg_daily}</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(stats.avgDaily)}</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar' ? 'لا توجد مدفوعات مسجلة في هذا الشهر' : 'No payments recorded this month'}
                  </p>
                </div>
              )}

              {/* % change vs previous month */}
              {stats?.pctChange !== null && stats?.pctChange !== undefined && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className={`text-xs font-medium ${stats.pctChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {stats.pctChange >= 0 ? '↑' : '↓'} {Math.abs(stats.pctChange).toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">{labels.vs_prev_month}</span>
                </div>
              )}

              {/* Calendar */}
              {data && data.days.length > 0 && (
                <>
                  <div className="flex justify-center mt-4">
                    <Calendar
                      month={monthDate}
                      disableNavigation
                      onDayClick={handleDayClick}
                      modifiers={{ hasPayment: paymentDays }}
                      modifiersClassNames={{ hasPayment: 'bg-destructive/20 text-destructive font-bold' }}
                      classNames={{ day: 'cursor-pointer' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {lang === 'ar' ? 'اضغط على يوم مُعلّم لعرض المدفوعات' : 'Click a highlighted day to view payments'}
                  </p>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <DayPaymentsSheet
        date={selectedDay}
        open={!!selectedDay}
        onOpenChange={(o) => { if (!o) setSelectedDay(null); }}
      />
    </>
  );
}
