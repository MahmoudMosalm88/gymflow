'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TrainerPerformance = {
  trainer_id: string;
  trainer_name: string;
  sessions_completed: number;
  sessions_no_show: number;
  sessions_total: number;
  no_show_rate: number;
  revenue: number;
  active_clients: number;
  active_packages: number;
};

type PerformanceData = {
  summary: {
    totalSessions: number;
    totalCompleted: number;
    totalNoShow: number;
    totalRevenue: number;
    overallNoShowRate: number;
  };
  trainers: TrainerPerformance[];
};

const PERIOD_OPTIONS = [7, 14, 30, 60, 90];

export default function PerformanceTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<PerformanceData>(`/api/pt/performance?days=${days}`).then(res => {
      if (cancelled) return;
      setData(res.data ?? null);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [days]);

  return (
    <div className="flex flex-col gap-6">
      {/* Period filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          {lang === 'ar' ? 'الفترة' : 'Period'}
        </span>
        <Select value={days.toString()} onValueChange={v => setDays(Number(v))} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <SelectTrigger className="w-[120px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(d => (
              <SelectItem key={d} value={d.toString()}>{d} {labels.days}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {lang === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}
        </p>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={lang === 'ar' ? 'جلسات مكتملة' : 'Sessions Completed'}
              value={data.summary.totalCompleted}
              color="text-success"
            />
            <StatCard
              label={lang === 'ar' ? 'لم يحضر' : 'No-Shows'}
              value={data.summary.totalNoShow}
              color={data.summary.totalNoShow > 0 ? 'text-warning' : 'text-foreground'}
            />
            <StatCard
              label={lang === 'ar' ? 'معدل عدم الحضور' : 'No-Show Rate'}
              value={`${data.summary.overallNoShowRate}%`}
              color={data.summary.overallNoShowRate > 15 ? 'text-destructive' : data.summary.overallNoShowRate > 10 ? 'text-warning' : 'text-foreground'}
            />
            <StatCard
              label={lang === 'ar' ? 'إيراد التدريب' : 'PT Revenue'}
              value={formatCurrencyCompact(data.summary.totalRevenue)}
              color="text-success"
            />
          </div>

          {/* Per-trainer breakdown */}
          <Card className="shadow-[6px_6px_0_#000000]">
            <CardHeader>
              <CardTitle>{lang === 'ar' ? 'أداء المدربين' : 'Trainer Performance'}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.trainers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lang === 'ar' ? 'لا يوجد مدربين نشطين' : 'No active trainers'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-start py-2 pe-4 text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                          {lang === 'ar' ? 'المدرب' : 'Trainer'}
                        </th>
                        <th className="text-end py-2 px-2 text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                          {lang === 'ar' ? 'مكتملة' : 'Done'}
                        </th>
                        <th className="text-end py-2 px-2 text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                          {lang === 'ar' ? 'لم يحضر' : 'No-Show'}
                        </th>
                        <th className="text-end py-2 px-2 text-xs text-muted-foreground font-semibold uppercase tracking-widest hidden sm:table-cell">
                          {lang === 'ar' ? '% عدم حضور' : 'NS%'}
                        </th>
                        <th className="text-end py-2 px-2 text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                          {lang === 'ar' ? 'الإيراد' : 'Revenue'}
                        </th>
                        <th className="text-end py-2 px-2 text-xs text-muted-foreground font-semibold uppercase tracking-widest hidden md:table-cell">
                          {lang === 'ar' ? 'عملاء' : 'Clients'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trainers.map(tr => (
                        <tr key={tr.trainer_id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                          <td className="py-3 pe-4 font-medium text-foreground">{tr.trainer_name}</td>
                          <td className="py-3 px-2 text-end font-stat text-success">{tr.sessions_completed}</td>
                          <td className="py-3 px-2 text-end font-stat text-warning">{tr.sessions_no_show}</td>
                          <td className="py-3 px-2 text-end hidden sm:table-cell">
                            <span className={tr.no_show_rate > 15 ? 'text-destructive font-bold' : tr.no_show_rate > 10 ? 'text-warning' : 'text-muted-foreground'}>
                              {tr.no_show_rate}%
                            </span>
                          </td>
                          <td className="py-3 px-2 text-end font-stat text-foreground">{formatCurrency(tr.revenue)}</td>
                          <td className="py-3 px-2 text-end hidden md:table-cell text-muted-foreground">{tr.active_clients}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
