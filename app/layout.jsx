'use client'

import './globals.css'
import { useEffect, useState } from 'react'

export const metadata = {
  title: 'GymFlow - Gym Attendance Made Simple',
  description: 'Free desktop app for gym owners',
}

export default function RootLayout({ children }) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check saved preference
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = saved ? saved === 'dark' : prefersDark

    setIsDark(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newValue = !isDark
    setIsDark(newValue)

    if (newValue) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className="fixed top-4 right-4 z-50 p-3 rounded-lg bg-white dark:bg-slate-800 border border-border dark:border-slate-700 shadow-md hover:shadow-lg transition-all duration-200"
          aria-label="Toggle dark mode"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l-2.12-2.12a1 1 0 111.414-1.414l2.12 2.12a1 1 0 11-1.414 1.414zM2.05 12.464a1 1 0 111.414-1.414l2.12 2.12a1 1 0 11-1.414 1.414l-2.12-2.12zm10-10a1 1 0 00-1-1H5a1 1 0 000 2h6a1 1 0 001-1zM5 8a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        {children}
      </body>
    </html>
  )
}
