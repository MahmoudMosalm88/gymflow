'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/use-auth';
import { useLang, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/lib/use-media-query';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

// Lazy-load tabs to keep initial bundle lean
const SessionsTab = dynamic(() => import('@/components/dashboard/pt/SessionsTab'), {
  loading: () => <div className="flex justify-center py-16"><LoadingSpinner /></div>,
});
const TrainersTab = dynamic(() => import('@/components/dashboard/pt/TrainersTab'), {
  loading: () => <div className="flex justify-center py-16"><LoadingSpinner /></div>,
});
const StaffTab = dynamic(() => import('@/components/dashboard/pt/StaffTab'), {
  loading: () => <div className="flex justify-center py-16"><LoadingSpinner /></div>,
});
const PerformanceTab = dynamic(() => import('@/components/dashboard/pt/PerformanceTab'), {
  loading: () => <div className="flex justify-center py-16"><LoadingSpinner /></div>,
});

type TabKey = 'sessions' | 'trainers' | 'staff' | 'performance';

const TABS: { key: TabKey; labelKey: string; roles: string[] }[] = [
  { key: 'sessions',    labelKey: 'pt_sessions',      roles: ['owner', 'manager', 'staff', 'trainer'] },
  { key: 'trainers',    labelKey: 'trainers_tab',      roles: ['owner', 'manager', 'staff'] },
  { key: 'staff',       labelKey: 'staff_tab',         roles: ['owner'] },
  { key: 'performance', labelKey: 'performance_tab',   roles: ['owner', 'manager'] },
];

/* ── Swipeable tab content — drag left/right to switch tabs on mobile ── */
function SwipeableTabs({
  activeTab,
  visibleTabs,
  setTab,
}: {
  activeTab: TabKey;
  visibleTabs: typeof TABS;
  setTab: (tab: TabKey) => void;
}) {
  const isDesktop = useIsDesktop();
  const { lang } = useLang();
  const isRtl = lang === 'ar';

  // Render the active tab's component
  const renderTab = (key: TabKey) => {
    switch (key) {
      case 'sessions':    return <SessionsTab />;
      case 'trainers':    return <TrainersTab />;
      case 'staff':       return <StaffTab />;
      case 'performance': return <PerformanceTab />;
      default:            return null;
    }
  };

  // On desktop, just render with AnimatePresence fade
  if (isDesktop) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          role="tabpanel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {renderTab(activeTab)}
        </motion.div>
      </AnimatePresence>
    );
  }

  // On mobile, enable swipe between tabs
  const currentIndex = visibleTabs.findIndex((t) => t.key === activeTab);
  const SWIPE_THRESHOLD = 50;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeTab}
        role="tabpanel"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, info) => {
          const offset = info.offset.x;
          // In RTL, swipe directions are inverted
          const swipedNext = isRtl ? offset > SWIPE_THRESHOLD : offset < -SWIPE_THRESHOLD;
          const swipedPrev = isRtl ? offset < -SWIPE_THRESHOLD : offset > SWIPE_THRESHOLD;

          if (swipedNext && currentIndex < visibleTabs.length - 1) {
            setTab(visibleTabs[currentIndex + 1].key);
          } else if (swipedPrev && currentIndex > 0) {
            setTab(visibleTabs[currentIndex - 1].key);
          }
        }}
        initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ touchAction: 'pan-y' }}
      >
        {renderTab(activeTab)}
      </motion.div>
    </AnimatePresence>
  );
}

function PtHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { lang } = useLang();
  const labels = t[lang] as Record<string, string>;
  const role = profile?.role ?? 'staff';

  const visibleTabs = TABS.filter(tab => tab.roles.includes(role));
  const rawTab = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = rawTab && visibleTabs.some(t => t.key === rawTab) ? rawTab : visibleTabs[0]?.key ?? 'sessions';

  const setTab = useCallback((tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/dashboard/pt?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">{labels.pt}</h1>
        <p className="text-sm text-muted-foreground">{labels.pt_today_hint}</p>
      </div>

      {/* ── Tab bar ── */}
      {visibleTabs.length > 1 && (
        <div className="flex gap-0 border-b border-border -mb-2 overflow-x-auto no-scrollbar" role="tablist" aria-label={labels.pt}>
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setTab(tab.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-[3px] -mb-[1px]',
                activeTab === tab.key
                  ? 'border-destructive text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {labels[tab.labelKey] ?? tab.key}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab content (swipeable on mobile) ── */}
      <SwipeableTabs
        activeTab={activeTab}
        visibleTabs={visibleTabs}
        setTab={setTab}
      />
    </div>
  );
}

export default function PtHubPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
      <PtHubContent />
    </Suspense>
  );
}
