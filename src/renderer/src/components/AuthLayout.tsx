import React, { useEffect, useState } from 'react'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

interface AuthLayoutProps {
  title?: string
  children: React.ReactNode
}

export default function AuthLayout({ title, children }: AuthLayoutProps): JSX.Element {
  const [isDark, setIsDark] = useState(false)

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode !== null) {
      const isDarkMode = JSON.parse(savedDarkMode)
      setIsDark(isDarkMode)
      applyDarkMode(isDarkMode)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true)
      applyDarkMode(true)
    }
  }, [])

  const applyDarkMode = (isDarkMode: boolean) => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleDarkMode = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode))
    applyDarkMode(newDarkMode)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-6">
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-6 right-6 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <SunIcon className="w-5 h-5" />
        ) : (
          <MoonIcon className="w-5 h-5" />
        )}
      </button>

      {/* Auth Card */}
      <div className="w-full max-w-md animate-slide-up">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
          {/* Logo Section */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 bg-brand-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">GF</span>
              </div>
              <div>
                <h1 className="text-3xl font-heading font-bold text-transparent bg-brand-gradient bg-clip-text">
                  GymFlow
                </h1>
              </div>
            </div>
            {title && (
              <p className="text-base text-gray-600 dark:text-gray-400 font-medium">
                {title}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            {children}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              GymFlow v1.0.0 • Secure Membership Management
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
