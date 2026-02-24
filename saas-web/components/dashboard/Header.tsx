'use client';

import { useAuth } from '@/lib/use-auth';
import Link from 'next/link';
import SyncStatus from './SyncStatus';
import NotificationBell from './NotificationBell';

type Props = {
  onMenuToggle: () => void;
};

export default function Header({ onMenuToggle }: Props) {
  const { profile } = useAuth();
  // Get initials for avatar (first letter of name)
  const initials = (profile?.name || 'O').charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b-2 border-[#2a2a2a] bg-[#141414] px-4 py-3">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden text-[#888888] hover:text-[#e8e4df]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <SyncStatus />
        <NotificationBell />

        <Link href="/dashboard/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-[#e63946] flex items-center justify-center text-white text-sm font-bold border border-[#2a2a2a]">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
