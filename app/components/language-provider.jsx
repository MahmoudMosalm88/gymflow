"use client"

import * as React from "react"

// A basic LanguageProvider for the landing page.
// If the landing page needs dynamic language switching,
// this component would be extended to read from context or state.
export function LanguageProvider({ children }) {
  // For the landing page, we'll assume default to English/LTR for now,
  // but allow external control.
  // If language state is available (e.g., from a cookie), it can be used here.
  const currentLang = "en"; // Default
  const currentDir = "ltr"; // Default

  React.useEffect(() => {
    document.documentElement.setAttribute('dir', currentDir);
    document.documentElement.setAttribute('lang', currentLang);
  }, [currentLang, currentDir]); // Rerun if these change

  return <>{children}</>
}