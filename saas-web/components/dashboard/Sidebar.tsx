'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang, t } from '@/lib/i18n';
import GymFlowLogo from '@/components/GymFlowLogo';
import { useAuth } from '@/lib/use-auth';
import { getNavKeysForRole } from '@/lib/permissions';
import { api } from '@/lib/api-client';
import type { EntityRef } from '@/lib/entities';

type Props = {
  open: boolean;
  onClose: () => void;
};

const navItems = [
  {
    key: 'dashboard' as const,
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
        <rect x="3" y="3" width="6" height="6" rx="0" />
        <rect x="11" y="3" width="6" height="6" rx="0" />
        <rect x="3" y="11" width="6" height="6" rx="0" />
        <rect x="11" y="11" width="6" height="6" rx="0" />
      </svg>
    ),
  },
  {
    key: 'members' as const,
    href: '/dashboard/members',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="3" />
        <path d="M2 17c0-3 2.5-5 5-5s5 2 5 5" />
        <circle cx="14" cy="7" r="2" />
        <path d="M14 12c2 0 4 1.5 4 4" />
      </svg>
    ),
  },
  {
    key: 'guest_passes' as const,
    href: '/dashboard/guest-passes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
        <rect x="3" y="4" width="14" height="10" rx="0" />
        <path d="M7 8h6" />
        <path d="M10 4v10" />
      </svg>
    ),
  },
  {
    key: 'pt' as const,
    href: '/dashboard/pt',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16V9" />
        <path d="M10 16V4" />
        <path d="M16 16v-6" />
        <path d="M2 16h16" />
      </svg>
    ),
  },
  {
    key: 'subscriptions' as const,
    href: '/dashboard/subscriptions',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
        <rect x="2" y="4" width="16" height="12" rx="0" />
        <path d="M2 8h16" />
        <path d="M6 12h3" />
      </svg>
    ),
  },
  {
    key: 'reports' as const,
    href: '/dashboard/reports',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M3 17V9" />
        <path d="M7 17V5" />
        <path d="M11 17V11" />
        <path d="M15 17V3" />
      </svg>
    ),
  },
  {
    key: 'income' as const,
    href: '/dashboard/income',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
        <rect x="2" y="3" width="16" height="14" rx="0" />
        <path d="M2 7h16" />
        <path d="M10 10v4" />
        <path d="M7 12v2" />
        <path d="M13 11v3" />
      </svg>
    ),
  },
  {
    key: 'whatsapp' as const,
    href: '/dashboard/whatsapp',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="4" cy="10" r="2" />
        <circle cx="16" cy="4" r="2" />
        <circle cx="16" cy="16" r="2" />
        <path d="M6 10h4" />
        <path d="M10 10l4-4.5" />
        <path d="M10 10l4 4.5" />
      </svg>
    ),
  },
  {
    key: 'notifications' as const,
    href: '/dashboard/notifications',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 15.5h4l-1.2-1.2a1.7 1.7 0 0 1-.5-1.2v-2.8a4.8 4.8 0 1 0-9.6 0v2.8c0 .5-.2.9-.5 1.2l-1.2 1.2h4" />
        <path d="M7.5 15.5a2.5 2.5 0 0 0 5 0" />
      </svg>
    ),
  },
  {
    key: 'help' as const,
    href: '/dashboard/help',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M7.5 7.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5" />
        <circle cx="10" cy="15" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'settings' as const,
    href: '/dashboard/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="3" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
      </svg>
    ),
  },
  {
    key: 'profile' as const,
    href: '/dashboard/profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="3" />
        <path d="M4 17c0-3 2.5-5 6-5s6 2 6 5" />
      </svg>
    ),
  },
];

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const { lang } = useLang();
  const { profile } = useAuth();
  const visibleKeys = getNavKeysForRole(profile?.role || 'owner');

  // WhatsApp connection indicator — fetch once on mount
  const [waConnected, setWaConnected] = useState(true); // default true to avoid flash
  useEffect(() => {
    if (!visibleKeys.includes('whatsapp')) return;
    api.get<{ connected: boolean }>('/api/whatsapp/status')
      .then(res => { if (res.data) setWaConnected(res.data.connected); })
      .catch(() => {});
  }, [visibleKeys]);

  // Branch switcher — only for owners with multiple branches
  const [branches, setBranches] = useState<EntityRef[]>([]);
  const [branchOpen, setBranchOpen] = useState(false);
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') : null;
  const currentBranch = branches.find(b => b.id === currentBranchId);

  useEffect(() => {
    if (profile?.role !== 'owner') return;
    api.get<EntityRef[]>('/api/branches').then(res => {
      if (res.data && res.data.length > 1) setBranches(res.data);
    }).catch((error) => {
      console.error('Failed to load branch switcher data', error);
    });
  }, [profile?.role]);

  function switchBranch(branchId: string) {
    localStorage.setItem('branch_id', branchId);
    setBranchOpen(false);
    window.location.reload();
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-1 mt-6 px-3">
      {navItems.filter((item) => visibleKeys.includes(item.key)).map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors ${
              active
                ? 'border-s-[4px] border-destructive text-destructive bg-destructive/10'
                : 'border-s-[4px] border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <span className={active ? 'text-destructive' : 'text-muted-foreground'} aria-hidden="true">{item.icon}</span>
            {t[lang][item.key]}
            {/* Disconnected dot for WhatsApp */}
            {item.key === 'whatsapp' && !waConnected && (
              <span className="ms-auto h-2 w-2 rounded-full bg-destructive shrink-0" title={lang === 'ar' ? 'غير متصل' : 'Disconnected'} />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 start-0 z-50 h-full w-64 bg-[#0a0a0a] border-e-2 border-border hidden lg:flex flex-col transition-transform lg:static lg:translate-x-0 rtl:lg:translate-x-0 ${
          open ? '!flex translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <GymFlowLogo size={32} />
          <span className="font-heading font-bold text-white text-sm tracking-tight">GymFlow</span>
        </div>

        {/* Branch switcher — only when owner has 2+ branches */}
        {branches.length > 1 && (
          <div className="px-3 pb-2">
            <button
              onClick={() => setBranchOpen(!branchOpen)}
              className="w-full flex items-center justify-between px-3 py-2 border-2 border-border bg-card text-sm text-foreground hover:border-muted-foreground/40 transition-colors"
            >
              <span className="truncate">{currentBranch?.name || (lang === 'ar' ? 'الفرع' : 'Branch')}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${branchOpen ? 'rotate-180' : ''}`}>
                <path d="M3 4.5l3 3 3-3" />
              </svg>
            </button>
            {branchOpen && (
              <div className="mt-1 border-2 border-border bg-card">
                {branches.map(branch => (
                  <button
                    key={branch.id}
                    onClick={() => switchBranch(branch.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-start ${
                      branch.id === currentBranchId
                        ? 'text-destructive bg-destructive/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    {branch.id === currentBranchId && <span className="w-1.5 h-1.5 bg-destructive shrink-0" />}
                    <span className="truncate">{branch.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {nav}
      </aside>
    </>
  );
}
