'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const CONSENT_KEY = "gymflow_public_analytics_consent";
const POSTHOG_SCRIPT_ID = "gymflow-posthog-script";
const POSTHOG_KEY = "phc_tLNXukzsjgXHBKFyXHakEwqmJr2hThueDNUGUAzem7Sw";
const POSTHOG_HOST = "https://us.i.posthog.com";

declare global {
  interface Window {
    posthog?: {
      init: (key: string, options: Record<string, unknown>) => void;
      register: (properties: Record<string, unknown>) => void;
      opt_out_capturing?: () => void;
    };
    __gymflowPosthogLoaded?: boolean;
  }
}

function isPublicRoute(pathname: string) {
  const authRoutes = [
    "/login",
    "/forgot-password",
    "/ar/login",
    "/ar/forgot-password",
    "/invite",
  ];

  return (
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/api") &&
    !authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  );
}

function isArabicRoute(pathname: string) {
  return pathname === "/ar" || pathname.startsWith("/ar/");
}

function ensurePosthogLoaded() {
  if (typeof window === "undefined" || window.__gymflowPosthogLoaded) {
    return;
  }

  const existingScript = document.getElementById(POSTHOG_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return;
  }

  const script = document.createElement("script");
  script.id = POSTHOG_SCRIPT_ID;
  script.async = true;
  script.src = `${POSTHOG_HOST}/static/array.js`;
  script.onload = () => {
    if (!window.posthog) {
      return;
    }

    window.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
    });
    window.posthog.register({ app: "gymflow" });
    window.__gymflowPosthogLoaded = true;
  };

  document.head.appendChild(script);
}

export default function PublicAnalyticsConsent() {
  const pathname = usePathname() ?? "/";
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);

  const publicRoute = useMemo(() => isPublicRoute(pathname), [pathname]);
  const arabic = useMemo(() => isArabicRoute(pathname), [pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === "accepted" || saved === "declined") {
      setConsent(saved);
      if (saved === "accepted") {
        ensurePosthogLoaded();
      }
      return;
    }

    setConsent(null);
  }, []);

  useEffect(() => {
    if (consent === "accepted") {
      ensurePosthogLoaded();
    }

    if (consent === "declined" && window.posthog?.opt_out_capturing) {
      window.posthog.opt_out_capturing();
    }
  }, [consent]);

  if (!publicRoute || consent !== null) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4">
      <div
        dir={arabic ? "rtl" : "ltr"}
        className="mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl border border-border bg-background/95 p-5 shadow-2xl backdrop-blur"
      >
        <div className="space-y-2">
          <p className="font-sans text-sm font-semibold text-foreground">
            {arabic ? "الكوكيز والتحليلات" : "Cookies and analytics"}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {arabic
              ? "يستخدم GymFlow تخزيناً أساسياً للموقع، ومع موافقتك فقط يفعّل التحليلات على الصفحات العامة لفهم الزيارات وتحسين الموقع."
              : "GymFlow uses essential site storage and, with your permission, enables analytics on public pages to understand visits and improve the website."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={arabic ? "/cookie-notice?lang=ar" : "/cookie-notice"} className="text-sm font-medium text-primary hover:underline">
            {arabic ? "اقرأ إشعار الكوكيز" : "Read cookie notice"}
          </Link>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(CONSENT_KEY, "declined");
                setConsent("declined");
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {arabic ? "رفض" : "Decline"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(CONSENT_KEY, "accepted");
                setConsent("accepted");
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {arabic ? "قبول التحليلات" : "Accept analytics"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
