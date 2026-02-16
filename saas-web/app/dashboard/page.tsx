'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import StatCard from '@/components/dashboard/StatCard';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

type Overview = {
  totalMembers: number;
  activeSubscriptions: number;
  todayCheckIns: number;
  totalRevenue: number;
};

type ScanResult = {
  success: boolean;
  memberName?: string;
  sessionsRemaining?: number;
  reason?: string;
};

export default function DashboardPage() {
  const { lang } = useLang();
  const labels = t[lang];

  // Overview data
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Scanner
  const [scannedValue, setScannedValue] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch overview stats on mount
  useEffect(() => {
    api.get<Overview>('/api/reports/overview')
      .then((res) => {
        if (res.data) setOverview(res.data);
      })
      .catch(() => {})
      .finally(() => setLoadingOverview(false));
  }, []);

  // Handle scan submission
  const handleScan = async () => {
    if (!scannedValue.trim() || scanning) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.post<ScanResult>('/api/attendance/check', {
        scannedValue: scannedValue.trim(),
        method: 'scan',
      });
      setScanResult(res.data ?? { success: false, reason: labels.error });
    } catch {
      setScanResult({ success: false, reason: labels.error });
    } finally {
      setScannedValue('');
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  if (loadingOverview) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Stat cards — 4 columns on large screens, 2 on medium, 1 on small */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={lang === 'ar' ? 'إجمالي الأعضاء' : 'Total Members'}
          value={overview?.totalMembers ?? 0}
        />
        <StatCard
          label={lang === 'ar' ? 'اشتراكات نشطة' : 'Active Subscriptions'}
          value={overview?.activeSubscriptions ?? 0}
          color="text-green-400"
        />
        <StatCard
          label={lang === 'ar' ? 'تسجيلات اليوم' : "Today's Check-ins"}
          value={overview?.todayCheckIns ?? 0}
          color="text-blue-400"
        />
        <StatCard
          label={lang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
          value={overview?.totalRevenue ?? 0}
          color="text-purple-400"
        />
      </div>

      {/* Scanner section */}
      <div className="rounded-xl border border-border bg-surface-card p-5">
        <h2 className="mb-3 text-lg font-semibold">{labels.scanner}</h2>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={scannedValue}
          onChange={(e) => setScannedValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleScan();
          }}
          placeholder={labels.scanPlaceholder}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-[#f3f6ff] placeholder-[#8892a8] outline-none focus:border-brand"
        />
      </div>

      {/* Scan result — green for success, red for failure */}
      {scanResult && (
        <div
          className={`rounded-xl border p-4 ${
            scanResult.success
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          {scanResult.success ? (
            <div>
              <p className="text-lg font-semibold text-green-400">{scanResult.memberName}</p>
              <p className="text-sm text-green-300">
                {lang === 'ar'
                  ? `الجلسات المتبقية: ${scanResult.sessionsRemaining ?? '—'}`
                  : `Sessions remaining: ${scanResult.sessionsRemaining ?? '—'}`}
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-red-400">{scanResult.reason}</p>
          )}
        </div>
      )}
    </div>
  );
}
