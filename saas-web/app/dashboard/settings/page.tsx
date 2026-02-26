'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Terminal, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_REMINDER_DAYS,
  getDefaultRenewalTemplate,
  getDefaultWelcomeTemplate,
  getTemplateKey
} from '@/lib/whatsapp-automation';


// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'general' | 'whatsapp' | 'backup' | 'import';

type WhatsAppStatus = { connected: boolean; state?: string; phone?: string; qrCode?: string };

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general',  label: labels.general_settings || 'General' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'backup',   label: labels.backup_and_restore || 'Backup & Restore' },
    { key: 'import',   label: labels.import_data || 'Import Data' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Page heading */}
      <h1 className="text-3xl font-bold">{labels.settings}</h1>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            className="min-w-[100px]"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'general'  && <GeneralTab />}
      {activeTab === 'whatsapp' && <WhatsAppTab />}
      {activeTab === 'backup'   && <BackupTab />}
      {activeTab === 'import'   && <ImportTab />}
    </div>
  );
}

// ── General Tab ────────────────────────────────────────────────────────────

function GeneralTab() {
  const { lang, setLang } = useLang();
  const labels = t[lang];
  const [cooldown, setCooldown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

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
    } catch {
      setMessage({ type: 'destructive', text: labels.failed_to_save });
    } finally {
      setSaving(false);
    }
  };

  const handleCardCodeBackfill = async () => {
    setBackfillRunning(true);
    setBackfillMessage(null);
    try {
      const res = await api.post<{ updated?: number; skipped?: number; notFound?: number; noArtifact?: boolean }>(
        '/api/migration/backfill-card-codes',
        {}
      );
      if (!res.success || !res.data) {
        setBackfillMessage({
          type: 'destructive',
          text: res.message || (lang === 'ar' ? 'فشل تنفيذ المزامنة.' : 'Failed to run backfill.'),
        });
        return;
      }

      if (res.data.noArtifact) {
        setBackfillMessage({
          type: 'success',
          text: lang === 'ar' ? 'لا توجد بيانات استيراد سابقة للمزامنة.' : 'No imported artifact found to backfill.',
        });
        return;
      }

      setBackfillMessage({
        type: 'success',
        text:
          lang === 'ar'
            ? `تمت المزامنة. تم تحديث ${res.data.updated ?? 0} سجل، وتخطي ${res.data.skipped ?? 0}.`
            : `Backfill complete. Updated ${res.data.updated ?? 0}, skipped ${res.data.skipped ?? 0}.`,
      });
    } catch {
      setBackfillMessage({
        type: 'destructive',
        text: lang === 'ar' ? 'فشل تنفيذ المزامنة.' : 'Failed to run backfill.',
      });
    } finally {
      setBackfillRunning(false);
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
        <div>
          <Label>{labels.language}</Label>
          <div className="flex border border-[#2a2a2a] mt-1 w-fit">
            <button
              onClick={() => { setLang('en'); api.put('/api/settings', { values: { system_language: 'en' } }); }}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                lang === 'en' ? 'bg-[#e63946] text-white' : 'bg-[#1e1e1e] text-[#888888] hover:text-[#e8e4df]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => { setLang('ar'); api.put('/api/settings', { values: { system_language: 'ar' } }); }}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                lang === 'ar' ? 'bg-[#e63946] text-white' : 'bg-[#1e1e1e] text-[#888888] hover:text-[#e8e4df]'
              }`}
            >
              العربية
            </button>
          </div>
        </div>
        <Separator />
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? labels.saving : labels.save}
          </Button>
          {message && (
            <Alert variant={message.type} className="max-w-md">
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{message.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </div>
        <Separator />
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">
              {lang === 'ar' ? 'صيانة رموز بطاقات العملاء' : 'Client Card Code Maintenance'}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'ar'
                ? 'تشغيل مزامنة رموز البطاقات يدويًا بعد استيراد بيانات قديمة فقط.'
                : 'Run card-code backfill manually only after importing legacy data.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button onClick={handleCardCodeBackfill} disabled={backfillRunning} variant="outline">
              {backfillRunning
                ? (lang === 'ar' ? 'جاري التنفيذ...' : 'Running...')
                : (lang === 'ar' ? 'تشغيل المزامنة الآن' : 'Run Backfill Now')}
            </Button>
            {backfillMessage && (
              <Alert variant={backfillMessage.type} className="max-w-md">
                {backfillMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{backfillMessage.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                <AlertDescription>{backfillMessage.text}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── WhatsApp Tab ───────────────────────────────────────────────────────────

function WhatsAppTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const systemLanguage = lang === 'ar' ? 'ar' : 'en';
  const defaultWelcomeTemplate = getDefaultWelcomeTemplate(systemLanguage);
  const defaultRenewalTemplate = getDefaultRenewalTemplate(systemLanguage);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesSaving, setTemplatesSaving] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [welcomeTemplate, setWelcomeTemplate] = useState(defaultWelcomeTemplate);
  const [renewalTemplate, setRenewalTemplate] = useState(defaultRenewalTemplate);
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<WhatsAppStatus>('/api/whatsapp/status');
      if (res.success && res.data) {
        setStatus(res.data);
      } else {
        setError(res.message ?? 'Failed to fetch WhatsApp status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await api.get<Record<string, unknown>>('/api/settings');
      if (res.success && res.data) {
        const maybeWelcome =
          res.data[getTemplateKey('welcome', systemLanguage)] ??
          (systemLanguage === 'en' ? res.data.whatsapp_template_welcome : undefined);
        const maybeRenewal =
          res.data[getTemplateKey('renewal', systemLanguage)] ??
          (systemLanguage === 'en' ? res.data.whatsapp_template_renewal : undefined);
        const maybeDays = res.data.whatsapp_reminder_days;

        if (typeof maybeWelcome === 'string' && maybeWelcome.trim()) {
          setWelcomeTemplate(maybeWelcome);
        } else {
          setWelcomeTemplate(defaultWelcomeTemplate);
        }
        if (typeof maybeRenewal === 'string' && maybeRenewal.trim()) {
          setRenewalTemplate(maybeRenewal);
        } else {
          setRenewalTemplate(defaultRenewalTemplate);
        }
        if (typeof maybeDays === 'string' && maybeDays.trim()) {
          setReminderDays(maybeDays);
        } else {
          setReminderDays(DEFAULT_REMINDER_DAYS);
        }
      }
    } catch (err) {
      setTemplateFeedback({
        type: 'destructive',
        text: err instanceof Error ? err.message : 'Failed to load WhatsApp templates'
      });
    } finally {
      setTemplatesLoading(false);
    }
  }, [defaultRenewalTemplate, defaultWelcomeTemplate, systemLanguage]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(() => {
      if (!status?.connected) fetchStatus();
    }, 3000);
    return () => clearInterval(id);
  }, [fetchStatus, status?.connected]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleConnect = async () => {
    setActing(true);
    setError(null);
    try {
      const res = await api.post('/api/whatsapp/connect', {});
      if (!res.success) throw new Error(res.message ?? 'Failed to start WhatsApp connection');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const handleDisconnect = async () => {
    setActing(true);
    setError(null);
    try {
      const res = await api.post('/api/whatsapp/disconnect', {});
      if (!res.success) throw new Error(res.message ?? 'Failed to disconnect WhatsApp');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const handleTemplateSave = async () => {
    setTemplatesSaving(true);
    setTemplateFeedback(null);
    try {
      const resolvedWelcome = welcomeTemplate.trim() || defaultWelcomeTemplate;
      const resolvedRenewal = renewalTemplate.trim() || defaultRenewalTemplate;
      const values: Record<string, string | boolean> = {
        [getTemplateKey('welcome', systemLanguage)]: resolvedWelcome,
        [getTemplateKey('renewal', systemLanguage)]: resolvedRenewal,
        whatsapp_reminder_days: reminderDays.trim() || DEFAULT_REMINDER_DAYS,
        whatsapp_automation_enabled: true,
        system_language: systemLanguage
      };
      if (systemLanguage === 'en') {
        values.whatsapp_template_welcome = resolvedWelcome;
        values.whatsapp_template_renewal = resolvedRenewal;
      }
      const res = await api.put('/api/settings', { values });
      if (!res.success) throw new Error(res.message ?? 'Failed to save WhatsApp templates');
      setTemplateFeedback({ type: 'success', text: labels.saved_successfully });
    } catch (err) {
      setTemplateFeedback({
        type: 'destructive',
        text: err instanceof Error ? err.message : labels.failed_to_save
      });
    } finally {
      setTemplatesSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const state = status?.state ?? (status?.connected ? 'connected' : 'disconnected');
  const connected = status?.connected ?? state === 'connected';
  const connecting = state === 'connecting' && !connected;
  const showWaitingQr = connecting && !status?.qrCode;
  const statusText = connected ? labels.connected : connecting ? (labels.connecting ?? 'Connecting...') : labels.disconnected;
  const statusVariant = connected ? 'success' : connecting ? 'secondary' : 'destructive';

  // ── Live preview helpers ──
  const sampleName = labels.sample_name;
  const sampleExpiry = new Date(Date.now() + 30 * 86400000).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  function previewText(template: string, type: 'welcome' | 'renewal') {
    let text = template || (type === 'welcome' ? defaultWelcomeTemplate : defaultRenewalTemplate);
    text = text.replace(/\{name\}/g, sampleName);
    if (type === 'renewal') {
      text = text.replace(/\{expiryDate\}/g, sampleExpiry);
      text = text.replace(/\{daysLeft\}/g, '7');
    }
    return text;
  }

  // ── Reminder days as chip set ──
  const REMINDER_OPTIONS = [1, 3, 7];
  const selectedDays = new Set(
    reminderDays.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  );

  function toggleDay(day: number) {
    const next = new Set(selectedDays);
    if (next.has(day)) next.delete(day); else next.add(day);
    setReminderDays(Array.from(next).sort((a, b) => b - a).join(','));
  }

  // ── Status badge styling ──
  const badgeDotColor = connected ? 'bg-emerald-500' : connecting ? 'bg-amber-400' : 'bg-red-500';
  const badgeBgColor = connected ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700' : connecting ? 'bg-amber-900/40 text-amber-400 border-amber-700' : 'bg-red-900/40 text-red-400 border-red-700';

  return (
    <div className="flex flex-col gap-6">
      {/* ── Connection Card ── */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp {labels.integration}</CardTitle>
          <CardDescription>{labels.whatsapp_integration_description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold border ${badgeBgColor}`}>
              <span className={`h-2 w-2 rounded-full ${badgeDotColor}`} />
              {statusText}
            </span>
            {connected && status?.phone && (
              <span className="text-foreground font-medium">{status.phone}</span>
            )}
          </div>

          {!connected && status?.qrCode && (
            <div className="flex flex-col items-center justify-center space-y-3">
              <p className="text-muted-foreground">{labels.scan_qr_code}</p>
              <img src={`data:image/png;base64,${status.qrCode}`} alt="WhatsApp QR Code" className="h-48 w-48 border-2 border-border" />
              <p className="text-sm text-muted-foreground">{labels.scan_qr_instructions}</p>
            </div>
          )}

          {showWaitingQr && (
            <div className="h-48 w-48 border-2 border-border flex items-center justify-center text-sm text-muted-foreground">
              {labels.waiting_for_qr}
            </div>
          )}

          <div>
            {connected ? (
              <Button onClick={handleDisconnect} disabled={acting} variant="destructive" className="min-w-[120px]">
                {acting ? labels.disconnecting : labels.disconnect}
              </Button>
            ) : connecting ? (
              <Button onClick={handleDisconnect} disabled={acting} variant="outline" className="min-w-[120px]">
                {acting ? labels.disconnecting : (labels.cancel ?? 'Cancel')}
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={acting} className="min-w-[120px]">
                {acting ? labels.connecting : labels.connect}
              </Button>
            )}
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ── Message Templates Card ── */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.automation_templates}</CardTitle>
          <CardDescription>{labels.dry_run_enabled}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {templatesLoading ? (
            <p className="text-sm text-muted-foreground">{labels.loading}</p>
          ) : (
            <>
              {/* Welcome Message */}
              <div className="space-y-3">
                <Label htmlFor="welcome-template">{labels.welcome_message_template}</Label>
                <Textarea
                  id="welcome-template"
                  value={welcomeTemplate}
                  onChange={(e) => setWelcomeTemplate(e.target.value)}
                  placeholder={defaultWelcomeTemplate}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Placeholders: {'{name}'}</p>

                {/* WhatsApp Chat Preview */}
                <div className="max-w-xs">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{labels.preview_label}</p>
                  <div className="border border-[#2a2a2a] overflow-hidden" style={{ background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundColor: '#0b141a' }}>
                    {/* Chat header */}
                    <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#8696a0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#e9edef]">{sampleName}</p>
                        <p className="text-[10px] text-[#8696a0]">online</p>
                      </div>
                    </div>
                    {/* Chat body */}
                    <div className="p-3 space-y-1 min-h-[120px]">
                      {/* Outgoing message bubble */}
                      <div className="flex justify-end">
                        <div className="relative bg-[#005c4b] text-[#e9edef] text-[13px] leading-[19px] px-2.5 py-1.5 max-w-[85%]" style={{ borderRadius: '7.5px 0 7.5px 7.5px' }}>
                          <p className="whitespace-pre-wrap">{previewText(welcomeTemplate, 'welcome')}</p>
                          <span className="float-right mt-1 ml-2 text-[10px] text-[#ffffff99]">10:30 AM</span>
                        </div>
                      </div>
                      {/* QR image bubble */}
                      <div className="flex justify-end">
                        <div className="bg-[#005c4b] px-1 py-1 max-w-[65%]" style={{ borderRadius: '7.5px 0 7.5px 7.5px' }}>
                          <div className="bg-[#0b141a] border border-[#ffffff15] h-28 w-28 flex flex-col items-center justify-center gap-1">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff40" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>
                            <span className="text-[9px] text-[#ffffff40]">Check-in QR</span>
                          </div>
                          <span className="float-right mt-0.5 mr-1 text-[10px] text-[#ffffff99]">10:30 AM</span>
                        </div>
                      </div>
                    </div>
                    {/* Input bar */}
                    <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2">
                      <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[13px] text-[#8696a0]">Type a message</div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#8696a0"><path d="M12 14.95q-.425 0-.712-.288T11 13.95V6.35L9.1 8.25q-.3.3-.7.3-.4 0-.7-.3-.3-.3-.3-.713 0-.412.3-.712l3.6-3.6q.15-.15.325-.213.175-.062.375-.062.2 0 .375.062.175.063.325.213l3.6 3.6q.3.3.3.712 0 .413-.3.713-.3.3-.7.3-.4 0-.7-.3L13 6.35v7.6q0 .425-.287.713-.288.287-.713.287zM6 20q-.825 0-1.413-.588T4 18v-2q0-.425.288-.713T5 15q.425 0 .713.288T6 16v2h12v-2q0-.425.288-.713T19 15q.425 0 .713.288T20 16v2q0 .825-.588 1.413T18 20H6z"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Renewal Reminder */}
              <div className="space-y-3">
                <Label htmlFor="renewal-template">{labels.renewal_reminder_template}</Label>
                <Textarea
                  id="renewal-template"
                  value={renewalTemplate}
                  onChange={(e) => setRenewalTemplate(e.target.value)}
                  placeholder={defaultRenewalTemplate}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Placeholders: {'{name}'}, {'{expiryDate}'}, {'{daysLeft}'}</p>

                {/* WhatsApp Chat Preview */}
                <div className="max-w-xs">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{labels.preview_label}</p>
                  <div className="border border-[#2a2a2a] overflow-hidden" style={{ background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundColor: '#0b141a' }}>
                    {/* Chat header */}
                    <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#8696a0"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#e9edef]">{sampleName}</p>
                        <p className="text-[10px] text-[#8696a0]">online</p>
                      </div>
                    </div>
                    {/* Chat body */}
                    <div className="p-3 min-h-[80px]">
                      <div className="flex justify-end">
                        <div className="relative bg-[#005c4b] text-[#e9edef] text-[13px] leading-[19px] px-2.5 py-1.5 max-w-[85%]" style={{ borderRadius: '7.5px 0 7.5px 7.5px' }}>
                          <p className="whitespace-pre-wrap">{previewText(renewalTemplate, 'renewal')}</p>
                          <span className="float-right mt-1 ml-2 text-[10px] text-[#ffffff99]">10:30 AM</span>
                        </div>
                      </div>
                    </div>
                    {/* Input bar */}
                    <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2">
                      <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[13px] text-[#8696a0]">Type a message</div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#8696a0"><path d="M12 14.95q-.425 0-.712-.288T11 13.95V6.35L9.1 8.25q-.3.3-.7.3-.4 0-.7-.3-.3-.3-.3-.713 0-.412.3-.712l3.6-3.6q.15-.15.325-.213.175-.062.375-.062.2 0 .375.062.175.063.325.213l3.6 3.6q.3.3.3.712 0 .413-.3.713-.3.3-.7.3-.4 0-.7-.3L13 6.35v7.6q0 .425-.287.713-.288.287-.713.287zM6 20q-.825 0-1.413-.588T4 18v-2q0-.425.288-.713T5 15q.425 0 .713.288T6 16v2h12v-2q0-.425.288-.713T19 15q.425 0 .713.288T20 16v2q0 .825-.588 1.413T18 20H6z"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Reminder Days — Chip Picker */}
              <div className="space-y-3">
                <Label>{labels.reminder_days_label}</Label>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map((day) => {
                    const active = selectedDays.has(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 text-sm font-semibold border transition-colors ${
                          active
                            ? 'bg-[#e63946] text-white border-[#e63946]'
                            : 'bg-[#1e1e1e] text-[#8a8578] border-[#2a2a2a] hover:text-[#e8e4df] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {day} {day === 1 ? (lang === 'ar' ? 'يوم' : 'day') : (lang === 'ar' ? 'أيام' : 'days')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleTemplateSave} disabled={templatesSaving}>
                  {templatesSaving ? labels.saving : labels.save}
                </Button>
              </div>

              {templateFeedback && (
                <Alert variant={templateFeedback.type}>
                  {templateFeedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{templateFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                  <AlertDescription>{templateFeedback.text}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Backup & Restore Tab ───────────────────────────────────────────────────

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

function BackupTab() {
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
      setCardResult({ type: 'destructive', text: labels.cards_count_error || 'Enter a valid count between 1 and 2000.' });
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
        text: `${labels.cards_generated || 'Generated'} ${from} → ${to}. ${labels.cards_download_started || 'Files downloaded successfully.'}`,
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
      <Card>
        <CardHeader>
          <CardTitle>{labels.cards_title || 'Pre-Printed Cards'}</CardTitle>
          <CardDescription>{labels.cards_description || 'Generate A4 QR code sheets for printing.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="card-count">{labels.cards_count || 'How many codes?'}</Label>
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
                      <Label htmlFor="card-next">{labels.cards_next || 'Next code'}</Label>
                      <Input id="card-next" value={cardNextPreview} readOnly className="max-w-xs mt-1" />
                    </div>
                    <div>
                      <Label>{labels.export_format || 'Export format'}</Label>
                      <Select value={cardFormat} onValueChange={(v) => setCardFormat(v as 'pdf' | 'csv')} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <SelectTrigger className="max-w-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">{labels.pdf_format || 'PDF'}</SelectItem>
                          <SelectItem value="csv">{labels.csv_format || 'CSV'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Button onClick={handleGenerateCards} disabled={cardGenerating}>
                      {cardGenerating
                        ? labels.loading
                        : (cardFormat === 'pdf'
                          ? (labels.cards_generate_pdf || 'Generate PDF')
                          : (labels.cards_generate_csv || 'Generate CSV'))}
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

      <Card>
        <CardHeader>
          <CardTitle>{labels.create_backup}</CardTitle>
          <CardDescription>{labels.backup_and_restore_description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border p-4 space-y-3">
            <h3 className="text-base font-semibold">{labels.periodic_backups}</h3>
            <div className="flex items-center gap-2">
              <input
                id="auto-backup-enabled"
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => setAutoEnabled(e.target.checked)}
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

      <Card>
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

// ── Import Tab ─────────────────────────────────────────────────────────────

type UploadResult  = { id: string; file_name: string; status: string; created_at: string };
type ValidateResult = { schemaVersion: string; members: number; subscriptions: number; isValid: boolean };
type ExecuteResult  = { jobId: string; status: string; report: Record<string, unknown> };
type StatusResult   = { id: string; type: string; status: string; payload: Record<string, unknown>; result: Record<string, unknown> | null; started_at: string; finished_at: string };

function StepIndicator({ current }: { current: number }) {
  const { lang } = useLang();
  const steps = [
    { num: 1, label: t[lang].upload_file },
    { num: 2, label: t[lang].validate_data },
    { num: 3, label: t[lang].execute_import },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-6 text-sm">
      {steps.map((step, i) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-9 h-9 flex items-center justify-center font-bold border-2 border-border",
              step.num <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {step.num}
            </div>
            <span className={cn("text-xs mt-1", step.num <= current ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <Separator orientation="horizontal" className={cn("w-12 h-0.5", step.num < current ? "bg-primary" : "bg-muted")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ImportRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center border-b border-border py-2 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-normal text-foreground", color)}>{value}</span>
    </div>
  );
}

function ImportTab() {
  const { lang } = useLang();
  const labels = t[lang];

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [artifactId, setArtifactId] = useState('');

  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidateResult | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);

  async function handleUpload() {
    setError('');
    const file = fileRef.current?.files?.[0];
    if (!file) { setError(labels.select_db_file); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('session_token');
      const branchId = localStorage.getItem('branch_id');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (branchId) headers['x-branch-id'] = branchId;
      const response = await fetch('/api/migration/upload', { method: 'POST', headers, body: formData });
      const res = await response.json();
      if (!res.success || !res.data) { setError(res.message || labels.upload_failed); return; }
      setArtifactId(res.data.id);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.upload_failed);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (step !== 2 || !artifactId) return;
    let cancelled = false;
    async function validate() {
      setValidating(true);
      setError('');
      try {
        const res = await api.post<ValidateResult>('/api/migration/validate', { artifactId });
        if (cancelled) return;
        if (!res.success || !res.data) { setError(res.message || labels.validation_failed); }
        else { setValidation(res.data); }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : labels.validation_failed);
      } finally {
        if (!cancelled) setValidating(false);
      }
    }
    validate();
    return () => { cancelled = true; };
  }, [step, artifactId, labels.validation_failed]);

  const handleExecute = useCallback(async () => {
    setShowConfirm(false);
    setExecuting(true);
    setError('');
    try {
      const res = await api.post<ExecuteResult>('/api/migration/execute', { artifactId });
      if (!res.success || !res.data) { setError(res.message || labels.execution_failed); setExecuting(false); return; }
      const jobId = res.data.jobId;
      const poll = async () => {
        const s = await api.get<StatusResult>(`/api/migration/status?jobId=${jobId}`);
        if (s.data && (s.data.status === 'completed' || s.data.status === 'failed')) {
          setResult(s.data);
          setExecuting(false);
        } else {
          setTimeout(poll, 2000);
        }
      };
      poll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.execution_failed);
      setExecuting(false);
    }
  }, [artifactId, labels.execution_failed]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <StepIndicator current={step} />

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.upload_file}</CardTitle>
            <CardDescription>{labels.upload_file_description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".db"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
              style={{ display: 'block', width: '100%', padding: '16px', border: '2px dashed #3a3a3a', backgroundColor: 'transparent', color: '#8a8578', cursor: 'pointer' }}
            />
            <Button onClick={handleUpload} disabled={uploading || !fileName} className="w-full">
              {uploading ? labels.uploading : labels.upload}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.validate_data}</CardTitle>
            <CardDescription>{labels.validate_data_description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validating && <LoadingSpinner />}
            {!validating && validation && (
              <div className="space-y-3 mb-6">
                <ImportRow label={labels.schema_version} value={validation.schemaVersion} />
                <ImportRow label={labels.members_count} value={String(validation.members)} />
                <ImportRow label={labels.subscriptions_count} value={String(validation.subscriptions)} />
                <ImportRow label={labels.status} value={validation.isValid ? labels.valid + ' ✓' : labels.invalid + ' ✗'} color={validation.isValid ? 'text-success' : 'text-destructive'} />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setStep(1); setValidation(null); setError(''); }}>{labels.back}</Button>
              {validation?.isValid && <Button onClick={() => setStep(3)}>{labels.continue}</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.execute_import}</CardTitle>
            <CardDescription>{labels.execute_import_description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!executing && !result && !showConfirm && (
              <>
                <Alert variant={"warning" as any}>
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>{labels.warning_title}</AlertTitle>
                  <AlertDescription>{labels.warning_replace_data}</AlertDescription>
                </Alert>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => { setStep(2); setError(''); }}>{labels.back}</Button>
                  <Button onClick={() => setShowConfirm(true)}>{labels.execute_import_button}</Button>
                </div>
              </>
            )}

            {showConfirm && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>{labels.confirm_action}</AlertTitle>
                <AlertDescription>{labels.confirm_replace_data}</AlertDescription>
                <div className="flex gap-3 justify-end mt-4">
                  <Button variant="outline" onClick={() => setShowConfirm(false)}>{labels.cancel}</Button>
                  <Button variant="destructive" onClick={handleExecute}>{labels.yes_execute}</Button>
                </div>
              </Alert>
            )}

            {executing && <LoadingSpinner />}

            {result && (
              <div className="space-y-4">
                {result.status === 'completed' ? (
                  <Alert variant={"success" as any}>
                    <Check className="h-4 w-4" />
                    <AlertTitle>{labels.import_successful}</AlertTitle>
                    <AlertDescription>
                      {labels.import_successful_description}
                      {result.result && (
                        <pre className="mt-2 text-xs p-2 bg-secondary text-secondary-foreground overflow-auto max-h-48 border-2 border-border">
                          {JSON.stringify(result.result as Record<string, unknown>, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>{labels.import_failed}</AlertTitle>
                    <AlertDescription>
                      {labels.import_failed_description}
                      {result.result && (
                        <pre className="mt-2 text-xs p-2 bg-secondary text-secondary-foreground overflow-auto max-h-48 border-2 border-border">
                          {JSON.stringify(result.result as Record<string, unknown>, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={() => { window.location.href = '/dashboard'; }} className="w-full">{labels.done}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
