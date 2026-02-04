import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: React.ReactNode
  onLogout?: () => void
}

interface NavItem {
  path: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { path: '/', labelKey: 'nav.dashboard', icon: HomeIcon },
  { path: '/members', labelKey: 'nav.members', icon: UsersIcon },
  { path: '/subscriptions', labelKey: 'nav.subscriptions', icon: CreditCardIcon },
  { path: '/reports', labelKey: 'nav.reports', icon: ChartBarIcon },
  { path: '/import', labelKey: 'nav.import', icon: ArrowDownTrayIcon },
  { path: '/settings', labelKey: 'nav.settings', icon: Cog6ToothIcon }
]

export default function Layout({ children, onLogout }: LayoutProps): JSX.Element {
  const location = useLocation()
  const { t } = useTranslation()
  const [isDark, setIsDark] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-900 shadow-lg flex-col border-r border-gray-200 dark:border-gray-800">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-800 gap-2">
          <div className="w-10 h-10 bg-brand-gradient rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">GF</span>
          </div>
          <h1 className="text-xl font-heading font-bold text-transparent bg-brand-gradient bg-clip-text">
            GymFlow
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? 'bg-brand-gradient text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
            <span className="font-medium text-sm">
              {isDark ? t('nav.lightMode') || 'Light' : t('nav.darkMode') || 'Dark'}
            </span>
          </button>

          {/* Logout */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="font-medium">{t('nav.logout')}</span>
            </button>
          )}
        </div>

        {/* Version */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            GymFlow v1.0.0
          </p>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-50 shadow-sm">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">GF</span>
          </div>
          <h1 className="text-lg font-heading font-bold text-transparent bg-brand-gradient bg-clip-text">
            GymFlow
          </h1>
        </div>

        <button
          onClick={toggleDarkMode}
          className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg"
        >
          {isDark ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <aside className="fixed top-16 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg z-40 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? 'bg-brand-gradient text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout()
                  setIsMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="font-medium">{t('nav.logout')}</span>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  )
}
