import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, El_Messiri, IBM_Plex_Sans_Arabic, Bebas_Neue } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider"; // Assuming this path

// Stat numbers — ultra-condensed brutalist display
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-stat",
  display: "swap",
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
});

// AR heading — modern Arabic display
const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["600", "700"],
  variable: "--font-arabic-heading",
  display: "swap",
});

// AR body — UI-first Arabic, excellent dark legibility
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GymFlow",
  description: "GymFlow web SaaS on Google Cloud",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
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
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
