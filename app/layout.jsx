import './globals.css'
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google' // Import both fonts

import { ThemeProvider } from './components/theme-provider'
import { LanguageProvider } from './components/language-provider'

// Define IBM Plex Sans (Latin)
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'], // Common weights for UI
  variable: '--font-sans', // Use CSS variable for Tailwind
  display: 'swap',
})

// Define IBM Plex Sans Arabic (Arabic)
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'], // Common weights for UI
  variable: '--font-arabic', // Use CSS variable for Tailwind
  display: 'swap',
})

export const metadata = {
  title: 'GymFlow - Gym Attendance Made Simple',
  description: 'Free desktop app for gym owners',
}

export default function RootLayout({ children }) {
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
  )
}
