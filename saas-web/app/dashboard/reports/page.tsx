'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { api } from '@/lib/api-client';
import { useLang } from '@/lib/i18n';
import { formatDate, formatDateTime, daysUntil } from '@/lib/format';
import DataTable from '@/components/dashboard/DataTable';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';

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
const DAYS_TABS: TabKey[] = ['daily-stats', 'top-members', 'denial-reasons', 'denied-entries', 'expiring-subs'];
const DAYS_OPTIONS = [7, 14, 30, 60, 90];

// Pie chart colors
const PIE_COLORS = ['#FF8C00', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#eab308', '#ec4899', '#06b6d4'];

export default function ReportsPage() {
  const { lang } = useLang();
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
    }
  }, []);

  // Fetch data whenever tab or days changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get(buildUrl(tab, days)).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || (lang === 'ar' ? 'حدث خطأ' : 'Something went wrong'));
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError(lang === 'ar' ? 'حدث خطأ' : 'Something went wrong');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tab, days, lang, buildUrl]);

  // Shared Recharts axis/grid styles
  const axisStyle = { fill: '#8892a8', fontSize: 12 };
  const gridStroke = 'rgba(255,255,255,0.1)';

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-2xl font-bold text-[#f3f6ff]">
        {lang === 'ar' ? 'التقارير' : 'Reports'}
      </h1>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand text-white'
                : 'bg-surface-card text-[#8892a8] hover:text-[#f3f6ff] border border-border'
            }`}
          >
            {t.label[lang]}
          </button>
        ))}
      </div>

      {/* Days filter — only shown for certain tabs */}
      {DAYS_TABS.includes(tab) && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#8892a8]">
            {lang === 'ar' ? 'الفترة:' : 'Period:'}
          </span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-[#f3f6ff] outline-none focus:border-brand"
          >
            {DAYS_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} {lang === 'ar' ? 'يوم' : 'days'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content area */}
      {loading ? (
        <LoadingSpinner size="lg" />
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
          {error}
        </div>
      ) : (
        <div>
          {/* Overview — 6 stat cards */}
          {tab === 'overview' && data && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label={lang === 'ar' ? 'إجمالي الأعضاء' : 'Total Members'}
                value={data.totalMembers ?? 0}
              />
              <StatCard
                label={lang === 'ar' ? 'اشتراكات نشطة' : 'Active Subscriptions'}
                value={data.activeSubscriptions ?? 0}
                color="text-green-400"
              />
              <StatCard
                label={lang === 'ar' ? 'اشتراكات منتهية' : 'Expired Subscriptions'}
                value={data.expiredSubscriptions ?? 0}
                color="text-red-400"
              />
              <StatCard
                label={lang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                value={data.totalRevenue ?? 0}
                color="text-brand"
              />
              <StatCard
                label={lang === 'ar' ? 'مسموح اليوم' : 'Allowed Today'}
                value={data.todayStats?.allowed ?? 0}
                color="text-green-400"
              />
              <StatCard
                label={lang === 'ar' ? 'مرفوض اليوم' : 'Denied Today'}
                value={data.todayStats?.denied ?? 0}
                color="text-red-400"
                subtitle={`${lang === 'ar' ? 'تحذير' : 'Warning'}: ${data.todayStats?.warning ?? 0}`}
              />
            </div>
          )}

          {/* Daily Stats — stacked bar chart */}
          {tab === 'daily-stats' && Array.isArray(data) && (
            <div className="rounded-xl border border-border bg-surface-card p-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="date" tick={axisStyle} />
                  <YAxis tick={axisStyle} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1f33', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    labelStyle={{ color: '#f3f6ff' }}
                    itemStyle={{ color: '#f3f6ff' }}
                  />
                  <Legend />
                  <Bar dataKey="allowed" stackId="a" fill="#22c55e" name={lang === 'ar' ? 'مسموح' : 'Allowed'} />
                  <Bar dataKey="warning" stackId="a" fill="#eab308" name={lang === 'ar' ? 'تحذير' : 'Warning'} />
                  <Bar dataKey="denied" stackId="a" fill="#ef4444" name={lang === 'ar' ? 'مرفوض' : 'Denied'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly Distribution — single bar chart */}
          {tab === 'hourly' && Array.isArray(data) && (
            <div className="rounded-xl border border-border bg-surface-card p-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="hour" tick={axisStyle} />
                  <YAxis tick={axisStyle} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1f33', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    labelStyle={{ color: '#f3f6ff' }}
                    itemStyle={{ color: '#f3f6ff' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" name={lang === 'ar' ? 'زيارات' : 'Visits'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Members — data table */}
          {tab === 'top-members' && Array.isArray(data) && (
            <DataTable
              columns={[
                { key: 'rank', label: lang === 'ar' ? 'الترتيب' : 'Rank' },
                { key: 'name', label: lang === 'ar' ? 'الاسم' : 'Name' },
                { key: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits' },
              ]}
              data={data.map((m: any, i: number) => ({ ...m, rank: i + 1 }))}
            />
          )}

          {/* Denial Reasons — pie chart */}
          {tab === 'denial-reasons' && Array.isArray(data) && (
            <div className="rounded-xl border border-border bg-surface-card p-4">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="reason_code"
                    cx="50%"
                    cy="50%"
                    outerRadius={140}
                    label={(props: any) => `${props.reason_code} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#8892a8' }}
                  >
                    {data.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1f33', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    itemStyle={{ color: '#f3f6ff' }}
                  />
                  <Legend formatter={(value: string) => <span style={{ color: '#f3f6ff' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Denied Entries — data table */}
          {tab === 'denied-entries' && Array.isArray(data) && (
            <DataTable
              columns={[
                { key: 'name', label: lang === 'ar' ? 'الاسم' : 'Name' },
                { key: 'timestamp', label: lang === 'ar' ? 'الوقت' : 'Time', render: (row: any) => formatDateTime(row.timestamp, lang === 'ar' ? 'ar-EG' : 'en-US') },
                { key: 'reason_code', label: lang === 'ar' ? 'السبب' : 'Reason' },
              ]}
              data={data}
            />
          )}

          {/* Expiring Subscriptions — data table */}
          {tab === 'expiring-subs' && Array.isArray(data) && (
            <DataTable
              columns={[
                { key: 'name', label: lang === 'ar' ? 'الاسم' : 'Name' },
                { key: 'phone', label: lang === 'ar' ? 'الهاتف' : 'Phone' },
                { key: 'end_date', label: lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date', render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US') },
                { key: 'days_left', label: lang === 'ar' ? 'أيام متبقية' : 'Days Left', render: (row: any) => {
                  const d = daysUntil(row.end_date);
                  return <span className={d <= 2 ? 'text-red-400' : 'text-yellow-400'}>{d}</span>;
                }},
              ]}
              data={data}
            />
          )}

          {/* Low Sessions — data table */}
          {tab === 'low-sessions' && Array.isArray(data) && (
            <DataTable
              columns={[
                { key: 'name', label: lang === 'ar' ? 'الاسم' : 'Name' },
                { key: 'phone', label: lang === 'ar' ? 'الهاتف' : 'Phone' },
                { key: 'sessions_remaining', label: lang === 'ar' ? 'جلسات متبقية' : 'Sessions Remaining', render: (row: any) => (
                  <span className={row.sessions_remaining <= 1 ? 'text-red-400 font-bold' : 'text-yellow-400'}>{row.sessions_remaining}</span>
                )},
              ]}
              data={data}
            />
          )}
        </div>
      )}
    </div>
  );
}
