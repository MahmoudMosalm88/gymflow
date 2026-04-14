'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { getCachedDashboardOverview, getCachedRecentActivity, getCachedTodayHourlyBars } from '@/lib/offline/read-model';
import { useScanContext } from '@/lib/scan-context';
import { submitCheckIn } from '@/lib/check-in/client';
import { playDeniedFeedback, playSuccessFeedback } from '@/lib/check-in/feedback';
import StatCard from '@/components/dashboard/StatCard';
import HourlyChart from '@/components/dashboard/HourlyChart';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const CameraScanner = dynamic(() => import('@/components/dashboard/CameraScanner'), { ssr: false });

type Overview = {
  totalMembers: number;
  activeSubscriptions: number;
  todayCheckIns: number;
  inGymNow?: number;
  expiringThisWeek?: number;
  newThisMonth?: number;
  totalRevenue: number;
  currentMonthRevenue?: number;
  previousMonthRevenue?: number;
  arpm?: number;
  revenueAtRisk?: number;
  revenueSaved?: number;
  atRiskMembers?: number;
  netMemberGrowth?: number;
  todayStats?: {
    allowed: number;
    warning: number;
    denied: number;
  };
  yesterdayCheckIns?: number;
  lastWeekActiveSubs?: number;
  checkInSparkline?: number[];
  ptLowBalance?: number;
};

type ScanResult = {
  success: boolean;
  memberName?: string;
  memberId?: string;
  sessionsRemaining?: number;
  reason?: string;
  reasonCode?: string;
  memberPhoto?: string;
  offline?: boolean;
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
  const attendanceLabels =
    lang === 'ar'
      ? { allowed: 'مسموح', warning: 'تحذير', denied: 'مرفوض' }
      : { allowed: 'Allowed', warning: 'Warning', denied: 'Denied' };

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [scannedValue, setScannedValue] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanInputFocused, setScanInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [hourlyBars, setHourlyBars] = useState<{ hour: number; count: number }[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(true);

  // Sync with global scanner context
  const { lastScan, setScan } = useScanContext();

  // Fetch overview on mount
  const refreshOverview = useCallback(async () => {
    try {
      const res = await api.get<Overview>('/api/reports/overview');
      if (res.data) {
        setOverview(res.data);
      } else {
        try {
          setOverview(await getCachedDashboardOverview());
        } catch {
          // Keep prior values on transient failures.
        }
      }
    } catch {
      try {
        setOverview(await getCachedDashboardOverview());
      } catch {
        // Keep prior values on transient failures.
      }
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    refreshOverview();
  }, [refreshOverview]);

  // Fetch today's activity log
  const refreshActivity = useCallback(async () => {
    try {
      const res = await api.get<ActivityEntry[]>('/api/attendance/today');
      if (res.data) {
        setActivityLog(res.data);
      } else {
        try {
          setActivityLog((await getCachedRecentActivity(20)) as ActivityEntry[]);
        } catch {}
      }
    } catch {}
    finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { refreshActivity(); }, [refreshActivity]);

  // Fetch today's hourly breakdown for the mini chart
  const refreshHourly = useCallback(async () => {
    try {
      const res = await api.get<{ hour: number; count: number }[]>('/api/reports/today-hourly');
      if (res.data) {
        setHourlyBars(res.data);
      } else {
        try {
          setHourlyBars(await getCachedTodayHourlyBars());
        } catch {}
      }
    } catch {
      try {
        setHourlyBars(await getCachedTodayHourlyBars());
      } catch {}
    }
    finally { setHourlyLoading(false); }
  }, []);

  useEffect(() => { refreshHourly(); }, [refreshHourly]);

  // Keep dashboard cards/feed fresh even without manual scans.
  // Throttle focus/visibility refreshes to at most once per 5s.
  const lastRefreshRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOverview();
      refreshActivity();
      refreshHourly();
    }, 30_000);

    const onFocus = () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < 5000) return;
      lastRefreshRef.current = now;
      refreshOverview();
      refreshActivity();
      refreshHourly();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refreshActivity, refreshOverview, refreshHourly]);

  // Scan handler — online first, offline fallback
  const handleScan = async () => {
    if (!scannedValue.trim() || scanning) return;
    setScanning(true);
    setScanResult(null);
    try {
      const resolvedResult = await submitCheckIn(
        scannedValue.trim(),
        'scan',
        reasonLabels,
        labels.error_scan_failed,
        labels.offline_suffix
      );
      setScanResult(resolvedResult);
      setScan({
        success: resolvedResult.success,
        memberName: resolvedResult.memberName,
        memberId: resolvedResult.memberId,
        sessionsRemaining: resolvedResult.sessionsRemaining,
        reason: resolvedResult.reason,
        reasonCode: resolvedResult.reasonCode,
        memberPhoto: resolvedResult.memberPhoto,
        offline: resolvedResult.offline,
        timestamp: Date.now(),
      });
    } finally {
      setScannedValue('');
      setScanning(false);
      inputRef.current?.focus();
      // Refresh activity feed after each scan
      refreshActivity();
      refreshOverview();
    }
  };

  const handleCameraScan = useCallback(async (value: string) => {
    if (!value.trim() || scanning) return;

    setScanning(true);
    setScanResult(null);
    try {
      const resolvedResult = await submitCheckIn(
        value,
        'camera',
        reasonLabels,
        labels.error_scan_failed,
        labels.offline_suffix
      );

      setScanResult(resolvedResult);
      setScan({
        success: resolvedResult.success,
        memberName: resolvedResult.memberName,
        memberId: resolvedResult.memberId,
        sessionsRemaining: resolvedResult.sessionsRemaining,
        reason: resolvedResult.reason,
        reasonCode: resolvedResult.reasonCode,
        memberPhoto: resolvedResult.memberPhoto,
        offline: resolvedResult.offline,
        timestamp: Date.now(),
      });

      if (resolvedResult.success) {
        playSuccessFeedback();
      } else {
        playDeniedFeedback();
      }
    } finally {
      setScanning(false);
      refreshActivity();
      refreshOverview();
    }
  }, [labels.error_scan_failed, labels.offline_suffix, reasonLabels, refreshActivity, refreshOverview, scanning, setScan]);

  // When a global scan happens (from any page), update hero zone + activity.
  // Ignore scans older than 5 s so navigating back doesn't replay a stale result.
  const lastScanTimestampRef = useRef(0);
  useEffect(() => {
    if (!lastScan || lastScan.timestamp === lastScanTimestampRef.current) return;
    if (Date.now() - lastScan.timestamp > 5000) {
      lastScanTimestampRef.current = lastScan.timestamp;
      return; // stale — skip
    }
    lastScanTimestampRef.current = lastScan.timestamp;
    setScanResult({
      success: lastScan.success,
      memberName: lastScan.memberName,
      memberId: lastScan.memberId,
      sessionsRemaining: lastScan.sessionsRemaining,
      reason: lastScan.reason,
      reasonCode: lastScan.reasonCode,
      memberPhoto: lastScan.memberPhoto,
      offline: lastScan.offline,
    });
    refreshActivity();
  }, [lastScan, refreshActivity]);

  useEffect(() => { inputRef.current?.focus(); }, [scanning]);

  // Auto-reset scan result after 5 seconds (both hero and camera)
  useEffect(() => {
    if (!scanResult) return;

    const timer = window.setTimeout(() => {
      setScanResult(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [scanResult]);

  // Derive hero status from scan state
  const heroSuccess = !scanning && scanResult?.success === true;
  const heroDenied = !scanning && scanResult?.success === false;

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8">

      {/* ── Hero Scanner ── */}
      <div
        className={`border-2 shadow-[6px_6px_0_#000000] transition-all duration-300 ${
          heroSuccess ? 'border-success bg-success/10' :
          heroDenied  ? 'border-destructive bg-destructive/10' :
          'border-border bg-card'
        }`}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Status zone — fixed height, always present */}
        <div className="px-5 pt-3 pb-2 h-[48px] md:h-[80px] flex items-center" role="status" aria-live="assertive">

          {/* Scanning */}
          {scanning && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">{labels.scanning}</p>
            </div>
          )}

          {/* Success */}
          {heroSuccess && scanResult && (
            <div className="flex items-center gap-4 w-full animate-fade-in">
              <div className="h-12 w-12 bg-success flex items-center justify-center shrink-0 animate-scale-in">
                <span className="text-white text-2xl font-bold leading-none">✓</span>
              </div>
              {scanResult.memberPhoto && (
                <img
                  src={scanResult.memberPhoto}
                  alt={scanResult.memberName || ''}
                  className="h-14 w-14 object-cover border-2 border-success/40 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-success leading-tight truncate">
                  {scanResult.memberName || (lang === 'ar' ? 'عضو' : 'Member')}
                </p>
                {scanResult.sessionsRemaining !== undefined && (
                  <p className="text-xs text-success/70 mt-0.5">
                    {labels.sessions_remaining.replace('{sessions}', String(scanResult.sessionsRemaining))}
                  </p>
                )}
                {scanResult.offline && (
                  <p className="text-xs text-warning mt-0.5">{labels.offline_suffix}</p>
                )}
              </div>
            </div>
          )}

          {/* Denied */}
          {heroDenied && scanResult && (
            <div className="flex items-center gap-4 w-full animate-fade-in">
              <div className="h-12 w-12 bg-destructive flex items-center justify-center shrink-0 animate-scale-in">
                <span className="text-white text-2xl font-bold leading-none">✗</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-destructive leading-tight truncate">
                  {scanResult.memberName || (lang === 'ar' ? 'عضو' : 'Member')}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {scanResult.reason}
                </p>
              </div>
              {scanResult.memberId && (scanResult.reasonCode === 'no_active_subscription' || scanResult.reasonCode === 'subscription_frozen') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => router.push(`/dashboard/members/${scanResult.memberId}`)}
                >
                  {lang === 'ar' ? 'عرض العضو' : 'View Member'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Input row */}
        <div className="px-5 pb-5 flex flex-col gap-2 md:flex-row">
          <Button
            type="button"
            onClick={() => { setCameraOpen(true); setScanResult(null); }}
            disabled={scanning}
            aria-label={labels.open_camera}
            className="md:hidden w-full h-12 gap-2"
          >
            <Camera className="h-5 w-5" />
            {lang === 'ar' ? 'مسح بالكاميرا' : 'Scan with Camera'}
          </Button>
          <div className="flex gap-2 flex-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => { setCameraOpen(true); setScanResult(null); }}
              disabled={scanning}
              aria-label={labels.open_camera}
              className="hidden md:flex h-12 w-12 shrink-0"
            >
              <Camera />
            </Button>
            <Label htmlFor="scannedValue" className="sr-only">{labels.scanPlaceholder}</Label>
            <div className={`search-bar-wrapper flex-1${scanInputFocused ? ' focused' : ''}`}>
              <Input
                id="scannedValue"
                ref={inputRef}
                autoFocus
                type="text"
                value={scannedValue}
                onChange={(e) => setScannedValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
                onFocus={() => setScanInputFocused(true)}
                onBlur={() => setScanInputFocused(false)}
                placeholder={labels.scanPlaceholder}
                disabled={scanning}
                className="w-full h-12 text-lg bg-card relative z-[1]"
              />
            </div>
            <Button onClick={handleScan} disabled={scanning} className="h-12 px-8 shrink-0">
              {scanning ? labels.scanning : labels.scan}
            </Button>
          </div>
        </div>
      </div>

      {cameraOpen ? (
        <CameraScanner
          lang={lang}
          active={cameraOpen}
          processing={scanning}
          result={cameraOpen ? scanResult : null}
          onClose={() => {
            setCameraOpen(false);
            setScanResult(null);
            setScanning(false);
            inputRef.current?.focus();
          }}
          onDetect={handleCameraScan}
          labels={{
            closeCamera: labels.close_camera,
            cameraTitle: labels.camera_title,
            cameraHint: labels.camera_hint,
            cameraLoading: labels.camera_loading,
            cameraPermissionDenied: labels.camera_permission_denied,
            cameraUnsupported: labels.camera_unsupported,
            cameraFallback: labels.camera_fallback,
            offlineBadge: labels.offline_badge,
            entryDenied: labels.entry_denied,
            welcomeName: labels.welcome_name,
            sessionsRemaining: labels.sessions_remaining,
          }}
        />
      ) : null}

      {/* ── Stat Cards ── */}
      <div className="mt-5 space-y-3">
        {/* Row 1: Live / operational — the numbers you check 50x/day */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loadingOverview ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-2 border-border bg-card h-[90px] animate-pulse" />
            ))
          ) : (
            <>
              <StatCard
                label={lang === 'ar' ? 'أعضاء نشطين' : 'Active Members'}
                value={overview?.activeSubscriptions ?? 0}
                color="text-foreground"
                previousValue={overview?.lastWeekActiveSubs}
                compareLabel={lang === 'ar' ? 'مقارنة بالشهر الماضي' : 'vs last month'}
                accent="border-s-foreground/30"
              />
              <StatCard
                label={lang === 'ar' ? 'عملاء PT على وشك النفاد' : 'PT Low Balance'}
                value={overview?.ptLowBalance ?? 0}
                color={(overview?.ptLowBalance ?? 0) > 0 ? 'text-warning' : 'text-foreground'}
                accent={(overview?.ptLowBalance ?? 0) > 0 ? 'border-s-warning' : undefined}
              />
              <div className={`h-full ${(overview?.inGymNow ?? 0) > 0 ? 'animate-live-glow' : ''}`}>
                <StatCard
                  label={lang === 'ar' ? 'داخل الصالة الآن' : 'Inside Gym Now'}
                  value={overview?.inGymNow ?? 0}
                  color={(overview?.inGymNow ?? 0) > 0 ? 'text-success' : 'text-foreground'}
                  accent={(overview?.inGymNow ?? 0) > 0 ? 'border-s-success' : undefined}
                />
              </div>
              <StatCard
                label={lang === 'ar' ? 'إيراد لكل عضو نشط' : 'Rev. Per Active Member'}
                value={formatCurrency(overview?.arpm ?? 0)}
                color="text-warning"
                accent="border-s-warning"
              />
            </>
          )}
        </div>

        {/* Row 2: Money / growth — the numbers you check morning + evening */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loadingOverview ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-2 border-border bg-card h-[90px] animate-pulse" />
            ))
          ) : (
            <>
              <StatCard
                label={lang === 'ar' ? 'إيراد مهدد هذا الأسبوع' : 'Revenue at Risk This Week'}
                value={formatCurrencyCompact(overview?.revenueAtRisk ?? 0)}
                color={(overview?.revenueAtRisk ?? 0) > 0 ? 'text-destructive' : 'text-foreground'}
                accent={(overview?.revenueAtRisk ?? 0) > 0 ? 'border-s-destructive' : undefined}
              />
              <StatCard
                label={lang === 'ar' ? 'اشتراكات تنتهي هذا الأسبوع' : 'Expiring This Week'}
                value={overview?.expiringThisWeek ?? 0}
                color={(overview?.expiringThisWeek ?? 0) > 0 ? 'text-warning' : 'text-foreground'}
                accent={(overview?.expiringThisWeek ?? 0) > 0 ? 'border-s-warning' : undefined}
              />
              <StatCard
                label={lang === 'ar' ? 'أعضاء انضموا هذا الشهر' : 'Joined This Month'}
                value={overview?.newThisMonth ?? 0}
                color={(overview?.newThisMonth ?? 0) > 0 ? 'text-success' : 'text-foreground'}
                accent={(overview?.newThisMonth ?? 0) > 0 ? 'border-s-success' : undefined}
              />
              <StatCard
                label={lang === 'ar' ? 'إجمالي المسجلين' : 'Total Registered'}
                value={overview?.totalMembers ?? 0}
                color="text-muted-foreground"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Section: attendance + activity ── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left column */}
        <div className="flex flex-col gap-3">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle>{labels.attendance_snapshot}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Hourly bar chart with inline summary */}
              {hourlyLoading ? (
                <div className="h-[140px] animate-pulse bg-secondary/20 border-2 border-border" />
              ) : hourlyBars.length > 0 ? (
                <HourlyChart bars={hourlyBars} lang={lang} todayStats={overview?.todayStats} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {lang === 'ar' ? 'لا توجد تسجيلات دخول اليوم بعد' : 'No check-ins yet today'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => router.push('/dashboard/members/new')}>
              {labels.add_new_member}
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/reports')}>
              {labels.view_reports}
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/guest-passes')}>
              {labels.guest_passes}
            </Button>
          </div>
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
              <ul className="divide-y divide-border max-h-[360px] overflow-y-auto no-scrollbar" role="list" aria-label={labels.recent_activity}>
                {activityLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-secondary transition-colors"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-4 text-center shrink-0 ${
                        entry.result === 'allowed' || entry.result === 'success' ? 'text-success' :
                        entry.result === 'warning' ? 'text-warning' :
                        'text-destructive'
                      }`} aria-hidden="true">
                        {entry.result === 'allowed' || entry.result === 'success'
                          ? '✓'
                          : entry.result === 'warning'
                            ? '!'
                            : '✗'}
                      </span>
                      <span className="text-sm text-foreground truncate">
                        {entry.member_name || entry.scanned_value}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ms-2">
                      {new Date(entry.timestamp * 1000).toLocaleTimeString(
                        lang === 'ar' ? 'ar-EG' : 'en-US',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
