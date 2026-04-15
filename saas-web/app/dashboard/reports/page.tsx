'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api-client';
import HourlyHeatmap from '@/components/dashboard/reports/HourlyHeatmap';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatDateTime, daysUntil, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import DataTable from '@/components/dashboard/DataTable';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';
import { toFiniteNumber } from '@/lib/coerce';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PAYMENT_METHOD_UI_ENABLED } from '@/lib/payment-method-ui';
import { getAutomationWarningLabel } from '@/lib/whatsapp-automation';

// ── Pinnable stats: for each tab key, how to fetch + display a single headline number ──
const PINNED_STAT_FETCH: Record<string, { url: string; extract: (d: any) => string }> = {
  'revenue-at-risk':        { url: '/api/reports/revenue-at-risk?days=30',            extract: d => formatCurrencyCompact(d?.summary?.revenueAtRisk ?? d?.summary?.totalValue ?? 0) },
  'ghost-members':          { url: '/api/reports/ghost-members?days=30',              extract: d => String(d?.summary?.ghostMembers ?? 0) },
  'whatsapp-saved':         { url: '/api/reports/revenue-saved-whatsapp?days=30',     extract: d => formatCurrencyCompact(d?.summary?.revenueSaved ?? 0) },
  'retention-churn':        { url: '/api/reports/retention-churn?days=30',            extract: d => `${(d?.summary?.retentionRate ?? 0).toFixed(1)}%` },
  'at-risk-members':        { url: '/api/reports/at-risk-members?days=30',            extract: d => String(d?.summary?.memberCount ?? 0) },
  'net-membership-change':  { url: '/api/reports/net-membership-change?days=30',      extract: d => { const n = d?.summary?.thisWeek?.net ?? 0; return n >= 0 ? `+${n}` : String(n); } },
  'visit-frequency-risk':   { url: '/api/reports/visit-frequency-risk?days=30',       extract: d => String(d?.summary?.atRiskCount ?? 0) },
  'expected-revenue':       { url: '/api/reports/expected-revenue?days=30',           extract: d => formatCurrencyCompact(d?.summary?.projectedRevenueNext30Days ?? 0) },
  'renewal-vs-new':         { url: '/api/reports/renewal-vs-new?days=30',             extract: d => formatCurrencyCompact((d?.summary?.renewalRevenue ?? 0) + (d?.summary?.newRevenue ?? 0)) },
  'attendance-decline':     { url: '/api/reports/attendance-decline?days=14',         extract: d => String(d?.summary?.memberCount ?? 0) },
  'expiring-subs':          { url: '/api/reports/expiring-subscriptions?days=7',      extract: d => String(Array.isArray(d) ? d.length : 0) },
  'top-members':            { url: '/api/reports/top-members?days=30&limit=1',        extract: d => Array.isArray(d) && d[0] ? `${d[0].visits} visits` : '—' },
  'whatsapp-performance':   { url: '/api/reports/whatsapp-performance?days=30',       extract: d => formatCurrencyCompact((d?.rows ?? []).reduce((s: number, r: any) => s + Number(r.revenueSaved ?? 0), 0)) },
  'post-expiry-performance':{ url: '/api/reports/post-expiry-performance?days=30',    extract: d => String(d?.summary?.renewalsWon ?? 0) },
  'onboarding-performance': { url: '/api/reports/onboarding-performance?days=30',     extract: d => String(d?.summary?.firstVisitMembers ?? 0) },
  'weekly-digest':          { url: '/api/reports/weekly-digest',                      extract: d => `${(d?.summary?.retentionRate ?? 0).toFixed(1)}%` },
  'denial-reasons':         { url: '/api/reports/denial-reasons?days=30',             extract: d => String(Array.isArray(d) ? d.reduce((s: number, r: any) => s + Number(r.count ?? 0), 0) : 0) },
  'denied-entries':         { url: '/api/reports/denied-entries?days=30',             extract: d => String(Array.isArray(d) ? d.length : 0) },
  'referral-funnel':        { url: '/api/reports/referral-funnel?days=30',            extract: d => String(d?.summary?.convertedMembers ?? 0) },
  'daily-stats':            { url: '/api/reports/daily-stats?days=7',                 extract: d => String(Array.isArray(d) ? d.reduce((s: number, r: any) => s + Number(r.allowed ?? 0), 0) : 0) },
  'cohort-retention':       { url: '/api/reports/cohort-retention',                   extract: d => Array.isArray(d) && d.length ? `${(d[0]?.retentionRate ?? 0).toFixed(0)}%` : '—' },
  'plan-revenue':           { url: '/api/reports/revenue-by-plan?days=30',            extract: d => formatCurrencyCompact(Array.isArray(d) ? d.reduce((s: number, r: any) => s + Number(r.totalRevenue ?? 0), 0) : 0) },
};

const PINNED_STAT_COLOR: Record<string, string> = {
  'revenue-at-risk': 'text-destructive', 'ghost-members': 'text-warning',
  'at-risk-members': 'text-warning', 'attendance-decline': 'text-warning', 'denied-entries': 'text-warning',
  'whatsapp-saved': 'text-success', 'retention-churn': 'text-success', 'net-membership-change': 'text-success',
  'expected-revenue': 'text-success', 'plan-revenue': 'text-success', 'post-expiry-performance': 'text-success',
};

function PinnedCard({ tabKey, lang, onNavigate, onUnpin }: { tabKey: TabKey; lang: string; onNavigate: (k: TabKey) => void; onUnpin: (k: TabKey) => void }) {
  const [stat, setStat] = useState<string | null>(null);
  const [statLoading, setStatLoading] = useState(true);
  const tabDef = TABS.find(t => t.key === tabKey);
  const label = tabDef?.label[lang as 'en' | 'ar'] ?? tabKey;
  const statFetch = PINNED_STAT_FETCH[tabKey];

  useEffect(() => {
    if (!statFetch) { setStatLoading(false); return; }
    let cancelled = false;
    api.get<any>(statFetch.url).then(res => {
      if (cancelled) return;
      if (res.success && res.data != null) setStat(statFetch.extract(res.data));
      setStatLoading(false);
    }).catch((error) => {
      if (!cancelled) {
        console.error(`Failed to load pinned stat for ${tabKey}`, error);
        setStatLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tabKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const valueColor = PINNED_STAT_COLOR[tabKey] ?? 'text-primary';

  return (
    <button
      onClick={() => onNavigate(tabKey)}
      className="group relative inline-flex items-center gap-3 border-2 border-border bg-card px-4 py-3 text-start shadow-[4px_4px_0_#000000] transition-colors hover:border-destructive/40 hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
    >
      {statLoading ? (
        <span className="h-6 w-12 animate-pulse bg-border inline-block" />
      ) : (
        <span className={cn('font-stat text-2xl tracking-wide', valueColor)}>{stat ?? '—'}</span>
      )}
      <span className="text-sm text-foreground">{label}</span>
      <span
        onClick={(e) => { e.stopPropagation(); onUnpin(tabKey); }}
        className="absolute -top-2 -end-2 flex h-5 w-5 items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive text-[10px] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        title={lang === 'ar' ? 'إزالة التثبيت' : 'Unpin'}
      >
        ✕
      </span>
    </button>
  );
}

// Load chart code only when a chart tab is actually opened.
const DailyStatsChart = dynamic(() => import('@/components/dashboard/reports/DailyStatsChart'), {
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const DenialReasonsChart = dynamic(() => import('@/components/dashboard/reports/DenialReasonsChart'), {
  loading: () => (
    <div className="flex h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

// All tabs
const TABS = [
  { key: 'revenue-at-risk',        label: { en: 'Revenue At Risk',       ar: 'الإيراد المعرّض للخطر' } },
  { key: 'whatsapp-saved',         label: { en: 'WhatsApp ROI',           ar: 'عائد واتساب' } },
  { key: 'plan-revenue',           label: { en: 'Plan Revenue',           ar: 'إيراد الخطط' } },
  { key: 'retention-churn',        label: { en: 'Retention',              ar: 'الاحتفاظ' } },
  { key: 'at-risk-members',        label: { en: 'At-Risk',                ar: 'المعرّضون للخطر' } },
  { key: 'cohort-retention',       label: { en: 'Cohorts',                ar: 'المجموعات' } },
  { key: 'whatsapp-performance',   label: { en: 'WhatsApp Perf',          ar: 'أداء واتساب' } },
  { key: 'ghost-members',          label: { en: 'Ghost Members',          ar: 'الأعضاء الغائبون' } },
  { key: 'attendance-decline',     label: { en: 'Attendance Decline',     ar: 'تراجع الحضور' } },
  { key: 'expected-revenue',       label: { en: 'Expected Revenue',       ar: 'الإيراد المتوقع' } },
  { key: 'renewal-vs-new',         label: { en: 'Renewal vs New',         ar: 'تجديد مقابل جديد' } },
  { key: 'cash-vs-digital',        label: { en: 'Cash vs Digital',        ar: 'نقدي مقابل رقمي' } },
  { key: 'referral-funnel',        label: { en: 'Referral Funnel',        ar: 'مسار الإحالة' } },
  { key: 'post-expiry-performance',label: { en: 'Post-Expiry',            ar: 'ما بعد الانتهاء' } },
  { key: 'onboarding-performance', label: { en: 'Onboarding',             ar: 'التهيئة' } },
  { key: 'weekly-digest',          label: { en: 'Weekly Digest',          ar: 'الملخص الأسبوعي' } },
  { key: 'net-membership-change',   label: { en: 'Growth',                 ar: 'النمو' } },
  { key: 'visit-frequency-risk',   label: { en: 'Visit Frequency',        ar: 'تكرار الزيارات' } },
  { key: 'daily-stats',            label: { en: 'Daily Stats',            ar: 'إحصائيات يومية' } },
  { key: 'hourly',                 label: { en: 'Hourly',                 ar: 'بالساعة' } },
  { key: 'top-members',            label: { en: 'Top Clients',            ar: 'أفضل العملاء' } },
  { key: 'expiring-subs',          label: { en: 'Expiring',               ar: 'تنتهي قريباً' } },
  { key: 'ended-subs',             label: { en: 'Ended Subs',             ar: 'اشتراكات منتهية' } },
  { key: 'denial-reasons',         label: { en: 'Denials',                ar: 'أسباب الرفض' } },
  { key: 'denied-entries',         label: { en: 'Denied Log',             ar: 'سجل الرفض' } },
] as const;

type TabKey = typeof TABS[number]['key'];

const REPORT_TABS = PAYMENT_METHOD_UI_ENABLED ? TABS : TABS.filter((tab) => tab.key !== 'cash-vs-digital');

// Category groups — each group shows as a pill, sub-tabs appear below
const CATEGORIES = [
  {
    key: 'revenue',
    label: { en: 'Revenue', ar: 'الإيراد' },
    tabs: ['revenue-at-risk', 'plan-revenue', 'expected-revenue', 'renewal-vs-new', 'cash-vs-digital'] as TabKey[],
  },
  {
    key: 'retention',
    label: { en: 'Retention', ar: 'الاحتفاظ' },
    tabs: ['retention-churn', 'at-risk-members', 'ghost-members', 'visit-frequency-risk', 'cohort-retention', 'attendance-decline', 'top-members'] as TabKey[],
  },
  {
    key: 'operations',
    label: { en: 'Operations', ar: 'التشغيل' },
    tabs: ['net-membership-change', 'daily-stats', 'hourly', 'expiring-subs', 'ended-subs', 'referral-funnel'] as TabKey[],
  },
  {
    key: 'whatsapp',
    label: { en: 'WhatsApp', ar: 'واتساب' },
    tabs: ['whatsapp-saved', 'whatsapp-performance', 'post-expiry-performance', 'onboarding-performance', 'weekly-digest'] as TabKey[],
  },
  {
    key: 'logs',
    label: { en: 'Logs', ar: 'السجلات' },
    tabs: ['denial-reasons', 'denied-entries'] as TabKey[],
  },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

// Which tabs show the days period filter
const DAYS_TABS: TabKey[] = [
  'revenue-at-risk', 'whatsapp-saved', 'plan-revenue', 'retention-churn', 'at-risk-members',
  'ghost-members', 'attendance-decline', 'expected-revenue', 'renewal-vs-new',
  'referral-funnel', 'post-expiry-performance', 'onboarding-performance', 'whatsapp-performance',
  'daily-stats', 'top-members', 'denial-reasons', 'denied-entries', 'expiring-subs',

  'net-membership-change', 'visit-frequency-risk',
];
const DAYS_OPTIONS = [7, 14, 30, 60, 90];

const PIE_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))",
  "hsl(var(--chart-1) / 0.6)",
];

// Human-readable label maps
const RISK_LEVEL_LABELS: Record<string, { en: string; ar: string }> = {
  high:   { en: 'High Risk',    ar: 'خطر مرتفع' },
  medium: { en: 'Medium Risk',  ar: 'خطر متوسط' },
  low:    { en: 'Low Risk',     ar: 'خطر منخفض' },
};
const RISK_REASON_LABELS: Record<string, { en: string; ar: string }> = {
  no_recent_visits:  { en: 'No recent visits',     ar: 'لا زيارات مؤخراً' },
  attendance_drop:   { en: 'Attendance dropped',   ar: 'تراجع الحضور' },
  low_visits:        { en: 'Low visit frequency',  ar: 'تردد منخفض' },
  expiring_soon:     { en: 'Expiring soon',         ar: 'قريب الانتهاء' },
};
const SUB_STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  expired:   { en: 'Expired',   ar: 'منتهي' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  frozen:    { en: 'Frozen',    ar: 'مجمّد' },
  ended:     { en: 'Ended',     ar: 'منتهي' },
};

// One-liner descriptions for each tab — shown below the sub-tab bar
const TAB_DESCRIPTIONS: Record<string, { en: string; ar: string }> = {
  'revenue-at-risk':         { en: 'Shows subscriptions expiring soon with no renewal — the exact cash you stand to lose this month if you do nothing.', ar: 'الاشتراكات التي تنتهي قريباً دون تجديد — المبلغ الذي ستخسره هذا الشهر إذا لم تتحرك.' },
  'plan-revenue':            { en: 'Breaks revenue down by subscription plan — shows which plans are generating the most money and which are dead weight.', ar: 'تفاصيل الإيراد حسب نوع الاشتراك — أي الخطط تجلب أكثر وأيها لا يُسهم.' },
  'expected-revenue':        { en: 'Forecasts renewal cash expected in the next 30 days from members due soon, using your current retention rate as the assumption.', ar: 'يتوقع النقد القادم من التجديدات خلال 30 يوماً للأعضاء القريبين من الانتهاء، بالاعتماد على معدل الاحتفاظ الحالي.' },
  'renewal-vs-new':          { en: 'Splits revenue into renewals vs. brand-new members — tells you if growth is real or just old members cycling through.', ar: 'الإيراد مقسوم إلى تجديدات مقابل أعضاء جدد — هل النمو حقيقي أم مجرد تدوير للقدامى؟' },
  'cash-vs-digital':         { en: 'Compares cash payments vs. digital — useful for spotting unreported cash and planning which payment methods to push.', ar: 'مقارنة المدفوعات النقدية بالرقمية — مفيد لاكتشاف النقد غير المسجل وتحديد طرق الدفع الأفضل.' },
  'retention-churn':         { en: 'Your monthly retention rate — the percentage of paying members who stayed vs. left. The #1 health indicator for your gym.', ar: 'معدل الاحتفاظ الشهري — نسبة الأعضاء الذين بقوا مقابل من غادروا. أهم مؤشر لصحة الصالة.' },
  'at-risk-members':         { en: 'Members showing early warning signs of cancellation — low visits, attendance drop, or expiring soon. Act before they\'re gone.', ar: 'الأعضاء الذين تظهر عليهم علامات الإلغاء المبكر — تدخّل قبل أن يغادروا.' },
  'ghost-members':           { en: 'Paying members who haven\'t scanned in 14+ days — they\'re paying but not coming. High cancel risk. Reach out now.', ar: 'أعضاء يدفعون لكنهم لم يحضروا منذ 14+ يوماً. خطر إلغاء مرتفع — تواصل معهم الآن.' },
  'visit-frequency-risk':    { en: 'Segments members by how often they visit. Members coming once a week cancel at 50% — this shows exactly who they are.', ar: 'تصنيف الأعضاء حسب تكرار الحضور. من يأتي مرة أسبوعياً يلغي باحتمال 50٪ — اعرف من هم.' },
  'cohort-retention':        { en: 'Groups members by the month they joined and shows how many from each cohort are still active today.', ar: 'يجمع الأعضاء حسب شهر الانضمام ويعرض كم بقي نشطاً من كل مجموعة حتى اليوم.' },
  'attendance-decline':      { en: 'Members whose visit frequency has dropped significantly in the last two weeks — early churn signal before they actually cancel.', ar: 'أعضاء تراجع حضورهم بشكل ملحوظ في الأسبوعين الأخيرين — إشارة مبكرة للإلغاء.' },
  'top-members':             { en: 'Your most loyal, highest-visit members — the ones to protect, reward, and ask for referrals.', ar: 'أكثر أعضائك حضوراً وولاءً — يستحقون المكافأة والتشجيع على الإحالة.' },
  'net-membership-change':   { en: 'Shows how many members joined vs. left each week — answers whether you\'re actually growing or just replacing people who leave.', ar: 'كم عضواً انضم وكم غادر كل أسبوع — هل تنمو فعلاً أم تستبدل من يغادر فقط؟' },
  'daily-stats':             { en: 'Day-by-day breakdown of check-ins, denials, and access activity — useful for spotting peak days and catching anomalies.', ar: 'تفاصيل يومية للحضور والرفض والنشاط — مفيد لاكتشاف الأيام الذروة والأخطاء.' },
  'hourly':                  { en: 'Heatmap of gym traffic by hour of day — shows your busiest and quietest windows to optimize staff schedules.', ar: 'خريطة حرارية لحضور الصالة بالساعة — اكتشف أوقات الذروة لتنظيم جدول الموظفين.' },
  'expiring-subs':           { en: 'Members whose subscriptions expire in the next 7 days — your renewal window. Contact them now before they drift away.', ar: 'أعضاء تنتهي اشتراكاتهم خلال 7 أيام — نافذة التجديد. تواصل قبل أن يبتعدوا.' },
  'ended-subs':              { en: 'Subscriptions that have already lapsed — useful for identifying win-back targets and understanding cancellation patterns.', ar: 'الاشتراكات التي انتهت بالفعل — لتحديد أهداف الاسترداد وفهم أنماط الإلغاء.' },
  'referral-funnel':         { en: 'Tracks how many referred leads converted to paid members — shows which referral sources are actually worth rewarding.', ar: 'تتبع الإحالات التي تحوّلت إلى أعضاء فعليين — أي مصادر الإحالة تستحق المكافأة؟' },
  'whatsapp-saved':          { en: 'Revenue directly linked to WhatsApp reminders — members who renewed within 14 days of receiving a message are counted here.', ar: 'الإيراد المرتبط مباشرة بتذكيرات واتساب — من جدّد خلال 14 يوماً من الرسالة يُحسب هنا.' },
  'whatsapp-performance':    { en: 'Volume, delivery, and open rates for every message sent — plus revenue saved per campaign type.', ar: 'حجم الرسائل ومعدلات التسليم والفتح — والإيراد المحمي لكل نوع من أنواع الحملات.' },
  'post-expiry-performance': { en: 'Tracks how many expired members came back after receiving win-back messages — your re-activation hit rate.', ar: 'كم عضواً منتهياً عاد بعد رسائل الاسترداد — معدل نجاح حملات إعادة التفعيل.' },
  'onboarding-performance':  { en: 'Measures whether new members are hitting the 2×/week habit in their first 90 days — the window that predicts long-term retention.', ar: 'هل الأعضاء الجدد يحضرون مرتين أسبوعياً في الـ90 يوماً الأولى؟ هذه الفترة تحدد الاحتفاظ طويل الأمد.' },
  'weekly-digest':           { en: 'A snapshot of your gym\'s health this week — retention, revenue, check-ins, and any alerts that need your attention.', ar: 'لمحة عن صحة صالتك هذا الأسبوع — الاحتفاظ والإيراد والحضور والتنبيهات.' },
  'denial-reasons':          { en: 'Why members are being denied at the gate — expired subscription, wrong time, freeze, or banned. Spot the most common blocks.', ar: 'لماذا يُرفض الأعضاء عند البوابة — اشتراك منتهٍ، وقت خاطئ، تجميد، أو حظر. اكتشف أكثر الأسباب تكراراً.' },
  'denied-entries':          { en: 'Full log of every denied access attempt with member name, time, and reason — useful for resolving disputes and spotting patterns.', ar: 'سجل كامل بكل محاولات الدخول المرفوضة مع الاسم والوقت والسبب — لحل النزاعات وتتبع الأنماط.' },
};

// Given a tab key, find its category
function categoryForTab(tabKey: TabKey): CategoryKey {
  for (const cat of CATEGORIES) {
    if ((cat.tabs as readonly string[]).includes(tabKey)) return cat.key;
  }
  return 'revenue';
}

export default function ReportsPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const [tab, setTab] = useState<TabKey>('revenue-at-risk');
  const [category, setCategory] = useState<CategoryKey>('revenue');
  const [days, setDays] = useState(30);

  // Pinned hero cards — persisted in localStorage
  const [pinnedTabs, setPinnedTabs] = useState<TabKey[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('gymflow_pinned_reports');
      return stored ? (JSON.parse(stored) as TabKey[]) : [];
    } catch (error) {
      console.error('Failed to read pinned reports from localStorage', error);
      return [];
    }
  });

  const togglePin = useCallback((tabKey: TabKey) => {
    setPinnedTabs(prev => {
      const next = prev.includes(tabKey)
        ? prev.filter(k => k !== tabKey)
        : prev.length < 4 ? [...prev, tabKey] : prev;
      try {
        localStorage.setItem('gymflow_pinned_reports', JSON.stringify(next));
      } catch (error) {
        console.error('Failed to persist pinned reports', error);
      }
      return next;
    });
  }, []);

  // Hero stats — parallel fetch on mount
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroStats, setHeroStats] = useState({
    revenueAtRisk: 0,
    atRiskCount: 0,
    ghostMembers: 0,
    revenueSaved: 0,
    denialCount: 0,
  });

  // Tab search filter
  const [tabSearch, setTabSearch] = useState('');

  // Drill-down tab data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const planLabel = (months: number) => {
    if (months <= 0) return lang === 'ar' ? 'غير محدد' : 'Unspecified';
    if (lang === 'ar') return `${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
    return `${months} month${months === 1 ? '' : 's'}`;
  };
  const toNumber = toFiniteNumber;
  const riskItems = Array.isArray(data?.items) ? data.items : Array.isArray(data?.rows) ? data.rows : [];
  const riskSummary = data?.summary ?? null;

  // Fetch hero stats in parallel on mount
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<any>('/api/reports/revenue-at-risk?days=30'),
      api.get<any>('/api/reports/ghost-members?days=30'),
      api.get<any>('/api/reports/revenue-saved-whatsapp?days=30'),
      api.get<any>('/api/reports/denial-reasons?days=30'),
    ]).then(([riskRes, ghostRes, savedRes, denialRes]) => {
      if (cancelled) return;
      const denialData = denialRes.data;
      const denialTotal = Array.isArray(denialData) ? denialData.reduce((s: number, r: any) => s + Number(r.count ?? 0), 0) : 0;
      setHeroStats({
        revenueAtRisk: riskRes.data?.summary?.revenueAtRisk ?? riskRes.data?.summary?.totalValue ?? 0,
        atRiskCount: riskRes.data?.summary?.membersInWindow ?? riskRes.data?.summary?.memberCount ?? 0,
        ghostMembers: ghostRes.data?.summary?.ghostMembers ?? ghostRes.data?.rows?.length ?? 0,
        revenueSaved: savedRes.data?.summary?.revenueSaved ?? 0,
        denialCount: denialTotal,
      });
    }).catch((error) => {
      console.error('Failed to load reports hero stats', error);
    }).finally(() => { if (!cancelled) setHeroLoading(false); });
    return () => { cancelled = true; };
  }, []);


  const buildUrl = useCallback((activeTab: TabKey, d: number) => {
    switch (activeTab) {
      case 'revenue-at-risk':        return `/api/reports/revenue-at-risk?days=${d}`;
      case 'whatsapp-saved':         return `/api/reports/revenue-saved-whatsapp?days=${d}`;
      case 'plan-revenue':           return `/api/reports/revenue-by-plan?days=${d}`;
      case 'retention-churn':        return `/api/reports/retention-churn?days=${d}`;
      case 'at-risk-members':        return `/api/reports/at-risk-members?days=${d}`;
      case 'cohort-retention':       return '/api/reports/cohort-retention';
      case 'whatsapp-performance':   return `/api/reports/whatsapp-performance?days=${d}`;
      case 'ghost-members':          return `/api/reports/ghost-members?days=${Math.max(d, 30)}`;
      case 'attendance-decline':     return `/api/reports/attendance-decline?days=${Math.max(d, 14)}`;
      case 'expected-revenue':       return `/api/reports/expected-revenue?days=${Math.max(d, 30)}`;
      case 'renewal-vs-new':         return `/api/reports/renewal-vs-new?days=${d}`;
      case 'cash-vs-digital':        return '/api/reports/cash-vs-digital';
      case 'referral-funnel':        return `/api/reports/referral-funnel?days=${Math.max(d, 30)}`;
      case 'post-expiry-performance':return `/api/reports/post-expiry-performance?days=${Math.max(d, 30)}`;
      case 'onboarding-performance': return `/api/reports/onboarding-performance?days=${Math.max(d, 30)}`;
      case 'weekly-digest':          return '/api/reports/weekly-digest';
      case 'daily-stats':            return `/api/reports/daily-stats?days=${d}`;
      case 'hourly':                 return '/api/reports/hourly-distribution';
      case 'top-members':            return `/api/reports/top-members?days=${d}&limit=10`;
      case 'denial-reasons':         return `/api/reports/denial-reasons?days=${d}`;
      case 'denied-entries':         return `/api/reports/denied-entries?days=${d}`;
      case 'expiring-subs':          return `/api/reports/expiring-subscriptions?days=${d}`;
      case 'ended-subs':             return '/api/reports/ended-subscriptions?limit=200';
      case 'net-membership-change':  return `/api/reports/net-membership-change?days=${d}`;
      case 'visit-frequency-risk':   return `/api/reports/visit-frequency-risk?days=${d}`;
    }
  }, []);

  const loadTabData = useCallback(async (activeTab: TabKey, d: number) => {
    const url = buildUrl(activeTab, d);
    if (!url) return null;
    const res = await api.get<any>(url);
    if (!res.success) throw new Error(res.message || labels.error);
    return res.data as any;
  }, [buildUrl, labels.error]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    loadTabData(tab, days).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    }).catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : labels.error);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tab, days, labels.error, loadTabData]);

  // Jump to a tab — also switches category
  const jumpToTab = useCallback((targetTab: TabKey) => {
    setLoading(true);
    setError('');
    setData(null);
    setCategory(categoryForTab(targetTab));
    setTab(targetTab);
    // Scroll to tab bar smoothly
    setTimeout(() => {
      document.getElementById('reports-category-bar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }, []);

  const changeCategory = useCallback((cat: CategoryKey) => {
    setLoading(true);
    setError('');
    setData(null);
    setCategory(cat);
    const catDef = CATEGORIES.find(c => c.key === cat);
    if (catDef && !(catDef.tabs as readonly string[]).includes(tab)) {
      const firstVisible = catDef.tabs.find(k => REPORT_TABS.some(rt => rt.key === k));
      if (firstVisible) setTab(firstVisible);
    }
  }, [tab]);

  const rs = useMemo(() => {
    const fg = "hsl(var(--foreground))";
    const muted = "hsl(var(--muted-foreground))";
    const bg = "hsl(var(--background))";
    const border = "hsl(var(--border))";
    return {
      axis: { fill: muted, fontSize: 12 },
      gridStroke: border,
      tooltipContent: { backgroundColor: bg, border: `2px solid ${border}`, borderRadius: 0 },
      tooltipLabel: { color: fg },
      tooltipItem: { color: fg },
      legendItem: { color: muted },
    };
  }, []);

  const showDaysFilter = DAYS_TABS.includes(tab);
  const ghostRows = tab === 'ghost-members' && data?.rows ? data.rows : [];
  const ghostSummary = tab === 'ghost-members' ? data?.summary : null;
  const declineRows = tab === 'attendance-decline' && data?.rows ? data.rows : [];
  const declineSummary = tab === 'attendance-decline' ? data?.summary : null;
  const expectedRevenueSummary = tab === 'expected-revenue' ? data?.summary : null;
  const renewalRows = tab === 'renewal-vs-new' && Array.isArray(data?.rows) ? data.rows : [];
  const renewalSummary = tab === 'renewal-vs-new' ? data?.summary : null;
  const referralRows = tab === 'referral-funnel' && Array.isArray(data?.rows) ? data.rows : [];
  const referralSummary = tab === 'referral-funnel' ? data?.summary : null;
  const postExpiryRows = tab === 'post-expiry-performance' && Array.isArray(data?.rows) ? data.rows : [];
  const postExpirySummary = tab === 'post-expiry-performance' ? data?.summary : null;
  const onboardingRows = tab === 'onboarding-performance' && Array.isArray(data?.rows) ? data.rows : [];
  const onboardingSummary = tab === 'onboarding-performance' ? data?.summary : null;
  const digest = tab === 'weekly-digest' ? data : null;
  // Active category's tab list, filtered for enabled tabs + search
  const activeCategoryDef = CATEGORIES.find(c => c.key === category)!;
  const searchActive = tabSearch.trim().length > 0;
  const searchLower = tabSearch.trim().toLowerCase();
  const visibleCategoryTabs = searchActive
    // When searching, show matching tabs from ALL categories
    ? REPORT_TABS.filter(rt => rt.label.en.toLowerCase().includes(searchLower) || rt.label.ar.includes(tabSearch.trim()))
    // Normal: show tabs for the active category
    : activeCategoryDef.tabs
        .filter(k => REPORT_TABS.some(rt => rt.key === k))
        .map(k => REPORT_TABS.find(rt => rt.key === k)!);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-heading font-bold tracking-tight">{labels.reports}</h1>

      {/* ── Hero: 4 questions — always visible ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Q1 */}
        <button
          onClick={() => jumpToTab('revenue-at-risk')}
          className="group flex flex-col gap-3 border-2 border-border bg-card p-5 text-start transition-colors hover:border-destructive/60 hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {lang === 'ar' ? 'كم سأخسر هذا الشهر؟' : 'How much am I about to lose?'}
            </p>
            <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {lang === 'ar' ? 'عرض ←' : 'View →'}
            </span>
          </div>
          {heroLoading ? (
            <div className="h-10 w-24 animate-pulse bg-border" />
          ) : (
            <p className={cn('font-stat text-4xl tracking-wide', heroStats.revenueAtRisk > 0 ? 'text-destructive' : 'text-success')}>
              {formatCurrencyCompact(heroStats.revenueAtRisk)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {heroLoading ? '' : heroStats.revenueAtRisk > 0
              ? (lang === 'ar' ? `${heroStats.atRiskCount} اشتراك ينتهي خلال ٣٠ يوم بدون تجديد` : `${heroStats.atRiskCount} subscription${heroStats.atRiskCount !== 1 ? 's' : ''} ending within 30 days — not yet renewed`)
              : (lang === 'ar' ? 'لا إيراد مهدد الآن' : 'No revenue at risk right now')}
          </p>
        </button>

        {/* Q2: Am I losing members? */}
        <button
          onClick={() => jumpToTab('ghost-members')}
          className="group flex flex-col gap-3 border-2 border-border bg-card p-5 text-start transition-colors hover:border-destructive/60 hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {lang === 'ar' ? 'من توقّف عن الحضور؟' : "Who's gone quiet on me?"}
            </p>
            <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {lang === 'ar' ? 'عرض ←' : 'View →'}
            </span>
          </div>
          {heroLoading ? (
            <div className="h-10 w-16 animate-pulse bg-border" />
          ) : (
            <p className={cn('font-stat text-4xl tracking-wide', heroStats.ghostMembers > 0 ? 'text-warning' : 'text-success')}>
              {heroStats.ghostMembers}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {heroLoading ? '' : heroStats.ghostMembers > 0
              ? (lang === 'ar' ? `${heroStats.ghostMembers} عضو يدفع لكنه لم يحضر منذ أسبوعين أو أكثر` : `${heroStats.ghostMembers} paying member${heroStats.ghostMembers !== 1 ? 's' : ''} haven't visited in 14+ days`)
              : (lang === 'ar' ? 'كل الأعضاء النشطون يحضرون بانتظام' : 'All active members are showing up regularly')}
          </p>
        </button>

        {/* Q3: Is anyone being blocked at the door? */}
        <button
          onClick={() => jumpToTab('denial-reasons')}
          className="group flex flex-col gap-3 border-2 border-border bg-card p-5 text-start transition-colors hover:border-destructive/60 hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {lang === 'ar' ? 'من يُرفض عند البوابة؟' : 'Who\'s being blocked at the door?'}
            </p>
            <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {lang === 'ar' ? 'عرض ←' : 'View →'}
            </span>
          </div>
          {heroLoading ? (
            <div className="h-10 w-24 animate-pulse bg-border" />
          ) : (
            <p className={cn('font-stat text-4xl tracking-wide', heroStats.denialCount > 0 ? 'text-warning' : 'text-success')}>
              {heroStats.denialCount}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {heroLoading ? '' : heroStats.denialCount > 0
              ? (lang === 'ar' ? `${heroStats.denialCount} محاولة دخول مرفوضة عند الماسح • آخر ٣٠ يوم` : `${heroStats.denialCount} member${heroStats.denialCount !== 1 ? 's' : ''} blocked at the scanner • last 30 days`)
              : (lang === 'ar' ? 'لم يُرفض أحد عند البوابة' : 'Nobody blocked at the door')}
          </p>
        </button>

        {/* Q4: Is GymFlow saving me money? */}
        <button
          onClick={() => jumpToTab('whatsapp-saved')}
          className={cn(
            'group flex flex-col gap-3 border-2 p-5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success',
            !heroLoading && heroStats.revenueSaved > 0
              ? 'border-success/40 bg-success/5 hover:border-success/60 hover:bg-success/10'
              : 'border-border bg-card hover:border-destructive/60 hover:bg-destructive/5'
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {lang === 'ar' ? 'ماذا أنقذت التذكيرات؟' : 'What did my reminders rescue?'}
            </p>
            <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {lang === 'ar' ? 'عرض ←' : 'View →'}
            </span>
          </div>
          {heroLoading ? (
            <div className="h-10 w-24 animate-pulse bg-border" />
          ) : heroStats.revenueSaved > 0 ? (
            <p className="font-stat text-4xl tracking-wide text-success">
              {formatCurrencyCompact(heroStats.revenueSaved)}
            </p>
          ) : (
            <p className="font-stat text-4xl tracking-wide text-muted-foreground">—</p>
          )}
          <p className="text-xs text-muted-foreground">
            {heroLoading ? '' : heroStats.revenueSaved > 0
              ? (lang === 'ar' ? 'إيراد تم حمايته بتذكيرات واتساب • آخر ٣٠ يوم' : 'Revenue protected by WhatsApp reminders • last 30 days')
              : (lang === 'ar' ? 'اربط واتساب لتبدأ في حماية إيرادك' : 'Connect WhatsApp to start saving revenue')}
          </p>
        </button>
      </div>

      {/* ── Pinned strip below hero ── */}
      {pinnedTabs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
            <Pin size={10} className="inline -mt-0.5 me-1" />{lang === 'ar' ? 'مثبّت' : 'Pinned'}
          </span>
          {pinnedTabs.map(k => (
            <PinnedCard key={k} tabKey={k} lang={lang} onNavigate={jumpToTab} onUnpin={togglePin} />
          ))}
        </div>
      )}

      {/* ── Search + Category pills ── */}
      <div id="reports-category-bar" className="flex flex-wrap items-center gap-2 border-b border-border pb-3" role="tablist" aria-label={lang === 'ar' ? 'فئات التقارير' : 'Report categories'}>
        <div className="relative shrink-0">
          <svg className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            type="text"
            value={tabSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث في التقارير...' : 'Search reports...'}
            className="h-9 w-[200px] border-2 border-border bg-card ps-8 pe-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-destructive focus:outline-none transition-colors"
          />
        </div>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            role="tab"
            aria-selected={category === cat.key}
            onClick={() => changeCategory(cat.key)}
            className={cn(
              'px-4 py-1.5 text-sm font-semibold border-2 transition-colors',
              category === cat.key
                ? 'border-destructive bg-destructive text-white'
                : 'border-border bg-card text-muted-foreground hover:border-destructive/60 hover:text-foreground'
            )}
          >
            {cat.label[lang]}
          </button>
        ))}
      </div>

      {/* ── Sub-tab bar + period filter ── */}
      <div className="flex flex-col -mt-4">
        <div className="flex items-stretch border-b border-border">
          {/* Scrollable tabs — only for this category */}
          <div className="flex overflow-x-auto flex-1" role="tablist" aria-label={lang === 'ar' ? 'تبويبات التقارير' : 'Report tabs'}>
            {visibleCategoryTabs.map((item, i) => {
              const isPinned = pinnedTabs.includes(item.key);
              const atMax = pinnedTabs.length >= 4 && !isPinned;
              // Urgency dot — flag tabs with alarming data
              const urgentTabs: Record<string, boolean> = {
                'revenue-at-risk': heroStats.revenueAtRisk > 0,
                'ghost-members': heroStats.ghostMembers > 0,
                'at-risk-members': heroStats.atRiskCount > 0,
              };
              const isUrgent = !heroLoading && urgentTabs[item.key];
              return (
                <div
                  key={item.key}
                  style={{
                    borderBottom: `3px solid ${tab === item.key ? 'hsl(var(--destructive))' : 'transparent'}`,
                    marginBottom: '-1px',
                  }}
                  className={cn(
                    'group flex items-center gap-1 shrink-0',
                    i < visibleCategoryTabs.length - 1 && 'border-e border-border',
                  )}
                >
                  <button
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => { setTab(item.key); setTabSearch(''); }}
                    className={cn(
                      'px-3 py-3 text-sm whitespace-nowrap cursor-pointer transition-colors',
                      tab === item.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label[lang]}
                    {isUrgent && <span className="inline-block w-1.5 h-1.5 bg-destructive rounded-full ms-1.5 -mt-1 align-top" />}
                  </button>
                  {/* Pin button — always visible, brighter when pinned */}
                  <button
                    onClick={() => !atMax && togglePin(item.key)}
                    title={atMax ? (lang === 'ar' ? 'الحد الأقصى 4 مثبّتات' : 'Max 4 pins') : isPinned ? (lang === 'ar' ? 'إزالة التثبيت' : 'Unpin') : (lang === 'ar' ? 'تثبيت في الأعلى' : 'Pin to top')}
                    className={cn(
                      'p-3 flex items-center transition-all rounded-sm',
                      isPinned
                        ? 'text-destructive'
                        : 'text-muted-foreground/40 hover:text-muted-foreground group-hover:text-muted-foreground/70',
                      atMax && 'cursor-not-allowed !text-muted-foreground/20',
                    )}
                  >
                    {isPinned
                      ? <PinOff size={15} strokeWidth={2} />
                      : <Pin size={15} strokeWidth={2} />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Period filter — pinned to right, never scrolled away */}
          {showDaysFilter && (
            <div className="flex items-center px-3 py-2 shrink-0 border-s border-border bg-background">
              <Select value={days.toString()} onValueChange={(v) => setDays(Number(v))} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <SelectTrigger className="w-[110px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d.toString()}>{d} {labels.days}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab description ── */}
      {TAB_DESCRIPTIONS[tab] && (
        <p className="text-sm text-muted-foreground border-s-2 border-destructive/40 ps-3 -mt-3">
          {TAB_DESCRIPTIONS[tab][lang]}
        </p>
      )}

      {/* ── Drill-down content ── */}
      {loading ? (
        <LoadingSpinner size="lg" />
      ) : error ? (
        <Alert variant="destructive">
          <Terminal className={cn("h-4 w-4 me-2")} />
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6" role="tabpanel" aria-label={TABS.find(t => t.key === tab)?.label[lang] ?? tab}>

          {tab === 'revenue-at-risk' && (riskSummary && riskItems.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={labels.revenue_at_risk}    value={formatCurrencyCompact(riskSummary.revenueAtRisk ?? riskSummary.totalValue ?? 0)}         color="text-destructive" valueSize="text-2xl" />
                <StatCard label={labels.members_in_window}  value={riskSummary.membersInWindow ?? riskSummary.memberCount ?? 0}                             color="text-foreground"  valueSize="text-2xl" />
                <StatCard label={labels.already_reminded}   value={formatCurrencyCompact(riskSummary.remindedValue ?? 0)}                                   color="text-warning"     valueSize="text-2xl" />
                <StatCard label={labels.revenue_secured}    value={formatCurrencyCompact(riskSummary.revenueSecured ?? riskSummary.renewedValue ?? 0)}       color="text-success"     valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{labels.revenue_at_risk}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'الأعضاء الذين تنتهي اشتراكاتهم قريباً مع حالة التذكير والتجديد'
                      : 'Members with subscriptions ending soon, plus reminder and renewal status'}
                  </p>
                </CardHeader>
                <CardContent>
                  <DataTable
                    searchable
                    columns={[
                      { key: 'name',            label: labels.name },
                      { key: 'phone',           label: labels.phone },
                      { key: 'planMonths',      label: labels.plan,        render: (row: any) => planLabel(row.planMonths ?? row.plan_months ?? 0) },
                      { key: 'end_date',        label: labels.end_date,    render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US') },
                      { key: 'days_left',       label: labels.days_left,   render: (row: any) => {
                        const d = row.days_left ?? daysUntil(row.end_date);
                        return <span className={d <= 3 ? 'font-bold text-destructive' : 'text-warning'}>{d}</span>;
                      }},
                      { key: 'amountAtRisk',    label: labels.amount_at_risk, render: (row: any) => formatCurrency(row.amountAtRisk ?? row.amount_at_risk ?? 0) },
                      { key: 'reminder_status', label: labels.reminder_status, render: (row: any) => (
                        <span className={
                          row.reminder_status === 'sent' || row.reminder_status === 'reminded'
                            ? 'font-semibold text-success'
                            : row.reminder_status === 'pending' || row.reminder_status === 'queued'
                              ? 'font-semibold text-warning'
                              : row.reminder_status === 'no_automation'
                                ? 'text-muted-foreground/50'
                                : 'text-muted-foreground'
                        }>
                          {row.reminder_status === 'sent' || row.reminder_status === 'reminded'
                            ? (lang === 'ar' ? 'تم الإرسال ✓' : 'Sent ✓')
                            : row.reminder_status === 'pending' || row.reminder_status === 'queued'
                              ? (lang === 'ar' ? 'مجدول — قيد الانتظار' : 'Scheduled — Pending')
                              : row.reminder_status === 'no_automation'
                                ? (lang === 'ar' ? 'واتساب غير مفعّل' : 'WhatsApp not connected')
                                : labels.not_reminded_yet}
                        </span>
                      )},
                      { key: 'renewed', label: labels.renewal_status, render: (row: any) => (
                        <div className="flex flex-col gap-1">
                          <span className={row.renewed || row.renewal_status === 'renewed' ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                            {row.renewed || row.renewal_status === 'renewed' ? labels.already_renewed : labels.at_risk_status}
                          </span>
                          {(row.renewed || row.renewal_status === 'renewed') && (
                            <span className={row.renewed_after_whatsapp || row.whatsapp_attributed_renewal ? 'text-xs font-medium text-primary' : 'text-xs text-muted-foreground'}>
                              {labels.renewed_after_whatsapp}: {(row.renewed_after_whatsapp || row.whatsapp_attributed_renewal)
                                ? (lang === 'ar' ? 'نعم' : 'Yes')
                                : (lang === 'ar' ? 'لا' : 'No')}
                            </span>
                          )}
                        </div>
                      )},
                    ]}
                    data={riskItems}
                    emptyMessage={labels.no_expiring_revenue_risk}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="border-2 border-border bg-card py-12 text-center">
              <p className="text-lg font-semibold text-success">
                {lang === 'ar' ? '✓ لا إيراد مهدد الآن' : '✓ No revenue at risk right now'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === 'ar'
                  ? 'جميع الاشتراكات إما نشطة أو تم تجديدها. عد لاحقاً قبل انتهاء الاشتراكات.'
                  : 'All subscriptions are active or renewed. Check back closer to renewal dates.'}
              </p>
            </div>
          ))}

          {tab === 'whatsapp-saved' && (data?.summary && Array.isArray(data.rows) ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'الإيراد المحفوظ'    : 'Revenue Saved'}     value={formatCurrencyCompact(data.summary.revenueSaved ?? 0)}      color="text-success"  valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الرسائل المرسلة'    : 'Messages Sent'}     value={data.summary.messagesSent ?? 0}                              color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الأعضاء الذين جددوا': 'Renewals Won'}      value={data.summary.renewalsWon ?? 0}                               color="text-primary"  valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'معدل التحويل'       : 'Conversion Rate'}   value={formatPercent((data.summary.messagesSent ?? 0) > 0 ? ((data.summary.renewalsWon ?? 0) / (data.summary.messagesSent ?? 1)) * 100 : 0)} color="text-warning" valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'أداء تذكيرات واتساب' : 'WhatsApp Reminder Performance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'reminderDays',    label: lang === 'ar' ? 'التوقيت'       : 'Timing',         render: (row: any) => lang === 'ar' ? `قبل ${row.reminderDays} يوم` : `${row.reminderDays} days before` },
                      { key: 'messagesSent',    label: lang === 'ar' ? 'تم الإرسال'    : 'Sent' },
                      { key: 'membersReached',  label: lang === 'ar' ? 'الأعضاء'       : 'Members' },
                      { key: 'renewalsWon',     label: lang === 'ar' ? 'التجديدات'     : 'Renewals' },
                      { key: 'conversion',      label: lang === 'ar' ? 'التحويل'       : 'Conversion',     render: (row: any) => formatPercent(row.messagesSent > 0 ? (row.renewalsWon / row.messagesSent) * 100 : 0) },
                      { key: 'revenueSaved',    label: lang === 'ar' ? 'الإيراد المحفوظ': 'Revenue Saved',  render: (row: any) => formatCurrency(row.revenueSaved || 0) },
                    ]}
                    data={data.rows}
                    emptyMessage={lang === 'ar' ? 'لا بيانات واتساب بعد.' : 'No WhatsApp data yet.'}
                  />
                  <p className="mt-3 text-xs text-muted-foreground">
                    {lang === 'ar'
                      ? `يتم احتساب الإيراد المحفوظ إذا تم التجديد خلال ${data.attributionWindowDays ?? 14} يوماً من الرسالة.`
                      : `Revenue is counted as saved only when renewal happens within ${data.attributionWindowDays ?? 14} days of the reminder.`}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="border-2 border-border bg-card py-12 text-center">
              <p className="text-lg font-semibold text-muted-foreground">
                {lang === 'ar' ? 'لا بيانات واتساب بعد' : 'No WhatsApp data yet'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === 'ar'
                  ? 'بعد ربط واتساب وإرسال أول تذكير ستظهر البيانات هنا.'
                  : 'Once you connect WhatsApp and send your first reminder, data will appear here.'}
              </p>
            </div>
          ))}

          {tab === 'plan-revenue' && (Array.isArray(data) && data.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{lang === 'ar' ? 'الإيراد حسب نوع الخطة' : 'Revenue by Plan Type'}</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'planMonths',    label: labels.plan,                               render: (row: any) => planLabel(row.planMonths) },
                    { key: 'activeMembers', label: lang === 'ar' ? 'الأعضاء النشطون' : 'Active Members' },
                    { key: 'totalRevenue',  label: lang === 'ar' ? 'إجمالي الإيراد'  : 'Total Revenue', render: (row: any) => formatCurrency(row.totalRevenue || 0) },
                    { key: 'renewalCount',  label: lang === 'ar' ? 'التجديدات'       : 'Renewals' },
                    { key: 'averageValue',  label: lang === 'ar' ? 'متوسط القيمة'    : 'Average Value',  render: (row: any) => formatCurrency(row.averageValue || 0) },
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}</p>
          ))}

          {tab === 'retention-churn' && (data?.summary && Array.isArray(data.rows) ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'الاحتفاظ'         : 'Retention Rate'}  value={formatPercent(data.summary.retentionRate ?? 0)}               color="text-success"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'التسرب'           : 'Churn Rate'}       value={formatPercent(data.summary.churnRate ?? 0)}                   color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'أعضاء خسرتهم': 'Members You Lost'}     value={data.summary.churnedMembers ?? 0}                             color="text-destructive"  valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إيراد ضائع'  : 'Revenue Lost'}     value={formatCurrencyCompact(data.summary.lostRevenue ?? 0)}          color="text-destructive"  valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الأعضاء الذين فقدتهم' : 'Members Lost In This Window'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name',       label: labels.name },
                      { key: 'phone',      label: labels.phone },
                      { key: 'endDate',    label: labels.end_date, render: (row: any) => formatDate(row.endDate, lang === 'ar' ? 'ar-EG' : 'en-US') },
                      { key: 'lostValue',  label: lang === 'ar' ? 'القيمة' : 'Lost Value', render: (row: any) => formatCurrency(row.lostValue || 0) },
                    ]}
                    data={data.rows}
                    emptyMessage={lang === 'ar' ? 'لم تخسر أعضاء في هذه الفترة.' : 'No members lost in this window.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}</p>
          ))}

          {tab === 'at-risk-members' && (data?.summary && Array.isArray(data.rows) ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={lang === 'ar' ? 'أعضاء قد يلغون' : 'Likely to Cancel'}      value={data.summary.memberCount ?? 0}                       color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'خطر مرتفع'       : 'High Risk'}             value={data.summary.highRiskCount ?? 0}                     color="text-warning"     valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الأعضاء الأكثر عرضة للتسرب' : 'Members Most Likely To Churn'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name',           label: labels.name },
                      { key: 'phone',          label: labels.phone },
                      { key: 'lastVisit',      label: lang === 'ar' ? 'آخر زيارة'     : 'Last Visit',       render: (row: any) => row.lastVisit ? formatDate(row.lastVisit, lang === 'ar' ? 'ar-EG' : 'en-US') : '—' },
                      { key: 'recentVisits',   label: lang === 'ar' ? 'زيارات حديثة'  : 'Recent Visits' },
                      { key: 'previousVisits', label: lang === 'ar' ? 'قبلها'          : 'Previous Visits' },
                      { key: 'riskLevel',      label: lang === 'ar' ? 'الخطورة'        : 'Risk', render: (row: any) => {
                        const lbl = RISK_LEVEL_LABELS[row.riskLevel]?.[lang] ?? row.riskLevel;
                        return (
                          <span className={row.riskLevel === 'high' ? 'text-destructive font-bold' : row.riskLevel === 'medium' ? 'text-warning font-bold' : 'text-muted-foreground'}>
                            {lbl}
                          </span>
                        );
                      }},
                      { key: 'riskReason', label: lang === 'ar' ? 'السبب' : 'Reason', render: (row: any) => RISK_REASON_LABELS[row.riskReason]?.[lang] ?? row.riskReason },
                    ]}
                    data={data.rows}
                    emptyMessage={lang === 'ar' ? 'لا أعضاء في خطر حالياً.' : 'No at-risk members right now.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}</p>
          ))}

          {tab === 'cohort-retention' && (Array.isArray(data) && data.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{lang === 'ar' ? 'الاحتفاظ حسب شهر الانضمام' : 'Cohort Retention'}</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'cohortMonth',    label: lang === 'ar' ? 'شهر الانضمام'   : 'Cohort' },
                    { key: 'joinedMembers',  label: lang === 'ar' ? 'المنضمون'        : 'Joined' },
                    { key: 'stillActive',    label: lang === 'ar' ? 'ما زالوا نشطين' : 'Still Active' },
                    { key: 'retentionRate',  label: lang === 'ar' ? 'الاحتفاظ'        : 'Retention', render: (row: any) => formatPercent(row.retentionRate || 0) },
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}</p>
          ))}

          {tab === 'whatsapp-performance' && (data?.rows && Array.isArray(data.rows) ? (
            <Card>
              <CardHeader>
                <CardTitle>{lang === 'ar' ? 'أداء الرسائل حسب النوع' : 'WhatsApp Message Performance'}</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'messageType',   label: lang === 'ar' ? 'النوع'           : 'Type', render: (row: any) => getAutomationWarningLabel(row.messageType, lang === 'ar' ? 'ar' : 'en') },
                    { key: 'messagesSent',  label: lang === 'ar' ? 'تم الإرسال'      : 'Sent' },
                    { key: 'membersReached',label: lang === 'ar' ? 'الأعضاء'         : 'Members' },
                    { key: 'renewalsWon',   label: lang === 'ar' ? 'التجديدات'       : 'Renewals' },
                    { key: 'revenueSaved',  label: lang === 'ar' ? 'الإيراد المستعاد' : 'Recovered Revenue', render: (row: any) => formatCurrency(row.revenueSaved || 0) },
                  ]}
                  data={data.rows}
                  emptyMessage={lang === 'ar' ? 'لا بيانات بعد.' : 'No data yet.'}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  {lang === 'ar'
                    ? `يتم احتساب الإيراد المنسوب خلال ${data.attributionWindowDays ?? 14} يوماً لرسائل التجديد.`
                    : `Renewal-linked saved revenue uses a ${data.attributionWindowDays ?? 14}-day attribution window.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}</p>
          ))}

          {tab === 'ghost-members' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={lang === 'ar' ? 'يدفعون لكن لا يحضرون' : 'Paying but Not Showing Up'}  value={ghostSummary?.ghostMembers ?? ghostRows.length}             color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'أطول غياب'             : 'Longest Gap'}                value={`${ghostSummary?.longestAbsenceDays ?? 0} ${labels.days}`}  color="text-warning"     valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الأعضاء النشطون الذين توقفوا عن الحضور' : 'Active Members Who Stopped Showing Up'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name',               label: labels.name },
                      { key: 'phone',              label: labels.phone },
                      { key: 'lastVisit',          label: lang === 'ar' ? 'آخر زيارة'             : 'Last Visit',          render: (row: any) => row.lastVisit ? formatDate(row.lastVisit, lang === 'ar' ? 'ar-EG' : 'en-US') : '—' },
                      { key: 'daysSinceLastVisit', label: lang === 'ar' ? 'أيام منذ آخر حضور'     : 'Days Since Last Visit', render: (row: any) => row.daysSinceLastVisit ?? '—' },
                      { key: 'recentVisits',       label: lang === 'ar' ? 'زيارات حديثة'           : 'Recent Visits' },
                    ]}
                    data={ghostRows}
                    emptyMessage={lang === 'ar' ? 'لا يوجد أعضاء غائبون ضمن هذه الفترة.' : 'No ghost members in this window.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'attendance-decline' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={lang === 'ar' ? 'حضورهم يتراجع' : 'Attendance Dropping'} value={declineSummary?.memberCount ?? declineRows.length}                                                         color="text-warning"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تراجع حاد'      : 'Sharp Drops'}          value={declineSummary?.highSeverityCount ?? declineRows.filter((row: any) => row.severity === 'high').length}   color="text-destructive" valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الأعضاء الذين انخفض حضورهم' : 'Members With Declining Attendance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name',           label: labels.name },
                      { key: 'phone',          label: labels.phone },
                      { key: 'previousVisits', label: lang === 'ar' ? 'الفترة السابقة' : 'Previous Visits' },
                      { key: 'recentVisits',   label: lang === 'ar' ? 'الفترة الحالية' : 'Recent Visits' },
                      { key: 'declinePercent', label: lang === 'ar' ? 'نسبة التراجع'   : 'Decline',   render: (row: any) => formatPercent(row.declinePercent ?? 0) },
                      { key: 'severity',       label: lang === 'ar' ? 'الحدة'           : 'Severity' },
                    ]}
                    data={declineRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد حالات تراجع واضحة حالياً.' : 'No attendance drops are flagged right now.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'expected-revenue' && (expectedRevenueSummary ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'نقد متوقع خلال ٣٠ يوم'  : 'Projected Cash Next 30 Days'}    value={formatCurrencyCompact(expectedRevenueSummary.projectedRevenueNext30Days ?? 0)} color="text-success"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'قاعدة الإيراد الحالية'   : 'Current Revenue Base'}      value={formatCurrencyCompact(expectedRevenueSummary.monthlyRunRate ?? 0)}             color="text-foreground"  valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تجديدات مؤكدة'        : 'Confirmed Renewals'}    value={formatCurrencyCompact(expectedRevenueSummary.securedRenewalValue ?? 0)}        color="text-success"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'بحاجة لتجديد'         : 'Needs Renewal'}         value={formatCurrencyCompact(expectedRevenueSummary.renewalExposure ?? 0)}            color="text-warning"     valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'نظرة على الإيراد المتوقع' : 'Expected Revenue Overview'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'يعرض هذا التبويب النقد المتوقع من التجديدات القريبة، مع إظهار قاعدة الإيراد الحالية بشكل منفصل.'
                      : 'This forecast focuses on renewal cash expected in the next 30 days and shows the current revenue base separately.'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="border-2 border-border bg-secondary/20 p-4">
                      <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'معدل الاحتفاظ المستخدم' : 'Retention used in forecast'}</p>
                      <p className="text-2xl font-bold text-success">{formatPercent(expectedRevenueSummary.expectedRetentionRate ?? 0)}</p>
                    </div>
                    <div className="border-2 border-border bg-secondary/20 p-4">
                      <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'أعضاء تنتهي اشتراكاتهم قريباً' : 'Members due soon'}</p>
                      <p className="text-2xl font-bold text-primary">{expectedRevenueSummary.membersDue ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}</p>
          ))}

          {tab === 'renewal-vs-new' && (renewalSummary ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'تجديدات'         : 'Renewal Revenue'}  value={formatCurrencyCompact(renewalSummary.renewalRevenue ?? 0)}                                                       color="text-success"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'اشتراكات جديدة'  : 'New Revenue'}       value={formatCurrencyCompact(renewalSummary.newRevenue ?? 0)}                                                            color="text-primary"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إجمالي الإيراد'  : 'Total Revenue'}     value={formatCurrencyCompact((renewalSummary.renewalRevenue ?? 0) + (renewalSummary.newRevenue ?? 0))}                  color="text-foreground"  valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'عدد المعاملات'    : 'Transactions'}       value={(renewalSummary.renewalCount ?? 0) + (renewalSummary.newCount ?? 0)}                                             color="text-foreground"  valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'التجديد مقابل الاشتراك الجديد' : 'Renewal vs New Revenue'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'day',            label: labels.date,                         render: (row: any) => formatDate(row.day, lang === 'ar' ? 'ar-EG' : 'en-US') },
                      { key: 'newRevenue',     label: lang === 'ar' ? 'جديد'     : 'New Revenue',     render: (row: any) => formatCurrency(toNumber(row.newRevenue)) },
                      { key: 'renewalRevenue', label: lang === 'ar' ? 'تجديد'    : 'Renewal Revenue', render: (row: any) => formatCurrency(toNumber(row.renewalRevenue)) },
                      { key: 'newCount',       label: lang === 'ar' ? 'عدد الجديد'  : 'New Count' },
                      { key: 'renewalCount',   label: lang === 'ar' ? 'عدد التجديد' : 'Renewal Count' },
                    ]}
                    data={renewalRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد معاملات كافية.' : 'Not enough recent transactions.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}</p>
          ))}

          {PAYMENT_METHOD_UI_ENABLED && tab === 'cash-vs-digital' && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={labels.cash_payment_method}    value={formatCurrencyCompact(data?.summary?.cashRevenue ?? 0)}    color="text-success"     valueSize="text-2xl" />
                <StatCard label={labels.digital_payment_method} value={formatCurrencyCompact(data?.summary?.digitalRevenue ?? 0)} color="text-primary"     valueSize="text-2xl" />
                <StatCard label={labels.unknown_payment_method} value={formatCurrencyCompact(data?.summary?.unknownRevenue ?? 0)} color="text-warning"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إجمالي الإيراد' : 'Total Revenue'} value={formatCurrencyCompact(data?.summary?.totalRevenue ?? 0)} color="text-foreground" valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'النقدي مقابل الرقمي' : 'Cash vs Digital Split'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'يعرض هذا التبويب الإيراد حسب طريقة الدفع. ستظهر العمليات القديمة بدون طريقة محددة ضمن فئة "غير معروف".'
                      : 'This tab splits revenue by payment method. Older records without a stored method remain under "Unknown".'}
                  </p>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'method',  label: labels.payment_method_label, render: (row: any) => row.method === 'cash' ? labels.cash_payment_method : row.method === 'digital' ? labels.digital_payment_method : labels.unknown_payment_method },
                      { key: 'revenue', label: lang === 'ar' ? 'الإيراد'       : 'Revenue',      render: (row: any) => formatCurrency(toNumber(row.revenue)) },
                      { key: 'count',   label: lang === 'ar' ? 'عدد العمليات'  : 'Transactions' },
                    ]}
                    data={Array.isArray(data?.rows) ? data.rows : []}
                    emptyMessage={lang === 'ar' ? 'لا توجد معاملات مالية كافية.' : 'Not enough payment records yet.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'referral-funnel' && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'دعوات مرسلة'   : 'Invites Sent'}       value={referralSummary?.invitesSent ?? 0}                             color="text-foreground"  valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'دعوات مستخدمة' : 'Invites Used'}        value={referralSummary?.invitesUsed ?? 0}                             color="text-warning"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تحويلات'       : 'Conversions'}         value={referralSummary?.convertedMembers ?? 0}                        color="text-success"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إيراد الإحالات': 'Referral Revenue'}    value={formatCurrencyCompact(referralSummary?.referralRevenue ?? 0)}   color="text-primary"     valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'مسار الإحالة من الدعوة إلى العضوية' : 'Invite to Member Conversion Funnel'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'inviterName',      label: lang === 'ar' ? 'العضو الداعي' : 'Inviter' },
                      { key: 'invitesSent',      label: lang === 'ar' ? 'الدعوات'      : 'Invites' },
                      { key: 'invitesUsed',      label: lang === 'ar' ? 'المستخدمة'    : 'Used' },
                      { key: 'convertedMembers', label: lang === 'ar' ? 'التحويلات'    : 'Converted' },
                      { key: 'conversionRate',   label: lang === 'ar' ? 'التحويل'      : 'Conversion', render: (row: any) => formatPercent(row.conversionRate ?? 0) },
                      { key: 'referralRevenue',  label: lang === 'ar' ? 'الإيراد'      : 'Revenue',    render: (row: any) => formatCurrency(toNumber(row.referralRevenue)) },
                    ]}
                    data={referralRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد دعوات مرتبطة حالياً.' : 'No linked invites yet.'}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'post-expiry-performance' && (postExpirySummary ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'أعضاء في التسلسل' : 'Members In Sequence'} value={postExpirySummary.membersInSequence ?? 0} color="text-warning"    valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'رسائل مرسلة'      : 'Messages Sent'}         value={postExpirySummary.messagesSent ?? 0}      color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تجديدات ناجحة'    : 'Renewals Won'}           value={postExpirySummary.renewalsWon ?? 0}       color="text-success"    valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'إيراد محفوظ'      : 'Revenue Saved'}          value={formatCurrencyCompact(postExpirySummary.revenueSaved ?? 0)} color="text-primary" valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'أداء تسلسل ما بعد انتهاء الاشتراك' : 'Post-Expiry Recovery Performance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'step',           label: lang === 'ar' ? 'اليوم'     : 'Day',      render: (row: any) => row.step === 0 ? 'Day 0' : `Day ${row.step}` },
                      { key: 'messagesSent',   label: lang === 'ar' ? 'تم الإرسال': 'Sent' },
                      { key: 'membersReached', label: lang === 'ar' ? 'الأعضاء'   : 'Members' },
                      { key: 'renewalsWon',    label: lang === 'ar' ? 'التجديدات' : 'Renewals' },
                      { key: 'revenueSaved',   label: lang === 'ar' ? 'الإيراد'   : 'Revenue',  render: (row: any) => formatCurrency(row.revenueSaved ?? 0) },
                    ]}
                    data={postExpiryRows}
                    emptyMessage={lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No post-expiry sequence data yet.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}</p>
          ))}

          {tab === 'onboarding-performance' && (onboardingSummary ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'أعضاء جدد'            : 'New Members'}           value={onboardingSummary.joinedMembers ?? 0}         color="text-foreground" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'أول زيارة'            : 'First Visits'}           value={onboardingSummary.firstVisitMembers ?? 0}     color="text-success"    valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? '٣ زيارات خلال ١٤ يوم' : '3 Visits In 14 Days'}   value={onboardingSummary.completedThreeVisits14d ?? 0} color="text-primary"   valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'تنبيه عدم العودة'     : 'No-Return Alerts'}       value={onboardingSummary.noReturnAlerts ?? 0}         color="text-warning"    valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'أداء تهيئة أول ٧٢ ساعة' : 'Early Onboarding Performance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'stage', label: lang === 'ar' ? 'المرحلة' : 'Stage' },
                      { key: 'count', label: lang === 'ar' ? 'العدد'   : 'Count' },
                    ]}
                    data={onboardingRows.map((row: any) => ({
                      ...row,
                      stage:
                        row.stage === 'welcome'                  ? (lang === 'ar' ? 'ترحيب'                   : 'Welcome') :
                        row.stage === 'first_visit'              ? (lang === 'ar' ? 'أول زيارة'               : 'First Visit') :
                        row.stage === 'first_visit_recognition'  ? (lang === 'ar' ? 'رسالة أول زيارة'         : 'First Visit Recognition') :
                        row.stage === 'completed_3_visits_14d'   ? (lang === 'ar' ? '٣ زيارات خلال ١٤ يوم'   : '3 Visits In 14 Days') :
                        row.stage === 'no_return_alert'          ? (lang === 'ar' ? 'تنبيه عدم العودة'        : 'No-Return Alert') :
                                                                   (lang === 'ar' ? 'انخفاض التفاعل ١٤ يوم'  : 'Low Engagement Day 14'),
                    }))}
                    emptyMessage={lang === 'ar' ? 'لا توجد بيانات تهيئة بعد.' : 'No onboarding data yet.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}</p>
          ))}

          {tab === 'weekly-digest' && (digest ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'إيراد مهدد'        : 'Revenue At Risk'}    value={formatCurrencyCompact(digest.summary?.revenueAtRisk ?? 0)}  color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الاحتفاظ'          : 'Retention'}           value={formatPercent(digest.summary?.retentionRate ?? 0)}           color="text-success"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'محفوظ بواتساب'     : 'WhatsApp Saved'}      value={formatCurrencyCompact(digest.summary?.revenueSaved ?? 0)}    color="text-primary"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'أعضاء معرضون للخطر': 'At-Risk Members'}    value={digest.summary?.atRiskMembers ?? 0}                          color="text-warning"     valueSize="text-2xl" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'ملخص أسبوعي جاهز للإرسال' : 'Weekly Digest Preview'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'هذا هو الشكل المختصر الذي يمكن إرساله لمالك الصالة كل أسبوع.'
                      : 'This is the short-form summary an owner can receive every week.'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="border-2 border-border bg-secondary/20 p-4">
                      <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'أهم خطر' : 'Top risk'}</p>
                      <p className="font-semibold">
                        {digest.summary?.atRiskMembers > 0
                          ? (lang === 'ar' ? `${digest.summary.atRiskMembers} عضو معرّض للتسرب` : `${digest.summary.atRiskMembers} members at risk of churning`)
                          : (lang === 'ar' ? 'لا توجد مخاطر مرتفعة هذا الأسبوع' : 'No high-risk members this week')}
                      </p>
                    </div>
                    <div className="border-2 border-border bg-secondary/20 p-4">
                      <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'تأثير واتساب' : 'WhatsApp effect'}</p>
                      <p className="font-semibold">
                        {(digest.summary?.revenueSaved ?? 0) > 0
                          ? (lang === 'ar' ? `تم حماية ${formatCurrencyCompact(digest.summary.revenueSaved)} بتذكيرات واتساب` : `${formatCurrencyCompact(digest.summary.revenueSaved)} protected by WhatsApp reminders`)
                          : (lang === 'ar' ? 'اربط واتساب لتتبع الأثر' : 'Connect WhatsApp to track impact')}
                      </p>
                    </div>
                  </div>
                  {digest.message && (
                    <div className="border-2 border-border bg-card p-4">
                      <p className="text-sm leading-7">{digest.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}</p>
          ))}

          {/* Daily Stats — stacked bar chart */}
          {tab === 'daily-stats' && (Array.isArray(data) && data.length > 0 ? (
            <DailyStatsChart data={data} labels={labels} styles={rs} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}</p>
          ))}

          {/* Hourly Distribution — heat map */}
          {tab === 'hourly' && (Array.isArray(data) && data.length > 0 ? (
            <HourlyHeatmap data={data} lang={lang} title={labels.hourly_distribution} />
          ) : (
            <div className="border-2 border-border bg-card py-12 text-center">
              <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات حضور بعد.' : 'No check-in data yet.'}</p>
            </div>
          ))}

          {tab === 'top-members' && (Array.isArray(data) && data.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>{labels.top_members}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'rank',   label: labels.rank },
                    { key: 'name',   label: labels.name },
                    { key: 'visits', label: labels.visits },
                  ]}
                  data={data.map((m: any, i: number) => ({ ...m, rank: i + 1 }))}
                />
              </CardContent>
            </Card>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد زيارات بعد.' : 'No visits yet.'}</p>
          ))}

          {tab === 'expiring-subs' && (Array.isArray(data) && data.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>{labels.expiring_subscriptions}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name',     label: labels.name },
                    { key: 'phone',    label: labels.phone },
                    { key: 'end_date', label: labels.end_date, render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US') },
                    { key: 'days_left',label: labels.days_left, render: (row: any) => {
                      const d = daysUntil(row.end_date);
                      return <span className={d <= 2 ? 'text-destructive font-bold' : 'text-warning'}>{d}</span>;
                    }},
                  ]}
                  data={data}
                  emptyMessage={lang === 'ar' ? 'لا اشتراكات تنتهي قريباً.' : 'No subscriptions expiring soon.'}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="border-2 border-border bg-card py-12 text-center">
              <p className="text-lg font-semibold text-success">
                {lang === 'ar' ? '✓ لا اشتراكات تنتهي في هذه الفترة' : '✓ No subscriptions expiring in this window'}
              </p>
            </div>
          ))}

          {tab === 'ended-subs' && (Array.isArray(data) && data.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>{labels.expired_subscriptions}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name',     label: labels.name },
                    { key: 'phone',    label: labels.phone },
                    { key: 'end_date', label: labels.end_date, render: (row: any) => formatDate(row.end_date, lang === 'ar' ? 'ar-EG' : 'en-US') },
                    { key: 'status',   label: labels.status,   render: (row: any) => {
                      const lbl = SUB_STATUS_LABELS[row.status]?.[lang] ?? row.status;
                      return <span className={row.status === 'expired' ? 'text-destructive font-bold' : 'text-warning'}>{lbl}</span>;
                    }},
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا اشتراكات منتهية.' : 'No ended subscriptions.'}</p>
          ))}

          {tab === 'denial-reasons' && (Array.isArray(data) && data.length > 0 ? (
            <DenialReasonsChart data={data} labels={labels} styles={rs} colors={PIE_COLORS} lang={lang} />
          ) : (
            <div className="border-2 border-border bg-card py-12 text-center">
              <p className="text-lg font-semibold text-success">
                {lang === 'ar' ? '✓ لا رفضات في هذه الفترة' : '✓ No denials in this window'}
              </p>
            </div>
          ))}

          {/* ── Net Membership Change ── */}
          {tab === 'net-membership-change' && (data?.summary ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label={lang === 'ar' ? 'هذا الأسبوع (صافي)' : 'This week (net)'}
                  value={data.summary.thisWeek.net >= 0 ? `+${data.summary.thisWeek.net}` : `${data.summary.thisWeek.net}`}
                  color={data.summary.thisWeek.net >= 0 ? 'text-success' : 'text-destructive'}
                  valueSize="text-2xl"
                />
                <StatCard
                  label={lang === 'ar' ? 'انضموا هذا الأسبوع' : 'Joined this week'}
                  value={data.summary.thisWeek.joins}
                  color="text-success"
                  valueSize="text-2xl"
                />
                <StatCard
                  label={lang === 'ar' ? 'انتهت هذا الأسبوع' : 'Ended this week'}
                  value={data.summary.thisWeek.ends}
                  color="text-destructive"
                  valueSize="text-2xl"
                />
                <StatCard
                  label={lang === 'ar' ? 'إجمالي النشطين' : 'Total active'}
                  value={data.summary.totalActive}
                  color="text-foreground"
                  valueSize="text-2xl"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'النمو الأسبوعي — انضمام مقابل إنهاء' : 'Weekly Growth — Joins vs Ends'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {lang === 'ar'
                      ? 'الأسبوع الماضي: +' + data.summary.lastWeek.joins + ' انضموا، ' + data.summary.lastWeek.ends + ' انتهوا (صافي: ' + (data.summary.lastWeek.net >= 0 ? '+' : '') + data.summary.lastWeek.net + ')'
                      : `Last week: +${data.summary.lastWeek.joins} joined, ${data.summary.lastWeek.ends} ended (net: ${data.summary.lastWeek.net >= 0 ? '+' : ''}${data.summary.lastWeek.net})`}
                  </p>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'weekStart', label: lang === 'ar' ? 'الأسبوع' : 'Week', render: (row: any) => formatDate(row.weekStart, lang === 'ar' ? 'ar-EG' : 'en-US') },
                      { key: 'joins',     label: lang === 'ar' ? 'انضموا' : 'Joined', render: (row: any) => <span className="text-success font-semibold">+{row.joins}</span> },
                      { key: 'ends',      label: lang === 'ar' ? 'انتهوا' : 'Ended',  render: (row: any) => <span className="text-destructive font-semibold">{row.ends}</span> },
                      { key: 'net',       label: lang === 'ar' ? 'الصافي' : 'Net',    render: (row: any) => <span className={row.net >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>{row.net >= 0 ? `+${row.net}` : row.net}</span> },
                    ]}
                    data={Array.isArray(data.weeks) ? [...data.weeks].reverse() : []}
                    emptyMessage={lang === 'ar' ? 'لا بيانات بعد.' : 'No data yet.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}</p>
          ))}

          {/* ── Visit Frequency → Churn Risk ── */}
          {tab === 'visit-frequency-risk' && (data?.segments ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={lang === 'ar' ? 'إجمالي النشطين'                  : 'Total Active'}                value={data.summary.totalActive}      color="text-foreground"  valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'يزورون أقل من مرتين أسبوعياً' : 'Visit Less Than 2×/Week'}  value={data.summary.atRiskCount}      color="text-destructive" valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'لم يحضروا منذ ٤ أسابيع'       : 'No Visits in 4 Weeks'}     value={data.summary.criticalCount}    color="text-warning"     valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'يحضرون ٣ مرات أو أكثر'        : 'Visit 3+ Times/Week'}      value={data.summary.safeCount}        color="text-success"     valueSize="text-2xl" />
              </div>

              <div className="space-y-4">
                {data.segments.map((seg: any) => (
                  <Card key={seg.key} className={cn(
                    seg.churnRisk === 'critical' && 'border-destructive/60',
                    seg.churnRisk === 'high'     && 'border-warning/60',
                    seg.churnRisk === 'medium'   && 'border-yellow-600/40',
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{seg.label}</CardTitle>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'text-sm font-bold',
                            seg.churnRisk === 'critical' && 'text-destructive',
                            seg.churnRisk === 'high'     && 'text-warning',
                            seg.churnRisk === 'medium'   && 'text-yellow-400',
                            seg.churnRisk === 'low'      && 'text-success',
                          )}>
                            {lang === 'ar' ? `خطر التسرب: ${seg.churnRiskPercent}%` : `${seg.churnRiskPercent}% churn risk`}
                          </span>
                          <span className="text-sm text-muted-foreground">{seg.memberCount} {lang === 'ar' ? 'عضو' : 'members'}</span>
                        </div>
                      </div>
                    </CardHeader>
                    {seg.members.length > 0 && (
                      <CardContent>
                        <DataTable
                          columns={[
                            { key: 'name',         label: lang === 'ar' ? 'الاسم' : 'Name' },
                            { key: 'phone',        label: lang === 'ar' ? 'الهاتف' : 'Phone' },
                            { key: 'avgPerWeek',   label: lang === 'ar' ? 'متوسط الزيارات/أسبوع' : 'Avg visits/week' },
                            { key: 'visitsInWindow', label: lang === 'ar' ? 'زيارات (٤ أسابيع)' : 'Visits (4 wks)' },
                            { key: 'endDate',      label: lang === 'ar' ? 'ينتهي' : 'Expires', render: (row: any) => formatDate(row.endDate, lang === 'ar' ? 'ar-EG' : 'en-US') },
                          ]}
                          data={seg.members}
                          emptyMessage={lang === 'ar' ? 'لا أعضاء في هذه الفئة.' : 'No members in this segment.'}
                        />
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {lang === 'ar'
                  ? 'المصدر: بيانات IHRSA 2024 — الأعضاء الذين يترددون مرة واحدة أسبوعياً لديهم احتمال إلغاء 50٪، مرتين 25٪، 3 مرات وأكثر أقل من 5٪.'
                  : 'Source: IHRSA 2024 data — members visiting 1×/week have 50% cancel rate, 2×/week 25%, 3×+/week under 5%.'}
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}</p>
          ))}

          {tab === 'denied-entries' && (Array.isArray(data) && data.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>{labels.denied_entries}</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name',        label: labels.name },
                    { key: 'timestamp',   label: labels.time,   render: (row: any) => formatDateTime(row.timestamp, lang === 'ar' ? 'ar-EG' : 'en-US') },
                    { key: 'reason_code', label: labels.reason, render: (row: any) => {
                      const DENIAL_LABELS: Record<string, { en: string; ar: string }> = {
                        unknown_member:           { en: 'Not found',           ar: 'غير موجود' },
                        cooldown:                 { en: 'Scanned too soon',    ar: 'تم المسح مؤخراً' },
                        already_checked_in_today: { en: 'Already checked in',  ar: 'سجّل حضور اليوم' },
                        no_active_subscription:   { en: 'No subscription',     ar: 'لا اشتراك نشط' },
                        quota_exceeded:           { en: 'Sessions used up',    ar: 'نفدت الجلسات' },
                        subscription_frozen:      { en: 'Subscription frozen', ar: 'الاشتراك مجمّد' },
                      };
                      const lbl = DENIAL_LABELS[row.reason_code];
                      return lbl ? lbl[lang as 'en' | 'ar'] : row.reason_code;
                    }},
                  ]}
                  data={data}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="border-2 border-border bg-card py-12 text-center">
              <p className="text-lg font-semibold text-success">
                {lang === 'ar' ? '✓ لا سجلات رفض في هذه الفترة' : '✓ No denied entries in this window'}
              </p>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}
