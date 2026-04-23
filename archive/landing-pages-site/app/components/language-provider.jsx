"use client"

import * as React from "react"

export function LanguageProvider({ children }) {
  const currentLang = "en"
  const currentDir = "ltr"

  React.useEffect(() => {
    document.documentElement.setAttribute('dir', currentDir);
    document.documentElement.setAttribute('lang', currentLang);
  }, [currentLang, currentDir]);

  return <>{children}</>
}
