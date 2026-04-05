"use client";

import { useEffect, useState } from "react";
import { useLang, t } from "@/lib/i18n";
import GymFlowLogo from "@/components/GymFlowLogo";

const DISMISS_KEY = "gymflow_install_dismissed";
const FORCE_PROMPT_KEY = "gymflow_prompt_install";

/**
 * PWA install prompt.
 * - Chromium: captures beforeinstallprompt and shows custom banner.
 * - iOS Safari: shows manual Add-to-Home-Screen instructions.
 * - Dismissal persists in localStorage.
 */
export default function InstallPrompt() {
  const { lang } = useLang();
  const labels = t[lang];
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const forcePrompt = sessionStorage.getItem(FORCE_PROMPT_KEY) === "1";
    if (forcePrompt) {
      sessionStorage.removeItem(FORCE_PROMPT_KEY);
    }

    // Check if already dismissed
    if (!forcePrompt && localStorage.getItem(DISMISS_KEY)) return;

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone);
    setIsStandalone(Boolean(standalone));
    if (standalone) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIos(ios);

    if (ios) {
      setShowBanner(true);
      return;
    }

    // Chromium: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || !showBanner) return null;

  const handleInstall = async () => {
    if (deferredPrompt && "prompt" in deferredPrompt) {
      (deferredPrompt as { prompt: () => void }).prompt();
    }
    dismiss();
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <div
      className="flex items-center justify-between gap-3 bg-card border-2 border-border px-4 py-3 mx-4 mt-4"
      style={{ boxShadow: "4px 4px 0 #000" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <GymFlowLogo size={28} className="shrink-0" />
        <p className="text-sm text-foreground truncate">
          {isIos
            ? labels.install_ios_instructions
            : labels.install_prompt}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isIos && (
          <button
            onClick={handleInstall}
            className="bg-[#e63946] text-white text-xs font-bold px-3 py-1.5 border-2 border-[#e63946] hover:opacity-90 transition-opacity"
          >
            {labels.install}
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-muted-foreground text-xs font-bold hover:text-foreground transition-colors"
        >
          {labels.dismiss}
        </button>
      </div>
    </div>
  );
}
