'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrencyCompact } from '@/lib/format';
import { useIsDesktop } from '@/lib/use-media-query';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAYMENT_METHOD_UI_ENABLED } from '@/lib/payment-method-ui';

// ── Tab components ──
import RevenueAtRiskTab from '@/components/dashboard/reports/tabs/RevenueAtRiskTab';
import PlanRevenueTab from '@/components/dashboard/reports/tabs/PlanRevenueTab';
import RenewalVsNewTab from '@/components/dashboard/reports/tabs/RenewalVsNewTab';
import CashVsDigitalTab from '@/components/dashboard/reports/tabs/CashVsDigitalTab';
import RetentionChurnTab from '@/components/dashboard/reports/tabs/RetentionChurnTab';
import AtRiskMembersTab from '@/components/dashboard/reports/tabs/AtRiskMembersTab';
import CohortRetentionTab from '@/components/dashboard/reports/tabs/CohortRetentionTab';
import TopMembersTab from '@/components/dashboard/reports/tabs/TopMembersTab';
import GrowthTab from '@/components/dashboard/reports/tabs/GrowthTab';
import TrafficTab from '@/components/dashboard/reports/tabs/TrafficTab';
import ReferralFunnelTab from '@/components/dashboard/reports/tabs/ReferralFunnelTab';
import WhatsAppPerformanceTab from '@/components/dashboard/reports/tabs/WhatsAppPerformanceTab';
import OnboardingPerformanceTab from '@/components/dashboard/reports/tabs/OnboardingPerformanceTab';
import WeeklyDigestTab from '@/components/dashboard/reports/tabs/WeeklyDigestTab';
import AccessDenialsTab from '@/components/dashboard/reports/tabs/AccessDenialsTab';

// ── Pinnable stats: for each tab key, how to fetch + display a single headline number ──
const PINNED_STAT_FETCH: Record<string, { url: string; extract: (d: any) => string }> = {
  'revenue-at-risk':        { url: '/api/reports/revenue-at-risk?days=30',            extract: d => formatCurrencyCompact(d?.summary?.revenueAtRisk ?? d?.summary?.totalValue ?? 0) },
  'whatsapp-performance':   { url: '/api/reports/revenue-saved-whatsapp?days=30',     extract: d => formatCurrencyCompact(d?.summary?.revenueSaved ?? 0) },
  'retention-churn':        { url: '/api/reports/retention-churn?days=30',            extract: d => `${(d?.summary?.retentionRate ?? 0).toFixed(1)}%` },
  'at-risk-members':        { url: '/api/reports/at-risk-members?days=30',            extract: d => String(d?.summary?.memberCount ?? 0) },
  'growth':                 { url: '/api/reports/net-membership-change?days=30',      extract: d => { const n = d?.summary?.thisWeek?.net ?? 0; return n >= 0 ? `+${n}` : String(n); } },
  'traffic':                { url: '/api/reports/daily-stats?days=7',                 extract: d => String(Array.isArray(d) ? d.reduce((s: number, r: any) => s + Number(r.allowed ?? 0), 0) : 0) },
  'access-denials':         { url: '/api/reports/denial-reasons?days=30',             extract: d => String(Array.isArray(d) ? d.reduce((s: number, r: any) => s + Number(r.count ?? 0), 0) : 0) },
  'renewal-vs-new':         { url: '/api/reports/renewal-vs-new?days=30',             extract: d => formatCurrencyCompact((d?.summary?.renewalRevenue ?? 0) + (d?.summary?.newRevenue ?? 0)) },
  'cohort-retention':       { url: '/api/reports/cohort-retention',                   extract: d => Array.isArray(d) && d.length ? `${(d[0]?.retentionRate ?? 0).toFixed(0)}%` : '—' },
  'plan-revenue':           { url: '/api/reports/revenue-by-plan?days=30',            extract: d => formatCurrencyCompact(Array.isArray(d) ? d.reduce((s: number, r: any) => s + Number(r.totalRevenue ?? 0), 0) : 0) },
  'top-members':            { url: '/api/reports/top-members?days=30&limit=1',        extract: d => Array.isArray(d) && d[0] ? `${d[0].visits} visits` : '—' },
  'onboarding-performance': { url: '/api/reports/onboarding-performance?days=30',     extract: d => String(d?.summary?.firstVisitMembers ?? 0) },
  'weekly-digest':          { url: '/api/reports/weekly-digest',                      extract: d => `${(d?.summary?.retentionRate ?? 0).toFixed(1)}%` },
  'referral-funnel':        { url: '/api/reports/referral-funnel?days=30',            extract: d => String(d?.summary?.convertedMembers ?? 0) },
};

const PINNED_STAT_COLOR: Record<string, string> = {
  'revenue-at-risk': 'text-destructive',
  'at-risk-members': 'text-warning',
  'access-denials': 'text-warning',
  'whatsapp-performance': 'text-success',
  'retention-churn': 'text-success',
  'growth': 'text-success',
  'plan-revenue': 'text-success',
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
    }).catch(() => {
      if (!cancelled) setStatLoading(false);
    });
    return () => { cancelled = true; };
  }, [tabKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const valueColor = PINNED_STAT_COLOR[tabKey] ?? 'text-primary';

  return (
    <button
      onClick={() => onNavigate(tabKey)}
      className="group relative inline-flex items-center gap-3 border-2 border-border bg-card px-4 py-3 text-start shadow-[6px_6px_0_#000000] transition-colors hover:border-destructive/40 hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
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

// ── Consolidated tabs (25 → 15) ──
const TABS = [
  // Revenue (3)
  { key: 'revenue-at-risk',       label: { en: 'Revenue At Risk',    ar: 'الإيراد المعرّض للخطر' } },
  { key: 'plan-revenue',          label: { en: 'Plan Revenue',        ar: 'إيراد الخطط' } },
  { key: 'renewal-vs-new',        label: { en: 'Renewal vs New',      ar: 'تجديد مقابل جديد' } },
  ...(PAYMENT_METHOD_UI_ENABLED ? [{ key: 'cash-vs-digital' as const, label: { en: 'Cash vs Digital', ar: 'نقدي مقابل رقمي' } }] : []),
  // Retention (4)
  { key: 'retention-churn',       label: { en: 'Retention',           ar: 'الاحتفاظ' } },
  { key: 'at-risk-members',       label: { en: 'At-Risk',             ar: 'المعرّضون للخطر' } },
  { key: 'cohort-retention',      label: { en: 'Cohorts',             ar: 'المجموعات' } },
  { key: 'top-members',           label: { en: 'Top Clients',         ar: 'أفضل العملاء' } },
  // Operations (3)
  { key: 'growth',                label: { en: 'Growth',              ar: 'النمو' } },
  { key: 'traffic',               label: { en: 'Traffic',             ar: 'الحركة' } },
  { key: 'referral-funnel',       label: { en: 'Referral Funnel',     ar: 'مسار الإحالة' } },
  // WhatsApp (3)
  { key: 'whatsapp-performance',  label: { en: 'WhatsApp',            ar: 'واتساب' } },
  { key: 'onboarding-performance',label: { en: 'Onboarding',          ar: 'التهيئة' } },
  { key: 'weekly-digest',         label: { en: 'Weekly Digest',       ar: 'الملخص الأسبوعي' } },
  // Logs (1)
  { key: 'access-denials',        label: { en: 'Access Denials',      ar: 'رفضات الدخول' } },
] as const;

type TabKey = typeof TABS[number]['key'];

const CATEGORIES = [
  {
    key: 'revenue',
    label: { en: 'Revenue', ar: 'الإيراد' },
    tabs: ['revenue-at-risk', 'plan-revenue', 'renewal-vs-new', ...(PAYMENT_METHOD_UI_ENABLED ? ['cash-vs-digital'] : [])] as TabKey[],
  },
  {
    key: 'retention',
    label: { en: 'Retention', ar: 'الاحتفاظ' },
    tabs: ['retention-churn', 'at-risk-members', 'cohort-retention', 'top-members'] as TabKey[],
  },
  {
    key: 'operations',
    label: { en: 'Operations', ar: 'التشغيل' },
    tabs: ['growth', 'traffic', 'referral-funnel'] as TabKey[],
  },
  {
    key: 'whatsapp',
    label: { en: 'WhatsApp', ar: 'واتساب' },
    tabs: ['whatsapp-performance', 'onboarding-performance', 'weekly-digest'] as TabKey[],
  },
  {
    key: 'logs',
    label: { en: 'Logs', ar: 'السجلات' },
    tabs: ['access-denials'] as TabKey[],
  },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

// Tabs that show the days period filter
const DAYS_TABS: TabKey[] = [
  'revenue-at-risk', 'plan-revenue', 'retention-churn', 'at-risk-members',
  'renewal-vs-new', 'referral-funnel', 'onboarding-performance',
  'growth', 'traffic', 'top-members', 'access-denials',
  'whatsapp-performance',
];
const DAYS_OPTIONS = [7, 14, 30, 60, 90];

// Tab descriptions
const TAB_DESCRIPTIONS: Record<string, { en: string; ar: string }> = {
  'revenue-at-risk':         { en: 'Subscriptions expiring soon with no renewal — the exact cash you stand to lose if you do nothing.', ar: 'الاشتراكات التي تنتهي قريباً دون تجديد — المبلغ الذي ستخسره إذا لم تتحرك.' },
  'plan-revenue':            { en: 'Revenue broken down by subscription plan — which plans generate the most and which are dead weight.', ar: 'تفاصيل الإيراد حسب نوع الاشتراك — أي الخطط تجلب أكثر وأيها لا يُسهم.' },
  'renewal-vs-new':          { en: 'Revenue split into renewals vs. new members — is growth real or just old members cycling through?', ar: 'الإيراد مقسوم إلى تجديدات مقابل أعضاء جدد — هل النمو حقيقي أم مجرد تدوير؟' },
  'cash-vs-digital':         { en: 'Cash vs. digital payments — spot unreported cash and plan which methods to push.', ar: 'مقارنة النقدي بالرقمي — اكتشف النقد غير المسجل.' },
  'retention-churn':         { en: 'Monthly retention rate — the #1 health indicator for your gym.', ar: 'معدل الاحتفاظ الشهري — أهم مؤشر لصحة الصالة.' },
  'at-risk-members':         { en: 'Members showing early warning signs — ghost members, attendance decline, and visit frequency all in one view.', ar: 'الأعضاء الذين تظهر عليهم علامات الإلغاء — الغائبون وتراجع الحضور وتكرار الزيارات في عرض واحد.' },
  'cohort-retention':        { en: 'Members grouped by join month — how many from each cohort are still active today.', ar: 'الأعضاء حسب شهر الانضمام — كم بقي نشطاً من كل مجموعة.' },
  'top-members':             { en: 'Your most loyal, highest-visit members — protect, reward, and ask for referrals.', ar: 'أكثر أعضائك حضوراً وولاءً — يستحقون المكافأة والتشجيع.' },
  'growth':                  { en: 'Weekly joins vs. ends — are you actually growing or just replacing people who leave?', ar: 'كم انضم وكم غادر كل أسبوع — هل تنمو فعلاً أم تستبدل من يغادر؟' },
  'traffic':                 { en: 'Daily check-in breakdown + hourly heatmap — spot peak times and optimize staff schedules.', ar: 'تفاصيل الحضور اليومية + خريطة حرارية بالساعة — اكتشف أوقات الذروة.' },
  'referral-funnel':         { en: 'How many referred leads converted to paid members — which sources are worth rewarding.', ar: 'كم إحالة تحوّلت لعضوية فعلية — أي المصادر تستحق المكافأة.' },
  'whatsapp-performance':    { en: 'WhatsApp ROI, message performance by type, and post-expiry recovery — all in one place.', ar: 'عائد واتساب وأداء الرسائل واسترداد ما بعد الانتهاء — في مكان واحد.' },
  'onboarding-performance':  { en: 'Are new members hitting the 2×/week habit in their first 90 days? The window that predicts retention.', ar: 'هل الأعضاء الجدد يحضرون مرتين أسبوعياً في الـ90 يوم الأولى؟' },
  'weekly-digest':           { en: 'A snapshot of your gym\'s health this week — retention, revenue, check-ins, and alerts.', ar: 'لمحة عن صحة صالتك هذا الأسبوع — الاحتفاظ والإيراد والحضور.' },
  'access-denials':          { en: 'Why members are blocked at the gate — denial reasons breakdown plus the full log of every attempt.', ar: 'لماذا يُرفض الأعضاء عند البوابة — أسباب الرفض وسجل كل المحاولات.' },
};

function categoryForTab(tabKey: TabKey): CategoryKey {
  for (const cat of CATEGORIES) {
    if ((cat.tabs as readonly string[]).includes(tabKey)) return cat.key;
  }
  return 'revenue';
}

// ── Self-fetching tabs: these handle their own data loading ──
const SELF_FETCHING_TABS: TabKey[] = ['traffic', 'whatsapp-performance', 'access-denials'];

/* ── Swipeable tab content — drag left/right to switch categories on mobile ── */
function ReportTabContent({
  loading,
  error,
  tab,
  lang,
  labels,
  category,
  changeCategory,
  renderTab,
}: {
  loading: boolean;
  error: string;
  tab: TabKey;
  lang: string;
  labels: Record<string, string>;
  category: CategoryKey;
  changeCategory: (cat: CategoryKey) => void;
  renderTab: () => React.ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const isRtl = lang === 'ar';

  // Loading / error states (no swipe needed)
  if (loading && !SELF_FETCHING_TABS.includes(tab)) {
    return <LoadingSpinner size="lg" />;
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className={cn("h-4 w-4 me-2")} />
        <AlertTitle>{labels.error_title}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Desktop: simple fade transition
  if (isDesktop) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          className="space-y-6"
          role="tabpanel"
          aria-label={TABS.find(t => t.key === tab)?.label[lang as 'en' | 'ar'] ?? tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Mobile: swipe between categories
  const catIndex = CATEGORIES.findIndex((c) => c.key === category);
  const SWIPE_THRESHOLD = 50;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        className="space-y-6"
        role="tabpanel"
        aria-label={TABS.find(t => t.key === tab)?.label[lang as 'en' | 'ar'] ?? tab}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, info) => {
          const offset = info.offset.x;
          const swipedNext = isRtl ? offset > SWIPE_THRESHOLD : offset < -SWIPE_THRESHOLD;
          const swipedPrev = isRtl ? offset < -SWIPE_THRESHOLD : offset > SWIPE_THRESHOLD;

          if (swipedNext && catIndex < CATEGORIES.length - 1) {
            changeCategory(CATEGORIES[catIndex + 1].key);
          } else if (swipedPrev && catIndex > 0) {
            changeCategory(CATEGORIES[catIndex - 1].key);
          }
        }}
        initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ touchAction: 'pan-y' }}
      >
        {renderTab()}
      </motion.div>
    </AnimatePresence>
  );
}

export default function ReportsPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const [tab, setTab] = useState<TabKey>('revenue-at-risk');
  const [category, setCategory] = useState<CategoryKey>('revenue');
  const [days, setDays] = useState(30);

  // Pinned hero cards
  const [pinnedTabs, setPinnedTabs] = useState<TabKey[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('gymflow_pinned_reports');
      return stored ? (JSON.parse(stored) as TabKey[]) : [];
    } catch { return []; }
  });

  const togglePin = useCallback((tabKey: TabKey) => {
    setPinnedTabs(prev => {
      const next = prev.includes(tabKey)
        ? prev.filter(k => k !== tabKey)
        : prev.length < 4 ? [...prev, tabKey] : prev;
      try { localStorage.setItem('gymflow_pinned_reports', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Hero stats
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroStats, setHeroStats] = useState({
    revenueAtRisk: 0, atRiskCount: 0, ghostMembers: 0, revenueSaved: 0, denialCount: 0,
  });

  const [tabSearch, setTabSearch] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch hero stats on mount
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
    }).catch(() => {}).finally(() => { if (!cancelled) setHeroLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const buildUrl = useCallback((activeTab: TabKey, d: number): string | null => {
    switch (activeTab) {
      case 'revenue-at-risk':        return `/api/reports/revenue-at-risk?days=${d}`;
      case 'plan-revenue':           return `/api/reports/revenue-by-plan?days=${d}`;
      case 'retention-churn':        return `/api/reports/retention-churn?days=${d}`;
      case 'at-risk-members':        return `/api/reports/at-risk-members?days=${d}`;
      case 'cohort-retention':       return '/api/reports/cohort-retention';
      case 'renewal-vs-new':         return `/api/reports/renewal-vs-new?days=${d}`;
      case 'cash-vs-digital':        return '/api/reports/cash-vs-digital';
      case 'referral-funnel':        return `/api/reports/referral-funnel?days=${Math.max(d, 30)}`;
      case 'onboarding-performance': return `/api/reports/onboarding-performance?days=${Math.max(d, 30)}`;
      case 'weekly-digest':          return '/api/reports/weekly-digest';
      case 'top-members':            return `/api/reports/top-members?days=${d}&limit=10`;
      case 'growth':                 return `/api/reports/net-membership-change?days=${d}`;
      // Self-fetching tabs — no URL needed from page
      case 'traffic':                return null;
      case 'whatsapp-performance':   return null;
      case 'access-denials':         return null;
      default:                       return null;
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
    // Self-fetching tabs handle their own data
    if (SELF_FETCHING_TABS.includes(tab)) {
      setLoading(false);
      setData(null);
      return;
    }
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

  const jumpToTab = useCallback((targetTab: TabKey) => {
    setLoading(true);
    setError('');
    setData(null);
    setCategory(categoryForTab(targetTab));
    setTab(targetTab);
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
      const firstVisible = catDef.tabs[0];
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
  const searchActive = tabSearch.trim().length > 0;
  const searchLower = tabSearch.trim().toLowerCase();
  const activeCategoryDef = CATEGORIES.find(c => c.key === category)!;
  const visibleCategoryTabs = searchActive
    ? TABS.filter(rt => rt.label.en.toLowerCase().includes(searchLower) || rt.label.ar.includes(tabSearch.trim()))
    : activeCategoryDef.tabs
        .filter(k => TABS.some(rt => rt.key === k))
        .map(k => TABS.find(rt => rt.key === k)!);

  // ── Render the active tab's content ──
  const renderTab = () => {
    switch (tab) {
      case 'revenue-at-risk':        return <RevenueAtRiskTab data={data} lang={lang} labels={labels} days={days} />;
      case 'plan-revenue':           return <PlanRevenueTab data={data} lang={lang} labels={labels} />;
      case 'renewal-vs-new':         return <RenewalVsNewTab data={data} lang={lang} labels={labels} />;
      case 'cash-vs-digital':        return <CashVsDigitalTab data={data} lang={lang} labels={labels} />;
      case 'retention-churn':        return <RetentionChurnTab data={data} lang={lang} labels={labels} />;
      case 'at-risk-members':        return <AtRiskMembersTab data={data} lang={lang} labels={labels} days={days} />;
      case 'cohort-retention':       return <CohortRetentionTab data={data} lang={lang} labels={labels} />;
      case 'top-members':            return <TopMembersTab data={data} lang={lang} labels={labels} />;
      case 'growth':                 return <GrowthTab data={data} lang={lang} labels={labels} days={days} />;
      case 'traffic':                return <TrafficTab lang={lang} labels={labels} days={days} styles={rs} />;
      case 'referral-funnel':        return <ReferralFunnelTab data={data} lang={lang} labels={labels} />;
      case 'whatsapp-performance':   return <WhatsAppPerformanceTab lang={lang} labels={labels} days={days} />;
      case 'onboarding-performance': return <OnboardingPerformanceTab data={data} lang={lang} labels={labels} />;
      case 'weekly-digest':          return <WeeklyDigestTab data={data} lang={lang} labels={labels} />;
      case 'access-denials':         return <AccessDenialsTab lang={lang} labels={labels} days={days} />;
      default:                       return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-heading font-bold tracking-tight">{labels.reports}</h1>

      {/* ── Hero: 4 stat cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button onClick={() => jumpToTab('revenue-at-risk')} className="text-start w-full">
          <StatCard
            label={lang === 'ar' ? 'كم سأخسر هذا الشهر؟' : 'How much am I about to lose?'}
            value={heroLoading ? '...' : formatCurrencyCompact(heroStats.revenueAtRisk)}
            color={heroStats.revenueAtRisk > 0 ? 'text-destructive' : 'text-success'}
            accent={heroStats.revenueAtRisk > 0 ? 'border-s-destructive' : undefined}
            animate
          />
        </button>
        <button onClick={() => jumpToTab('at-risk-members')} className="text-start w-full">
          <StatCard
            label={lang === 'ar' ? 'من توقّف عن الحضور؟' : "Who's gone quiet on me?"}
            value={heroLoading ? '...' : String(heroStats.ghostMembers)}
            color={heroStats.ghostMembers > 0 ? 'text-warning' : 'text-success'}
            accent={heroStats.ghostMembers > 0 ? 'border-s-warning' : undefined}
            animate
          />
        </button>
        <button onClick={() => jumpToTab('access-denials')} className="text-start w-full">
          <StatCard
            label={lang === 'ar' ? 'من يُرفض عند البوابة؟' : "Who's being blocked at the door?"}
            value={heroLoading ? '...' : String(heroStats.denialCount)}
            color={heroStats.denialCount > 0 ? 'text-warning' : 'text-success'}
            accent={heroStats.denialCount > 0 ? 'border-s-warning' : undefined}
            animate
          />
        </button>
        <button onClick={() => jumpToTab('whatsapp-performance')} className="text-start w-full">
          <StatCard
            label={lang === 'ar' ? 'ماذا أنقذت التذكيرات؟' : 'What did my reminders rescue?'}
            value={heroLoading ? '...' : heroStats.revenueSaved > 0 ? formatCurrencyCompact(heroStats.revenueSaved) : '—'}
            color={heroStats.revenueSaved > 0 ? 'text-success' : 'text-muted-foreground'}
            accent={heroStats.revenueSaved > 0 ? 'border-s-success' : undefined}
            animate
          />
        </button>
      </div>

      {/* ── Pinned strip ── */}
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
          <div className="flex overflow-x-auto flex-1 no-scrollbar" role="tablist" aria-label={lang === 'ar' ? 'تبويبات التقارير' : 'Report tabs'}>
            {visibleCategoryTabs.map((item, i) => {
              const isPinned = pinnedTabs.includes(item.key);
              const atMax = pinnedTabs.length >= 4 && !isPinned;
              const urgentTabs: Record<string, boolean> = {
                'revenue-at-risk': heroStats.revenueAtRisk > 0,
                'at-risk-members': heroStats.ghostMembers > 0,
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
                  <button
                    onClick={() => !atMax && togglePin(item.key)}
                    title={atMax ? (lang === 'ar' ? 'الحد الأقصى 4 مثبّتات' : 'Max 4 pins') : isPinned ? (lang === 'ar' ? 'إزالة التثبيت' : 'Unpin') : (lang === 'ar' ? 'تثبيت في الأعلى' : 'Pin to top')}
                    className={cn(
                      'p-3 flex items-center transition-all',
                      isPinned
                        ? 'text-destructive'
                        : 'text-muted-foreground/40 hover:text-muted-foreground group-hover:text-muted-foreground/70',
                      atMax && 'cursor-not-allowed !text-muted-foreground/20',
                    )}
                  >
                    {isPinned ? <PinOff size={15} strokeWidth={2} /> : <Pin size={15} strokeWidth={2} />}
                  </button>
                </div>
              );
            })}
          </div>

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

      {/* ── Tab content (swipeable categories on mobile) ── */}
      <ReportTabContent
        loading={loading}
        error={error}
        tab={tab}
        lang={lang}
        labels={labels}
        category={category}
        changeCategory={changeCategory}
        renderTab={renderTab}
      />
    </div>
  );
}
