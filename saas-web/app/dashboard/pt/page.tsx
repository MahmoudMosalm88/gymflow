'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/use-auth';
import { useLang, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
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

      {/* ── Tab content ── */}
      <div role="tabpanel">
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'trainers' && <TrainersTab />}
        {activeTab === 'staff' && <StaffTab />}
        {activeTab === 'performance' && <PerformanceTab />}
      </div>
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
