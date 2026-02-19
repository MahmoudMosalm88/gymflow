'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatDateTime, daysUntil, formatCurrency } from '@/lib/format'; // Added formatCurrency
import DataTable from '@/components/dashboard/DataTable';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard'; // Keeping custom StatCard, but will update its colors here

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react'; // Example icon for Alert
import { cn } from '@/lib/utils'; // cn helper

// --- Tab definitions ---
const TABS = [
  { key: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' } },
  { key: 'daily-stats', label: { en: 'Daily Stats', ar: 'إحصائيات يومية' } },
  { key: 'hourly', label: { en: 'Hourly', ar: 'بالساعة' } },
  { key: 'top-members', label: { en: 'Top Members', ar: 'أفضل الأعضاء' } },
  { key: 'denial-reasons', label: { en: 'Denial Reasons', ar: 'أسباب الرفض' } },
  { key: 'denied-entries', label: { en: 'Denied Entries', ar: 'دخول مرفوض' } },
  { key: 'expiring-subs', label: { en: 'Expiring Subs', ar: 'اشتراكات منتهية' } },
  { key: 'low-sessions', label: { en: 'Low Sessions', ar: 'جلسات منخفضة' } },
] as const;

type TabKey = typeof TABS[number]['key'];

// Which tabs show the days filter
const DAYS_TABS: TabKey[] = [
  'daily-stats',
  'top-members',
  'denial-reasons',
  'denied-entries',
  'expiring-subs',
];
const DAYS_OPTIONS = [7, 14, 30, 60, 90];

// Pie chart colors — brutalist red + grays
const PIE_COLORS_TAILWIND = [
  "hsl(var(--chart-1))",             // red
  "hsl(var(--chart-2))",             // dark gray
  "hsl(var(--chart-3))",             // dark red
  "hsl(var(--chart-4))",             // mid gray
  "hsl(var(--chart-5))",             // charcoal
  "hsl(var(--muted-foreground))",
  "hsl(var(--chart-1) / 0.6)",
];


export default function ReportsPage() {
  const { lang } = useLang();
  const labels = t[lang]; // Use global labels for consistency
  const [tab, setTab] = useState<TabKey>('overview');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Build the API URL for the current tab + params
  const buildUrl = useCallback((t: TabKey, d: number) => {
    switch (t) {
      case 'overview': return '/api/reports/overview';
      case 'daily-stats': return `/api/reports/daily-stats?days=${d}`;
      case 'hourly': return '/api/reports/hourly-distribution';
      case 'top-members': return `/api/reports/top-members?days=${d}&limit=10`;
      case 'denial-reasons': return `/api/reports/denial-reasons?days=${d}`;
      case 'denied-entries': return `/api/reports/denied-entries?days=${d}`;
      case 'expiring-subs': return `/api/reports/expiring-subscriptions?days=${d}`;
      case 'low-sessions': return '/api/reports/low-sessions?threshold=3';
      default: return ''; // Fallback
    }
  }, []);

  // Fetch data whenever tab or days changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const apiUrl = buildUrl(tab, days);
    if (!apiUrl) { // Handle cases where API URL might be empty
      setError(labels.error_invalid_report_tab); // Assuming a label for this
      setLoading(false);
      return;
    }

    api.get(apiUrl).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || labels.error);
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError(labels.error);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tab, days, lang, buildUrl, labels.error, labels.error_invalid_report_tab]);

  // Dynamic Recharts axis/grid/tooltip styles based on theme
  const getRechartStyles = () => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const foregroundColor = isDarkMode ? "hsl(var(--foreground))" : "hsl(var(--foreground))";
    const mutedForegroundColor = isDarkMode ? "hsl(var(--muted-foreground))" : "hsl(var(--muted-foreground))";
    const backgroundColor = isDarkMode ? "hsl(var(--background))" : "hsl(var(--background))";
    const borderColor = isDarkMode ? "hsl(var(--border))" : "hsl(var(--border))";

    return {
      axis: { fill: mutedForegroundColor, fontSize: 12 },
      gridStroke: borderColor,
      tooltipContent: { backgroundColor: backgroundColor, border: `2px solid ${borderColor}`, borderRadius: 0 },
      tooltipLabel: { color: foregroundColor },
      tooltipItem: { color: foregroundColor },
      legendItem: { color: mutedForegroundColor },
    };
  };
  const rechartStyles = getRechartStyles();


  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Page title */}
      <h1 className="text-3xl font-bold">{labels.reports}</h1>

      {/* Tab navigation — grouped by category */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-4">
          {[
            { label: { en: 'Overview', ar: 'نظرة عامة' }, tabs: ['overview'] },
            { label: { en: 'Attendance', ar: 'الحضور' }, tabs: ['daily-stats', 'hourly'] },
            { label: { en: 'Members', ar: 'الأعضاء' }, tabs: ['top-members', 'expiring-subs', 'low-sessions'] },
            { label: { en: 'Revenue', ar: 'الإيرادات' }, tabs: ['overview'] },
            { label: { en: 'Access Control', ar: 'التحكم بالدخول' }, tabs: ['denial-reasons', 'denied-entries'] },
          ].map((group) => (
            <div key={group.label.en}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.label[lang]}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.tabs.map((key) => {
                  const tItem = TABS.find(t => t.key === key)!;
                  return (
                    <Button
                      key={key}
                      onClick={() => setTab(key as TabKey)}
                      variant={tab === key ? 'default' : 'outline'}
                      className="text-sm"
                    >
                      {tItem.label[lang]}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>


      {/* Days filter — only shown for certain tabs */}
      {DAYS_TABS.includes(tab) && (
        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm font-medium text-foreground">
            {labels.period}:
          </Label>
          <Select value={days.toString()} onValueChange={(value) => setDays(Number(value))} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={labels.select_period} />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((d) => (
                <SelectItem key={d} value={d.toString()}>
                  {d} {labels.days}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content area */}
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
          {/* Overview — 6 stat cards */}
          {tab === 'overview' && data && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label={labels.total_members}
                value={data.totalMembers ?? 0}
              />
              <StatCard
                label={labels.active_subscriptions}
                value={data.activeSubscriptions ?? 0}
                color="text-success"
              />
              <StatCard
                label={labels.expired_subscriptions}
                value={data.expiredSubscriptions ?? 0}
                color="text-destructive"
              />
              <StatCard
                label={labels.total_revenue}
                value={formatCurrency(data.totalRevenue ?? 0)} // Format currency
                color="text-primary"
              />
              <StatCard
                label={labels.allowed_today}
                value={data.todayStats?.allowed ?? 0}
                color="text-success"
              />
              <StatCard
                label={labels.denied_today}
                value={data.todayStats?.denied ?? 0}
                color="text-destructive"
                subtitle={`${labels.warning}: ${data.todayStats?.warning ?? 0}`}
              />
            </div>
          )}

          {/* Daily Stats — stacked bar chart */}
          {tab === 'daily-stats' && Array.isArray(data) && (
            <Card>
              <CardHeader>
                <CardTitle>{labels.daily_checkins_stats}</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={rechartStyles.gridStroke} />
                    <XAxis dataKey="date" tick={rechartStyles.axis} />
                    <YAxis tick={rechartStyles.axis} />
                    <Tooltip
                      contentStyle={rechartStyles.tooltipContent}
                      labelStyle={rechartStyles.tooltipLabel}
                      itemStyle={rechartStyles.tooltipItem}
                    />
                    <Legend wrapperStyle={{ color: rechartStyles.legendItem.color }}/>
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
              <CardHeader>
                <CardTitle>{labels.hourly_distribution}</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={rechartStyles.gridStroke} />
                    <XAxis dataKey="hour" tick={rechartStyles.axis} />
                    <YAxis tick={rechartStyles.axis} />
                    <Tooltip
                      contentStyle={rechartStyles.tooltipContent}
                      labelStyle={rechartStyles.tooltipLabel}
                      itemStyle={rechartStyles.tooltipItem}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name={labels.visits} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Members — data table */}
          {tab === 'top-members' && Array.isArray(data) && (
            <Card>
              <CardHeader>
                <CardTitle>{labels.top_members}</CardTitle>
              </CardHeader>
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

          {/* Denial Reasons — pie chart */}
          {tab === 'denial-reasons' && Array.isArray(data) && (
            <Card>
              <CardHeader>
                <CardTitle>{labels.denial_reasons}</CardTitle>
              </CardHeader>
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
                      labelLine={{ stroke: rechartStyles.gridStroke }}
                    >
                      {data.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS_TAILWIND[i % PIE_COLORS_TAILWIND.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={rechartStyles.tooltipContent}
                      labelStyle={rechartStyles.tooltipLabel}
                      itemStyle={rechartStyles.tooltipItem}
                    />
                    <Legend wrapperStyle={{ color: rechartStyles.legendItem.color }} formatter={(value: string) => <span style={{ color: rechartStyles.legendItem.color }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Denied Entries — data table */}
          {tab === 'denied-entries' && Array.isArray(data) && (
            <Card>
              <CardHeader>
                <CardTitle>{labels.denied_entries}</CardTitle>
              </CardHeader>
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

          {/* Expiring Subscriptions — data table */}
          {tab === 'expiring-subs' && Array.isArray(data) && (
            <Card>
              <CardHeader>
                <CardTitle>{labels.expiring_subscriptions}</CardTitle>
              </CardHeader>
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
              <CardHeader>
                <CardTitle>{labels.low_sessions}</CardTitle>
              </CardHeader>
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
        </div>
      )}
    </div>
  );
}
