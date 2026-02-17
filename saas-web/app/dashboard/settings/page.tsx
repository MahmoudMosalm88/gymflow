'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Terminal, CheckCircle } from 'lucide-react'; // Icons for Alert
import { cn } from '@/lib/utils';


// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'general' | 'whatsapp' | 'backup' | 'data';

type WhatsAppStatus = { connected: boolean; phone?: string; qrCode?: string };

type BackupEntry = {
  id: string;
  source: string;
  status: string;
  storage_path: string;
  metadata: unknown;
  created_at: number;
  artifact_id: string;
};

// ── Main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // Tab definitions (label + key)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: labels.general_settings || 'General' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'backup', label: labels.backup || 'Backup' },
    { key: 'data', label: labels.data_management || 'Data' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Page heading */}
      <h1 className="text-3xl font-bold">{labels.settings}</h1>

      {/* Tab bar */}
      <Card>
        <CardContent className="p-2 flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              variant={activeTab === tab.key ? 'default' : 'ghost'}
              className="flex-1 min-w-[100px]"
            >
              {tab.label}
            </Button>
          ))}
        </CardContent>
      </Card>


      {/* Tab content */}
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'whatsapp' && <WhatsAppTab />}
      {activeTab === 'backup' && <BackupTab />}
      {activeTab === 'data' && <DataTab />}
    </div>
  );
}

// ── General Tab ────────────────────────────────────────────────────────────

function GeneralTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const [cooldown, setCooldown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    api.get<Record<string, string>>('/api/settings').then((res) => {
      if (res.success && res.data) {
        setCooldown(res.data.scan_cooldown_seconds ?? '');
      }
      setLoading(false);
    }).catch(() => {
      setMessage({ type: 'destructive', text: labels.error_loading_settings });
      setLoading(false);
    });
  }, [labels.error_loading_settings]);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put('/api/settings', {
        values: { scan_cooldown_seconds: cooldown },
      });
      if (res.success) {
        setMessage({ type: 'success', text: labels.saved_successfully });
      } else {
        setMessage({ type: 'destructive', text: res.message || labels.failed_to_save });
      }
    } catch (error) {
      setMessage({ type: 'destructive', text: labels.failed_to_save });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.general_settings}</CardTitle>
        <CardDescription>{labels.general_settings_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Scan cooldown */}
        <div>
          <Label htmlFor="scan-cooldown">{labels.scan_cooldown_seconds}</Label>
          <Input
            id="scan-cooldown"
            type="number"
            min={0}
            value={cooldown}
            onChange={(e) => setCooldown(e.target.value)}
            className="max-w-xs mt-1"
          />
        </div>

        {/* Language info */}
        <div>
          <Label>{labels.language}</Label>
          <p className="text-sm text-muted-foreground mt-1">
            {labels.language_toggle_sidebar}
          </p>
        </div>

        {/* Save button and message */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? labels.saving : labels.save}
          </Button>
          {message && (
            <Alert variant={message.type} className="max-w-md">
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
              <AlertTitle>{message.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── WhatsApp Tab ───────────────────────────────────────────────────────────

function WhatsAppTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchStatus = useCallback(async () => {
    const res = await api.get<WhatsAppStatus>('/api/whatsapp/status');
    if (res.success && res.data) setStatus(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleConnect = async () => {
    setActing(true);
    try {
      await api.post('/api/whatsapp/connect', {});
      await fetchStatus();
    } catch (error) {
      console.error("WhatsApp connect failed:", error);
    } finally {
      setActing(false);
    }
  };

  const handleDisconnect = async () => {
    setActing(true);
    try {
      await api.post('/api/whatsapp/disconnect', {});
      await fetchStatus();
    } catch (error) {
      console.error("WhatsApp disconnect failed:", error);
    } finally {
      setActing(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const connected = status?.connected ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp {labels.integration}</CardTitle>
        <CardDescription>{labels.whatsapp_integration_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <Badge variant={(connected ? 'success' : 'destructive') as any} className="text-sm">
            {connected
              ? labels.connected
              : labels.disconnected}
          </Badge>
          {connected && status?.phone && (
            <span className="text-foreground font-medium">{status.phone}</span>
          )}
        </div>

        {/* QR Code display if available and not connected */}
        {!connected && status?.qrCode && (
          <div className="flex flex-col items-center justify-center space-y-3">
            <p className="text-muted-foreground">{labels.scan_qr_code}</p>
            {/* Using a placeholder for QR code image */}
            <img src={`data:image/png;base64,${status.qrCode}`} alt="WhatsApp QR Code" className="h-48 w-48 border-2 border-[#2a2a2a]" />
            <p className="text-sm text-muted-foreground">{labels.scan_qr_instructions}</p>
          </div>
        )}

        {/* Action buttons */}
        <div>
          {connected ? (
            <Button onClick={handleDisconnect} disabled={acting} variant="destructive" className="min-w-[120px]">
              {acting
                ? labels.disconnecting
                : labels.disconnect}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={acting} className="min-w-[120px]">
              {acting
                ? labels.connecting
                : labels.connect}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Backup Tab ─────────────────────────────────────────────────────────────

function BackupTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const [history, setHistory] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get<BackupEntry[]>('/api/backup/history');
      if (res.success && res.data) setHistory(res.data);
    } catch (error) {
      console.error("Failed to fetch backup history:", error);
      setExportResult({ type: 'destructive', text: labels.error_loading_history });
    } finally {
      setLoading(false);
    }
  }, [labels.error_loading_history]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleExport = async () => {
    setExporting(true);
    setExportResult(null);
    try {
      const res = await api.post<{ backupId: string; rowCounts: Record<string, number> }>(
        '/api/backup/export', {}
      );
      if (res.success) {
        setExportResult({ type: 'success', text: labels.backup_created_successfully });
        fetchHistory(); // refresh the table
      } else {
        setExportResult({ type: 'destructive', text: res.message ?? labels.backup_failed });
      }
    } catch (error) {
      setExportResult({ type: 'destructive', text: labels.backup_failed });
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.backup_and_restore}</CardTitle>
        <CardDescription>{labels.backup_and_restore_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Create backup section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button onClick={handleExport} disabled={exporting} className="min-w-[150px]">
            {exporting
              ? labels.creating_backup
              : labels.create_backup}
          </Button>
          {exportResult && (
            <Alert variant={exportResult.type} className="max-w-md">
              {exportResult.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
              <AlertTitle>{exportResult.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{exportResult.text}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* History table */}
        <h3 className="text-lg font-semibold text-foreground pt-4">
          {labels.backup_history}
        </h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">{labels.date}</TableHead>
                <TableHead>{labels.source}</TableHead>
                <TableHead>{labels.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    {labels.no_backups_yet}
                  </TableCell>
                </TableRow>
              ) : (
                history.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{formatDateTime(b.created_at, lang === 'ar' ? 'ar-EG' : 'en-US')}</TableCell>
                    <TableCell>{b.source}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          b.status === 'completed'
                            ? 'bg-success hover:bg-success/90'
                            : b.status === 'failed'
                            ? 'bg-destructive hover:bg-destructive/90'
                            : 'bg-warning hover:bg-warning/90'
                        }
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Data Tab ───────────────────────────────────────────────────────────────

function DataTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const [history, setHistory] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  useEffect(() => {
    api.get<BackupEntry[]>('/api/backup/history').then((res) => {
      if (res.success && res.data) setHistory(res.data);
      setLoading(false);
    }).catch((error) => {
      console.error("Failed to load backup history for restore:", error);
      setResult({ type: 'destructive', text: labels.error_loading_backups_for_restore });
      setLoading(false);
    });
  }, [labels.error_loading_backups_for_restore]);

  const handleRestore = async () => {
    setConfirmOpen(false);
    setRestoring(true);
    setResult(null);
    try {
      const res = await api.post('/api/backup/restore', { artifactId: selectedId });
      if (res.success) {
        setResult({ type: 'success', text: labels.restore_successful });
      } else {
        setResult({ type: 'destructive', text: res.message ?? labels.restore_failed });
      }
    } catch (error) {
      setResult({ type: 'destructive', text: labels.restore_failed });
    } finally {
      setRestoring(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Only show completed backups for restore
  const completedBackups = history.filter((b) => b.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.restore_from_backup}</CardTitle>
        <CardDescription>{labels.restore_from_backup_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {completedBackups.length === 0 ? (
          <p className="text-muted-foreground">
            {labels.no_backups_available_to_restore}
          </p>
        ) : (
          <>
            {/* Backup selector */}
            <div>
              <Label htmlFor="backup-select">{labels.select_a_backup}</Label>
              <Select value={selectedId} onValueChange={setSelectedId} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <SelectTrigger id="backup-select" className="max-w-md mt-1">
                  <SelectValue placeholder={labels.select_placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" disabled>{labels.select_placeholder}</SelectItem>
                  {completedBackups.map((b) => (
                    <SelectItem key={b.artifact_id} value={b.artifact_id}>
                      {formatDateTime(b.created_at, lang === 'ar' ? 'ar-EG' : 'en-US')} — {b.source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Restore button */}
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!selectedId || restoring}
              variant="destructive"
              className="min-w-[120px]"
            >
              {restoring
                ? labels.restoring
                : labels.restore}
            </Button>
          </>
        )}

        {/* Result message */}
        {result && (
          <Alert variant={result.type} className="max-w-md">
            {result.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
            <AlertTitle>{result.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
            <AlertDescription>{result.text}</AlertDescription>
          </Alert>
        )}

        {/* Confirmation dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{labels.confirm_restore}</DialogTitle>
              <DialogDescription>{labels.confirm_restore_description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setConfirmOpen(false)} variant="outline">
                {labels.cancel}
              </Button>
              <Button onClick={handleRestore} variant="destructive">
                {labels.yes_restore}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
