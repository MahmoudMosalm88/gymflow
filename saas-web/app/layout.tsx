import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, El_Messiri, IBM_Plex_Sans_Arabic, Bebas_Neue } from "next/font/google";

import PublicAnalyticsConsent from "@/components/analytics/public-analytics-consent";
import { ThemeProvider } from "@/components/theme-provider";

// Stat numbers — ultra-condensed brutalist display
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-stat",
  display: "swap",
  preload: false,
});

// EN body — gold standard UI font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// EN heading — geometric grotesque with techy personality
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
  preload: false,
});

// AR heading — modern Arabic display
const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["600", "700"],
  variable: "--font-arabic-heading",
  display: "swap",
  preload: false,
});

// AR body — UI-first Arabic, excellent dark legibility
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "GymFlow | Gym Management Software for MENA",
    template: "%s | GymFlow",
  },
  description: "Manage memberships, automate check-ins, track attendance and revenue. Built for gyms in Egypt, Saudi Arabia and the Middle East. Arabic + English.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://gymflowsystem.com"),
  icons: {
    icon: [{ url: "/gymflow-logo.png", type: "image/png" }],
    shortcut: [{ url: "/gymflow-logo.png", type: "image/png" }],
    apple: [{ url: "/gymflow-logo.png", type: "image/png" }]
  },
  openGraph: {
    type: "website",
    siteName: "GymFlow",
    title: "GymFlow | Gym Management Software for MENA",
    description: "Run your gym without the admin headache. QR check-ins, WhatsApp reminders, subscription management, and real-time reports for gyms across MENA.",
    url: "https://gymflowsystem.com",
    locale: "en_US",
    alternateLocale: "ar_EG",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GymFlow - Gym Management Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GymFlow | Gym Management Software for MENA",
    description: "Run your gym without the admin headache. QR check-ins, WhatsApp reminders, subscription management, and real-time reports.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://gymflowsystem.com",
    languages: {
      "en": "https://gymflowsystem.com",
      "ar": "https://gymflowsystem.com/ar",
    },
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymFlow",
  },
  other: {
    "mobile-web-app-capable": "yes"
  }
};

export const viewport: Viewport = {
  themeColor: "#e63946",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const shouldRegisterServiceWorker = process.env.NODE_ENV === "production";

  return (
    <html
      className={`${inter.variable} ${spaceGrotesk.variable} ${elMessiri.variable} ${ibmPlexSansArabic.variable} ${bebasNeue.variable}`}
      suppressHydrationWarning
    >
      <body>
        {shouldRegisterServiceWorker ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `
            }}
          />
        ) : (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) { registration.unregister(); });
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(keys) {
                    keys.forEach(function(key) { caches.delete(key); });
                  });
                }
              `
            }}
          />
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PublicAnalyticsConsent />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
