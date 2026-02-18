'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang, t } from '@/lib/i18n';

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
    key: 'import' as const,
    href: '/dashboard/import',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M10 14V4" />
        <path d="M6 8l4-4 4 4" />
        <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
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

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-1 mt-6 px-3">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-l-[4px] border-[#e63946] text-[#e63946] bg-[#e63946]/10'
                : 'border-l-[4px] border-transparent text-[#888888] hover:text-[#f0f0f0] hover:bg-white/5'
            }`}
          >
            <span className={active ? 'text-[#e63946]' : 'text-[#888888]'}>{item.icon}</span>
            {t[lang][item.key]}
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
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0a0a0a] border-r-2 border-[#2a2a2a] flex flex-col transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span style={{ background: '#e63946', color: '#fff', padding: '4px 7px', fontWeight: 800, fontSize: '0.7rem', lineHeight: 1 }}>GF</span>
          <span className="font-bold text-white text-sm tracking-tight">GymFlow</span>
        </div>
        {nav}
      </aside>
    </>
  );
}
