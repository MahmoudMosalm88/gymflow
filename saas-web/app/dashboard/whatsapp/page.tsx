'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DEFAULT_BEHAVIOR_TEMPLATES,
  DEFAULT_ONBOARDING_TEMPLATES,
  DEFAULT_POST_EXPIRY_TEMPLATES,
  DEFAULT_REMINDER_DAYS,
  getDefaultRenewalTemplate,
  getDefaultWelcomeTemplate,
  getAutomationStatusLabel,
  getAutomationWarningLabel,
  getTemplateKey,
  parseBooleanSetting,
  WHATSAPP_AUTOMATION_GROUPS,
  WHATSAPP_AUTOMATIONS,
} from '@/lib/whatsapp-automation';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────

type WhatsAppQueueCounts = {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
};

type WhatsAppStatus = {
  connected: boolean;
  queue?: Partial<WhatsAppQueueCounts>;
  workerHeartbeatAt?: string | null;
  lastQueueRunAt?: string | null;
  lastQueueSuccessAt?: string | null;
  lastQueueError?: string | null;
  warningSummary?: {
    warningActive: boolean;
    affectedMembers: number;
    membersChecked: number;
    topSources: Array<{ key: string; count: number }>;
    members: Array<{
      memberId: string;
      name: string | null;
      phone: string | null;
      messagesLast72h: number;
      messagesLast7d: number;
      topSources: string[];
    }>;
    thresholds: {
      shortWindowHours: number;
      shortWindowMessages: number;
      longWindowDays: number;
      longWindowMessages: number;
      affectedMemberThreshold: number;
    };
  };
  automationStates?: Array<{
    id: string;
    enabled: boolean;
    locked: boolean;
    ownerControlled: boolean;
    status: 'live' | 'blocked' | 'planned';
  }>;
  lifecycleRuntimeGateEnabled?: boolean;
  weeklyDigestReleaseEnabled?: boolean;
  weeklyDigestMode?: 'blocked_system_owned' | 'live_system_owned';
  compatibilityAudit?: {
    currentBranchId: string;
    currentBranchStatus: 'compatible' | 'needs_migration' | 'needs_manual_cleanup';
    lifecycleRuntimeGateEnabled: boolean;
    weeklyDigestReleaseEnabled: boolean;
    weeklyDigestMode: 'blocked_system_owned' | 'live_system_owned';
    issues: string[];
    branches: Array<{
      branchId: string;
      branchName: string;
      status: 'compatible' | 'needs_migration' | 'needs_manual_cleanup';
      issues: string[];
      current: boolean;
    }>;
  };
};

type WhatsAppSequenceItem = {
  automationId: 'post_expiry' | 'onboarding';
  memberId: string;
  memberName?: string | null;
  memberPhone?: string | null;
  scope?: string | null;
  sequenceKind: string;
  status:
    | 'pending'
    | 'processing'
    | 'sent'
    | 'failed'
    | 'stopped_manual'
    | 'stopped_not_eligible'
    | 'stopped_renewed'
    | 'stopped_goal_met';
  latestEventAt: string;
  canStop: boolean;
};

type WhatsAppSequencesResponse = {
  items: WhatsAppSequenceItem[];
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
};

type WhatsAppQueueResponse = {
  items: WhatsAppQueueItem[];
  counts?: Partial<WhatsAppQueueCounts>;
  workerHeartbeatAt?: string | null;
  lastQueueRunAt?: string | null;
  lastQueueSuccessAt?: string | null;
  lastQueueError?: string | null;
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
  recipients?: Array<{ id: string; name: string; phone?: string | null }>;
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
};

type WhatsAppCampaignsResponse = {
  items: WhatsAppCampaign[];
};

const REMINDER_OPTIONS = [1, 3, 7];

const DEFAULT_BROADCAST_FILTERS: BroadcastFilters = {
  search: '',
  status: 'all',
  gender: 'all',
  planMonthsMin: '1',
  planMonthsMax: '24',
  daysLeftMin: '0',
  daysLeftMax: '365',
  createdFrom: '',
  createdTo: '',
  sessionsMin: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  if (status === 'running' || status === 'processing' || status === 'queued' || status === 'pending')
    return 'bg-warning/10 text-warning border-warning/30';
  if (
    status === 'stopped_manual' ||
    status === 'stopped_not_eligible' ||
    status === 'stopped_renewed' ||
    status === 'stopped_goal_met'
  ) {
    return 'bg-muted/10 text-muted-foreground border-border';
  }
  if (status === 'failed') return 'bg-destructive/10 text-destructive border-destructive/30';
  return 'bg-muted/10 text-muted-foreground border-border';
}

function compatibilityStatusLabel(
  status: 'compatible' | 'needs_migration' | 'needs_manual_cleanup',
  lang: 'en' | 'ar'
) {
  if (status === 'compatible') return lang === 'ar' ? 'متوافق' : 'Compatible';
  if (status === 'needs_migration') return lang === 'ar' ? 'يحتاج ترحيل' : 'Needs migration';
  return lang === 'ar' ? 'يحتاج تنظيف يدوي' : 'Needs manual cleanup';
}

function sequenceStatusLabel(status: WhatsAppSequenceItem['status'], lang: 'en' | 'ar') {
  const labels = {
    pending: { en: 'Pending', ar: 'قيد الانتظار' },
    processing: { en: 'Processing', ar: 'قيد المعالجة' },
    sent: { en: 'Sent', ar: 'تم الإرسال' },
    failed: { en: 'Failed', ar: 'فشل' },
    stopped_manual: { en: 'Stopped manually', ar: 'أوقف يدوياً' },
    stopped_not_eligible: { en: 'Stopped: not eligible', ar: 'أوقف: غير مؤهل' },
    stopped_renewed: { en: 'Stopped: renewed', ar: 'أوقف: تم التجديد' },
    stopped_goal_met: { en: 'Stopped: goal met', ar: 'أوقف: تحقق الهدف' },
  } as const;
  return labels[status][lang];
}

function isActiveSequenceStatus(status: WhatsAppSequenceItem['status']) {
  return (
    status === 'pending' ||
    status === 'processing' ||
    status === 'sent'
  );
}

function typeLabel(type: WhatsAppQueueItem['type'], lang: 'en' | 'ar') {
  const en = { welcome: 'Welcome', qr_code: 'QR code', manual: 'Manual', renewal: 'Renewal', broadcast: 'Broadcast' } as const;
  const ar = { welcome: 'ترحيب', qr_code: 'رمز QR', manual: 'يدوي', renewal: 'تجديد', broadcast: 'بث جماعي' } as const;
  return lang === 'ar' ? ar[type] : en[type];
}

// ── WA Chat Preview Component ─────────────────────────────────────────────────

const WA_CHAT_BG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

function WaPreview({ text, sampleName }: { text: string; sampleName: string }) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">PREVIEW</p>
      <div
        className="border border-[#2a2a2a] overflow-hidden flex flex-col flex-1"
        style={{ background: WA_CHAT_BG, backgroundColor: '#0b141a' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#8696a0">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#e9edef]">{sampleName}</p>
            <p className="text-[10px] text-[#8696a0]">online</p>
          </div>
        </div>
        {/* Body — grows to match textarea height */}
        <div className="p-3 flex-1">
          <div className="flex justify-end">
            <div
              className="bg-[#005c4b] text-[#e9edef] text-[13px] leading-[19px] px-2.5 py-1.5 max-w-[85%]"
              style={{ borderRadius: '7.5px 0 7.5px 7.5px' }}
            >
              <p className="whitespace-pre-wrap">{text}</p>
              <span className="float-end mt-1 ms-2 text-[10px] text-[#ffffff99]">10:30 AM</span>
            </div>
          </div>
        </div>
        {/* Input bar */}
        <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2 shrink-0">
          <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[13px] text-[#8696a0]">
            Type a message
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#8696a0">
            <path d="M12 14.95q-.425 0-.712-.288T11 13.95V6.35L9.1 8.25q-.3.3-.7.3-.4 0-.7-.3-.3-.3-.3-.713 0-.412.3-.712l3.6-3.6q.15-.15.325-.213.175-.062.375-.062.2 0 .375.062.175.063.325.213l3.6 3.6q.3.3.3.712 0 .413-.3.713-.3.3-.7.3-.4 0-.7-.3L13 6.35v7.6q0 .425-.287.713-.288.287-.713.287zM6 20q-.825 0-1.413-.588T4 18v-2q0-.425.288-.713T5 15q.425 0 .713.288T6 16v2h12v-2q0-.425.288-.713T19 15q.425 0 .713.288T20 16v2q0 .825-.588 1.413T18 20H6z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Lightweight bubble-only preview (no chat chrome) for lifecycle templates
function WaBubble({ text }: { text: string }) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">PREVIEW</p>
      <div
        className="p-3 flex-1 border border-[#2a2a2a]"
        style={{ background: WA_CHAT_BG, backgroundColor: '#0b141a' }}
      >
        <div className="flex justify-end">
          <div
            className="bg-[#005c4b] text-[#e9edef] text-[13px] leading-[19px] px-2.5 py-1.5 max-w-[85%]"
            style={{ borderRadius: '7.5px 0 7.5px 7.5px' }}
          >
            <p className="whitespace-pre-wrap">{text}</p>
            <span className="float-end mt-1 ms-2 text-[10px] text-[#ffffff99]">10:30 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slider ─────────────────────────────────────────────────────────────────────

function RangeSlider({
  labelEn,
  labelAr,
  min,
  max,
  value,
  onChange,
  lang,
  anyLabel,
}: {
  labelEn: string;
  labelAr: string;
  min: number;
  max: number;
  value: string;
  onChange: (v: string) => void;
  lang: 'en' | 'ar';
  anyLabel?: string;
}) {
  const num = parseInt(value, 10);
  const displayVal = isNaN(num) ? min : Math.min(Math.max(num, min), max);
  const isAny = value === '' || isNaN(num);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{lang === 'ar' ? labelAr : labelEn}</Label>
        <span className="text-sm font-semibold text-foreground min-w-[48px] text-end">
          {isAny ? (anyLabel ?? 'Any') : displayVal}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={isAny ? min : displayVal}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-[#e63946] h-1.5 bg-[#2a2a2a] appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type ActiveTab = 'templates' | 'queue' | 'broadcast';

export default function WhatsAppSystemPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const systemLanguage = lang === 'ar' ? 'ar' : 'en';

  const defaultWelcomeTemplate = getDefaultWelcomeTemplate(systemLanguage);
  const defaultRenewalTemplate = getDefaultRenewalTemplate(systemLanguage);
  const defaultPostExpiry = DEFAULT_POST_EXPIRY_TEMPLATES[systemLanguage];
  const defaultOnboarding = DEFAULT_ONBOARDING_TEMPLATES[systemLanguage];
  const defaultBehavior = DEFAULT_BEHAVIOR_TEMPLATES[systemLanguage];

  const [activeTab, setActiveTab] = useState<ActiveTab>('templates');

  // ── Status & queue state ──
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [queueData, setQueueData] = useState<WhatsAppQueueResponse>({ items: [] });
  const [queueLoading, setQueueLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [queueFeedback, setQueueFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  // ── Template state ──
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesSaving, setTemplatesSaving] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [welcomeTemplate, setWelcomeTemplate] = useState(defaultWelcomeTemplate);
  const [renewalTemplate, setRenewalTemplate] = useState(defaultRenewalTemplate);
  const [postExpiryDay0, setPostExpiryDay0] = useState<string>(defaultPostExpiry.day0);
  const [postExpiryDay3, setPostExpiryDay3] = useState<string>(defaultPostExpiry.day3);
  const [postExpiryDay7, setPostExpiryDay7] = useState<string>(defaultPostExpiry.day7);
  const [postExpiryDay14, setPostExpiryDay14] = useState<string>(defaultPostExpiry.day14);
  const [onboardingFirstVisit, setOnboardingFirstVisit] = useState<string>(defaultOnboarding.firstVisit);
  const [onboardingNoReturn7, setOnboardingNoReturn7] = useState<string>(defaultOnboarding.noReturnDay7);
  const [onboardingLowEngagement14, setOnboardingLowEngagement14] = useState<string>(defaultOnboarding.lowEngagementDay14);
  const [habitBreakTemplate, setHabitBreakTemplate] = useState<string>(defaultBehavior.habitBreak);
  const [streakTemplate, setStreakTemplate] = useState<string>(defaultBehavior.streaks);
  const [freezeEndingTemplate, setFreezeEndingTemplate] = useState<string>(defaultBehavior.freezeEnding);
  const [postExpiryEnabled, setPostExpiryEnabled] = useState(false);
  const [onboardingEnabled, setOnboardingEnabled] = useState(false);
  const [habitBreakEnabled, setHabitBreakEnabled] = useState(false);
  const [streaksEnabled, setStreaksEnabled] = useState(false);
  const [freezeEndingEnabled, setFreezeEndingEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS);
  const [postExpiryDay, setPostExpiryDay] = useState<'day0' | 'day3' | 'day7' | 'day14'>('day0');
  const [onboardingStep, setOnboardingStep] = useState<'firstVisit' | 'noReturn7' | 'lowEngagement14'>('firstVisit');
  const [behaviorStep, setBehaviorStep] = useState<'habitBreak' | 'streaks' | 'freezeEnding'>('habitBreak');
  const [lifecycleInfoOpen, setLifecycleInfoOpen] = useState(false);
  const [controlSavingId, setControlSavingId] = useState<string | null>(null);
  const [controlFeedback, setControlFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [sequences, setSequences] = useState<WhatsAppSequenceItem[]>([]);
  const [sequencesLoading, setSequencesLoading] = useState(true);
  const [stoppingSequenceKey, setStoppingSequenceKey] = useState<string | null>(null);
  const [sequenceFeedback, setSequenceFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  // ── Broadcast state ──
  const [broadcastFilters, setBroadcastFilters] = useState<BroadcastFilters>(DEFAULT_BROADCAST_FILTERS);
  const [broadcastTitle, setBroadcastTitle] = useState(lang === 'ar' ? 'رسالة جماعية' : 'Broadcast');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPreview, setBroadcastPreview] = useState<BroadcastPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const [broadcastConfirmOpen, setBroadcastConfirmOpen] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // ── Derived values ──
  const sampleName = labels.sample_name;
  const sampleExpiry = new Date(Date.now() + 30 * 86400000).toLocaleDateString(
    lang === 'ar' ? 'ar-EG' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  function previewText(template: string, type: 'welcome' | 'renewal' | 'post_expiry' | 'onboarding' | 'habit_break' | 'streaks' | 'freeze_ending') {
    let text = template;
    if (!text.trim()) {
      if (type === 'welcome') text = defaultWelcomeTemplate;
      else if (type === 'renewal') text = defaultRenewalTemplate;
      else if (type === 'post_expiry') text = defaultPostExpiry.day0;
      else if (type === 'onboarding') text = defaultOnboarding.firstVisit;
      else if (type === 'habit_break') text = defaultBehavior.habitBreak;
      else if (type === 'streaks') text = defaultBehavior.streaks;
      else text = defaultBehavior.freezeEnding;
    }
    text = text.replace(/\{name\}/g, sampleName);
    if (type === 'renewal' || type === 'post_expiry') text = text.replace(/\{expiryDate\}/g, sampleExpiry);
    if (type === 'renewal') text = text.replace(/\{daysLeft\}/g, '7');
    if (type === 'habit_break') text = text.replace(/\{daysAbsent\}/g, '4');
    if (type === 'streaks') text = text.replace(/\{streakDays\}/g, '7');
    if (type === 'freeze_ending') text = text.replace(/\{resumeDate\}/g, sampleExpiry);
    return text;
  }

  const queueCounts = pickQueueCounts(status?.queue ?? queueData.counts);
  const canPreviewBroadcast = Boolean(broadcastMessage.trim()) && !previewLoading && !broadcastSubmitting;
  const warningSummary = status?.warningSummary;
  const automationStateMap = new Map((status?.automationStates ?? []).map((item) => [item.id, item]));
  const compatibilityAudit = status?.compatibilityAudit;
  const selectedReminderDays = new Set(
    reminderDays
      .split(',')
      .map((chunk) => Number.parseInt(chunk.trim(), 10))
      .filter((value) => Number.isInteger(value))
  );
  const activeSequenceCounts = sequences.reduce<Record<string, number>>((acc, item) => {
    if (!isActiveSequenceStatus(item.status)) return acc;
    acc[item.automationId] = (acc[item.automationId] || 0) + 1;
    return acc;
  }, {});

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

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<WhatsAppStatus>('/api/whatsapp/status');
      if (res.success && res.data) setStatus(res.data);
    } catch { /* silently ignore — status is optional */ }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await api.get<Record<string, unknown>>('/api/settings');
      if (res.success && res.data) {
        const d = res.data;
        const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);
        setWelcomeTemplate(str(d[getTemplateKey('welcome', systemLanguage)] ?? d.whatsapp_template_welcome, defaultWelcomeTemplate));
        setRenewalTemplate(str(d[getTemplateKey('renewal', systemLanguage)] ?? d.whatsapp_template_renewal, defaultRenewalTemplate));
        setReminderDays(str(d.whatsapp_reminder_days, DEFAULT_REMINDER_DAYS));
        setPostExpiryDay0(str(d[`whatsapp_template_post_expiry_day0_${systemLanguage}`], defaultPostExpiry.day0));
        setPostExpiryDay3(str(d[`whatsapp_template_post_expiry_day3_${systemLanguage}`], defaultPostExpiry.day3));
        setPostExpiryDay7(str(d[`whatsapp_template_post_expiry_day7_${systemLanguage}`], defaultPostExpiry.day7));
        setPostExpiryDay14(str(d[`whatsapp_template_post_expiry_day14_${systemLanguage}`], defaultPostExpiry.day14));
        setOnboardingFirstVisit(str(d[`whatsapp_template_onboarding_first_visit_${systemLanguage}`], defaultOnboarding.firstVisit));
        setOnboardingNoReturn7(str(d[`whatsapp_template_onboarding_no_return_day7_${systemLanguage}`], defaultOnboarding.noReturnDay7));
        setOnboardingLowEngagement14(str(d[`whatsapp_template_onboarding_low_engagement_day14_${systemLanguage}`], defaultOnboarding.lowEngagementDay14));
        setHabitBreakTemplate(str(d[`whatsapp_template_habit_break_${systemLanguage}`], defaultBehavior.habitBreak));
        setStreakTemplate(str(d[`whatsapp_template_streak_${systemLanguage}`], defaultBehavior.streaks));
        setFreezeEndingTemplate(str(d[`whatsapp_template_freeze_ending_${systemLanguage}`], defaultBehavior.freezeEnding));
        setPostExpiryEnabled(parseBooleanSetting(d.whatsapp_post_expiry_enabled, false));
        setOnboardingEnabled(parseBooleanSetting(d.whatsapp_onboarding_enabled, false));
        setHabitBreakEnabled(parseBooleanSetting(d.whatsapp_habit_break_enabled, false));
        setStreaksEnabled(parseBooleanSetting(d.whatsapp_streaks_enabled, false));
        setFreezeEndingEnabled(parseBooleanSetting(d.whatsapp_freeze_ending_enabled, false));
      }
    } catch (err) {
      setTemplateFeedback({ type: 'destructive', text: err instanceof Error ? err.message : 'Failed to load templates' });
    } finally {
      setTemplatesLoading(false);
    }
  }, [defaultBehavior, defaultOnboarding, defaultPostExpiry, defaultRenewalTemplate, defaultWelcomeTemplate, systemLanguage]);

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await api.get<WhatsAppQueueResponse>('/api/whatsapp/queue?status=all&limit=12');
      if (res.success && res.data) setQueueData(res.data);
    } catch { /* ignore */ } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await api.get<WhatsAppCampaignsResponse>('/api/whatsapp/campaigns?limit=10');
      if (res.success && res.data?.items) setCampaigns(res.data.items);
    } catch { /* ignore */ } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const fetchSequences = useCallback(async () => {
    setSequencesLoading(true);
    try {
      const res = await api.get<WhatsAppSequencesResponse>('/api/whatsapp/sequences?limit=12');
      if (res.success && res.data?.items) {
        setSequences(res.data.items);
      } else {
        setSequences([]);
      }
    } catch {
      setSequences([]);
    } finally {
      setSequencesLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { fetchQueue(); }, [fetchQueue]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);
  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchQueue();
      void fetchCampaigns();
      void fetchStatus();
      void fetchSequences();
    }, 15000);
    return () => clearInterval(id);
  }, [fetchCampaigns, fetchQueue, fetchSequences, fetchStatus]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleTemplateSave = async () => {
    setTemplatesSaving(true);
    setTemplateFeedback(null);
    try {
      if (selectedReminderDays.size === 0) {
        throw new Error(lang === 'ar' ? 'يجب اختيار يوم تذكير واحد على الأقل.' : 'Select at least one reminder day.');
      }
      const values: Record<string, string | boolean> = {
        [getTemplateKey('welcome', systemLanguage)]: welcomeTemplate.trim() || defaultWelcomeTemplate,
        [getTemplateKey('renewal', systemLanguage)]: renewalTemplate.trim() || defaultRenewalTemplate,
        [`whatsapp_template_post_expiry_day0_${systemLanguage}`]: postExpiryDay0.trim() || defaultPostExpiry.day0,
        [`whatsapp_template_post_expiry_day3_${systemLanguage}`]: postExpiryDay3.trim() || defaultPostExpiry.day3,
        [`whatsapp_template_post_expiry_day7_${systemLanguage}`]: postExpiryDay7.trim() || defaultPostExpiry.day7,
        [`whatsapp_template_post_expiry_day14_${systemLanguage}`]: postExpiryDay14.trim() || defaultPostExpiry.day14,
        [`whatsapp_template_onboarding_first_visit_${systemLanguage}`]:
          onboardingFirstVisit.trim() || defaultOnboarding.firstVisit,
        [`whatsapp_template_onboarding_no_return_day7_${systemLanguage}`]:
          onboardingNoReturn7.trim() || defaultOnboarding.noReturnDay7,
        [`whatsapp_template_onboarding_low_engagement_day14_${systemLanguage}`]:
          onboardingLowEngagement14.trim() || defaultOnboarding.lowEngagementDay14,
        whatsapp_reminder_days: Array.from(selectedReminderDays).sort((a, b) => b - a).join(','),
        system_language: systemLanguage,
      };
      if (systemLanguage === 'en') {
        values.whatsapp_template_welcome = welcomeTemplate.trim() || defaultWelcomeTemplate;
        values.whatsapp_template_renewal = renewalTemplate.trim() || defaultRenewalTemplate;
      }
      const res = await api.put('/api/settings', { values });
      if (!res.success) throw new Error(res.message ?? 'Failed to save templates');
      setTemplateFeedback({ type: 'success', text: labels.saved_successfully });
    } catch (err) {
      setTemplateFeedback({ type: 'destructive', text: err instanceof Error ? err.message : labels.failed_to_save });
    } finally {
      setTemplatesSaving(false);
    }
  };

  const toggleReminderDay = (day: number) => {
    const next = new Set(selectedReminderDays);
    if (next.has(day)) {
      if (next.size === 1) {
        setTemplateFeedback({
          type: 'destructive',
          text: lang === 'ar' ? 'يجب اختيار يوم تذكير واحد على الأقل.' : 'You must keep at least one reminder day selected.',
        });
        return;
      }
      next.delete(day);
    } else {
      next.add(day);
    }
    setTemplateFeedback(null);
    setReminderDays(Array.from(next).sort((a, b) => b - a).join(','));
  };

  const handleAutomationToggle = async (
    automationId: 'post_expiry' | 'onboarding',
    enabled: boolean
  ) => {
    const settingKey =
      automationId === 'post_expiry' ? 'whatsapp_post_expiry_enabled' : 'whatsapp_onboarding_enabled';
    setControlSavingId(automationId);
    setControlFeedback(null);
    try {
      const res = await api.put('/api/settings', {
        values: { [settingKey]: enabled },
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to update automation state');
      if (automationId === 'post_expiry') setPostExpiryEnabled(enabled);
      else setOnboardingEnabled(enabled);
      setControlFeedback({
        type: 'success',
        text:
          lang === 'ar'
            ? 'تم تحديث حالة الأتمتة.'
            : 'Automation state updated.',
      });
      await Promise.all([fetchStatus(), fetchSequences()]);
    } catch (err) {
      setControlFeedback({
        type: 'destructive',
        text: err instanceof Error ? err.message : 'Failed to update automation state.',
      });
    } finally {
      setControlSavingId(null);
    }
  };

  const handleStopSequence = async (item: WhatsAppSequenceItem) => {
    const sequenceKey = `${item.automationId}:${item.memberId}:${item.scope || ''}`;
    setStoppingSequenceKey(sequenceKey);
    setSequenceFeedback(null);
    try {
      const res = await api.post('/api/whatsapp/sequences', {
        memberId: item.memberId,
        automationId: item.automationId,
        scope: item.scope ?? null,
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to stop sequence');
      setSequenceFeedback({
        type: 'success',
        text: lang === 'ar' ? 'تم إيقاف التسلسل.' : 'Sequence stopped.',
      });
      await Promise.all([fetchSequences(), fetchStatus(), fetchQueue()]);
    } catch (err) {
      setSequenceFeedback({
        type: 'destructive',
        text: err instanceof Error ? err.message : 'Failed to stop sequence.',
      });
    } finally {
      setStoppingSequenceKey(null);
    }
  };

  const handleRetryFailed = async (ids?: string[]) => {
    setRetrying(true);
    setQueueFeedback(null);
    try {
      const res = await api.post<{ retried: number }>('/api/whatsapp/queue/retry', { ids });
      if (!res.success) throw new Error(res.message ?? 'Failed to retry');
      setQueueFeedback({
        type: 'success',
        text: lang === 'ar'
          ? `تمت إعادة ${res.data?.retried ?? 0} رسالة إلى الطابور.`
          : `Re-queued ${res.data?.retried ?? 0} WhatsApp messages.`,
      });
      await Promise.all([fetchQueue(), fetchStatus(), fetchCampaigns()]);
    } catch (err) {
      setQueueFeedback({ type: 'destructive', text: err instanceof Error ? err.message : 'Retry failed.' });
    } finally {
      setRetrying(false);
    }
  };

  const handlePreviewBroadcast = async () => {
    setPreviewLoading(true);
    setBroadcastFeedback(null);
    try {
      const res = await api.post<BroadcastPreview>('/api/whatsapp/broadcast/preview', buildBroadcastPayload());
      if (!res.success || !res.data) throw new Error(res.message ?? 'Failed to preview');
      setBroadcastPreview(res.data);
    } catch (err) {
      setBroadcastFeedback({ type: 'destructive', text: err instanceof Error ? err.message : 'Failed to preview broadcast.' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      setBroadcastFeedback({ type: 'destructive', text: lang === 'ar' ? 'أدخل نص الرسالة أولاً.' : 'Enter a message first.' });
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
      setBroadcastFeedback({ type: 'destructive', text: err instanceof Error ? err.message : 'Failed to queue broadcast.' });
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  // ── Tab config ─────────────────────────────────────────────────────────────

  const tabs: { id: ActiveTab; labelEn: string; labelAr: string }[] = [
    { id: 'templates', labelEn: 'Templates', labelAr: 'القوالب' },
    { id: 'queue', labelEn: 'Queue', labelAr: 'الطابور' },
    { id: 'broadcast', labelEn: 'Broadcast', labelAr: 'البث الجماعي' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">{lang === 'ar' ? 'نظام واتساب' : 'WhatsApp System'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === 'ar'
            ? 'إدارة قوالب الرسائل، صحة الطابور، والبث الجماعي.'
            : 'Manage message templates, queue health, and broadcast campaigns.'}
        </p>
      </div>

      {/* Internal tab nav */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'border-[#e63946] text-[#e63946]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {lang === 'ar' ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* ── Templates Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="flex flex-col gap-6">
          {templatesLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {warningSummary && warningSummary.affectedMembers > 0 && (
                <Alert variant={warningSummary.warningActive ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {lang === 'ar' ? 'تحذير كثافة الرسائل' : 'Messaging frequency warning'}
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      {lang === 'ar'
                        ? `${warningSummary.affectedMembers} عضو من أصل ${warningSummary.membersChecked} تلقوا رسائل كثيرة خلال آخر ${warningSummary.thresholds.longWindowDays} أيام.`
                        : `${warningSummary.affectedMembers} of ${warningSummary.membersChecked} checked members received high message volume in the last ${warningSummary.thresholds.longWindowDays} days.`}
                    </p>
                    {warningSummary.topSources.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {warningSummary.topSources.map((source) => (
                          <Badge key={source.key} variant="outline" className="border-border text-xs">
                            {getAutomationWarningLabel(source.key, systemLanguage)} · {source.count}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {warningSummary.members.length > 0 && (
                      <div className="grid gap-2 md:grid-cols-2">
                        {warningSummary.members.slice(0, 4).map((member) => (
                          <div key={member.memberId} className="border border-border px-3 py-2 text-xs">
                            <p className="font-medium text-foreground">{member.name || (lang === 'ar' ? 'بدون اسم' : 'Unnamed')}</p>
                            <p className="text-muted-foreground">
                              {lang === 'ar'
                                ? `${member.messagesLast72h} خلال ${warningSummary.thresholds.shortWindowHours} ساعة · ${member.messagesLast7d} خلال ${warningSummary.thresholds.longWindowDays} أيام`
                                : `${member.messagesLast72h} in ${warningSummary.thresholds.shortWindowHours}h · ${member.messagesLast7d} in ${warningSummary.thresholds.longWindowDays}d`}
                            </p>
                            <p className="text-muted-foreground">
                              {(member.topSources.length > 0 ? member.topSources : ['manual'])
                                .map((key) => getAutomationWarningLabel(key, systemLanguage))
                                .join(' • ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'مركز تحكم الأتمتة' : 'Automation control center'}</CardTitle>
                  <CardDescription>
                    {lang === 'ar'
                      ? 'الواجهة هنا هي مرجع التشغيل: ما الذي يمكن للمالك تفعيله الآن، ما الذي ما زال محجوباً، وما الذي يتحكم به النظام.'
                      : 'This is the rollout control surface: what the owner can enable now, what is still blocked, and what stays system-owned.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {compatibilityAudit && (
                    <div className="border border-border px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {lang === 'ar' ? 'توافق الفرع الحالي' : 'Current branch compatibility'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lang === 'ar'
                              ? 'التحقق يفحص الجداول والأعمدة المطلوبة لمسار واتساب.'
                              : 'Audit checks the schema required for WhatsApp rollout and fail-open behavior.'}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-border">
                          {compatibilityStatusLabel(compatibilityAudit.currentBranchStatus, lang)}
                        </Badge>
                      </div>
                      {compatibilityAudit.issues.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {compatibilityAudit.issues.map((issue) => (
                            <Badge key={issue} variant="outline" className="border-warning/30 text-warning">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!status?.lifecycleRuntimeGateEnabled && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{lang === 'ar' ? 'مسار الإطلاق مغلق' : 'Runtime rollout gate is off'}</AlertTitle>
                      <AlertDescription>
                        {lang === 'ar'
                          ? 'يمكنك ضبط القوالب ومفاتيح الفرع، لكن العامل لن يرسل أتمتات دورة الحياة حتى يتم تفعيل WHATSAPP_LIFECYCLE_AUTOMATIONS_ENABLED.'
                          : 'Templates and branch toggles can be configured, but the worker will not send lifecycle automations until WHATSAPP_LIFECYCLE_AUTOMATIONS_ENABLED is enabled.'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {controlFeedback && (
                    <Alert variant={controlFeedback.type}>
                      {controlFeedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      <AlertTitle>{controlFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                      <AlertDescription>{controlFeedback.text}</AlertDescription>
                    </Alert>
                  )}

                  {WHATSAPP_AUTOMATION_GROUPS.map((group) => {
                    const items = WHATSAPP_AUTOMATIONS.filter((item) => item.group === group.id);
                    return (
                      <div key={group.id} className="space-y-3">
                        <div>
                          <h3 className="text-sm font-semibold">{group.title[systemLanguage]}</h3>
                          <p className="text-xs text-muted-foreground">{group.description[systemLanguage]}</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {items.map((item) => {
                            const serverState = automationStateMap.get(item.id);
                            const configured = serverState
                              ? serverState.enabled
                              : item.id === 'post_expiry'
                                ? postExpiryEnabled
                                : item.id === 'onboarding'
                                  ? onboardingEnabled
                                  : item.id === 'weekly_digest'
                                    ? Boolean(status?.weeklyDigestReleaseEnabled)
                                    : item.status === 'live';
                            const activeCount = activeSequenceCounts[item.id] || 0;
                            return (
                              <div key={item.id} className="border border-border px-4 py-3 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold">{item.title[systemLanguage]}</p>
                                    <p className="text-xs text-muted-foreground">{item.description[systemLanguage]}</p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={item.status === 'live' ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}
                                  >
                                    {getAutomationStatusLabel(item.status, systemLanguage)}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <Badge variant="outline" className="border-border text-muted-foreground">
                                    {configured
                                      ? (lang === 'ar' ? 'مفعّل' : 'Enabled')
                                      : (lang === 'ar' ? 'متوقف' : 'Off')}
                                  </Badge>
                                  <Badge variant="outline" className="border-border text-muted-foreground">
                                    {item.controlMode === 'system'
                                      ? (lang === 'ar' ? 'يتحكم به النظام' : 'System owned')
                                      : item.ownerControlled
                                      ? (lang === 'ar' ? 'يتحكم به المالك' : 'Owner controlled')
                                      : (lang === 'ar' ? 'نظامي / يدوي' : 'System / manual')}
                                  </Badge>
                                  {item.editableTemplates ? (
                                    <Badge variant="outline" className="border-border text-muted-foreground">
                                      {lang === 'ar' ? 'قابل للتعديل الآن' : 'Editable now'}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-border text-muted-foreground">
                                      {lang === 'ar' ? 'مقفل حالياً' : 'Locked for now'}
                                    </Badge>
                                  )}
                                  {(item.id === 'post_expiry' || item.id === 'onboarding') && (
                                    <Badge variant="outline" className="border-border text-muted-foreground">
                                      {lang === 'ar'
                                        ? `${activeCount} متأثرون الآن`
                                        : `${activeCount} active now`}
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <p>{item.triggerSummary[systemLanguage]}</p>
                                  <p>{item.stopSummary[systemLanguage]}</p>
                                </div>
                                {(item.id === 'post_expiry' || item.id === 'onboarding') && (
                                  <div className="flex items-center justify-between gap-3 border border-border px-3 py-2">
                                    <div>
                                      <p className="text-sm font-medium">
                                        {lang === 'ar' ? 'تمكين هذه الأتمتة' : 'Enable this automation'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {lang === 'ar'
                                          ? 'الحفظ هنا لا يغير القوالب. القوالب تحفظ من الأسفل.'
                                          : 'This only changes the branch toggle. Templates are saved separately below.'}
                                      </p>
                                    </div>
                                    <label className="inline-flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={configured}
                                        disabled={controlSavingId === item.id}
                                        onChange={(event) =>
                                          void handleAutomationToggle(
                                            item.id as 'post_expiry' | 'onboarding',
                                            event.target.checked
                                          )
                                        }
                                      />
                                      <span>{configured ? (lang === 'ar' ? 'مفعّل' : 'On') : (lang === 'ar' ? 'متوقف' : 'Off')}</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Welcome Message */}
              <Card>
                <CardHeader>
                  <CardTitle>{labels.welcome_message_template}</CardTitle>
                  <CardDescription>
                    {lang === 'ar'
                      ? 'ترسل عند تسجيل عضو جديد. المتغيرات: {name}'
                      : 'Sent when a new member is added. Variables: {name}'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={welcomeTemplate}
                        onChange={(e) => setWelcomeTemplate(e.target.value)}
                        placeholder={defaultWelcomeTemplate}
                        rows={3}
                        className="flex-1 resize-none"
                      />
                      <p className="text-xs text-muted-foreground">Placeholders: {'{name}'}</p>
                    </div>
                    <WaPreview text={previewText(welcomeTemplate, 'welcome')} sampleName={sampleName} />
                  </div>
                </CardContent>
              </Card>

              {/* Renewal Reminder */}
              <Card>
                <CardHeader>
                  <CardTitle>{labels.renewal_reminder_template}</CardTitle>
                  <CardDescription>
                    {lang === 'ar'
                      ? 'ترسل قبل انتهاء الاشتراك. المتغيرات: {name}، {expiryDate}، {daysLeft}'
                      : 'Sent before subscription expiry. Variables: {name}, {expiryDate}, {daysLeft}'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                    <div className="flex flex-col gap-4">
                      <Textarea
                        value={renewalTemplate}
                        onChange={(e) => setRenewalTemplate(e.target.value)}
                        placeholder={defaultRenewalTemplate}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="space-y-2">
                        <Label>{labels.reminder_days_label}</Label>
                        <div className="flex flex-wrap gap-2">
                          {REMINDER_OPTIONS.map((day) => {
                            const active = selectedReminderDays.has(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleReminderDay(day)}
                                className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                                  active
                                    ? 'bg-[#e63946] text-white border-[#e63946]'
                                    : 'bg-[#1e1e1e] text-[#8a8578] border-[#2a2a2a] hover:text-[#e8e4df] hover:border-[#3a3a3a]'
                                }`}
                              >
                                {lang === 'ar' ? `قبل ${day} يوم` : `${day} day${day === 1 ? '' : 's'} before`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <WaPreview text={previewText(renewalTemplate, 'renewal')} sampleName={sampleName} />
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Lifecycle automations — collapsible banner */}
              <button
                type="button"
                onClick={() => setLifecycleInfoOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 border border-border px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {lang === 'ar' ? 'أتمتة دورة حياة العضو' : 'Lifecycle automations'}
                  </span>
                  <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-xs">
                    {lang === 'ar' ? 'الموجة الأولى جاهزة' : 'First wave ready'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'ما بعد الانتهاء + التهيئة جاهزان، والباقي ما زال محجوباً' : 'Post-expiry + onboarding are ready; later waves stay blocked'}
                  </span>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className={`shrink-0 transition-transform ${lifecycleInfoOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {lifecycleInfoOpen && (
                <div className="border border-border border-t-0 px-4 py-4 space-y-3 bg-[#1a1a1a]">
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'الموجة الأولى فقط قابلة للتفعيل من مركز التحكم. الملخص الأسبوعي يبقى استثناءً مملوكاً للنظام، وبقية التنبيهات السلوكية تظل ظاهرة لكن محجوبة.'
                      : 'Only the first wave is owner-toggleable in the control center. Weekly digest stays system-owned, and the later behavior automations remain visible but blocked.'}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { titleEn: 'Post-expiry recovery', titleAr: 'استرجاع ما بعد الانتهاء', enabled: postExpiryEnabled },
                      { titleEn: 'New member onboarding', titleAr: 'تهيئة العضو الجديد', enabled: onboardingEnabled },
                      { titleEn: 'Habit-break nudge', titleAr: 'تنبيه انقطاع العادة', enabled: habitBreakEnabled },
                      { titleEn: 'Streak encouragement', titleAr: 'تشجيع الاستمرارية', enabled: streaksEnabled },
                      { titleEn: 'Freeze-ending reminder', titleAr: 'تذكير انتهاء التجميد', enabled: freezeEndingEnabled },
                      { titleEn: 'Weekly digest', titleAr: 'الملخص الأسبوعي', enabled: Boolean(status?.weeklyDigestReleaseEnabled) },
                    ].map((item) => (
                      <div key={item.titleEn} className="flex items-center justify-between gap-2 border border-border px-3 py-2">
                        <p className="text-xs font-medium">{lang === 'ar' ? item.titleAr : item.titleEn}</p>
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                          {item.titleEn === 'Weekly digest'
                            ? item.enabled
                              ? (lang === 'ar' ? 'مباشر كنظام' : 'Live as system release')
                              : (lang === 'ar' ? 'محجوب كنظام' : 'Blocked system release')
                            : item.enabled
                              ? (lang === 'ar' ? 'مُعدّ' : 'Configured')
                              : (lang === 'ar' ? 'محجوب' : 'Blocked')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{lang === 'ar' ? 'التسلسلات النشطة' : 'Active sequences'}</CardTitle>
                  <CardDescription className="text-xs">
                    {lang === 'ar'
                      ? 'يمكنك رؤية الحالات الفعلية وإيقاف تسلسل بعينه لكل عضو.'
                      : 'Review the current lifecycle sequences and stop an individual sequence when needed.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sequenceFeedback && (
                    <Alert variant={sequenceFeedback.type}>
                      {sequenceFeedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      <AlertTitle>{sequenceFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                      <AlertDescription>{sequenceFeedback.text}</AlertDescription>
                    </Alert>
                  )}
                  {sequencesLoading ? (
                    <p className="text-sm text-muted-foreground">{labels.loading}</p>
                  ) : sequences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'لا توجد تسلسلات مرئية حالياً.' : 'No visible lifecycle sequences right now.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sequences.map((item) => {
                        const sequenceKey = `${item.automationId}:${item.memberId}:${item.scope || ''}`;
                        return (
                          <div key={sequenceKey} className="flex flex-col gap-3 border border-border px-3 py-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{item.memberName || (lang === 'ar' ? 'بدون اسم' : 'Unnamed')}</p>
                                <Badge variant="outline" className="border-border text-muted-foreground">
                                  {item.automationId === 'post_expiry'
                                    ? (lang === 'ar' ? 'ما بعد الانتهاء' : 'Post-expiry')
                                    : (lang === 'ar' ? 'تهيئة' : 'Onboarding')}
                                </Badge>
                                <Badge variant="outline" className={statusBadgeClass(item.status)}>
                                  {sequenceStatusLabel(item.status, lang)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.memberPhone || '—'} · {formatDateTime(item.latestEventAt, lang)}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.sequenceKind}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!item.canStop || stoppingSequenceKey === sequenceKey}
                              onClick={() => void handleStopSequence(item)}
                            >
                              {stoppingSequenceKey === sequenceKey
                                ? (lang === 'ar' ? 'جارٍ الإيقاف...' : 'Stopping...')
                                : (lang === 'ar' ? 'إيقاف التسلسل' : 'Stop sequence')}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Post-expiry templates — sub-tab picker */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{lang === 'ar' ? 'قوالب ما بعد انتهاء الاشتراك' : 'Post-expiry templates'}</CardTitle>
                  <CardDescription className="text-xs">
                    {lang === 'ar' ? 'التسلسل: يوم 0، 3، 7، 14. المتغيرات: {name}، {expiryDate}' : 'Sequence: Day 0, 3, 7, 14 · Variables: {name}, {expiryDate}'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Day picker */}
                  <div className="flex gap-1 flex-wrap">
                    {([
                      { id: 'day0', labelEn: 'Day 0', labelAr: 'يوم 0' },
                      { id: 'day3', labelEn: 'Day 3', labelAr: 'يوم 3' },
                      { id: 'day7', labelEn: 'Day 7', labelAr: 'يوم 7' },
                      { id: 'day14', labelEn: 'Day 14', labelAr: 'يوم 14' },
                    ] as const).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setPostExpiryDay(d.id)}
                        className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                          postExpiryDay === d.id
                            ? 'bg-[#e63946] text-white border-[#e63946]'
                            : 'bg-[#1e1e1e] text-[#8a8578] border-[#2a2a2a] hover:text-[#e8e4df] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {lang === 'ar' ? d.labelAr : d.labelEn}
                      </button>
                    ))}
                  </div>
                  {/* Active day editor */}
                  {(() => {
                    const map = {
                      day0: { value: postExpiryDay0, setValue: setPostExpiryDay0, defaultVal: defaultPostExpiry.day0 },
                      day3: { value: postExpiryDay3, setValue: setPostExpiryDay3, defaultVal: defaultPostExpiry.day3 },
                      day7: { value: postExpiryDay7, setValue: setPostExpiryDay7, defaultVal: defaultPostExpiry.day7 },
                      day14: { value: postExpiryDay14, setValue: setPostExpiryDay14, defaultVal: defaultPostExpiry.day14 },
                    };
                    const active = map[postExpiryDay];
                    const previewMsg = (active.value.trim() || active.defaultVal)
                      .replace(/\{name\}/g, sampleName)
                      .replace(/\{expiryDate\}/g, sampleExpiry);
                    return (
                      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                        <Textarea value={active.value} onChange={(e) => active.setValue(e.target.value)} rows={3} className="resize-none" />
                        <WaBubble text={previewMsg} />
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Onboarding templates — sub-tab picker */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{lang === 'ar' ? 'قوالب تهيئة الأعضاء الجدد' : 'New member onboarding templates'}</CardTitle>
                  <CardDescription className="text-xs">
                    {lang === 'ar' ? 'الخطوات: أول زيارة · 7 أيام · 14 يوماً. المتغيرات: {name}' : 'Stages: first visit · 7 days · 14 days · Variable: {name}'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Step picker */}
                  <div className="flex gap-1 flex-wrap">
                    {([
                      { id: 'firstVisit', labelEn: 'First visit', labelAr: 'أول زيارة' },
                      { id: 'noReturn7', labelEn: 'No return · 7d', labelAr: 'عدم عودة · 7 أيام' },
                      { id: 'lowEngagement14', labelEn: 'Low engagement · 14d', labelAr: 'تفاعل منخفض · 14 يوماً' },
                    ] as const).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setOnboardingStep(s.id)}
                        className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                          onboardingStep === s.id
                            ? 'bg-[#e63946] text-white border-[#e63946]'
                            : 'bg-[#1e1e1e] text-[#8a8578] border-[#2a2a2a] hover:text-[#e8e4df] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {lang === 'ar' ? s.labelAr : s.labelEn}
                      </button>
                    ))}
                  </div>
                  {/* Active step editor */}
                  {(() => {
                    const map = {
                      firstVisit: { value: onboardingFirstVisit, setValue: setOnboardingFirstVisit, defaultVal: defaultOnboarding.firstVisit },
                      noReturn7: { value: onboardingNoReturn7, setValue: setOnboardingNoReturn7, defaultVal: defaultOnboarding.noReturnDay7 },
                      lowEngagement14: { value: onboardingLowEngagement14, setValue: setOnboardingLowEngagement14, defaultVal: defaultOnboarding.lowEngagementDay14 },
                    };
                    const active = map[onboardingStep];
                    const previewMsg = (active.value.trim() || active.defaultVal).replace(/\{name\}/g, sampleName);
                    return (
                      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                        <Textarea value={active.value} onChange={(e) => active.setValue(e.target.value)} rows={3} className="resize-none" />
                        <WaBubble text={previewMsg} />
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{lang === 'ar' ? 'قوالب الأتمتات السلوكية' : 'Behavior automation templates'}</CardTitle>
                  <CardDescription className="text-xs">
                    {lang === 'ar'
                      ? 'ضمن النطاق لكنها مقفلة حتى الإطلاق. المتغيرات: {name}، {daysAbsent}، {streakDays}، {resumeDate}'
                      : 'In scope but locked until release. Variables: {name}, {daysAbsent}, {streakDays}, {resumeDate}'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-1 flex-wrap">
                    {([
                      { id: 'habitBreak', labelEn: 'Habit break', labelAr: 'انقطاع العادة' },
                      { id: 'streaks', labelEn: 'Streaks', labelAr: 'الاستمرارية' },
                      { id: 'freezeEnding', labelEn: 'Freeze ending', labelAr: 'انتهاء التجميد' },
                    ] as const).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setBehaviorStep(s.id)}
                        className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                          behaviorStep === s.id
                            ? 'bg-[#e63946] text-white border-[#e63946]'
                            : 'bg-[#1e1e1e] text-[#8a8578] border-[#2a2a2a] hover:text-[#e8e4df] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {lang === 'ar' ? s.labelAr : s.labelEn}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const map = {
                      habitBreak: { value: habitBreakTemplate, type: 'habit_break' as const },
                      streaks: { value: streakTemplate, type: 'streaks' as const },
                      freezeEnding: { value: freezeEndingTemplate, type: 'freeze_ending' as const },
                    };
                    const active = map[behaviorStep];
                    return (
                      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                        <Textarea value={active.value} onChange={() => undefined} rows={3} className="resize-none" disabled />
                        <WaBubble text={previewText(active.value, active.type)} />
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Save */}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleTemplateSave} disabled={templatesSaving}>
                  {templatesSaving ? labels.saving : labels.save}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {lang === 'ar'
                    ? 'حفظ القوالب لا يغيّر مفاتيح التشغيل في مركز التحكم.'
                    : 'Saving templates does not change the control-center toggles.'}
                </span>
                {templateFeedback && (
                  <span className={`text-sm ${templateFeedback.type === 'success' ? 'text-success' : 'text-destructive'}`}>
                    {templateFeedback.text}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Queue Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div className="flex flex-col gap-6">
          {/* Queue count cards */}
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

          {/* Worker metrics */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { labelEn: 'Last worker heartbeat', labelAr: 'آخر نبضة من العامل', value: status?.workerHeartbeatAt ? formatDateTime(status.workerHeartbeatAt, lang) : (lang === 'ar' ? 'لا يوجد' : 'No heartbeat yet') },
              { labelEn: 'Last queue run', labelAr: 'آخر تشغيل للطابور', value: status?.lastQueueRunAt ? formatDateTime(status.lastQueueRunAt, lang) : (lang === 'ar' ? 'لا يوجد' : 'No runs yet') },
              { labelEn: 'Last success', labelAr: 'آخر نجاح', value: status?.lastQueueSuccessAt ? formatDateTime(status.lastQueueSuccessAt, lang) : (lang === 'ar' ? 'لا يوجد' : 'None yet') },
              { labelEn: 'Last error', labelAr: 'آخر خطأ', value: status?.lastQueueError || (lang === 'ar' ? 'لا يوجد' : 'No errors'), isError: Boolean(status?.lastQueueError) },
            ].map((m) => (
              <div key={m.labelEn} className="border border-border px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{lang === 'ar' ? m.labelAr : m.labelEn}</p>
                <p className={`mt-2 text-sm font-medium ${m.isError ? 'text-destructive' : ''}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void fetchQueue()} disabled={queueLoading}>
              {queueLoading ? labels.loading : (lang === 'ar' ? 'تحديث الطابور' : 'Refresh queue')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleRetryFailed()}
              disabled={retrying || queueCounts.failed === 0}
            >
              {retrying ? (lang === 'ar' ? 'جارٍ الإعادة...' : 'Retrying...') : (lang === 'ar' ? 'إعادة كل الرسائل الفاشلة' : 'Retry all failed')}
            </Button>
          </div>

          {queueFeedback && (
            <Alert variant={queueFeedback.type}>
              {queueFeedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{queueFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{queueFeedback.text}</AlertDescription>
            </Alert>
          )}

          {/* Queue items table */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">{lang === 'ar' ? 'آخر الرسائل في الطابور' : 'Latest queue items'}</h3>
              <p className="text-xs text-muted-foreground">
                {lang === 'ar' ? 'الفاشلة تظهر أولاً.' : 'Failed items stay at the top so they can be fixed quickly.'}
              </p>
            </div>
            {queueLoading ? (
              <p className="text-sm text-muted-foreground">{labels.loading}</p>
            ) : queueData.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'لا توجد رسائل في الطابور حالياً.' : 'No WhatsApp queue items right now.'}
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
                      <TableHead className="text-end">{lang === 'ar' ? 'إجراء' : 'Action'}</TableHead>
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
                            <p className="font-medium">{item.member_name || (lang === 'ar' ? 'بدون اسم' : 'Unnamed')}</p>
                            <p className="text-xs text-muted-foreground">{item.member_phone || '—'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(item.status)}>{item.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(item.sent_at || item.scheduled_at, lang)}
                        </TableCell>
                        <TableCell>{item.attempts}</TableCell>
                        <TableCell className="max-w-[280px] text-sm text-muted-foreground">{item.last_error || '—'}</TableCell>
                        <TableCell className="text-end">
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
        </div>
      )}

      {/* ── Broadcast Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'broadcast' && (
        <div className="flex flex-col gap-6">
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
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: message */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bc-title">{lang === 'ar' ? 'عنوان داخلي' : 'Internal title'}</Label>
                    <Input
                      id="bc-title"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: عرض نهاية الشهر' : 'Example: Month-end offer'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bc-message">{lang === 'ar' ? 'نص الرسالة' : 'Message text'}</Label>
                    <Textarea
                      id="bc-message"
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      rows={6}
                      placeholder={lang === 'ar' ? 'اكتب الرسالة التي ستصل للأعضاء.' : 'Write the message members will receive.'}
                    />
                  </div>
                </div>

                {/* Right: audience filters */}
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bc-search">{lang === 'ar' ? 'بحث' : 'Search'}</Label>
                      <Input
                        id="bc-search"
                        value={broadcastFilters.search}
                        onChange={(e) => setBroadcastFilters((p) => ({ ...p, search: e.target.value }))}
                        placeholder={lang === 'ar' ? 'اسم أو هاتف' : 'Name or phone'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{lang === 'ar' ? 'حالة الاشتراك' : 'Subscription status'}</Label>
                      <Select
                        value={broadcastFilters.status}
                        onValueChange={(v) => setBroadcastFilters((p) => ({ ...p, status: v as BroadcastFilters['status'] }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{lang === 'ar' ? 'الكل' : 'All'}</SelectItem>
                          <SelectItem value="active">{lang === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                          <SelectItem value="expired">{lang === 'ar' ? 'منتهي' : 'Expired'}</SelectItem>
                          <SelectItem value="no_sub">{lang === 'ar' ? 'بدون اشتراك' : 'No subscription'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{lang === 'ar' ? 'الجنس' : 'Gender'}</Label>
                      <Select
                        value={broadcastFilters.gender}
                        onValueChange={(v) => setBroadcastFilters((p) => ({ ...p, gender: v as BroadcastFilters['gender'] }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{lang === 'ar' ? 'الكل' : 'All'}</SelectItem>
                          <SelectItem value="male">{lang === 'ar' ? 'ذكر' : 'Male'}</SelectItem>
                          <SelectItem value="female">{lang === 'ar' ? 'أنثى' : 'Female'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bc-sessions">{lang === 'ar' ? 'حد الجلسات المتبقية' : 'Max sessions remaining'}</Label>
                      <Input
                        id="bc-sessions"
                        inputMode="numeric"
                        value={broadcastFilters.sessionsMin}
                        onChange={(e) => setBroadcastFilters((p) => ({ ...p, sessionsMin: e.target.value }))}
                        placeholder={lang === 'ar' ? 'مثال: 2' : 'e.g. 2'}
                      />
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RangeSlider
                      labelEn="Min plan months" labelAr="أقل مدة خطة"
                      min={1} max={24}
                      value={broadcastFilters.planMonthsMin}
                      onChange={(v) => setBroadcastFilters((p) => ({ ...p, planMonthsMin: v }))}
                      lang={lang}
                    />
                    <RangeSlider
                      labelEn="Max plan months" labelAr="أقصى مدة خطة"
                      min={1} max={24}
                      value={broadcastFilters.planMonthsMax}
                      onChange={(v) => setBroadcastFilters((p) => ({ ...p, planMonthsMax: v }))}
                      lang={lang}
                    />
                    <RangeSlider
                      labelEn="Min days left" labelAr="أقل أيام متبقية"
                      min={0} max={365}
                      value={broadcastFilters.daysLeftMin}
                      onChange={(v) => setBroadcastFilters((p) => ({ ...p, daysLeftMin: v }))}
                      lang={lang}
                    />
                    <RangeSlider
                      labelEn="Max days left" labelAr="أقصى أيام متبقية"
                      min={0} max={365}
                      value={broadcastFilters.daysLeftMax}
                      onChange={(v) => setBroadcastFilters((p) => ({ ...p, daysLeftMax: v }))}
                      lang={lang}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bc-from">{lang === 'ar' ? 'تاريخ الإنشاء من' : 'Created from'}</Label>
                      <Input id="bc-from" type="date" value={broadcastFilters.createdFrom} onChange={(e) => setBroadcastFilters((p) => ({ ...p, createdFrom: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bc-to">{lang === 'ar' ? 'تاريخ الإنشاء إلى' : 'Created to'}</Label>
                      <Input id="bc-to" type="date" value={broadcastFilters.createdTo} onChange={(e) => setBroadcastFilters((p) => ({ ...p, createdTo: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void handlePreviewBroadcast()} disabled={!canPreviewBroadcast}>
                  {previewLoading ? (lang === 'ar' ? 'جارٍ المعاينة...' : 'Previewing...') : (lang === 'ar' ? 'معاينة الاستهداف' : 'Preview audience')}
                </Button>
                <Button
                  onClick={() => setBroadcastConfirmOpen(true)}
                  disabled={broadcastSubmitting || !broadcastMessage.trim()}
                >
                  {broadcastSubmitting ? (lang === 'ar' ? 'جارٍ الجدولة...' : 'Queueing...') : (lang === 'ar' ? 'جدولة البث' : 'Queue broadcast')}
                </Button>
              </div>

              {broadcastFeedback && (
                <Alert variant={broadcastFeedback.type}>
                  {broadcastFeedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{broadcastFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                  <AlertDescription>{broadcastFeedback.text}</AlertDescription>
                </Alert>
              )}

              {/* Preview result */}
              {broadcastPreview && (
                <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                  <div className="border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{lang === 'ar' ? 'نتيجة المعاينة' : 'Preview result'}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-2xl font-semibold">{broadcastPreview.recipientCount}</p>
                        <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'عميل مطابق' : 'matching members'}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{broadcastPreview.estimatedMinutes ?? 0}</p>
                        <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'دقيقة تقديرية' : 'estimated minutes to drain'}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">{lang === 'ar' ? 'المرشحات' : 'Applied filters'}</p>
                      <div className="flex flex-wrap gap-2">
                        {(broadcastPreview.filterSummary?.length
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
                      <p className="text-sm font-medium">{lang === 'ar' ? 'المستلمون' : 'Matching recipients'}</p>
                      <p className="text-xs text-muted-foreground">{broadcastPreview.recipientCount} {lang === 'ar' ? 'إجمالي' : 'total'}</p>
                    </div>
                    <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pe-1">
                      {broadcastPreview.recipients && broadcastPreview.recipients.length > 0 ? (
                        broadcastPreview.recipients.map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-3 border border-border px-3 py-2">
                            <div>
                              <p className="font-medium">{r.name}</p>
                              <p className="text-xs text-muted-foreground">{r.phone || '—'}</p>
                            </div>
                            <Badge variant="outline">{lang === 'ar' ? 'مطابق' : 'Included'}</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {lang === 'ar' ? 'لا يوجد أعضاء مطابقون.' : 'No members matched the current filters.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign history */}
          <Card>
            <CardHeader>
              <CardTitle>{lang === 'ar' ? 'سجل الحملات' : 'Campaign history'}</CardTitle>
              <CardDescription>
                {lang === 'ar' ? 'حالة كل حملة، عدد الرسائل المرسلة، والفشل.' : 'Campaign status, sent volume, and failure counts.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={() => void fetchCampaigns()} disabled={campaignsLoading}>
                {campaignsLoading ? labels.loading : (lang === 'ar' ? 'تحديث السجل' : 'Refresh history')}
              </Button>

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
                      {campaigns.map((c) => {
                        const normalized = normalizeBroadcastStatus(c.status);
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{c.title}</p>
                                <p className="max-w-[360px] truncate text-xs text-muted-foreground">{c.message}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusBadgeClass(normalized)}>{normalized}</Badge>
                            </TableCell>
                            <TableCell>{c.recipient_count}</TableCell>
                            <TableCell>{c.sent_count}</TableCell>
                            <TableCell>{c.failed_count}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDateTime(c.created_at, lang)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.completed_at ? formatDateTime(c.completed_at, lang) : '—'}</TableCell>
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
      )}

      {/* Broadcast confirm dialog */}
      <Dialog open={broadcastConfirmOpen} onOpenChange={(open) => { if (!open) setBroadcastConfirmOpen(false); }}>
        <DialogContent className="max-w-sm" role="dialog" aria-modal="true">
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? 'تأكيد البث الجماعي' : 'Confirm Broadcast'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {broadcastPreview
              ? (lang === 'ar'
                ? `سيتم إرسال هذه الرسالة إلى ${broadcastPreview.recipientCount} عميل. لا يمكن التراجع.`
                : `This will queue a message to ${broadcastPreview.recipientCount} member${broadcastPreview.recipientCount === 1 ? '' : 's'}. This cannot be undone.`)
              : (lang === 'ar'
                ? 'سيتم إرسال هذه الرسالة لجميع العملاء المستوفين للمعايير. لا يمكن التراجع.'
                : 'This will queue the message for all matching members. This cannot be undone.')}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBroadcastConfirmOpen(false)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => { setBroadcastConfirmOpen(false); void handleSendBroadcast(); }}>
              {lang === 'ar' ? 'تأكيد الإرسال' : 'Confirm & Queue'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
