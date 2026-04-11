'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';
import { LangContext, Lang } from '@/lib/i18n';
import { api } from '@/lib/api-client';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { ScanProvider } from '@/lib/scan-context';
import { canAccessPath, getDefaultPathForRole } from '@/lib/permissions';

const InstallPrompt = dynamic(() => import('@/components/dashboard/InstallPrompt'), { ssr: false });
const GlobalScanner = dynamic(() => import('@/components/dashboard/GlobalScanner'), { ssr: false });
const Toaster = dynamic(
  () => import('@/components/ui/sonner').then((mod) => mod.Toaster),
  { ssr: false }
);

const OFFLINE_SHELL_CACHE = 'gymflow-shell-v3';
const CORE_OFFLINE_ROUTES = [
  '/dashboard',
  '/dashboard/members',
  '/dashboard/members/new',
  '/dashboard/guest-passes',
  '/dashboard/subscriptions',
  '/dashboard/income',
  '/dashboard/income/payments',
  '/dashboard/profile',
  '/dashboard/settings',
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Language state, persisted to localStorage
  const [lang, setLangState] = useState<Lang>('en');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading || !profile || !navigator.onLine || typeof caches === 'undefined') return;

    let cancelled = false;

    void (async () => {
      try {
        const cache = await caches.open(OFFLINE_SHELL_CACHE);
        const routes = CORE_OFFLINE_ROUTES.filter((route) => canAccessPath(profile.role, route));
        await Promise.all(routes.map(async (route) => {
          try {
            const response = await fetch(route, {
              cache: 'no-store',
              credentials: 'same-origin',
              headers: { accept: 'text/html' },
            });
            if (!cancelled && response.ok) {
              await cache.put(route, response.clone());
            }
          } catch {
            // Ignore route warm failures. Offline cache will still use what is already stored.
          }
        }));
      } catch {
        // Ignore cache warm failures.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, profile]);

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
    let mounted = true;
    let stopSync: (() => void) | null = null;

    // Load offline runtime lazily so the first dashboard paint is not blocked by sync code.
    void (async () => {
      const [{ fetchAndStoreBundle }, { startSyncManager, stopSyncManager }] = await Promise.all([
        import('@/lib/offline/offline-bundle'),
        import('@/lib/offline/sync-manager')
      ]);

      if (!mounted) return;
      if (navigator.onLine) fetchAndStoreBundle();
      startSyncManager();
      stopSync = stopSyncManager;
    })();

    return () => {
      mounted = false;
      stopSync?.();
    };
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
    if (loading || !profile) return;
    if (canAccessPath(profile.role, pathname)) return;
    router.replace(getDefaultPathForRole(profile.role));
  }, [loading, pathname, profile, router]);

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
