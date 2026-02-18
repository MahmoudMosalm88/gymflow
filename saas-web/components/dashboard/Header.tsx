'use client';

import { useAuth } from '@/lib/use-auth';
import { useLang } from '@/lib/i18n';
import Link from 'next/link';

type Props = {
  onMenuToggle: () => void;
};

export default function Header({ onMenuToggle }: Props) {
  const { profile } = useAuth();
  const { lang, setLang } = useLang();

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
        <div className="flex border-2 border-[#2a2a2a]">
          <button
            onClick={() => setLang('en')}
            className={`px-2 py-1 text-xs font-bold transition-colors ${
              lang === 'en' ? 'bg-[#e63946] text-white' : 'bg-[#1e1e1e] text-[#888888] hover:text-[#e8e4df]'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('ar')}
            className={`px-2 py-1 text-xs font-bold transition-colors ${
              lang === 'ar' ? 'bg-[#e63946] text-white' : 'bg-[#1e1e1e] text-[#888888] hover:text-[#e8e4df]'
            }`}
          >
            AR
          </button>
        </div>

        <Link href="/dashboard/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-[#e63946] flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
