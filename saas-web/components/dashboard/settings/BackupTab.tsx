'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

// Fallback copy for labels that may not exist in all i18n locales
const copy = {
  cardsTitle: 'Pre-Printed Cards',
  cardsDescription: 'Generate A4 QR code sheets for printing.',
  cardsCount: 'How many codes?',
  cardsNext: 'Next code',
  exportFormat: 'Export format',
  pdfFormat: 'PDF',
  csvFormat: 'CSV',
  cardsGeneratePdf: 'Generate PDF',
  cardsGenerateCsv: 'Generate CSV',
  cardsCountError: 'Enter a valid count between 1 and 2000.',
  cardsGenerated: 'Generated',
  cardsDownloadStarted: 'Files downloaded successfully.',
};

type BackupEntry = {
  id: string;
  source: string;
  status: string;
  storage_path: string;
  metadata: unknown;
  created_at: number;
  artifact_id: string;
};

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getDownloadFileName(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const normalMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (normalMatch?.[1]) return normalMatch[1];
  return fallback;
}

export default function BackupTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const [cardCount, setCardCount] = useState('500');
  const [cardFormat, setCardFormat] = useState<'pdf' | 'csv'>('pdf');
  const [cardNextPreview, setCardNextPreview] = useState('');
  const [cardGenerating, setCardGenerating] = useState(false);
  const [cardResult, setCardResult] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [history, setHistory] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [intervalHours, setIntervalHours] = useState('24');
  const [windowStart, setWindowStart] = useState('0');
  const [windowEnd, setWindowEnd] = useState('24');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      await api.post('/api/backup/auto-run', {});
      const res = await api.get<BackupEntry[]>('/api/backup/history');
      if (res.success && res.data) setHistory(res.data);
      const cardPreviewRes = await api.get<{ next: string }>('/api/cards/next-preview');
      if (cardPreviewRes.success && cardPreviewRes.data?.next) {
        setCardNextPreview(cardPreviewRes.data.next);
      }
      const settingsRes = await api.get<Record<string, unknown>>('/api/settings');
      if (settingsRes.success && settingsRes.data) {
        setAutoEnabled(Boolean(settingsRes.data.backup_auto_enabled));
        setIntervalHours(String(settingsRes.data.backup_auto_interval_hours ?? 24));
        setWindowStart(String(settingsRes.data.backup_auto_window_start ?? 0));
        setWindowEnd(String(settingsRes.data.backup_auto_window_end ?? 24));
      }
    } catch {
      setExportResult({ type: 'destructive', text: labels.error_loading_history });
    } finally {
      setLoading(false);
    }
  }, [labels.error_loading_history]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleGenerateCards = async () => {
    setCardResult(null);
    const count = Number(cardCount);
    if (!Number.isFinite(count) || count < 1 || count > 2000 || !Number.isInteger(count)) {
      setCardResult({ type: 'destructive', text: labels.cards_count_error || copy.cardsCountError });
      return;
    }

    setCardGenerating(true);
    try {
      const token = localStorage.getItem('session_token');
      const branchId = localStorage.getItem('branch_id');
      const response = await fetch('/api/cards/generate-batch-file', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(branchId ? { 'x-branch-id': branchId } : {}),
        },
        body: JSON.stringify({ count, format: cardFormat }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => null);
        const errMessage = errPayload?.message || labels.error;
        setCardResult({ type: 'destructive', text: errMessage });
        return;
      }

      const fileBlob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const fallbackName = cardFormat === 'pdf' ? 'GymFlow-Cards.pdf' : 'GymFlow-Cards.csv';
      const fileName = getDownloadFileName(contentDisposition, fallbackName);
      const from = response.headers.get('x-card-from') ?? '';
      const to = response.headers.get('x-card-to') ?? '';
      triggerDownload(fileBlob, fileName);
      setCardResult({
        type: 'success',
        text: `${labels.cards_generated || copy.cardsGenerated} ${from} → ${to}. ${labels.cards_download_started || copy.cardsDownloadStarted}`,
      });

      const preview = await api.get<{ next: string }>('/api/cards/next-preview');
      if (preview.success && preview.data?.next) {
        setCardNextPreview(preview.data.next);
      }
    } catch {
      setCardResult({ type: 'destructive', text: labels.error });
    } finally {
      setCardGenerating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportResult(null);
    try {
      const res = await api.post<{ backupId: string; rowCounts: Record<string, number> }>('/api/backup/export', {});
      if (res.success) {
        setExportResult({ type: 'success', text: labels.backup_created_successfully });
        fetchHistory();
      } else {
        setExportResult({ type: 'destructive', text: res.message ?? labels.backup_failed });
      }
    } catch {
      setExportResult({ type: 'destructive', text: labels.backup_failed });
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = async () => {
    setConfirmOpen(false);
    setRestoring(true);
    setRestoreResult(null);
    try {
      const res = await api.post('/api/backup/restore', { artifactId: selectedId });
      if (res.success) {
        setRestoreResult({ type: 'success', text: labels.restore_successful });
      } else {
        setRestoreResult({ type: 'destructive', text: res.message ?? labels.restore_failed });
      }
    } catch {
      setRestoreResult({ type: 'destructive', text: labels.restore_failed });
    } finally {
      setRestoring(false);
    }
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const values = {
        backup_auto_enabled: autoEnabled,
        backup_auto_interval_hours: Number(intervalHours) || 24,
        backup_auto_window_start: Number(windowStart) || 0,
        backup_auto_window_end: Number(windowEnd) || 24,
      };
      const res = await api.put('/api/settings', { values });
      if (res.success) {
        setExportResult({ type: 'success', text: labels.saved_successfully });
      } else {
        setExportResult({ type: 'destructive', text: res.message ?? labels.failed_to_save });
      }
    } catch {
      setExportResult({ type: 'destructive', text: labels.failed_to_save });
    } finally {
      setSavingSchedule(false);
    }
  };

  const statusLabel = (s: string) => s === 'completed' ? labels.backup_status_completed : s === 'failed' ? labels.backup_status_failed : labels.backup_status_pending;
  const statusVariant = (s: string) =>
    s === 'completed' ? 'bg-success hover:bg-success/90' : s === 'failed' ? 'bg-destructive hover:bg-destructive/90' : 'bg-warning hover:bg-warning/90';

  if (loading) return <LoadingSpinner />;

  const completedBackups = history.filter((b) => b.status === 'completed');

  return (
    <div className="flex flex-col gap-6">
      {/* Card 1: Pre-Printed Cards */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{labels.cards_title || copy.cardsTitle}</CardTitle>
          <CardDescription>{labels.cards_description || copy.cardsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="card-count">{labels.cards_count || copy.cardsCount}</Label>
              <Input
                id="card-count"
                type="number"
                min={1}
                max={2000}
                value={cardCount}
                onChange={(e) => setCardCount(e.target.value)}
                className="max-w-xs mt-1"
              />
            </div>
                    <div>
                      <Label htmlFor="card-next">{labels.cards_next || copy.cardsNext}</Label>
                      <Input id="card-next" value={cardNextPreview} readOnly className="max-w-xs mt-1" />
                    </div>
                    <div>
                      <Label>{labels.export_format || copy.exportFormat}</Label>
                      <Select value={cardFormat} onValueChange={(v) => setCardFormat(v as 'pdf' | 'csv')} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <SelectTrigger className="max-w-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">{labels.pdf_format || copy.pdfFormat}</SelectItem>
                          <SelectItem value="csv">{labels.csv_format || copy.csvFormat}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Button onClick={handleGenerateCards} disabled={cardGenerating}>
                      {cardGenerating
                        ? labels.loading
                        : (cardFormat === 'pdf'
                          ? (labels.cards_generate_pdf || copy.cardsGeneratePdf)
                          : (labels.cards_generate_csv || copy.cardsGenerateCsv))}
                    </Button>
            {cardResult && (
              <Alert variant={cardResult.type} className="max-w-xl">
                {cardResult.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{cardResult.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                <AlertDescription>{cardResult.text}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Create Backup */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{labels.create_backup}</CardTitle>
          <CardDescription>{labels.backup_and_restore_description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-backup schedule section */}
          <div className="border border-border p-4 space-y-3">
            <h3 className="text-base font-semibold">{labels.periodic_backups}</h3>
            {/* Styled checkbox — border-2, accent color, no native appearance */}
            <div className="flex items-center gap-2">
              <input
                id="auto-backup-enabled"
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => setAutoEnabled(e.target.checked)}
                className="h-4 w-4 appearance-none border-2 border-input checked:bg-primary checked:border-primary cursor-pointer"
              />
              <Label htmlFor="auto-backup-enabled">{labels.enable_auto_backups}</Label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label htmlFor="backup-interval-hours">{labels.backup_interval_hours}</Label>
                <Input id="backup-interval-hours" type="number" min={1} max={168} value={intervalHours} onChange={(e) => setIntervalHours(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="backup-window-start">{labels.backup_window_start}</Label>
                <Input id="backup-window-start" type="number" min={0} max={23} value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="backup-window-end">{labels.backup_window_end}</Label>
                <Input id="backup-window-end" type="number" min={1} max={24} value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
              </div>
            </div>
            <Button onClick={saveSchedule} disabled={savingSchedule}>
              {savingSchedule ? labels.saving : labels.save}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button onClick={handleExport} disabled={exporting} className="min-w-[150px]">
              {exporting ? labels.creating_backup : labels.create_backup}
            </Button>
            {exportResult && (
              <Alert variant={exportResult.type} className="max-w-md">
                {exportResult.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{exportResult.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                <AlertDescription>{exportResult.text}</AlertDescription>
              </Alert>
            )}
          </div>

          <h3 className="text-base font-semibold text-foreground pt-2">{labels.backup_history}</h3>
          <div className="border overflow-x-auto">
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
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">{labels.no_backups_yet}</TableCell>
                  </TableRow>
                ) : (
                  history.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{formatDateTime(b.created_at, lang === 'ar' ? 'ar-EG' : 'en-US')}</TableCell>
                      <TableCell>{b.source}</TableCell>
                      <TableCell><Badge className={statusVariant(b.status)}>{statusLabel(b.status)}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Restore from Backup */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{labels.restore_from_backup}</CardTitle>
          <CardDescription>{labels.restore_from_backup_description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {completedBackups.length === 0 ? (
            <p className="text-muted-foreground">{labels.no_backups_available_to_restore}</p>
          ) : (
            <>
              <div>
                <Label htmlFor="backup-select">{labels.select_a_backup}</Label>
                <Select value={selectedId} onValueChange={setSelectedId} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <SelectTrigger id="backup-select" className="max-w-md mt-1">
                    <SelectValue placeholder={labels.select_placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {completedBackups.map((b) => (
                      <SelectItem key={b.artifact_id} value={b.artifact_id}>
                        {formatDateTime(b.created_at, lang === 'ar' ? 'ar-EG' : 'en-US')} — {b.source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setConfirmOpen(true)} disabled={!selectedId || restoring} variant="destructive" className="min-w-[120px]">
                {restoring ? labels.restoring : labels.restore}
              </Button>
            </>
          )}

          {restoreResult && (
            <Alert variant={restoreResult.type} className="max-w-md">
              {restoreResult.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{restoreResult.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{restoreResult.text}</AlertDescription>
            </Alert>
          )}

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{labels.confirm_restore}</DialogTitle>
                <DialogDescription>{labels.confirm_restore_description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setConfirmOpen(false)} variant="outline">{labels.cancel}</Button>
                <Button onClick={handleRestore} variant="destructive">{labels.yes_restore}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
