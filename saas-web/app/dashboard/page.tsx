'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import StatCard from '@/components/dashboard/StatCard'; // Keeping existing StatCard for now, will update it later
import LoadingSpinner from '@/components/dashboard/LoadingSpinner'; // Keeping existing LoadingSpinner for now

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // cn helper from shadcn/ui

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
  memberPhoto?: string; // Assuming photo path can be returned
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
      .catch(() => {}) // Handle error appropriately
      .finally(() => setLoadingOverview(false));
  }, []);

  // Handle scan submission
  const handleScan = async () => {
    if (!scannedValue.trim() || scanning) return;
    setScanning(true);
    setScanResult(null); // Clear previous result
    try {
      const res = await api.post<ScanResult>('/api/attendance/check', {
        scannedValue: scannedValue.trim(),
        method: 'scan',
      });
      setScanResult(res.data ?? { success: false, reason: labels.error });
    } catch (error) {
      console.error("Scan error:", error);
      setScanResult({ success: false, reason: labels.error_scan_failed }); // Use a specific error message
    } finally {
      setScannedValue(''); // Clear input after scan
      setScanning(false);
      inputRef.current?.focus(); // Re-focus for next scan
    }
  };

  // Focus input on page load and after each scan
  useEffect(() => {
    inputRef.current?.focus();
  }, [scanning]);

  if (loadingOverview) return <LoadingSpinner size="lg" />;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Using existing StatCard component for now, will update its internal styling/structure later */}
        <StatCard
          label={labels.total_members}
          value={overview?.totalMembers ?? 0}
        />
        <StatCard
          label={labels.active_subscriptions}
          value={overview?.activeSubscriptions ?? 0}
          color="text-success" // Using new semantic color
        />
        <StatCard
          label={labels.todays_check_ins}
          value={overview?.todayCheckIns ?? 0}
          color="text-info" // Using new semantic color
        />
        <StatCard
          label={labels.total_revenue}
          value={overview?.totalRevenue ?? 0}
          color="text-primary" // Using new primary color
        />
      </div>

      {/* Scan for Check-in Section */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-2xl">{labels.scanner}</CardTitle>
          <CardDescription>{labels.scan_qr_or_enter_id}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-4">
          <div className="flex w-full items-center space-x-2">
            <Label htmlFor="scannedValue" className="sr-only">{labels.scanPlaceholder}</Label>
            <Input
              id="scannedValue"
              ref={inputRef}
              autoFocus
              type="text"
              value={scannedValue}
              onChange={(e) => setScannedValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleScan();
              }}
              placeholder={labels.scanPlaceholder}
              disabled={scanning}
              className="flex-grow text-lg h-12"
            />
            <Button onClick={handleScan} disabled={scanning} className="h-12 px-6">
              {scanning ? labels.scanning : labels.scan}
            </Button>
          </div>

          {/* Live Feedback Area */}
          {scanResult && (
            <div
              className={cn(
                "flex items-center gap-4 p-4 text-white",
                scanResult.success ? "bg-success" : "bg-destructive"
              )}
              dir={lang === 'ar' ? 'rtl' : 'ltr'} // Ensure proper direction for feedback
            >
              {scanResult.success ? (
                // Success feedback
                <>
                  {scanResult.memberPhoto && (
                    <img
                      src={scanResult.memberPhoto}
                      alt={scanResult.memberName || "Member"}
                      className="h-12 w-12 object-cover border-2 border-white/30"
                    />
                  )}
                  <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                    <p className="text-xl font-semibold">{labels.welcome_name.replace('{name}', scanResult.memberName || '')}</p>
                    {scanResult.sessionsRemaining !== undefined && (
                      <p className="text-sm">
                        {labels.sessions_remaining.replace('{sessions}', scanResult.sessionsRemaining.toString())}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                // Failure feedback
                <p className="text-base font-medium">{scanResult.reason}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholders for other sections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{labels.attendance_snapshot}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{labels.attendance_snapshot_content}</p>
          {/* Content for Peak Hours/Capacity Utilization */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{labels.recent_activity}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{labels.recent_activity_content}</p>
          {/* Content for Latest Check-ins, New Subscriptions, etc. */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{labels.quick_actions}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button>{labels.add_new_member}</Button>
          <Button variant="outline">{labels.view_reports}</Button>
          {/* Other quick actions */}
        </CardContent>
      </Card>
    </div>
  );
}
