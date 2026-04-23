'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { useSaveShortcut } from '@/lib/use-save-shortcut';
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
import { AlertCircle, CheckCircle, Loader2, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEFAULT_BEHAVIOR_TEMPLATES,
  DEFAULT_ONBOARDING_TEMPLATES,
  DEFAULT_POST_EXPIRY_TEMPLATES,
  DEFAULT_REMINDER_DAYS,
  getDefaultRenewalTemplate,
  getDefaultWelcomeTemplate,
  getAutomationWarningLabel,
  getTemplateKey,
  parseBooleanSetting,
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

type TemplateEditorState = {
  welcomeTemplate: string;
  renewalTemplate: string;
  postExpiryDay0: string;
  postExpiryDay3: string;
  postExpiryDay7: string;
  postExpiryDay14: string;
  onboardingFirstVisit: string;
  onboardingNoReturn7: string;
  onboardingLowEngagement14: string;
  habitBreakTemplate: string;
  streakTemplate: string;
  freezeEndingTemplate: string;
  reminderDays: string;
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
        aria-label={lang === 'ar' ? labelAr : labelEn}
        className="w-full accent-primary h-1.5 bg-input appearance-none cursor-pointer"
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
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS);
  const [postExpiryDay, setPostExpiryDay] = useState<'day0' | 'day3' | 'day7' | 'day14'>('day0');
  const [onboardingStep, setOnboardingStep] = useState<'firstVisit' | 'noReturn7' | 'lowEngagement14'>('firstVisit');
  const [controlSavingId, setControlSavingId] = useState<string | null>(null);
  const [controlFeedback, setControlFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [sequences, setSequences] = useState<WhatsAppSequenceItem[]>([]);
  const [sequencesLoading, setSequencesLoading] = useState(true);
  const [stoppingSequenceKey, setStoppingSequenceKey] = useState<string | null>(null);
  const [sequenceFeedback, setSequenceFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  // ── Sheet / grid state ──
  const [activeSheet, setActiveSheet] = useState<
    'welcome' | 'renewal' | 'post_expiry' | 'onboarding' | 'habit_break' | 'streaks' | 'freeze_ending' | 'sequences' | null
  >(null);
  const templateSaveScopeRef = useRef<HTMLDivElement | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [templatesFetchError, setTemplatesFetchError] = useState(false);
  const [savedTemplateState, setSavedTemplateState] = useState<TemplateEditorState>({
    welcomeTemplate: defaultWelcomeTemplate,
    renewalTemplate: defaultRenewalTemplate,
    postExpiryDay0: defaultPostExpiry.day0,
    postExpiryDay3: defaultPostExpiry.day3,
    postExpiryDay7: defaultPostExpiry.day7,
    postExpiryDay14: defaultPostExpiry.day14,
    onboardingFirstVisit: defaultOnboarding.firstVisit,
    onboardingNoReturn7: defaultOnboarding.noReturnDay7,
    onboardingLowEngagement14: defaultOnboarding.lowEngagementDay14,
    habitBreakTemplate: defaultBehavior.habitBreak,
    streakTemplate: defaultBehavior.streaks,
    freezeEndingTemplate: defaultBehavior.freezeEnding,
    reminderDays: DEFAULT_REMINDER_DAYS,
  });

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

  const applyTemplateState = useCallback((next: TemplateEditorState) => {
    setWelcomeTemplate(next.welcomeTemplate);
    setRenewalTemplate(next.renewalTemplate);
    setPostExpiryDay0(next.postExpiryDay0);
    setPostExpiryDay3(next.postExpiryDay3);
    setPostExpiryDay7(next.postExpiryDay7);
    setPostExpiryDay14(next.postExpiryDay14);
    setOnboardingFirstVisit(next.onboardingFirstVisit);
    setOnboardingNoReturn7(next.onboardingNoReturn7);
    setOnboardingLowEngagement14(next.onboardingLowEngagement14);
    setHabitBreakTemplate(next.habitBreakTemplate);
    setStreakTemplate(next.streakTemplate);
    setFreezeEndingTemplate(next.freezeEndingTemplate);
    setReminderDays(next.reminderDays);
  }, []);

  const captureCurrentTemplateState = useCallback((): TemplateEditorState => ({
    welcomeTemplate,
    renewalTemplate,
    postExpiryDay0,
    postExpiryDay3,
    postExpiryDay7,
    postExpiryDay14,
    onboardingFirstVisit,
    onboardingNoReturn7,
    onboardingLowEngagement14,
    habitBreakTemplate,
    streakTemplate,
    freezeEndingTemplate,
    reminderDays,
  }), [
    freezeEndingTemplate,
    habitBreakTemplate,
    onboardingFirstVisit,
    onboardingLowEngagement14,
    onboardingNoReturn7,
    postExpiryDay0,
    postExpiryDay14,
    postExpiryDay3,
    postExpiryDay7,
    reminderDays,
    renewalTemplate,
    streakTemplate,
    welcomeTemplate,
  ]);

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
    setTemplatesFetchError(false);
    try {
      const res = await api.get<Record<string, unknown>>('/api/settings');
      if (res.success && res.data) {
        const d = res.data;
        const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);
        const nextTemplateState = {
          welcomeTemplate: str(d[getTemplateKey('welcome', systemLanguage)] ?? d.whatsapp_template_welcome, defaultWelcomeTemplate),
          renewalTemplate: str(d[getTemplateKey('renewal', systemLanguage)] ?? d.whatsapp_template_renewal, defaultRenewalTemplate),
          postExpiryDay0: str(d[`whatsapp_template_post_expiry_day0_${systemLanguage}`], defaultPostExpiry.day0),
          postExpiryDay3: str(d[`whatsapp_template_post_expiry_day3_${systemLanguage}`], defaultPostExpiry.day3),
          postExpiryDay7: str(d[`whatsapp_template_post_expiry_day7_${systemLanguage}`], defaultPostExpiry.day7),
          postExpiryDay14: str(d[`whatsapp_template_post_expiry_day14_${systemLanguage}`], defaultPostExpiry.day14),
          onboardingFirstVisit: str(d[`whatsapp_template_onboarding_first_visit_${systemLanguage}`], defaultOnboarding.firstVisit),
          onboardingNoReturn7: str(d[`whatsapp_template_onboarding_no_return_day7_${systemLanguage}`], defaultOnboarding.noReturnDay7),
          onboardingLowEngagement14: str(d[`whatsapp_template_onboarding_low_engagement_day14_${systemLanguage}`], defaultOnboarding.lowEngagementDay14),
          habitBreakTemplate: str(d[`whatsapp_template_habit_break_${systemLanguage}`], defaultBehavior.habitBreak),
          streakTemplate: str(d[`whatsapp_template_streak_${systemLanguage}`], defaultBehavior.streaks),
          freezeEndingTemplate: str(d[`whatsapp_template_freeze_ending_${systemLanguage}`], defaultBehavior.freezeEnding),
          reminderDays: str(d.whatsapp_reminder_days, DEFAULT_REMINDER_DAYS),
        } satisfies TemplateEditorState;
        applyTemplateState(nextTemplateState);
        setSavedTemplateState(nextTemplateState);
        setPostExpiryEnabled(parseBooleanSetting(d.whatsapp_post_expiry_enabled, false));
        setOnboardingEnabled(parseBooleanSetting(d.whatsapp_onboarding_enabled, false));
        setHabitBreakEnabled(parseBooleanSetting(d.whatsapp_habit_break_enabled, false));
        setStreaksEnabled(parseBooleanSetting(d.whatsapp_streaks_enabled, false));
        setFreezeEndingEnabled(parseBooleanSetting(d.whatsapp_freeze_ending_enabled, false));
        setAutomationEnabled(parseBooleanSetting(d.whatsapp_automation_enabled, true));
      }
    } catch (err) {
      setTemplatesFetchError(true);
      setTemplateFeedback({ type: 'destructive', text: err instanceof Error ? err.message : 'Failed to load templates' });
    } finally {
      setTemplatesLoading(false);
    }
  }, [
    applyTemplateState,
    defaultBehavior,
    defaultOnboarding,
    defaultPostExpiry,
    defaultRenewalTemplate,
    defaultWelcomeTemplate,
    systemLanguage,
  ]);

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

  const reloadTemplatesTabData = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchTemplates(), fetchSequences()]);
  }, [fetchSequences, fetchStatus, fetchTemplates]);

  const closeTemplateSheet = useCallback(() => {
    applyTemplateState(savedTemplateState);
    setTemplateFeedback(null);
    setActiveSheet(null);
  }, [applyTemplateState, savedTemplateState]);

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
        [`whatsapp_template_habit_break_${systemLanguage}`]:
          habitBreakTemplate.trim() || defaultBehavior.habitBreak,
        [`whatsapp_template_streak_${systemLanguage}`]:
          streakTemplate.trim() || defaultBehavior.streaks,
        [`whatsapp_template_freeze_ending_${systemLanguage}`]:
          freezeEndingTemplate.trim() || defaultBehavior.freezeEnding,
        whatsapp_reminder_days: Array.from(selectedReminderDays).sort((a, b) => b - a).join(','),
        system_language: systemLanguage,
      };
      if (systemLanguage === 'en') {
        values.whatsapp_template_welcome = welcomeTemplate.trim() || defaultWelcomeTemplate;
        values.whatsapp_template_renewal = renewalTemplate.trim() || defaultRenewalTemplate;
      }
      const res = await api.put('/api/settings', { values });
      if (!res.success) throw new Error(res.message ?? 'Failed to save templates');
      setSavedTemplateState(captureCurrentTemplateState());
      setActiveSheet(null);
      setTemplateFeedback({ type: 'success', text: labels.saved_successfully });
    } catch (err) {
      setTemplateFeedback({ type: 'destructive', text: err instanceof Error ? err.message : labels.failed_to_save });
    } finally {
      setTemplatesSaving(false);
    }
  };

  useSaveShortcut({
    scopeRef: templateSaveScopeRef,
    onSave: () => {
      void handleTemplateSave();
    },
    enabled: activeSheet !== null && activeSheet !== 'sequences',
    disabled: templatesSaving,
    enterMode: 'all',
  });

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
    automationId: 'post_expiry' | 'onboarding' | 'habit_break' | 'streaks' | 'freeze_ending',
    enabled: boolean
  ) => {
    const settingKey = {
      post_expiry: 'whatsapp_post_expiry_enabled',
      onboarding: 'whatsapp_onboarding_enabled',
      habit_break: 'whatsapp_habit_break_enabled',
      streaks: 'whatsapp_streaks_enabled',
      freeze_ending: 'whatsapp_freeze_ending_enabled',
    }[automationId];
    setControlSavingId(automationId);
    setControlFeedback(null);
    try {
      const res = await api.put('/api/settings', {
        values: { [settingKey]: enabled },
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to update automation state');
      if (automationId === 'post_expiry') setPostExpiryEnabled(enabled);
      else if (automationId === 'onboarding') setOnboardingEnabled(enabled);
      else if (automationId === 'habit_break') setHabitBreakEnabled(enabled);
      else if (automationId === 'streaks') setStreaksEnabled(enabled);
      else setFreezeEndingEnabled(enabled);
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

  const handleLifecycleToggle = async (enabled: boolean) => {
    setControlSavingId('lifecycle_master');
    setControlFeedback(null);
    try {
      const res = await api.put('/api/settings', {
        values: { whatsapp_automation_enabled: enabled },
      });
      if (!res.success) throw new Error(res.message ?? 'Failed to update automation state');
      setAutomationEnabled(enabled);
      setControlFeedback({
        type: 'success',
        text: lang === 'ar' ? 'تم تحديث حالة أتمتة دورة الحياة.' : 'Lifecycle automation state updated.',
      });
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

  // Gate: if WhatsApp is not connected, show an overlay prompting the user to connect
  const showConnectionGate = status !== null && !status.connected;

  return (
    <div className="flex flex-col gap-6 relative">

      {/* ── Connection gate overlay ── */}
      {showConnectionGate && (
        <div className="absolute inset-0 z-30 flex items-start justify-center pt-32 bg-background/80 backdrop-blur-[2px]">
          <div className="border-2 border-border bg-card shadow-[6px_6px_0_#000000] p-8 max-w-md text-center">
            {/* WhatsApp icon */}
            <div className="mx-auto mb-4 h-14 w-14 border-2 border-border bg-muted flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-heading font-bold text-foreground">
              {lang === 'ar' ? 'واتساب غير متصل' : 'WhatsApp Not Connected'}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {lang === 'ar'
                ? 'يجب ربط واتساب من الإعدادات أولاً لتتمكن من إدارة القوالب والرسائل والبث الجماعي.'
                : 'Connect your WhatsApp from Settings first to manage templates, queue, and broadcast campaigns.'}
            </p>
            <Button
              className="mt-5"
              onClick={() => window.location.href = '/dashboard/settings?tab=whatsapp'}
            >
              {lang === 'ar' ? 'اذهب إلى الإعدادات' : 'Go to Settings'}
            </Button>
          </div>
        </div>
      )}

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
      <div role="tablist" aria-label={lang === 'ar' ? 'أقسام واتساب' : 'WhatsApp sections'} className="flex gap-0 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {lang === 'ar' ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* ── Templates Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="flex flex-col gap-6">

          {/* ── Loading: real master card with disabled switch + skeleton subtext + 6 skeleton cards ── */}
          {templatesLoading && (
            <div className="flex flex-col gap-6">
              {/* Real master card — heading visible, switch disabled, subtext skeletonized */}
              <Card>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {lang === 'ar' ? 'أتمتة دورة الحياة' : 'Lifecycle Automations'}
                    </p>
                    <Skeleton className="h-3 w-48 mt-1" />
                  </div>
                  <Switch disabled aria-label={lang === 'ar' ? 'حالة أتمتة دورة الحياة' : 'Lifecycle automations status'} />
                </CardContent>
              </Card>
              {/* 6-card grid skeleton */}
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground" aria-live="polite">
                {lang === 'ar' ? 'جارٍ تحميل الأتمتة…' : 'Loading automations…'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border border-border p-4 flex flex-col gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error state ── */}
          {!templatesLoading && templatesFetchError && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {lang === 'ar' ? 'أتمتة دورة الحياة' : 'Lifecycle Automations'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lang === 'ar'
                        ? 'تعذّر تحميل إعدادات الأتمتة لهذه الصفحة.'
                        : 'Could not load automation settings for this page.'}
                    </p>
                  </div>
                  <Switch
                    checked={automationEnabled}
                    disabled
                    aria-label={lang === 'ar' ? 'حالة أتمتة دورة الحياة' : 'Lifecycle automations status'}
                  />
                </div>
                <div className="flex items-center gap-3 border border-border px-3 py-3">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-sm text-muted-foreground flex-1">
                    {lang === 'ar' ? 'تعذّر تحميل الأتمتة.' : 'Could not load automations.'}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => void reloadTemplatesTabData()}>
                    {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Loaded state ── */}
          {!templatesLoading && !templatesFetchError && (
            <>
              {/* Frequency warning alert */}
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

              {/* ── Master Toggle Card ── */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {lang === 'ar' ? 'أتمتة دورة الحياة' : 'Lifecycle Automations'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lang === 'ar'
                          ? 'إرسال رسائل تلقائية عند المحطات المهمة للأعضاء'
                          : 'Automatically send messages when members hit key moments'}
                      </p>
                    </div>
                    <Switch
                      checked={automationEnabled}
                      disabled={controlSavingId === 'lifecycle_master'}
                      onCheckedChange={(checked) => void handleLifecycleToggle(checked)}
                      aria-label={lang === 'ar' ? 'حالة أتمتة دورة الحياة' : 'Lifecycle automations status'}
                    />
                  </div>

                  {!status?.lifecycleRuntimeGateEnabled && (
                    <p className="text-xs text-muted-foreground border border-border px-3 py-2">
                      {lang === 'ar'
                        ? 'يمكنك ضبط القوالب وتفعيل الأتمتة أو إيقافها، لكن لن تُرسل رسائل دورة الحياة حتى يُفعّل فريق GymFlow هذه الميزة.'
                        : 'You can configure templates and turn automations on or off, but no lifecycle messages will be sent until GymFlow enables this feature.'}
                    </p>
                  )}

                  <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        aria-controls="advanced-settings-content"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                        />
                        {lang === 'ar' ? 'إعدادات متقدمة' : 'Advanced settings'}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent id="advanced-settings-content" className="mt-3">
                      <button
                        type="button"
                        onClick={() => setAuditOpen((v) => !v)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${auditOpen ? 'rotate-180' : ''}`} />
                        {lang === 'ar' ? 'تفاصيل تقنية' : 'Advanced technical details'}
                      </button>
                      {auditOpen && compatibilityAudit && (
                        <div className="border border-border px-4 py-3 mb-3">
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

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-2 border border-border px-3 py-2">
                          <p className="text-xs font-medium">
                            {lang === 'ar' ? 'بوابة التشغيل العامة' : 'Runtime release gate'}
                          </p>
                          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                            {status?.lifecycleRuntimeGateEnabled
                              ? (lang === 'ar' ? 'مفعّلة من GymFlow' : 'Enabled by GymFlow')
                              : (lang === 'ar' ? 'مقفلة من GymFlow' : 'Blocked by GymFlow')}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 border border-border px-3 py-2">
                          <p className="text-xs font-medium">
                            {lang === 'ar' ? 'الملخص الأسبوعي' : 'Weekly digest'}
                          </p>
                          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                            {status?.weeklyDigestReleaseEnabled
                              ? (lang === 'ar' ? 'مباشر كنظام' : 'Live as system release')
                              : (lang === 'ar' ? 'محجوب كنظام' : 'Blocked system release')}
                          </Badge>
                        </div>
                      </div>

                      {controlFeedback && (
                        <Alert variant={controlFeedback.type} className="mt-3">
                          {controlFeedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          <AlertTitle>{controlFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                          <AlertDescription>{controlFeedback.text}</AlertDescription>
                        </Alert>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              {/* ── Automation Grid label ── */}
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground -mb-2">
                {lang === 'ar' ? 'الأتمتة' : 'Automations'}
              </p>

              {/* ── Automation Grid ── */}
              <div
                role="list"
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity ${
                  !automationEnabled ? 'opacity-60' : ''
                }`}
              >
                {/* ── Welcome card ── */}
                <div
                  role="listitem"
                  aria-label={lang === 'ar' ? 'أتمتة الترحيب' : 'Welcome automation'}
                  className="border border-border border-s-[3px] border-s-success p-4 flex flex-col gap-3 bg-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {lang === 'ar' ? 'رسالة الترحيب' : 'Welcome'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lang === 'ar' ? 'ترسل عند بدء العضوية' : 'Sent when a membership starts'}
                      </p>
                    </div>
                    <Switch checked disabled aria-label={lang === 'ar' ? 'مفعّل دائماً' : 'Always on'} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {welcomeTemplate.trim().length > 0 ? (
                      <span className="text-xs text-success">
                        ● {lang === 'ar' ? 'مفعّل · 1 رسالة' : 'Enabled · 1 message'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        ○ {lang === 'ar' ? 'الرسالة فارغة' : 'Message not set'}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => { setTemplateFeedback(null); setActiveSheet('welcome'); }}
                    >
                      {lang === 'ar' ? '← تعديل' : 'Edit →'}
                    </Button>
                  </div>
                </div>

                {/* ── Renewal card ── */}
                <div
                  role="listitem"
                  aria-label={lang === 'ar' ? 'أتمتة التجديد' : 'Renewal automation'}
                  className="border border-border border-s-[3px] border-s-success p-4 flex flex-col gap-3 bg-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {lang === 'ar' ? 'تذكير التجديد' : 'Renewal Reminder'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lang === 'ar' ? 'أيام التذكير المخصصة' : 'Custom reminder days'}
                      </p>
                    </div>
                    <Switch checked disabled aria-label={lang === 'ar' ? 'مفعّل دائماً' : 'Always on'} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {renewalTemplate.trim().length > 0 && selectedReminderDays.size > 0 ? (
                      <span className="text-xs text-success">
                        ● {lang === 'ar'
                          ? `مفعّل · ${selectedReminderDays.size} يوم تذكير`
                          : `Enabled · ${selectedReminderDays.size} reminder day(s)`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        ○ {lang === 'ar' ? 'معطّل' : 'Disabled'}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => { setTemplateFeedback(null); setActiveSheet('renewal'); }}
                    >
                      {lang === 'ar' ? '← تعديل' : 'Edit →'}
                    </Button>
                  </div>
                </div>

                {/* ── Post-expiry card ── */}
                {(() => {
                  const dayCount = [postExpiryDay0, postExpiryDay3, postExpiryDay7, postExpiryDay14].filter(
                    (t) => t.trim().length > 0
                  ).length;
                  const totalDays = 4;
                  const isEnabled = postExpiryEnabled;
                  const isPartial = isEnabled && dayCount > 0 && dayCount < totalDays;
                  const isFullEnabled = isEnabled && dayCount === totalDays;
                  const borderColor = isFullEnabled
                    ? 'border-s-success'
                    : isPartial
                    ? 'border-s-warning'
                    : 'border-s-border';
                  return (
                    <div
                      role="listitem"
                      aria-label={lang === 'ar' ? 'أتمتة ما بعد الانتهاء' : 'Post-expiry automation'}
                      className={`border border-border border-s-[3px] ${borderColor} p-4 flex flex-col gap-3 bg-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {lang === 'ar' ? 'استرجاع ما بعد الانتهاء' : 'Post-Expiry Recovery'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lang === 'ar' ? 'إعادة استهداف الأعضاء المنتهية عضويتهم' : 'Re-engage lapsed members'}
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          disabled={controlSavingId === 'post_expiry' || !automationEnabled}
                          onCheckedChange={(checked) => void handleAutomationToggle('post_expiry', checked)}
                          aria-label={isEnabled ? (lang === 'ar' ? 'مفعّل' : 'Enabled') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {!isEnabled ? (
                          <span className="text-xs text-muted-foreground">○ {lang === 'ar' ? 'معطّل' : 'Disabled'}</span>
                        ) : isPartial ? (
                          <span className="text-xs text-warning">
                            ⚠ {lang === 'ar' ? `جزئي · ${dayCount} من ${totalDays} أيام` : `Partial · ${dayCount} of ${totalDays} days set`}
                          </span>
                        ) : (
                          <span className="text-xs text-success">
                            ● {lang === 'ar' ? `مفعّل · ${dayCount} رسائل` : `Enabled · ${dayCount} messages`}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => { setTemplateFeedback(null); setActiveSheet('post_expiry'); }}
                        >
                          {lang === 'ar' ? '← تعديل' : 'Edit →'}
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Onboarding card ── */}
                {(() => {
                  const messages = [onboardingFirstVisit, onboardingNoReturn7, onboardingLowEngagement14];
                  const dayCount = messages.filter((t) => t.trim().length > 0).length;
                  const totalDays = 3;
                  const isEnabled = onboardingEnabled;
                  const isPartial = isEnabled && dayCount > 0 && dayCount < totalDays;
                  const isFullEnabled = isEnabled && dayCount === totalDays;
                  const borderColor = isFullEnabled
                    ? 'border-s-success'
                    : isPartial
                    ? 'border-s-warning'
                    : 'border-s-border';
                  return (
                    <div
                      role="listitem"
                      aria-label={lang === 'ar' ? 'أتمتة التهيئة' : 'Onboarding automation'}
                      className={`border border-border border-s-[3px] ${borderColor} p-4 flex flex-col gap-3 bg-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {lang === 'ar' ? 'تهيئة العضو الجديد' : 'Onboarding'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lang === 'ar' ? 'إرشادات الأسبوع الأول للأعضاء الجدد' : 'First week guidance for new members'}
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          disabled={controlSavingId === 'onboarding' || !automationEnabled}
                          onCheckedChange={(checked) => void handleAutomationToggle('onboarding', checked)}
                          aria-label={isEnabled ? (lang === 'ar' ? 'مفعّل' : 'Enabled') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {!isEnabled ? (
                          <span className="text-xs text-muted-foreground">○ {lang === 'ar' ? 'معطّل' : 'Disabled'}</span>
                        ) : isPartial ? (
                          <span className="text-xs text-warning">
                            ⚠ {lang === 'ar' ? `جزئي · ${dayCount} من ${totalDays} أيام` : `Partial · ${dayCount} of ${totalDays} days set`}
                          </span>
                        ) : (
                          <span className="text-xs text-success">
                            ● {lang === 'ar' ? `مفعّل · ${dayCount} رسائل` : `Enabled · ${dayCount} messages`}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => { setTemplateFeedback(null); setActiveSheet('onboarding'); }}
                        >
                          {lang === 'ar' ? '← تعديل' : 'Edit →'}
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Habit-break card ── */}
                {(() => {
                  const hasTemplate = habitBreakTemplate.trim().length > 0;
                  const borderColor = habitBreakEnabled && hasTemplate ? 'border-s-success' : 'border-s-border';
                  return (
                    <div
                      role="listitem"
                      aria-label={lang === 'ar' ? 'أتمتة انقطاع العادة' : 'Habit-break automation'}
                      className={`border border-border border-s-[3px] ${borderColor} p-4 flex flex-col gap-3 bg-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {lang === 'ar' ? 'تنبيه انقطاع العادة' : 'Habit Break'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lang === 'ar' ? 'تنبيه عند انقطاع الحضور بعد بداية جيدة' : 'Nudge members when attendance drops after a strong start'}
                          </p>
                        </div>
                        <Switch
                          checked={habitBreakEnabled}
                          disabled={controlSavingId === 'habit_break' || !automationEnabled}
                          onCheckedChange={(checked) => void handleAutomationToggle('habit_break', checked)}
                          aria-label={habitBreakEnabled ? (lang === 'ar' ? 'مفعّل' : 'Enabled') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {habitBreakEnabled && hasTemplate ? (
                          <span className="text-xs text-success">● {lang === 'ar' ? 'مفعّل · 1 رسالة' : 'Enabled · 1 message'}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">○ {lang === 'ar' ? 'معطّل' : 'Disabled'}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => { setTemplateFeedback(null); setActiveSheet('habit_break'); }}
                        >
                          {lang === 'ar' ? '← تعديل' : 'Edit →'}
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Streaks card ── */}
                {(() => {
                  const hasTemplate = streakTemplate.trim().length > 0;
                  const borderColor = streaksEnabled && hasTemplate ? 'border-s-success' : 'border-s-border';
                  return (
                    <div
                      role="listitem"
                      aria-label={lang === 'ar' ? 'أتمتة الاستمرارية' : 'Streak automation'}
                      className={`border border-border border-s-[3px] ${borderColor} p-4 flex flex-col gap-3 bg-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {lang === 'ar' ? 'تشجيع الاستمرارية' : 'Streak Encouragement'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lang === 'ar' ? 'رسالة تشجيع عند الوصول إلى سلسلة حضور' : 'Celebrate milestone attendance streaks'}
                          </p>
                        </div>
                        <Switch
                          checked={streaksEnabled}
                          disabled={controlSavingId === 'streaks' || !automationEnabled}
                          onCheckedChange={(checked) => void handleAutomationToggle('streaks', checked)}
                          aria-label={streaksEnabled ? (lang === 'ar' ? 'مفعّل' : 'Enabled') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {streaksEnabled && hasTemplate ? (
                          <span className="text-xs text-success">● {lang === 'ar' ? 'مفعّل · 1 رسالة' : 'Enabled · 1 message'}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">○ {lang === 'ar' ? 'معطّل' : 'Disabled'}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => { setTemplateFeedback(null); setActiveSheet('streaks'); }}
                        >
                          {lang === 'ar' ? '← تعديل' : 'Edit →'}
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Freeze-ending card ── */}
                {(() => {
                  const hasTemplate = freezeEndingTemplate.trim().length > 0;
                  const borderColor = freezeEndingEnabled && hasTemplate ? 'border-s-success' : 'border-s-border';
                  return (
                    <div
                      role="listitem"
                      aria-label={lang === 'ar' ? 'أتمتة انتهاء التجميد' : 'Freeze-ending automation'}
                      className={`border border-border border-s-[3px] ${borderColor} p-4 flex flex-col gap-3 bg-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {lang === 'ar' ? 'تذكير انتهاء التجميد' : 'Freeze Ending'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lang === 'ar' ? 'ذكّر العضو قبل عودته من التجميد' : 'Remind members shortly before freeze ends'}
                          </p>
                        </div>
                        <Switch
                          checked={freezeEndingEnabled}
                          disabled={controlSavingId === 'freeze_ending' || !automationEnabled}
                          onCheckedChange={(checked) => void handleAutomationToggle('freeze_ending', checked)}
                          aria-label={freezeEndingEnabled ? (lang === 'ar' ? 'مفعّل' : 'Enabled') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {freezeEndingEnabled && hasTemplate ? (
                          <span className="text-xs text-success">● {lang === 'ar' ? 'مفعّل · 1 رسالة' : 'Enabled · 1 message'}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">○ {lang === 'ar' ? 'معطّل' : 'Disabled'}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => { setTemplateFeedback(null); setActiveSheet('freeze_ending'); }}
                        >
                          {lang === 'ar' ? '← تعديل' : 'Edit →'}
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Active Sequences card (view-only) ── */}
                {(() => {
                  const activeCount = sequences.filter((s) => isActiveSequenceStatus(s.status)).length;
                  return (
                    <div
                      role="listitem"
                      aria-label={lang === 'ar' ? 'التسلسلات النشطة' : 'Active sequences'}
                      className={`border border-border border-s-[3px] ${activeCount > 0 ? 'border-s-success' : 'border-s-border'} p-4 flex flex-col gap-3 bg-card`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {lang === 'ar' ? 'التسلسلات النشطة' : 'Active Sequences'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lang === 'ar' ? 'الأعضاء في تسلسل حالياً' : 'Members currently in a sequence'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {activeCount > 0 ? (
                          <span className="text-xs text-success">
                            ● {lang === 'ar' ? `${activeCount} تسلسل نشط` : `${activeCount} active sequence(s)`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            ○ {lang === 'ar' ? 'لا توجد تسلسلات نشطة' : 'No active sequences'}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => { setTemplateFeedback(null); setActiveSheet('sequences'); }}
                        >
                          {lang === 'ar' ? '← عرض' : 'View →'}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Template feedback */}
              {templateFeedback && (
                <p className={`text-sm ${templateFeedback.type === 'success' ? 'text-success' : 'text-destructive'}`}>
                  {templateFeedback.text}
                </p>
              )}

              {/* ── Template Editor Sheet ── */}
              <Sheet
                open={activeSheet !== null && activeSheet !== 'sequences'}
                onOpenChange={(open) => { if (!open) closeTemplateSheet(); }}
              >
                <SheetContent
                  ref={templateSaveScopeRef}
                  side={lang === 'ar' ? 'left' : 'right'}
                  className="w-full sm:w-[600px] sm:max-w-[600px] flex flex-col p-0"
                >
                  <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                    <SheetTitle>
                      {activeSheet === 'welcome' && (lang === 'ar' ? 'تعديل: رسالة الترحيب' : 'Edit: Welcome')}
                      {activeSheet === 'renewal' && (lang === 'ar' ? 'تعديل: تذكير التجديد' : 'Edit: Renewal Reminder')}
                      {activeSheet === 'post_expiry' && (lang === 'ar' ? 'تعديل: استرجاع ما بعد الانتهاء' : 'Edit: Post-Expiry Recovery')}
                      {activeSheet === 'onboarding' && (lang === 'ar' ? 'تعديل: تهيئة العضو' : 'Edit: Onboarding')}
                      {activeSheet === 'habit_break' && (lang === 'ar' ? 'تعديل: تنبيه انقطاع العادة' : 'Edit: Habit Break')}
                      {activeSheet === 'streaks' && (lang === 'ar' ? 'تعديل: تشجيع الاستمرارية' : 'Edit: Streak Encouragement')}
                      {activeSheet === 'freeze_ending' && (lang === 'ar' ? 'تعديل: تذكير انتهاء التجميد' : 'Edit: Freeze Ending')}
                    </SheetTitle>
                    <SheetDescription>
                      {activeSheet === 'welcome' && (lang === 'ar' ? 'ترسل عند تسجيل عضو جديد. المتغيرات: {name}' : 'Sent when a new member is added. Variables: {name}')}
                      {activeSheet === 'renewal' && (lang === 'ar' ? 'المتغيرات: {name}، {expiryDate}، {daysLeft}' : 'Variables: {name}, {expiryDate}, {daysLeft}')}
                      {activeSheet === 'post_expiry' && (lang === 'ar' ? 'المتغيرات: {name}، {expiryDate}' : 'Variables: {name}, {expiryDate}')}
                      {activeSheet === 'onboarding' && (lang === 'ar' ? 'المتغيرات: {name}' : 'Variables: {name}')}
                      {activeSheet === 'habit_break' && (lang === 'ar' ? 'المتغيرات: {name}، {daysAbsent}' : 'Variables: {name}, {daysAbsent}')}
                      {activeSheet === 'streaks' && (lang === 'ar' ? 'المتغيرات: {name}، {streakDays}' : 'Variables: {name}, {streakDays}')}
                      {activeSheet === 'freeze_ending' && (lang === 'ar' ? 'المتغيرات: {name}، {resumeDate}' : 'Variables: {name}, {resumeDate}')}
                    </SheetDescription>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Welcome editor */}
                    {activeSheet === 'welcome' && (
                      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                        <Textarea
                          value={welcomeTemplate}
                          onChange={(e) => setWelcomeTemplate(e.target.value)}
                          rows={6}
                          className="resize-none"
                          placeholder={lang === 'ar' ? 'المتغيرات: {name}' : 'Placeholders: {name}'}
                        />
                        <WaPreview text={previewText(welcomeTemplate, 'welcome')} sampleName={sampleName} />
                      </div>
                    )}

                    {/* Renewal editor */}
                    {activeSheet === 'renewal' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm">
                            {lang === 'ar' ? 'أيام التذكير قبل الانتهاء' : 'Reminder days before expiry'}
                          </Label>
                          <div className="flex gap-4 flex-wrap">
                            {REMINDER_OPTIONS.map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleReminderDay(day)}
                                className="flex items-center gap-2 text-xs cursor-pointer"
                              >
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
                                  selectedReminderDays.has(day)
                                    ? 'bg-primary border-primary'
                                    : 'bg-transparent border-border'
                                }`}>
                                  {selectedReminderDays.has(day) && (
                                    <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </span>
                                <span className={selectedReminderDays.has(day) ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                  {lang === 'ar' ? `يوم ${day}` : `Day ${day}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                          <Textarea
                            value={renewalTemplate}
                            onChange={(e) => setRenewalTemplate(e.target.value)}
                            rows={6}
                            className="resize-none"
                            placeholder={lang === 'ar' ? 'المتغيرات: {name}، {expiryDate}، {daysLeft}' : 'Placeholders: {name}, {expiryDate}, {daysLeft}'}
                          />
                          <WaPreview text={previewText(renewalTemplate, 'renewal')} sampleName={sampleName} />
                        </div>
                      </div>
                    )}

                    {/* Post-expiry editor */}
                    {activeSheet === 'post_expiry' && (
                      <div className="space-y-4">
                        <div className="flex border-b border-border">
                          {([
                            { id: 'day0', labelEn: 'Day 0', labelAr: 'يوم 0' },
                            { id: 'day3', labelEn: 'Day 3', labelAr: 'يوم 3' },
                            { id: 'day7', labelEn: 'Day 7', labelAr: 'يوم 7' },
                            { id: 'day14', labelEn: 'Day 14', labelAr: 'يوم 14' },
                          ] as const).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setPostExpiryDay(s.id)}
                              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                                postExpiryDay === s.id
                                  ? 'border-primary text-foreground'
                                  : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {lang === 'ar' ? s.labelAr : s.labelEn}
                            </button>
                          ))}
                        </div>
                        {(() => {
                          const map = {
                            day0: { value: postExpiryDay0, setValue: setPostExpiryDay0 },
                            day3: { value: postExpiryDay3, setValue: setPostExpiryDay3 },
                            day7: { value: postExpiryDay7, setValue: setPostExpiryDay7 },
                            day14: { value: postExpiryDay14, setValue: setPostExpiryDay14 },
                          };
                          const active = map[postExpiryDay];
                          return (
                            <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                              <Textarea
                                value={active.value}
                                onChange={(e) => active.setValue(e.target.value)}
                                rows={6}
                                className="resize-none"
                                placeholder={lang === 'ar' ? 'المتغيرات: {name}، {expiryDate}' : 'Placeholders: {name}, {expiryDate}'}
                              />
                              <WaPreview text={previewText(active.value, 'post_expiry')} sampleName={sampleName} />
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Onboarding editor */}
                    {activeSheet === 'onboarding' && (
                      <div className="space-y-4">
                        <div className="flex border-b border-border">
                          {([
                            { id: 'firstVisit', labelEn: 'First visit', labelAr: 'أول زيارة' },
                            { id: 'noReturn7', labelEn: 'No return day 7', labelAr: 'غياب يوم 7' },
                            { id: 'lowEngagement14', labelEn: 'Low engagement day 14', labelAr: 'مشاركة منخفضة يوم 14' },
                          ] as const).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setOnboardingStep(s.id)}
                              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                                onboardingStep === s.id
                                  ? 'border-primary text-foreground'
                                  : 'border-transparent text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {lang === 'ar' ? s.labelAr : s.labelEn}
                            </button>
                          ))}
                        </div>
                        {(() => {
                          const map = {
                            firstVisit: { value: onboardingFirstVisit, setValue: setOnboardingFirstVisit },
                            noReturn7: { value: onboardingNoReturn7, setValue: setOnboardingNoReturn7 },
                            lowEngagement14: { value: onboardingLowEngagement14, setValue: setOnboardingLowEngagement14 },
                          };
                          const active = map[onboardingStep];
                          return (
                            <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                              <Textarea
                                value={active.value}
                                onChange={(e) => active.setValue(e.target.value)}
                                rows={6}
                                className="resize-none"
                                placeholder={lang === 'ar' ? 'المتغيرات: {name}' : 'Placeholders: {name}'}
                              />
                              <WaPreview text={previewText(active.value, 'onboarding')} sampleName={sampleName} />
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Behavior editors */}
                    {activeSheet === 'habit_break' && (
                      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                        <Textarea
                          value={habitBreakTemplate}
                          onChange={(e) => setHabitBreakTemplate(e.target.value)}
                          rows={6}
                          className="resize-none"
                          placeholder={lang === 'ar' ? 'المتغيرات: {name}، {daysAbsent}' : 'Placeholders: {name}, {daysAbsent}'}
                        />
                        <WaPreview text={previewText(habitBreakTemplate, 'habit_break')} sampleName={sampleName} />
                      </div>
                    )}

                    {activeSheet === 'streaks' && (
                      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                        <Textarea
                          value={streakTemplate}
                          onChange={(e) => setStreakTemplate(e.target.value)}
                          rows={6}
                          className="resize-none"
                          placeholder={lang === 'ar' ? 'المتغيرات: {name}، {streakDays}' : 'Placeholders: {name}, {streakDays}'}
                        />
                        <WaPreview text={previewText(streakTemplate, 'streaks')} sampleName={sampleName} />
                      </div>
                    )}

                    {activeSheet === 'freeze_ending' && (
                      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
                        <Textarea
                          value={freezeEndingTemplate}
                          onChange={(e) => setFreezeEndingTemplate(e.target.value)}
                          rows={6}
                          className="resize-none"
                          placeholder={lang === 'ar' ? 'المتغيرات: {name}، {resumeDate}' : 'Placeholders: {name}, {resumeDate}'}
                        />
                        <WaPreview text={previewText(freezeEndingTemplate, 'freeze_ending')} sampleName={sampleName} />
                      </div>
                    )}
                  </div>

                  <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex gap-2 sm:justify-end">
                    <Button
                      variant="ghost"
                      onClick={closeTemplateSheet}
                      disabled={templatesSaving}
                    >
                      {lang === 'ar' ? 'تجاهل' : 'Discard'}
                    </Button>
                    <Button
                      onClick={() => void handleTemplateSave()}
                      disabled={templatesSaving}
                    >
                      {templatesSaving ? (
                        <><Loader2 className="h-4 w-4 animate-spin me-2" />{lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</>
                      ) : (
                        lang === 'ar' ? 'حفظ' : 'Save'
                      )}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              {/* ── Sequences View Sheet ── */}
              <Sheet
                open={activeSheet === 'sequences'}
                onOpenChange={(open) => { if (!open) setActiveSheet(null); }}
              >
                <SheetContent
                  side={lang === 'ar' ? 'left' : 'right'}
                  className="w-full sm:w-[700px] sm:max-w-[700px] flex flex-col p-0"
                >
                  <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                    <SheetTitle>{lang === 'ar' ? 'التسلسلات النشطة' : 'Active Sequences'}</SheetTitle>
                    <SheetDescription>
                      {lang === 'ar'
                        ? 'يمكنك رؤية الحالات الفعلية وإيقاف تسلسل بعينه لكل عضو.'
                        : 'Review the current lifecycle sequences and stop an individual sequence when needed.'}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {sequenceFeedback && (
                      <Alert variant={sequenceFeedback.type}>
                        {sequenceFeedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <AlertTitle>{sequenceFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                        <AlertDescription>{sequenceFeedback.text}</AlertDescription>
                      </Alert>
                    )}
                    {sequences.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {lang === 'ar'
                          ? 'لا توجد تسلسلات نشطة. ستظهر هنا عند دخول الأعضاء في مسار دورة الحياة.'
                          : 'No active sequences. When members enter a lifecycle, their progress will appear here.'}
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
                                  <span dir="ltr">{item.memberPhone || '—'}</span> · {formatDateTime(item.latestEventAt, lang)}
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
                  </div>
                  <SheetFooter className="px-6 py-4 border-t border-border shrink-0 sm:justify-end">
                    <Button variant="ghost" onClick={() => setActiveSheet(null)}>
                      {lang === 'ar' ? 'إغلاق' : 'Close'}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      )}

      {/* ── Queue Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="flex flex-col gap-6">
          {/* Queue count cards */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: lang === 'ar' ? 'قيد الانتظار' : 'Pending', value: queueCounts.pending, status: 'pending' },
              { label: lang === 'ar' ? 'قيد المعالجة' : 'Processing', value: queueCounts.processing, status: 'processing' },
              { label: lang === 'ar' ? 'تم الإرسال' : 'Sent', value: queueCounts.sent, status: 'sent' },
              { label: lang === 'ar' ? 'فشلت' : 'Failed', value: queueCounts.failed, status: 'failed' },
            ].map((metric) => (
              <Card key={metric.label} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <Badge variant="outline" className={statusBadgeClass(metric.status)}>
                    {metric.value}
                  </Badge>
                </div>
              </Card>
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
              <Card key={m.labelEn} className="px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{lang === 'ar' ? m.labelAr : m.labelEn}</p>
                <p className={`mt-2 text-sm font-medium ${m.isError ? 'text-destructive' : ''}`}>{m.value}</p>
              </Card>
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
                {lang === 'ar' ? 'الطابور فارغ — تم تسليم جميع الرسائل المجدولة.' : 'Queue is clear — all scheduled messages have been delivered.'}
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
                            <p className="text-xs text-muted-foreground" dir="ltr">{item.member_phone || '—'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(item.status)}>{item.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(item.sent_at || item.scheduled_at, lang)}
                        </TableCell>
                        <TableCell className="tabular-nums">{item.attempts}</TableCell>
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
        <div role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="flex flex-col gap-6">
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
                    <Label htmlFor="bc-title">{lang === 'ar' ? 'عنوان داخلي (لا يراه الأعضاء)' : 'Internal title (not visible to members)'}</Label>
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
                <Button
                  variant="ghost"
                  onClick={() => setBroadcastFilters(DEFAULT_BROADCAST_FILTERS)}
                  disabled={broadcastSubmitting}
                >
                  {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                </Button>
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
                              <p className="text-xs text-muted-foreground" dir="ltr">{r.phone || '—'}</p>
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
                            <TableCell className="tabular-nums">{c.recipient_count}</TableCell>
                            <TableCell className="tabular-nums">{c.sent_count}</TableCell>
                            <TableCell className="tabular-nums">{c.failed_count}</TableCell>
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
