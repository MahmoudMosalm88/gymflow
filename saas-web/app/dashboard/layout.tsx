'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import { LangContext, Lang } from '@/lib/i18n';
import { api } from '@/lib/api-client';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { fetchAndStoreBundle } from '@/lib/offline/offline-bundle';
import { startSyncManager, stopSyncManager } from '@/lib/offline/sync-manager';
import InstallPrompt from '@/components/dashboard/InstallPrompt';
import GlobalScanner from '@/components/dashboard/GlobalScanner';
import { ScanProvider } from '@/lib/scan-context';
import { Toaster } from '@/components/ui/sonner';

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

  // Sync dashboard language with server-side settings so backend automations
  // can use the same system language.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<Record<string, unknown>>('/api/settings');
        if (!res.success || !res.data || cancelled) return;
        const systemLanguage = res.data.system_language;
        if (systemLanguage === 'en' || systemLanguage === 'ar') {
          setLangState(systemLanguage);
          localStorage.setItem('dashboard_lang', systemLanguage);
        }
      } catch {
        // Ignore sync failures; local language still works.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading]);

  // Offline bundle refresh + sync manager
  useEffect(() => {
    if (navigator.onLine) fetchAndStoreBundle();
    startSyncManager();
    return () => stopSyncManager();
  }, []);

  // Persist language changes
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('dashboard_lang', l);
    api.put('/api/settings', { values: { system_language: l } }).catch(() => {
      // Ignore server-sync failures for language toggle UX.
    });
  };

  // Bump root font size + switch body font for Arabic
  useEffect(() => {
    document.documentElement.style.fontSize = '16px';
    document.body.style.fontFamily = lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-sans)';
    return () => {
      document.documentElement.style.fontSize = '';
      document.body.style.fontFamily = '';
    };
  }, [lang]);

  // Show spinner while auth is loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <ScanProvider>
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex h-screen bg-background text-foreground">
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
            <InstallPrompt />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">{children}</main>
          </div>

          {/* Global barcode scanner listener + toast container */}
          <GlobalScanner />
          <Toaster />
        </div>
      </ScanProvider>
    </LangContext.Provider>
  );
}
