'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import Modal from '@/components/dashboard/Modal';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'general' | 'whatsapp' | 'backup' | 'data';

type WhatsAppStatus = { connected: boolean; phone?: string };

type BackupEntry = {
  id: string;
  source: string;
  status: string;
  storage_path: string;
  metadata: unknown;
  created_at: number;
  artifact_id: string;
};

// ── Shared styles ──────────────────────────────────────────────────────────

const cardClass = 'rounded-xl border border-[#1a2235] bg-[#0c1324] p-6';
const labelClass = 'block text-sm font-medium text-[#8892a8] mb-1';
const inputClass =
  'w-full rounded-lg border border-[#1a2235] bg-[#090f1f] px-3 py-2 text-[#f3f6ff] ' +
  'focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50 focus:border-[#FF8C00]';
const btnPrimary =
  'rounded-lg bg-[#FF8C00] px-5 py-2 text-sm font-semibold text-white hover:bg-[#e07e00] ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnDanger =
  'rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary =
  'rounded-lg border border-[#1a2235] px-5 py-2 text-sm font-semibold text-[#f3f6ff] ' +
  'hover:bg-[#1a2235] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

// ── Main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // Tab definitions (label + key)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: lang === 'ar' ? 'عام' : 'General' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'backup', label: lang === 'ar' ? 'النسخ الاحتياطي' : 'Backup' },
    { key: 'data', label: lang === 'ar' ? 'البيانات' : 'Data' },
  ];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <h1 className="text-2xl font-bold text-[#f3f6ff]">{labels.settings}</h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-[#1a2235] bg-[#0c1324] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ' +
              (activeTab === tab.key
                ? 'bg-[#FF8C00] text-white'
                : 'text-[#8892a8] hover:text-[#f3f6ff]')
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && <GeneralTab lang={lang} labels={labels} />}
      {activeTab === 'whatsapp' && <WhatsAppTab lang={lang} />}
      {activeTab === 'backup' && <BackupTab lang={lang} />}
      {activeTab === 'data' && <DataTab lang={lang} />}
    </div>
  );
}

// ── General Tab ────────────────────────────────────────────────────────────

function GeneralTab({ lang, labels }: { lang: string; labels: (typeof t)['en'] | (typeof t)['ar'] }) {
  const [cooldown, setCooldown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load settings on mount
  useEffect(() => {
    api.get<Record<string, string>>('/api/settings').then((res) => {
      if (res.success && res.data) {
        setCooldown(res.data.scan_cooldown_seconds ?? '');
      }
      setLoading(false);
    });
  }, []);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const res = await api.put('/api/settings', {
      values: { scan_cooldown_seconds: cooldown },
    });
    setSaving(false);
    setMessage(
      res.success
        ? lang === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully'
        : lang === 'ar' ? 'فشل الحفظ' : 'Failed to save'
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className={cardClass + ' space-y-5'}>
      {/* Scan cooldown */}
      <div>
        <label className={labelClass}>
          {lang === 'ar' ? 'فترة التبريد للمسح (ثواني)' : 'Scan Cooldown (seconds)'}
        </label>
        <input
          type="number"
          min={0}
          value={cooldown}
          onChange={(e) => setCooldown(e.target.value)}
          className={inputClass + ' max-w-xs'}
        />
      </div>

      {/* Language info */}
      <div>
        <label className={labelClass}>
          {lang === 'ar' ? 'اللغة' : 'Language'}
        </label>
        <p className="text-sm text-[#8892a8]">
          {lang === 'ar'
            ? 'يمكنك تبديل اللغة من الشريط الجانبي'
            : 'You can toggle the language from the sidebar.'}
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : labels.save}
        </button>
        {message && (
          <span className="text-sm text-[#8892a8]">{message}</span>
        )}
      </div>
    </div>
  );
}

// ── WhatsApp Tab ───────────────────────────────────────────────────────────

function WhatsAppTab({ lang }: { lang: string }) {
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
    await api.post('/api/whatsapp/connect', {});
    await fetchStatus();
    setActing(false);
  };

  const handleDisconnect = async () => {
    setActing(true);
    await api.post('/api/whatsapp/disconnect', {});
    await fetchStatus();
    setActing(false);
  };

  if (loading) return <LoadingSpinner />;

  const connected = status?.connected ?? false;

  return (
    <div className={cardClass + ' space-y-5'}>
      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <span
          className={
            'inline-block h-3 w-3 rounded-full ' +
            (connected ? 'bg-green-500' : 'bg-red-500')
          }
        />
        <span className="text-[#f3f6ff] font-medium">
          {connected
            ? lang === 'ar' ? 'متصل' : 'Connected'
            : lang === 'ar' ? 'غير متصل' : 'Disconnected'}
        </span>
      </div>

      {/* Phone number if connected */}
      {connected && status?.phone && (
        <div>
          <label className={labelClass}>
            {lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
          </label>
          <p className="text-[#f3f6ff]">{status.phone}</p>
        </div>
      )}

      {/* Action buttons */}
      <div>
        {connected ? (
          <button onClick={handleDisconnect} disabled={acting} className={btnDanger}>
            {acting
              ? lang === 'ar' ? 'جاري قطع الاتصال...' : 'Disconnecting...'
              : lang === 'ar' ? 'قطع الاتصال' : 'Disconnect'}
          </button>
        ) : (
          <button onClick={handleConnect} disabled={acting} className={btnPrimary}>
            {acting
              ? lang === 'ar' ? 'جاري الاتصال...' : 'Connecting...'
              : lang === 'ar' ? 'اتصال' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Backup Tab ─────────────────────────────────────────────────────────────

function BackupTab({ lang }: { lang: string }) {
  const [history, setHistory] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState('');

  const fetchHistory = useCallback(async () => {
    const res = await api.get<BackupEntry[]>('/api/backup/history');
    if (res.success && res.data) setHistory(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleExport = async () => {
    setExporting(true);
    setExportResult('');
    const res = await api.post<{ backupId: string; rowCounts: Record<string, number> }>(
      '/api/backup/export', {}
    );
    setExporting(false);
    if (res.success) {
      setExportResult(lang === 'ar' ? 'تم إنشاء النسخة الاحتياطية بنجاح' : 'Backup created successfully');
      fetchHistory(); // refresh the table
    } else {
      setExportResult(res.message ?? (lang === 'ar' ? 'فشل الإنشاء' : 'Backup failed'));
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Create backup card */}
      <div className={cardClass + ' flex items-center gap-4'}>
        <button onClick={handleExport} disabled={exporting} className={btnPrimary}>
          {exporting
            ? lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...'
            : lang === 'ar' ? 'إنشاء نسخة احتياطية' : 'Create Backup'}
        </button>
        {exportResult && (
          <span className="text-sm text-[#8892a8]">{exportResult}</span>
        )}
      </div>

      {/* History table */}
      <div className={cardClass + ' overflow-x-auto'}>
        <h3 className="text-sm font-semibold text-[#f3f6ff] mb-4">
          {lang === 'ar' ? 'سجل النسخ الاحتياطي' : 'Backup History'}
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-[#8892a8]">
            {lang === 'ar' ? 'لا توجد نسخ احتياطية' : 'No backups yet'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a2235] text-[#8892a8]">
                <th className="pb-2 text-left font-medium">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="pb-2 text-left font-medium">{lang === 'ar' ? 'المصدر' : 'Source'}</th>
                <th className="pb-2 text-left font-medium">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.id} className="border-b border-[#1a2235]/50">
                  <td className="py-2 text-[#f3f6ff]">{formatDateTime(b.created_at)}</td>
                  <td className="py-2 text-[#f3f6ff]">{b.source}</td>
                  <td className="py-2">
                    <span
                      className={
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
                        (b.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : b.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400')
                      }
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Data Tab ───────────────────────────────────────────────────────────────

function DataTab({ lang }: { lang: string }) {
  const [history, setHistory] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    api.get<BackupEntry[]>('/api/backup/history').then((res) => {
      if (res.success && res.data) setHistory(res.data);
      setLoading(false);
    });
  }, []);

  const handleRestore = async () => {
    setConfirmOpen(false);
    setRestoring(true);
    setResult('');
    const res = await api.post('/api/backup/restore', { artifactId: selectedId });
    setRestoring(false);
    setResult(
      res.success
        ? lang === 'ar' ? 'تمت الاستعادة بنجاح' : 'Restore completed successfully'
        : res.message ?? (lang === 'ar' ? 'فشلت الاستعادة' : 'Restore failed')
    );
  };

  if (loading) return <LoadingSpinner />;

  // Only show completed backups for restore
  const completedBackups = history.filter((b) => b.status === 'completed');

  return (
    <div className={cardClass + ' space-y-5'}>
      <h3 className="text-sm font-semibold text-[#f3f6ff]">
        {lang === 'ar' ? 'استعادة من نسخة احتياطية' : 'Restore from Backup'}
      </h3>

      {completedBackups.length === 0 ? (
        <p className="text-sm text-[#8892a8]">
          {lang === 'ar' ? 'لا توجد نسخ احتياطية متاحة' : 'No backups available to restore'}
        </p>
      ) : (
        <>
          {/* Backup selector */}
          <div>
            <label className={labelClass}>
              {lang === 'ar' ? 'اختر نسخة احتياطية' : 'Select a backup'}
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={inputClass + ' max-w-md'}
            >
              <option value="">
                {lang === 'ar' ? '-- اختر --' : '-- Select --'}
              </option>
              {completedBackups.map((b) => (
                <option key={b.artifact_id} value={b.artifact_id}>
                  {formatDateTime(b.created_at)} — {b.source}
                </option>
              ))}
            </select>
          </div>

          {/* Restore button */}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!selectedId || restoring}
            className={btnDanger}
          >
            {restoring
              ? lang === 'ar' ? 'جاري الاستعادة...' : 'Restoring...'
              : lang === 'ar' ? 'استعادة' : 'Restore'}
          </button>
        </>
      )}

      {/* Result message */}
      {result && (
        <p className="text-sm text-[#8892a8]">{result}</p>
      )}

      {/* Confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={lang === 'ar' ? 'تأكيد الاستعادة' : 'Confirm Restore'}
      >
        <p className="text-sm text-[#8892a8] mb-6">
          {lang === 'ar'
            ? 'سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية المحددة. هل أنت متأكد؟'
            : 'This will replace all current data with the selected backup. Are you sure?'}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirmOpen(false)} className={btnSecondary}>
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button onClick={handleRestore} className={btnDanger}>
            {lang === 'ar' ? 'نعم، استعادة' : 'Yes, Restore'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
