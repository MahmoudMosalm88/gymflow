import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  ChartBarIcon,
  TicketIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ArrowRightOnRectangleIcon,
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
  { path: '/guest-passes', labelKey: 'nav.guestPasses', icon: TicketIcon },
  { path: '/reports', labelKey: 'nav.reports', icon: ChartBarIcon },
  { path: '/income', labelKey: 'nav.income', icon: BanknotesIcon },
  { path: '/import', labelKey: 'nav.import', icon: ArrowDownTrayIcon },
  { path: '/settings', labelKey: 'nav.settings', icon: Cog6ToothIcon }
]

export default function Layout({ children, onLogout }: LayoutProps): JSX.Element {
  const location = useLocation()
  const { t } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-card shadow-lg flex-col border-r border-border">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-border gap-2">
          <div className="w-10 h-10 bg-brand-gradient rounded-lg flex items-center justify-center shadow-sm">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-gradient text-white shadow-md'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-border p-4 space-y-3">
          {/* Logout */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:bg-muted"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="font-medium">{t('nav.logout')}</span>
            </button>
          )}
        </div>

        {/* Version */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            GymFlow v1.0.0
          </p>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-50 shadow-sm">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-muted-foreground hover:bg-muted p-2 rounded-lg"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">GF</span>
          </div>
          <h1 className="text-lg font-heading font-bold text-transparent bg-brand-gradient bg-clip-text">
            GymFlow
          </h1>
        </div>

        <div className="w-8 h-8" aria-hidden />
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <aside className="fixed top-16 left-0 right-0 bg-card shadow-lg z-40 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-gradient text-white shadow-md'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border p-3 space-y-2">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout()
                  setIsMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:bg-muted text-sm"
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
