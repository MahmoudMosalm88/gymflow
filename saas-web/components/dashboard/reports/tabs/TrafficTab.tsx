'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

// Lazy-load the chart components — they pull in Recharts and canvas code,
// so we only load them when this tab is actually rendered.
const DailyStatsChart = dynamic(
  () => import('@/components/dashboard/reports/DailyStatsChart'),
  {
    loading: () => (
      <div className="flex h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    ),
  }
);

const HourlyHeatmap = dynamic(
  () => import('@/components/dashboard/reports/HourlyHeatmap'),
  {
    loading: () => (
      <div className="flex h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    ),
  }
);

interface Props {
  lang: string;
  labels: any;
  days: number;
  styles: any;
}

export default function TrafficTab({ lang, labels, days, styles }: Props) {
  // This tab self-fetches both endpoints in parallel
  const [dailyData, setDailyData] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/reports/daily-stats?days=${days}`),
      api.get('/api/reports/hourly-distribution'),
    ]).then(([dailyRes, hourlyRes]) => {
      if (dailyRes.success) setDailyData(dailyRes.data);
      if (hourlyRes.success) setHourlyData(hourlyRes.data);
      setLoading(false);
    });
  }, [days]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Panel 1: Daily Stats chart ── */}
      <div>
        {Array.isArray(dailyData) && dailyData.length > 0 ? (
          <DailyStatsChart data={dailyData} labels={labels} styles={styles} />
        ) : (
          <div className="border-2 border-border bg-card py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد بيانات يومية بعد.' : 'No daily stats data yet.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Panel 2: Hourly heatmap ── */}
      <div>
        {Array.isArray(hourlyData) && hourlyData.length > 0 ? (
          <HourlyHeatmap data={hourlyData} lang={lang} title={labels.hourly_distribution} />
        ) : (
          <div className="border-2 border-border bg-card py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد بيانات حضور بعد.' : 'No check-in data yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
