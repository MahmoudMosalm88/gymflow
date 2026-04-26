'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang, t } from '@/lib/i18n';
import type { NavKey } from '@/lib/permissions';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/* ── Icon map — reuses the same SVGs from Sidebar ── */
const iconMap: Record<NavKey, React.ReactNode> = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <rect x="3" y="3" width="6" height="6" />
      <rect x="11" y="3" width="6" height="6" />
      <rect x="3" y="11" width="6" height="6" />
      <rect x="11" y="11" width="6" height="6" />
    </svg>
  ),
  members: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="3" />
      <path d="M2 17c0-3 2.5-5 5-5s5 2 5 5" />
      <circle cx="14" cy="7" r="2" />
      <path d="M14 12c2 0 4 1.5 4 4" />
    </svg>
  ),
  guest_passes: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <rect x="3" y="4" width="14" height="10" />
      <path d="M7 8h6" />
      <path d="M10 4v10" />
    </svg>
  ),
  pt: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16V9" />
      <path d="M10 16V4" />
      <path d="M16 16v-6" />
      <path d="M2 16h16" />
    </svg>
  ),
  subscriptions: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <rect x="2" y="4" width="16" height="12" />
      <path d="M2 8h16" />
      <path d="M6 12h3" />
    </svg>
  ),
  reports: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <path d="M3 17V9" />
      <path d="M7 17V5" />
      <path d="M11 17V11" />
      <path d="M15 17V3" />
    </svg>
  ),
  income: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <rect x="2" y="3" width="16" height="14" />
      <path d="M2 7h16" />
      <path d="M10 10v4" />
      <path d="M7 12v2" />
      <path d="M13 11v3" />
    </svg>
  ),
  whatsapp: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="10" r="2" />
      <circle cx="16" cy="4" r="2" />
      <circle cx="16" cy="16" r="2" />
      <path d="M6 10h4" />
      <path d="M10 10l4-4.5" />
      <path d="M10 10l4 4.5" />
    </svg>
  ),
  notifications: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 15.5h4l-1.2-1.2a1.7 1.7 0 0 1-.5-1.2v-2.8a4.8 4.8 0 1 0-9.6 0v2.8c0 .5-.2.9-.5 1.2l-1.2 1.2h4" />
      <path d="M7.5 15.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  ),
  help: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8" />
      <path d="M7.5 7.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5" />
      <circle cx="10" cy="15" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c0-3 2.5-5 6-5s6 2 6 5" />
    </svg>
  ),
};

const navPaths: Record<NavKey, string> = {
  dashboard: '/dashboard',
  members: '/dashboard/members',
  guest_passes: '/dashboard/guest-passes',
  pt: '/dashboard/pt',
  subscriptions: '/dashboard/subscriptions',
  reports: '/dashboard/reports',
  income: '/dashboard/income',
  whatsapp: '/dashboard/whatsapp',
  notifications: '/dashboard/notifications',
  help: '/dashboard/help',
  settings: '/dashboard/settings',
  profile: '/dashboard/profile',
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: NavKey[];
};

export default function MoreSheet({ open, onClose, items }: Props) {
  const pathname = usePathname();
  const { lang } = useLang();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="border-t-2 border-border bg-background px-4 pb-8"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="text-sm font-heading text-foreground">
            {t[lang].more}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {lang === 'ar'
              ? 'اختر قسماً إضافياً من أقسام لوحة التحكم.'
              : 'Choose another dashboard section from this menu.'}
          </SheetDescription>
        </SheetHeader>

        {/* 2-column grid of nav items */}
        <div className="grid grid-cols-3 gap-2">
          {items.map((key) => {
            const href = navPaths[key];
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={href}
                onClick={onClose}
                className={`flex flex-col items-center gap-1.5 p-3 text-xs font-medium transition-colors ${
                  active
                    ? 'text-destructive bg-destructive/10 border border-destructive/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={active ? 'text-destructive' : 'text-muted-foreground'}>
                  {iconMap[key]}
                </span>
                {t[lang][key]}
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
