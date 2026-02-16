'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import { LangContext, Lang } from '@/lib/i18n';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  // Language state, persisted to localStorage
  const [lang, setLangState] = useState<Lang>('en');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_lang') as Lang | null;
    if (saved === 'en' || saved === 'ar') setLangState(saved);
  }, []);

  // Persist language changes
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('dashboard_lang', l);
  };

  // Show spinner while auth is loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex h-screen bg-surface text-[#f3f6ff]">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </LangContext.Provider>
  );
}
