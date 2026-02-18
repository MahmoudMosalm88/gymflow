"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "gymflow_install_dismissed";

/**
 * PWA install prompt.
 * - Chromium: captures beforeinstallprompt and shows custom banner.
 * - iOS Safari: shows manual Add-to-Home-Screen instructions.
 * - Dismissal persists in localStorage.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;

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
      className="flex items-center justify-between gap-3 bg-[#1e1e1e] border-2 border-[#2a2a2a] px-4 py-3 mx-4 mt-4"
      style={{ boxShadow: "4px 4px 0 #000" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="bg-[#e63946] text-white font-extrabold text-xs px-2 py-1 shrink-0">GF</span>
        <p className="text-sm text-[#e8e4df] truncate">
          {isIos
            ? "Tap the share button, then \"Add to Home Screen\" to install GymFlow."
            : "Install GymFlow for faster access and offline check-ins."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isIos && (
          <button
            onClick={handleInstall}
            className="bg-[#e63946] text-white text-xs font-bold px-3 py-1.5 border-2 border-[#e63946] hover:opacity-90 transition-opacity"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-[#8a8578] text-xs font-bold hover:text-[#e8e4df] transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
