'use client';

import { useAuth, logout } from '@/lib/use-auth';
import { useLang, t } from '@/lib/i18n';

type Props = {
  onMenuToggle: () => void;
};

export default function Header({ onMenuToggle }: Props) {
  const { profile } = useAuth();
  const { lang, setLang } = useLang();

  return (
    <header className="flex items-center justify-between border-b border-border bg-[#0c1324] px-4 py-3">
      {/* Left: hamburger (mobile) + owner name */}
      <div className="flex items-center gap-3">
        {/* Hamburger — visible on small screens */}
        <button onClick={onMenuToggle} className="lg:hidden text-[#8892a8] hover:text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-medium text-[#f3f6ff]">
          {profile?.name || 'Owner'}
        </span>
      </div>

      {/* Right: lang toggle + logout */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={() => setLang('en')}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            lang === 'en' ? 'bg-brand text-white' : 'text-[#8892a8] hover:text-white'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang('ar')}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            lang === 'ar' ? 'bg-brand text-white' : 'text-[#8892a8] hover:text-white'
          }`}
        >
          AR
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="ml-2 rounded-lg border border-border px-3 py-1.5 text-xs text-[#8892a8] hover:border-red-500 hover:text-red-400 transition-colors"
        >
          {t[lang].logout}
        </button>
      </div>
    </header>
  );
}
