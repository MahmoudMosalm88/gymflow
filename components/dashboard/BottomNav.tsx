'use client';

import { type MouseEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLang, t } from '@/lib/i18n';
import { useAuth } from '@/lib/use-auth';
import { getNavKeysForRole, type NavKey } from '@/lib/permissions';
import MoreSheet from './MoreSheet';
import { getOnboardingChecklistNavLock, subscribeToOnboardingStateChanges } from '@/lib/onboarding-client';

/* ── Role-based bottom bar items ── */
// Each role gets up to 4 nav items + the center Scan button + More
type BottomItem = { key: NavKey; href: string };

const roleBottomItems: Record<string, BottomItem[]> = {
  owner: [
    { key: 'dashboard', href: '/dashboard' },
    { key: 'members', href: '/dashboard/members' },
    // Scan goes in the center — handled separately
    { key: 'income', href: '/dashboard/income' },
  ],
  manager: [
    { key: 'dashboard', href: '/dashboard' },
    { key: 'members', href: '/dashboard/members' },
    { key: 'subscriptions', href: '/dashboard/subscriptions' },
  ],
  staff: [
    { key: 'dashboard', href: '/dashboard' },
    { key: 'members', href: '/dashboard/members' },
    { key: 'subscriptions', href: '/dashboard/subscriptions' },
  ],
  trainer: [
    { key: 'pt', href: '/dashboard/pt' },
    { key: 'members', href: '/dashboard/members' },
  ],
};

/* ── Icons (compact for bottom bar) ── */
const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <rect x="3" y="3" width="6" height="6" />
      <rect x="11" y="3" width="6" height="6" />
      <rect x="3" y="11" width="6" height="6" />
      <rect x="11" y="11" width="6" height="6" />
    </svg>
  ),
  members: (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="3" />
      <path d="M2 17c0-3 2.5-5 5-5s5 2 5 5" />
      <circle cx="14" cy="7" r="2" />
      <path d="M14 12c2 0 4 1.5 4 4" />
    </svg>
  ),
  income: (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <rect x="2" y="3" width="16" height="14" />
      <path d="M2 7h16" />
      <path d="M10 10v4" />
      <path d="M7 12v2" />
      <path d="M13 11v3" />
    </svg>
  ),
  subscriptions: (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <rect x="2" y="4" width="16" height="12" />
      <path d="M2 8h16" />
      <path d="M6 12h3" />
    </svg>
  ),
  pt: (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16V9" />
      <path d="M10 16V4" />
      <path d="M16 16v-6" />
      <path d="M2 16h16" />
    </svg>
  ),
};

/* ── Scan icon (center CTA) ── */
const scanIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
    {/* QR-style scan corners */}
    <path d="M3 7V3h4" />
    <path d="M17 3h4v4" />
    <path d="M21 17v4h-4" />
    <path d="M7 21H3v-4" />
    {/* Center line */}
    <path d="M7 12h10" strokeWidth="1.5" />
  </svg>
);

/* ── More icon (three dots) ── */
const moreIcon = (
  <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
    <circle cx="10" cy="4" r="1.5" />
    <circle cx="10" cy="10" r="1.5" />
    <circle cx="10" cy="16" r="1.5" />
  </svg>
);

export default function BottomNav() {
  const pathname = usePathname();
  const { lang } = useLang();
  const { profile } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [checklistLockPath, setChecklistLockPath] = useState<string | null>(null);

  const role = profile?.role || 'owner';
  const allKeys = getNavKeysForRole(role);
  const bottomItems = roleBottomItems[role] || roleBottomItems.owner;

  // Items shown in the "More" sheet = all nav items NOT in the bottom bar and not "scan"
  const bottomKeySet = new Set(bottomItems.map((i) => i.key));
  const moreItems = allKeys.filter((k) => !bottomKeySet.has(k));

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  // Check if any "more" item is active (to highlight the More button)
  const moreActive = moreItems.some((key) => {
    const href = key === 'dashboard' ? '/dashboard' : `/dashboard/${key.replace('_', '-')}`;
    return isActive(href);
  });

  useEffect(() => {
    const syncLock = () => setChecklistLockPath(getOnboardingChecklistNavLock()?.path ?? null);
    syncLock();
    return subscribeToOnboardingStateChanges(syncLock);
  }, [pathname]);

  const showChecklistNav = checklistLockPath !== null && !pathname.startsWith('/dashboard/onboarding');
  const blockOtherTabs = showChecklistNav;

  function showChecklistMessage() {
    toast.message(
      lang === 'ar'
        ? 'أكمِل قائمة التشغيل أولاً ثم افتح باقي التبويبات.'
        : 'Finish the checklist first, then the rest of the tabs will open up.'
    );
  }

  function handleBlockedClick(event: MouseEvent, href: string) {
    const navPath = href.split('?')[0];
    if (!blockOtherTabs || navPath === checklistLockPath || href === '/dashboard/onboarding') {
      return;
    }

    event.preventDefault();
    showChecklistMessage();
  }

  return (
    <>
      {/* Fixed bottom bar — only visible on mobile (hidden on lg+) */}
      <nav
        className="fixed bottom-0 start-0 end-0 z-50 flex items-end justify-around border-t-2 border-border bg-background lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Left items */}
        {bottomItems.slice(0, 2).map((item) => {
          const active = isActive(item.href);
          const dimmed = blockOtherTabs && item.href.split('?')[0] !== checklistLockPath;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={(event) => handleBlockedClick(event, item.href)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-[3px] text-[10px] font-medium transition-colors ${
                active ? 'text-destructive' : 'text-muted-foreground'
              } ${dimmed ? 'opacity-35' : ''}`}
            >
              {/* Animated active indicator bar */}
              {active && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute bottom-0 start-0 end-0 h-[3px] bg-destructive"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span aria-hidden="true" className={active ? 'text-destructive' : 'text-muted-foreground'}>{icons[item.key]}</span>
              {t[lang][item.key]}
            </Link>
          );
        })}

        {/* Center Scan CTA — elevated circle */}
        <Link
          href="/dashboard"
          onClick={(e) => {
            if (blockOtherTabs) {
              if ('/dashboard' !== checklistLockPath) {
                e.preventDefault();
                showChecklistMessage();
                return;
              }
            }
            e.preventDefault();
            // Navigate to dashboard and click the camera button
            if (pathname === '/dashboard') {
              // Already on dashboard — click the camera button directly
              const cameraBtn = document.querySelector<HTMLButtonElement>('[data-camera-trigger]');
              if (cameraBtn) {
                cameraBtn.click();
                return;
              }
            }
            // Navigate to dashboard with scan flag
            window.location.href = '/dashboard?scan=1';
          }}
          className={`relative -mt-5 flex flex-col items-center gap-0.5 ${blockOtherTabs && checklistLockPath !== '/dashboard' ? 'opacity-35' : ''}`}
        >
          <span className="flex h-14 w-14 items-center justify-center bg-destructive text-white shadow-[4px_4px_0_#000000]">
            {scanIcon}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground pb-2">{t[lang].scan}</span>
        </Link>

        {/* Right items */}
        {bottomItems.slice(2).map((item) => {
          const active = isActive(item.href);
          const dimmed = blockOtherTabs && item.href.split('?')[0] !== checklistLockPath;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={(event) => handleBlockedClick(event, item.href)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-[3px] text-[10px] font-medium transition-colors ${
                active ? 'text-destructive' : 'text-muted-foreground'
              } ${dimmed ? 'opacity-35' : ''}`}
            >
              {active && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute bottom-0 start-0 end-0 h-[3px] bg-destructive"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span aria-hidden="true" className={active ? 'text-destructive' : 'text-muted-foreground'}>{icons[item.key]}</span>
              {t[lang][item.key]}
            </Link>
          );
        })}

        {/* More button */}
        {showChecklistNav ? (
          <Link
            href="/dashboard/onboarding"
            className="relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-[3px] text-[10px] font-medium text-destructive"
          >
            <motion.div
              layoutId="bottomnav-indicator"
              className="absolute bottom-0 start-0 end-0 h-[3px] bg-destructive"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
            <span
              aria-hidden="true"
              className="text-destructive drop-shadow-[0_0_10px_rgba(220,68,68,0.45)] animate-pulse"
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                <path d="M4 10l4 4 8-8" />
                <rect x="3" y="3" width="14" height="14" rx="0" />
              </svg>
            </span>
            {lang === 'ar' ? 'قائمة التشغيل' : 'Checklist'}
          </Link>
        ) : (
          <button
            onClick={() => setMoreOpen(true)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 pt-2 pb-[3px] text-[10px] font-medium transition-colors ${
              moreActive ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {moreActive && (
              <motion.div
                layoutId="bottomnav-indicator"
                className="absolute bottom-0 start-0 end-0 h-[3px] bg-destructive"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span aria-hidden="true" className={moreActive ? 'text-destructive' : 'text-muted-foreground'}>{moreIcon}</span>
            {t[lang].more}
          </button>
        )}
      </nav>

      {/* More sheet */}
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={moreItems} />
    </>
  );
}
