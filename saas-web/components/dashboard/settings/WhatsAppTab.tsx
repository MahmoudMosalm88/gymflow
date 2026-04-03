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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle } from 'lucide-react';
import {
  DEFAULT_REMINDER_DAYS,
  getDefaultRenewalTemplate,
  getDefaultWelcomeTemplate,
  getTemplateKey,
} from '@/lib/whatsapp-automation';


type Tab = 'general' | 'whatsapp' | 'backup' | 'import';

type WhatsAppQueueCounts = {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
};

type WhatsAppStatus = {
  connected: boolean;
  state?: string;
  phone?: string;
  qrCode?: string;
  queue?: Partial<WhatsAppQueueCounts>;
  workerHeartbeatAt?: string | null;
  lastQueueRunAt?: string | null;
  lastQueueSuccessAt?: string | null;
  lastQueueError?: string | null;
};

type WhatsAppQueueItem = {
  id: string;
  type: 'welcome' | 'qr_code' | 'manual' | 'renewal' | 'broadcast';
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  scheduled_at: string;
  sent_at?: string | null;
  last_error?: string | null;
  member_name?: string | null;
  member_phone?: string | null;
  campaign_title?: string | null;
  provider_message_id?: string | null;
};

type WhatsAppQueueResponse = {
  items: WhatsAppQueueItem[];
  counts?: Partial<WhatsAppQueueCounts>;
  workerHeartbeatAt?: string | null;
  lastQueueRunAt?: string | null;
  lastQueueSuccessAt?: string | null;
  lastQueueError?: string | null;
  hasMore?: boolean;
  nextCursor?: string | null;
};

type BroadcastFilters = {
  search: string;
  status: 'all' | 'active' | 'expired' | 'no_sub';
  gender: 'all' | 'male' | 'female';
  planMonthsMin: string;
  planMonthsMax: string;
  daysLeftMin: string;
  daysLeftMax: string;
  createdFrom: string;
  createdTo: string;
  sessionsMin: string;
};

type BroadcastPreview = {
  recipientCount: number;
  estimatedMinutes?: number | null;
  filterSummary?: string[];
  recipients?: Array<{
    id: string;
    name: string;
    phone?: string | null;
  }>;
};

type WhatsAppCampaign = {
  id: string;
  title: string;
  message: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at?: string | null;
  filters?: Record<string, unknown> | null;
};

type WhatsAppCampaignsResponse = {
  items: WhatsAppCampaign[];
  hasMore?: boolean;
  nextCursor?: string | null;
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

const DEFAULT_BROADCAST_FILTERS: BroadcastFilters = {
  search: '',
  status: 'all',
  gender: 'all',
  planMonthsMin: '',
  planMonthsMax: '',
  daysLeftMin: '',
  daysLeftMax: '',
  createdFrom: '',
  createdTo: '',
  sessionsMin: '',
};

function toOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

function pickQueueCounts(source?: Partial<WhatsAppQueueCounts> | null): WhatsAppQueueCounts {
  return {
    pending: Number(source?.pending || 0),
    processing: Number(source?.processing || 0),
    sent: Number(source?.sent || 0),
    failed: Number(source?.failed || 0),
  };
}

function normalizeBroadcastStatus(status: WhatsAppCampaign['status']): 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' {
  if (status === 'running' || status === 'completed' || status === 'failed' || status === 'cancelled') return status;
  return 'queued';
}

function statusBadgeClass(status: string) {
  if (status === 'completed' || status === 'sent') return 'bg-success/10 text-success border-success/30';
  if (status === 'running' || status === 'processing' || status === 'queued' || status === 'pending') return 'bg-warning/10 text-warning border-warning/30';
  if (status === 'failed') return 'bg-destructive/10 text-destructive border-destructive/30';
  return 'bg-muted/10 text-muted-foreground border-border';
}

function typeLabel(type: WhatsAppQueueItem['type'], lang: 'en' | 'ar') {
  const en = {
    welcome: 'Welcome',
    qr_code: 'QR code',
    manual: 'Manual',
    renewal: 'Renewal',
    broadcast: 'Broadcast',
  } as const;
  const ar = {
    welcome: 'ترحيب',
    qr_code: 'رمز QR',
    manual: 'يدوي',
    renewal: 'تجديد',
    broadcast: 'بث جماعي',
  } as const;
  return lang === 'ar' ? ar[type] : en[type];
}

export default function WhatsAppTab() {
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
  const [queueData, setQueueData] = useState<WhatsAppQueueResponse>({ items: [] });
  const [queueLoading, setQueueLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [broadcastFilters, setBroadcastFilters] = useState<BroadcastFilters>(DEFAULT_BROADCAST_FILTERS);
  const [broadcastTitle, setBroadcastTitle] = useState(lang === 'ar' ? 'رسالة جماعية' : 'Broadcast');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPreview, setBroadcastPreview] = useState<BroadcastPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const canPreviewBroadcast = Boolean(broadcastMessage.trim()) && !previewLoading && !broadcastSubmitting;

  const buildBroadcastPayload = useCallback(() => ({
    title: broadcastTitle.trim() || (lang === 'ar' ? 'رسالة جماعية' : 'Broadcast'),
    message: broadcastMessage.trim(),
    filters: {
      search: broadcastFilters.search.trim() || undefined,
      status: broadcastFilters.status,
      gender: broadcastFilters.gender,
      planMonthsMin: toOptionalInt(broadcastFilters.planMonthsMin),
      planMonthsMax: toOptionalInt(broadcastFilters.planMonthsMax),
      daysLeftMin: toOptionalInt(broadcastFilters.daysLeftMin),
      daysLeftMax: toOptionalInt(broadcastFilters.daysLeftMax),
      createdFrom: broadcastFilters.createdFrom || null,
      createdTo: broadcastFilters.createdTo || null,
      sessionsRemainingMax: toOptionalInt(broadcastFilters.sessionsMin),
    },
  }), [broadcastFilters, broadcastMessage, broadcastTitle, lang]);

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

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await api.get<WhatsAppQueueResponse>('/api/whatsapp/queue?status=all&limit=12');
      if (res.success && res.data) {
        setQueueData(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await api.get<WhatsAppCampaignsResponse>('/api/whatsapp/campaigns?limit=10');
      if (res.success && res.data?.items) {
        setCampaigns(res.data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(() => {
      fetchStatus();
    }, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { fetchQueue(); }, [fetchQueue]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchQueue();
      void fetchCampaigns();
    }, 15000);
    return () => clearInterval(id);
  }, [fetchCampaigns, fetchQueue]);

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

  const handleRetryFailed = async (ids?: string[]) => {
    setRetrying(true);
    setBroadcastFeedback(null);
    try {
      const res = await api.post<{ retried: number }>('/api/whatsapp/queue/retry', { ids });
      if (!res.success) throw new Error(res.message ?? 'Failed to retry WhatsApp queue items');
      setBroadcastFeedback({
        type: 'success',
        text: lang === 'ar'
          ? `تمت إعادة ${res.data?.retried ?? 0} رسالة إلى الطابور.`
          : `Re-queued ${res.data?.retried ?? 0} WhatsApp messages.`,
      });
      await Promise.all([fetchQueue(), fetchStatus(), fetchCampaigns()]);
    } catch (err) {
      setBroadcastFeedback({
        type: 'destructive',
        text: err instanceof Error ? err.message : (lang === 'ar' ? 'فشل إعادة المحاولة.' : 'Retry failed.'),
      });
    } finally {
      setRetrying(false);
    }
  };

  const handlePreviewBroadcast = async () => {
    setPreviewLoading(true);
    setBroadcastFeedback(null);
    try {
      const res = await api.post<BroadcastPreview>('/api/whatsapp/broadcast/preview', buildBroadcastPayload());
      if (!res.success || !res.data) throw new Error(res.message ?? 'Failed to preview broadcast');
      setBroadcastPreview(res.data);
    } catch (err) {
      setBroadcastFeedback({
        type: 'destructive',
        text: err instanceof Error ? err.message : (lang === 'ar' ? 'فشل معاينة البث.' : 'Failed to preview broadcast.'),
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      setBroadcastFeedback({
        type: 'destructive',
        text: lang === 'ar' ? 'أدخل نص الرسالة أولاً.' : 'Enter a message first.',
      });
      return;
    }
    setBroadcastSubmitting(true);
    setBroadcastFeedback(null);
    try {
      const res = await api.post<{ recipientCount: number }>('/api/whatsapp/broadcast', buildBroadcastPayload());
      if (!res.success) throw new Error(res.message ?? 'Failed to queue broadcast');
      setBroadcastFeedback({
        type: 'success',
        text: lang === 'ar'
          ? `تمت جدولة البث لـ ${res.data?.recipientCount ?? 0} عميل.`
          : `Broadcast queued for ${res.data?.recipientCount ?? 0} members.`,
      });
      setBroadcastPreview(null);
      await Promise.all([fetchQueue(), fetchCampaigns(), fetchStatus()]);
    } catch (err) {
      setBroadcastFeedback({
        type: 'destructive',
        text: err instanceof Error ? err.message : (lang === 'ar' ? 'فشل إرسال البث.' : 'Failed to queue broadcast.'),
      });
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const state = status?.state ?? (status?.connected ? 'connected' : 'disconnected');
  const connected = status?.connected ?? state === 'connected';
  const connecting = state === 'connecting' && !connected;
  const showWaitingQr = connecting && !status?.qrCode;
  const statusText = connected ? labels.connected : connecting ? (labels.connecting ?? 'Connecting...') : labels.disconnected;
  const queueCounts = pickQueueCounts(status?.queue ?? queueData.counts);

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

      <Card>
        <CardHeader>
          <CardTitle>{lang === 'ar' ? 'صحة الطابور والإرسال' : 'Queue health and delivery'}</CardTitle>
          <CardDescription>
            {lang === 'ar'
              ? 'راجع حالة العامل، عدد الرسائل، وأعد المحاولة للرسائل الفاشلة.'
              : 'Review worker health, queue counts, and retry failed messages.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: lang === 'ar' ? 'قيد الانتظار' : 'Pending', value: queueCounts.pending, status: 'pending' },
              { label: lang === 'ar' ? 'قيد المعالجة' : 'Processing', value: queueCounts.processing, status: 'processing' },
              { label: lang === 'ar' ? 'تم الإرسال' : 'Sent', value: queueCounts.sent, status: 'sent' },
              { label: lang === 'ar' ? 'فشلت' : 'Failed', value: queueCounts.failed, status: 'failed' },
            ].map((metric) => (
              <div key={metric.label} className="border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <Badge variant="outline" className={statusBadgeClass(metric.status)}>
                    {metric.value}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {lang === 'ar' ? 'آخر نبضة من العامل' : 'Last worker heartbeat'}
              </p>
              <p className="mt-2 text-sm font-medium">
                {status?.workerHeartbeatAt ? formatDateTime(status.workerHeartbeatAt, lang) : (lang === 'ar' ? 'لا يوجد' : 'No heartbeat yet')}
              </p>
            </div>
            <div className="border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {lang === 'ar' ? 'آخر تشغيل للطابور' : 'Last queue run'}
              </p>
              <p className="mt-2 text-sm font-medium">
                {status?.lastQueueRunAt ? formatDateTime(status.lastQueueRunAt, lang) : (lang === 'ar' ? 'لا يوجد' : 'No runs yet')}
              </p>
            </div>
            <div className="border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {lang === 'ar' ? 'آخر نجاح' : 'Last success'}
              </p>
              <p className="mt-2 text-sm font-medium">
                {status?.lastQueueSuccessAt ? formatDateTime(status.lastQueueSuccessAt, lang) : (lang === 'ar' ? 'لا يوجد' : 'No successful run yet')}
              </p>
            </div>
            <div className="border border-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {lang === 'ar' ? 'آخر خطأ' : 'Last error'}
              </p>
              <p className="mt-2 text-sm font-medium text-destructive">
                {status?.lastQueueError || (lang === 'ar' ? 'لا يوجد' : 'No errors')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void fetchQueue()} disabled={queueLoading}>
              {queueLoading ? labels.loading : (lang === 'ar' ? 'تحديث الطابور' : 'Refresh queue')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleRetryFailed()}
              disabled={retrying || queueCounts.failed === 0}
            >
              {retrying
                ? (lang === 'ar' ? 'جارٍ الإعادة...' : 'Retrying...')
                : (lang === 'ar' ? 'إعادة كل الرسائل الفاشلة' : 'Retry all failed')}
            </Button>
          </div>

          {broadcastFeedback && (
            <Alert variant={broadcastFeedback.type}>
              {broadcastFeedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{broadcastFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{broadcastFeedback.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{lang === 'ar' ? 'آخر الرسائل في الطابور' : 'Latest queue items'}</h3>
                <p className="text-xs text-muted-foreground">
                  {lang === 'ar'
                    ? 'الفاشلة تظهر أولاً حتى يمكن معالجتها بسرعة.'
                    : 'Failed items stay at the top so they can be fixed quickly.'}
                </p>
              </div>
            </div>

            {queueLoading ? (
              <p className="text-sm text-muted-foreground">{labels.loading}</p>
            ) : queueData.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'لا توجد رسائل في الطابور حالياً.' : 'There are no WhatsApp queue items right now.'}
              </p>
            ) : (
              <div className="overflow-x-auto border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{lang === 'ar' ? 'العميل' : 'Member'}</TableHead>
                      <TableHead>{lang === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{lang === 'ar' ? 'الموعد' : 'Scheduled'}</TableHead>
                      <TableHead>{lang === 'ar' ? 'المحاولات' : 'Attempts'}</TableHead>
                      <TableHead>{lang === 'ar' ? 'الخطأ' : 'Error'}</TableHead>
                      <TableHead className="text-right">{lang === 'ar' ? 'إجراء' : 'Action'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className={statusBadgeClass(item.status)}>
                              {typeLabel(item.type, lang)}
                            </Badge>
                            {item.campaign_title && (
                              <p className="text-xs text-muted-foreground">{item.campaign_title}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{item.member_name || (lang === 'ar' ? 'بدون اسم' : 'Unnamed member')}</p>
                            <p className="text-xs text-muted-foreground">{item.member_phone || '—'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(item.sent_at || item.scheduled_at, lang)}
                        </TableCell>
                        <TableCell>{item.attempts}</TableCell>
                        <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                          {item.last_error || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={retrying || item.status !== 'failed'}
                            onClick={() => void handleRetryFailed([item.id])}
                          >
                            {lang === 'ar' ? 'إعادة' : 'Retry'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{lang === 'ar' ? 'بث جماعي' : 'Broadcast composer'}</CardTitle>
          <CardDescription>
            {lang === 'ar'
              ? 'أنشئ رسالة جماعية مفلترة بدون تعطيل رسائل الترحيب أو التذكير.'
              : 'Queue a filtered broadcast without blocking welcome or reminder messages.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="broadcast-title">{lang === 'ar' ? 'عنوان داخلي' : 'Internal title'}</Label>
                <Input
                  id="broadcast-title"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: عرض نهاية الشهر' : 'Example: Month-end offer'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="broadcast-message">{lang === 'ar' ? 'نص الرسالة' : 'Message text'}</Label>
                <Textarea
                  id="broadcast-message"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={6}
                  placeholder={lang === 'ar' ? 'اكتب الرسالة التي ستصل للأعضاء.' : 'Write the message members will receive.'}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="broadcast-search">{lang === 'ar' ? 'بحث' : 'Search'}</Label>
                  <Input
                    id="broadcast-search"
                    value={broadcastFilters.search}
                    onChange={(e) => setBroadcastFilters((prev) => ({ ...prev, search: e.target.value }))}
                    placeholder={lang === 'ar' ? 'اسم، هاتف، أو كود البطاقة' : 'Name, phone, or card code'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{lang === 'ar' ? 'حالة الاشتراك' : 'Subscription status'}</Label>
                  <Select
                    value={broadcastFilters.status}
                    onValueChange={(value) => setBroadcastFilters((prev) => ({ ...prev, status: value as BroadcastFilters['status'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{lang === 'ar' ? 'الكل' : 'All'}</SelectItem>
                      <SelectItem value="active">{lang === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                      <SelectItem value="expired">{lang === 'ar' ? 'منتهي' : 'Expired'}</SelectItem>
                      <SelectItem value="no_sub">{lang === 'ar' ? 'بدون اشتراك' : 'No subscription'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{lang === 'ar' ? 'النوع' : 'Gender'}</Label>
                  <Select
                    value={broadcastFilters.gender}
                    onValueChange={(value) => setBroadcastFilters((prev) => ({ ...prev, gender: value as BroadcastFilters['gender'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{lang === 'ar' ? 'الكل' : 'All'}</SelectItem>
                      <SelectItem value="male">{lang === 'ar' ? 'ذكر' : 'Male'}</SelectItem>
                      <SelectItem value="female">{lang === 'ar' ? 'أنثى' : 'Female'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="broadcast-sessions">{lang === 'ar' ? 'حد الجلسات المتبقية' : 'Max sessions remaining'}</Label>
                  <Input
                    id="broadcast-sessions"
                    inputMode="numeric"
                    value={broadcastFilters.sessionsMin}
                    onChange={(e) => setBroadcastFilters((prev) => ({ ...prev, sessionsMin: e.target.value }))}
                    placeholder={lang === 'ar' ? 'مثال: 2' : 'Example: 2'}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="broadcast-plan-min">{lang === 'ar' ? 'أقل مدة خطة' : 'Min plan months'}</Label>
                  <Input
                    id="broadcast-plan-min"
                    inputMode="numeric"
                    value={broadcastFilters.planMonthsMin}
                    onChange={(e) => setBroadcastFilters((prev) => ({ ...prev, planMonthsMin: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broadcast-plan-max">{lang === 'ar' ? 'أقصى مدة خطة' : 'Max plan months'}</Label>
                  <Input
                    id="broadcast-plan-max"
                    inputMode="numeric"
                    value={broadcastFilters.planMonthsMax}
                    onChange={(e) => setBroadcastFilters((prev) => ({ ...prev, planMonthsMax: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broadcast-days-min">{lang === 'ar' ? 'أقل أيام متبقية' : 'Min days left'}</Label>
                  <Input
                    id="broadcast-days-min"
                    inputMode="numeric"
                    value={broadcastFilters.daysLeftMin}
                    onChange={(e) => setBroadcastFilters((prev) => ({ ...prev, daysLeftMin: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broadcast-days-max">{lang === 'ar' ? 'أقصى أيام متبقية' : 'Max days left'}</Label>
                  <Input
                    id="broadcast-days-max"
                    inputMode="numeric"
                    value={broadcastFilters.daysLeftMax}
                    onChange={(e) => setBroadcastFilters((prev) => ({ ...prev, daysLeftMax: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="broadcast-created-from">{lang === 'ar' ? 'تاريخ الإنشاء من' : 'Created from'}</Label>
                  <Input
                    id="broadcast-created-from"
                    type="date"
                    value={broadcastFilters.createdFrom}
                    onChange={(e) => setBroadcastFilters((prev) => ({ ...prev, createdFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broadcast-created-to">{lang === 'ar' ? 'تاريخ الإنشاء إلى' : 'Created to'}</Label>
                  <Input
                    id="broadcast-created-to"
                    type="date"
                    value={broadcastFilters.createdTo}
                    onChange={(e) => setBroadcastFilters((prev) => ({ ...prev, createdTo: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handlePreviewBroadcast()} disabled={!canPreviewBroadcast}>
              {previewLoading
                ? (lang === 'ar' ? 'جارٍ المعاينة...' : 'Previewing...')
                : (lang === 'ar' ? 'معاينة الاستهداف' : 'Preview audience')}
            </Button>
            <Button onClick={() => void handleSendBroadcast()} disabled={broadcastSubmitting || !broadcastMessage.trim()}>
              {broadcastSubmitting
                ? (lang === 'ar' ? 'جارٍ الجدولة...' : 'Queueing...')
                : (lang === 'ar' ? 'جدولة البث' : 'Queue broadcast')}
            </Button>
          </div>

          {broadcastPreview && (
            <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="border border-border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {lang === 'ar' ? 'نتيجة المعاينة' : 'Preview result'}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-2xl font-semibold">{broadcastPreview.recipientCount}</p>
                    <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'عميل مطابق' : 'matching members'}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{broadcastPreview.estimatedMinutes ?? 0}</p>
                    <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'دقيقة تقديرية للإرسال' : 'estimated minutes to drain'}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">{lang === 'ar' ? 'المرشحات' : 'Applied filters'}</p>
                  <div className="flex flex-wrap gap-2">
                    {(broadcastPreview.filterSummary && broadcastPreview.filterSummary.length > 0
                      ? broadcastPreview.filterSummary
                      : [lang === 'ar' ? 'بدون مرشحات إضافية' : 'No extra filters']
                    ).map((item) => (
                      <Badge key={item} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{lang === 'ar' ? 'كل المستلمين المطابقين' : 'All matching recipients'}</p>
                  <p className="text-xs text-muted-foreground">
                    {broadcastPreview.recipientCount} {lang === 'ar' ? 'إجمالي' : 'total'}
                  </p>
                </div>
                <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {broadcastPreview.recipients && broadcastPreview.recipients.length > 0 ? (
                    broadcastPreview.recipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between gap-3 border border-border px-3 py-2">
                        <div>
                          <p className="font-medium">{recipient.name}</p>
                          <p className="text-xs text-muted-foreground">{recipient.phone || '—'}</p>
                        </div>
                        <Badge variant="outline">{lang === 'ar' ? 'مطابق' : 'Included'}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'لا يوجد أعضاء مطابقون الآن.' : 'No members matched the current filters.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{lang === 'ar' ? 'سجل الحملات' : 'Campaign history'}</CardTitle>
          <CardDescription>
            {lang === 'ar'
              ? 'حالة كل حملة، عدد الرسائل المرسلة، والفشل المتبقي.'
              : 'See campaign status, sent volume, and failure counts.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void fetchCampaigns()} disabled={campaignsLoading}>
              {campaignsLoading ? labels.loading : (lang === 'ar' ? 'تحديث السجل' : 'Refresh history')}
            </Button>
          </div>

          {campaignsLoading ? (
            <p className="text-sm text-muted-foreground">{labels.loading}</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد حملات حتى الآن.' : 'No broadcast campaigns yet.'}
            </p>
          ) : (
            <div className="overflow-x-auto border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lang === 'ar' ? 'الحملة' : 'Campaign'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'المستلمون' : 'Recipients'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'تم الإرسال' : 'Sent'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'فشل' : 'Failed'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'أُنشئت' : 'Created'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'اكتملت' : 'Completed'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const normalizedStatus = normalizeBroadcastStatus(campaign.status);
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{campaign.title}</p>
                            <p className="max-w-[360px] truncate text-xs text-muted-foreground">{campaign.message}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(normalizedStatus)}>
                            {normalizedStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{campaign.recipient_count}</TableCell>
                        <TableCell>{campaign.sent_count}</TableCell>
                        <TableCell>{campaign.failed_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(campaign.created_at, lang)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {campaign.completed_at ? formatDateTime(campaign.completed_at, lang) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
