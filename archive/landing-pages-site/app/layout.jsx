import './globals.css'
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google'

import { ThemeProvider } from './components/theme-provider'
import { LanguageProvider } from './components/language-provider'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

export const metadata = {
  title: 'GymFlow - Gym Management for Modern Fitness Teams',
  description: 'Cloud-based gym management software with check-ins, billing, reports, and WhatsApp automation.',
}

export default function RootLayout({ children }) {
  return (
    <html
      className={`${ibmPlexSans.variable} ${ibmPlexSansArabic.variable}`}
      suppressHydrationWarning
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
