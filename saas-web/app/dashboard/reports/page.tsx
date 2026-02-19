'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatDateTime, daysUntil, formatCurrencyCompact } from '@/lib/format';
import DataTable from '@/components/dashboard/DataTable';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 7 drill-down tabs — Overview is always pinned above as a stats bar
const TABS = [
  { key: 'daily-stats',    label: { en: 'Daily Stats',  ar: 'إحصائيات يومية' } },
  { key: 'hourly',         label: { en: 'Hourly',        ar: 'بالساعة' } },
  { key: 'top-members',    label: { en: 'Top Members',   ar: 'أفضل الأعضاء' } },
  { key: 'expiring-subs',  label: { en: 'Expiring',      ar: 'منتهية' } },
  { key: 'low-sessions',   label: { en: 'Low Sessions',  ar: 'جلسات منخفضة' } },
  { key: 'denial-reasons', label: { en: 'Denials',       ar: 'أسباب الرفض' } },
  { key: 'denied-entries', label: { en: 'Denied Log',    ar: 'سجل الرفض' } },
] as const;

type TabKey = typeof TABS[number]['key'];

// Which tabs show the days period filter
const DAYS_TABS: TabKey[] = ['daily-stats', 'top-members', 'denial-reasons', 'denied-entries', 'expiring-subs'];
const DAYS_OPTIONS = [7, 14, 30, 60, 90];

const PIE_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))",
  "hsl(var(--chart-1) / 0.6)",
];

export default function ReportsPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const [tab, setTab] = useState<TabKey>('daily-stats');
  const [days, setDays] = useState(30);

  // Overview stats — always fetched on mount, always visible
  const [overviewData, setOverviewData] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Drill-down tab data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      case 'daily-stats':    return `/api/reports/daily-stats?days=${d}`;
      case 'hourly':         return '/api/reports/hourly-distribution';
      case 'top-members':    return `/api/reports/top-members?days=${d}&limit=10`;
      case 'denial-reasons': return `/api/reports/denial-reasons?days=${d}`;
      case 'denied-entries': return `/api/reports/denied-entries?days=${d}`;
      case 'expiring-subs':  return `/api/reports/expiring-subscriptions?days=${d}`;
      case 'low-sessions':   return '/api/reports/low-sessions?threshold=3';
    }
  }, []);

  // Fetch tab data when tab or days changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get(buildUrl(tab, days)).then((res) => {
      if (cancelled) return;
      if (res.success) setData(res.data);
      else setError(res.message || labels.error);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setError(labels.error); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [tab, days, buildUrl, labels.error]);

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

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold">{labels.reports}</h1>

      {/* ── Always-visible overview stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {overviewLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-2 border-[#2a2a2a] bg-[#1e1e1e] h-[80px] animate-pulse" />
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
      <div className="flex items-stretch border-b border-[#2a2a2a] overflow-x-auto no-scrollbar">
        {TABS.map((item, i) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              borderBottom: `3px solid ${tab === item.key ? '#e63946' : 'transparent'}`,
              marginBottom: '-1px',
            }}
            className={cn(
              'px-4 py-3 text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors',
              i < TABS.length - 1 && 'border-r border-[#2a2a2a]',
              tab === item.key ? 'text-[#e8e4df]' : 'text-[#8a8578] hover:text-[#e8e4df]'
            )}
          >
            {item.label[lang]}
          </button>
        ))}

        {/* Period filter — floats to the right of the command bar */}
        {showDaysFilter && (
          <div className="ml-auto flex items-center px-4 shrink-0 border-l border-[#2a2a2a]">
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
          <Terminal className={cn("h-4 w-4", lang === 'ar' ? "ml-2" : "mr-2")} />
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">

          {/* Daily Stats — stacked bar chart */}
          {tab === 'daily-stats' && Array.isArray(data) && (
            <Card>
              <CardHeader><CardTitle>{labels.daily_checkins_stats}</CardTitle></CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={rs.gridStroke} />
                    <XAxis dataKey="date" tick={rs.axis} />
                    <YAxis tick={rs.axis} />
                    <Tooltip contentStyle={rs.tooltipContent} labelStyle={rs.tooltipLabel} itemStyle={rs.tooltipItem} />
                    <Legend wrapperStyle={{ color: rs.legendItem.color }} />
                    <Bar dataKey="allowed" stackId="a" fill="hsl(var(--success))" name={labels.allowed} />
                    <Bar dataKey="warning" stackId="a" fill="hsl(var(--warning))" name={labels.warning} />
                    <Bar dataKey="denied" stackId="a" fill="hsl(var(--destructive))" name={labels.denied} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Hourly Distribution — single bar chart */}
          {tab === 'hourly' && Array.isArray(data) && (
            <Card>
              <CardHeader><CardTitle>{labels.hourly_distribution}</CardTitle></CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={rs.gridStroke} />
                    <XAxis dataKey="hour" tick={rs.axis} />
                    <YAxis tick={rs.axis} />
                    <Tooltip contentStyle={rs.tooltipContent} labelStyle={rs.tooltipLabel} itemStyle={rs.tooltipItem} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name={labels.visits} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

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

          {/* Low Sessions — data table */}
          {tab === 'low-sessions' && Array.isArray(data) && (
            <Card>
              <CardHeader><CardTitle>{labels.low_sessions}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: labels.name },
                    { key: 'phone', label: labels.phone },
                    { key: 'sessions_remaining', label: labels.sessions_remaining, render: (row: any) => (
                      <span className={row.sessions_remaining <= 1 ? 'text-destructive font-bold' : 'text-warning'}>{row.sessions_remaining}</span>
                    )},
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          )}

          {/* Denial Reasons — pie chart */}
          {tab === 'denial-reasons' && Array.isArray(data) && (
            <Card>
              <CardHeader><CardTitle>{labels.denial_reasons}</CardTitle></CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="count"
                      nameKey="reason_code"
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      label={(props: any) => `${props.reason_code} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: rs.gridStroke }}
                    >
                      {data.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={rs.tooltipContent} labelStyle={rs.tooltipLabel} itemStyle={rs.tooltipItem} />
                    <Legend wrapperStyle={{ color: rs.legendItem.color }} formatter={(v: string) => <span style={{ color: rs.legendItem.color }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
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

        </div>
      )}
    </div>
  );
}
