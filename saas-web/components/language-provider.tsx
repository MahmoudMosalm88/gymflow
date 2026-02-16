"use client"

import * as React from "react"
import { useLang } from "@/lib/i18n" // Assuming useLang provides 'lang' (e.g., 'en' or 'ar')

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang(); // Get current language from context or state
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  React.useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang, dir]);

  return <>{children}</>
}
