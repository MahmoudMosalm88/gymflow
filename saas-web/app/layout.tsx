import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider"; // Assuming this path

// Define IBM Plex Sans (Latin)
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Define IBM Plex Sans Arabic (Arabic)
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GymFlow",
  description: "GymFlow web SaaS on Google Cloud",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      // lang="en" // LanguageProvider will manage this
      // dir="ltr" // LanguageProvider will manage this
      className={`${ibmPlexSans.variable} ${ibmPlexSansArabic.variable}`}
      suppressHydrationWarning // Recommended for next-themes
    >
      <body>
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
