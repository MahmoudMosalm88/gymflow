'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrencyCompact } from '@/lib/format';
import { offlineCheckIn } from '@/lib/offline/check-in-engine';
import { useScanContext } from '@/lib/scan-context';
import StatCard from '@/components/dashboard/StatCard';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
  memberPhoto?: string;
};

type ActivityEntry = {
  id: string;
  timestamp: number;
  result: string;
  reason_code: string | null;
  scanned_value: string;
  member_name: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];
  const reasonLabels: Record<string, string> = {
    unknown_member: labels.scan_reason_unknown_member,
    cooldown: labels.scan_reason_cooldown,
    already_checked_in_today: labels.scan_reason_already_checked_in_today,
    no_active_subscription: labels.scan_reason_no_active_subscription,
    quota_exceeded: labels.scan_reason_quota_exceeded,
    subscription_frozen: labels.scan_reason_subscription_frozen,
  };

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [scannedValue, setScannedValue] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Sync with global scanner context
  const { lastScan, setScan } = useScanContext();

  // Fetch overview on mount
  useEffect(() => {
    api.get<Overview>('/api/reports/overview')
      .then((res) => { if (res.data) setOverview(res.data); })
      .catch(() => {})
      .finally(() => setLoadingOverview(false));
  }, []);

  // Fetch today's activity log
  const refreshActivity = useCallback(async () => {
    try {
      const res = await api.get<ActivityEntry[]>('/api/attendance/today');
      if (res.data) setActivityLog(res.data);
    } catch {}
    setActivityLoading(false);
  }, []);

  useEffect(() => { refreshActivity(); }, [refreshActivity]);

  // Scan handler — online first, offline fallback
  const handleScan = async () => {
    if (!scannedValue.trim() || scanning) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.post<ScanResult>('/api/attendance/check', {
        scannedValue: scannedValue.trim(),
        method: 'scan',
      });
      const payload = res.data ?? { success: false, reason: labels.error };
      const resolvedResult = {
        ...payload,
        reason: payload.success
          ? payload.reason
          : (payload.reason ? (reasonLabels[payload.reason] ?? payload.reason) : labels.error),
      };
      setScanResult(resolvedResult);
      // Sync manual scan to global context
      setScan({
        success: resolvedResult.success,
        memberName: resolvedResult.memberName,
        sessionsRemaining: resolvedResult.sessionsRemaining,
        reason: resolvedResult.reason,
        timestamp: Date.now(),
      });
    } catch {
      try {
        const offlineResult = await offlineCheckIn(scannedValue.trim(), 'scan');
        setScanResult({
          success: offlineResult.allowed,
          memberName: offlineResult.member?.name,
          sessionsRemaining: offlineResult.sessionsRemaining,
          reason: offlineResult.allowed
            ? `${offlineResult.member?.name} (${labels.offline_suffix})`
            : (reasonLabels[offlineResult.reason] ?? offlineResult.reason),
        });
      } catch {
        setScanResult({ success: false, reason: labels.error_scan_failed });
      }
    } finally {
      setScannedValue('');
      setScanning(false);
      inputRef.current?.focus();
      // Refresh activity feed after each scan
      refreshActivity();
    }
  };

  // When a global scan happens (from any page), update hero zone + activity
  const lastScanTimestampRef = useRef(0);
  useEffect(() => {
    if (!lastScan || lastScan.timestamp === lastScanTimestampRef.current) return;
    lastScanTimestampRef.current = lastScan.timestamp;
    setScanResult({
      success: lastScan.success,
      memberName: lastScan.memberName,
      sessionsRemaining: lastScan.sessionsRemaining,
      reason: lastScan.reason,
    });
    refreshActivity();
  }, [lastScan, refreshActivity]);

  useEffect(() => { inputRef.current?.focus(); }, [scanning]);

  // Derive hero status from scan state
  const heroIdle = !scanning && !scanResult;
  const heroSuccess = !scanning && scanResult?.success === true;
  const heroDenied = !scanning && scanResult?.success === false;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 lg:p-8">

      {/* ── Hero Scanner ── */}
      <div
        className="border-2 border-[#2a2a2a] bg-[#1e1e1e] shadow-[6px_6px_0_#000000]"
        style={{ borderLeft: '4px solid #e63946' }}
      >
        {/* Always-visible status zone */}
        <div
          className={`min-h-[72px] px-6 pt-5 pb-3 flex items-center transition-colors ${
            heroSuccess ? 'bg-[#0d2b1a]' :
            heroDenied  ? 'bg-[#2b0d0d]' :
            'bg-transparent'
          }`}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          {heroIdle && (
            <span className="text-sm text-[#8a8578]">{labels.scan_qr_or_enter_id}</span>
          )}
          {scanning && (
            <span className="text-sm text-[#8a8578]">{labels.scanning}</span>
          )}
          {heroSuccess && scanResult && (
            <div className="flex items-center gap-4">
              {scanResult.memberPhoto && (
                <img
                  src={scanResult.memberPhoto}
                  alt={scanResult.memberName || ''}
                  className="h-12 w-12 object-cover border-2 border-white/20 shrink-0"
                />
              )}
              <div style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
                <p className="text-xl font-bold text-[#4ade80]">
                  {labels.welcome_name.replace('{name}', scanResult.memberName || '')}
                </p>
                {scanResult.sessionsRemaining !== undefined && (
                  <p className="text-sm text-[#4ade80]/70">
                    {labels.sessions_remaining.replace('{sessions}', String(scanResult.sessionsRemaining))}
                  </p>
                )}
              </div>
            </div>
          )}
          {heroDenied && scanResult && (
            <p className="text-sm font-medium text-[#e63946]">{scanResult.reason}</p>
          )}
        </div>

        {/* Input row */}
        <div className="px-6 pb-5 flex gap-2">
          <Label htmlFor="scannedValue" className="sr-only">{labels.scanPlaceholder}</Label>
          <Input
            id="scannedValue"
            ref={inputRef}
            autoFocus
            type="text"
            value={scannedValue}
            onChange={(e) => setScannedValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
            placeholder={labels.scanPlaceholder}
            disabled={scanning}
            className="flex-1 h-12 text-lg"
          />
          <Button onClick={handleScan} disabled={scanning} className="h-12 px-8 shrink-0">
            {scanning ? labels.scanning : labels.scan}
          </Button>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingOverview ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-2 border-[#2a2a2a] bg-[#1e1e1e] h-[100px] animate-pulse" />
          ))
        ) : (
          <>
            <StatCard label={labels.total_members} value={overview?.totalMembers ?? 0} color="text-foreground" />
            <StatCard label={labels.active_subscriptions} value={overview?.activeSubscriptions ?? 0} color="text-success" />
            <StatCard label={labels.todays_check_ins} value={overview?.todayCheckIns ?? 0} color="text-info" />
            <StatCard label={labels.total_revenue} value={formatCurrencyCompact(overview?.totalRevenue ?? 0)} color="text-primary" valueSize="text-2xl" />
          </>
        )}
      </div>

      {/* ── Bottom Bento: left column (attendance + quick actions) + right column (activity) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left column */}
        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>{labels.attendance_snapshot}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{labels.attendance_snapshot_content}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{labels.quick_actions}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={() => router.push('/dashboard/members/new')}>
                {labels.add_new_member}
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard/reports')}>
                {labels.view_reports}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column — today's activity feed */}
        <Card>
          <CardHeader>
            <CardTitle>{labels.recent_activity}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityLoading ? (
              <div className="p-6"><LoadingSpinner /></div>
            ) : activityLog.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{labels.noData}</p>
            ) : (
              <div className="divide-y divide-[#2a2a2a] max-h-[360px] overflow-y-auto no-scrollbar">
                {activityLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#222222] transition-colors"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-4 text-center shrink-0 ${
                        entry.result === 'allowed'  ? 'text-success' :
                        entry.result === 'warning'  ? 'text-warning' :
                        'text-destructive'
                      }`}>
                        {entry.result === 'allowed' ? '✓' : entry.result === 'warning' ? '!' : '✗'}
                      </span>
                      <span className="text-sm text-[#e8e4df] truncate">
                        {entry.member_name || entry.scanned_value}
                      </span>
                    </div>
                    <span className="text-xs text-[#8a8578] shrink-0 ml-2">
                      {new Date(entry.timestamp * 1000).toLocaleTimeString(
                        lang === 'ar' ? 'ar-EG' : 'en-US',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
