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

  // Sync when dialog opens with a new month
  useEffect(() => {
    if (month && open) setCurrentMonth(month);
  }, [month, open]);

  // Fetch daily data when currentMonth changes
  useEffect(() => {
    if (!currentMonth || !open) return;
    setLoading(true);
    api.get<MonthData>(`/api/income/monthly/${currentMonth}`)
      .then((res) => { if (res.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentMonth, open]);

  // Compute stats from daily data
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

  // Days that have payments — as Date objects for the Calendar modifiers
  const paymentDays = useMemo(() => {
    if (!data) return [];
    return data.days.map((d) => new Date(d.day + 'T00:00:00'));
  }, [data]);

  // Map day string → data for quick lookup
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#141414] border-[#2a2a2a]"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-[#e8e4df]">
              {/* Prev month arrow */}
              <button
                onClick={() => setCurrentMonth(shiftMonth(currentMonth, -1))}
                className="p-2 hover:bg-[#1e1e1e] text-[#8a8578] hover:text-[#e8e4df] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d={lang === 'ar' ? 'M6 3l5 5-5 5' : 'M10 3l-5 5 5 5'} />
                </svg>
              </button>
              <span className="text-lg font-bold">{monthLabel}</span>
              {/* Next month arrow */}
              <button
                onClick={() => setCurrentMonth(shiftMonth(currentMonth, 1))}
                className="p-2 hover:bg-[#1e1e1e] text-[#8a8578] hover:text-[#e8e4df] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d={lang === 'ar' ? 'M10 3l-5 5 5 5' : 'M6 3l5 5-5 5'} />
                </svg>
              </button>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Stats row */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div className="bg-[#1e1e1e] border border-[#2a2a2a] p-3">
                    <p className="text-xs text-[#8a8578]">{labels.total_revenue}</p>
                    <p className="text-sm font-bold text-[#e8e4df]">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="bg-[#1e1e1e] border border-[#2a2a2a] p-3">
                    <p className="text-xs text-[#8a8578]">{labels.payments_count}</p>
                    <p className="text-sm font-bold text-[#e8e4df]">{stats.totalCount}</p>
                  </div>
                  <div className="bg-[#1e1e1e] border border-[#2a2a2a] p-3">
                    <p className="text-xs text-[#8a8578]">{labels.top_earning_day}</p>
                    <p className="text-sm font-bold text-[#e63946]">
                      {new Date(stats.topDay.day + 'T00:00:00').getDate()}
                    </p>
                  </div>
                  <div className="bg-[#1e1e1e] border border-[#2a2a2a] p-3">
                    <p className="text-xs text-[#8a8578]">{labels.avg_daily}</p>
                    <p className="text-sm font-bold text-[#e8e4df]">{formatCurrency(stats.avgDaily)}</p>
                  </div>
                </div>
              )}

              {/* % change vs previous month */}
              {stats?.pctChange !== null && stats?.pctChange !== undefined && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className={`text-xs font-medium ${stats.pctChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stats.pctChange >= 0 ? '↑' : '↓'} {Math.abs(stats.pctChange).toFixed(1)}%
                  </span>
                  <span className="text-xs text-[#8a8578]">{labels.vs_prev_month}</span>
                </div>
              )}

              {/* Calendar */}
              <div className="flex justify-center mt-4">
                <Calendar
                  month={monthDate}
                  disableNavigation
                  onDayClick={handleDayClick}
                  modifiers={{ hasPayment: paymentDays }}
                  modifiersClassNames={{ hasPayment: 'bg-[#e63946]/20 text-[#e63946] font-bold' }}
                  classNames={{
                    day: 'cursor-pointer',
                  }}
                />
              </div>

              {/* Hint */}
              {data && data.days.length > 0 && (
                <p className="text-xs text-[#8a8578] text-center mt-2">
                  {lang === 'ar' ? 'اضغط على يوم مُعلّم لعرض المدفوعات' : 'Click a highlighted day to view payments'}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Day drill-down sheet */}
      <DayPaymentsSheet
        date={selectedDay}
        open={!!selectedDay}
        onOpenChange={(open) => { if (!open) setSelectedDay(null); }}
      />
    </>
  );
}
