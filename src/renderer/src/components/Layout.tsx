import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import gymflowLogo from '../assets/gymflow-logo.png'
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
  UserCircleIcon,
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

  // Close mobile menu on Escape
  useEffect(() => {
    if (!isMobileMenuOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMobileMenuOpen])

  // Check if a nav item is active (supports child routes like /members/123)
  const isNavActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-card flex-col border-e border-border/50">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-border px-6">
          <img src={gymflowLogo} alt="GymFlow" className="h-10 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = isNavActive(item.path)
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                    ? 'bg-primary/10 text-primary font-medium'
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
        <div className="border-t border-border p-4 space-y-1">
          <Link
            to="/profile"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === '/profile'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <UserCircleIcon className="w-5 h-5" />
            <span className="font-medium">{t('nav.profile')}</span>
          </Link>
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
          aria-label={isMobileMenuOpen ? t('common.close') : t('common.openMenu', 'Open menu')}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>

        <img src={gymflowLogo} alt="GymFlow" className="h-8 w-auto" />

        <div className="w-8 h-8" aria-hidden />
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <aside className="fixed top-16 left-0 right-0 bg-card shadow-lg z-40 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = isNavActive(item.path)
              const Icon = item.icon

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
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

          <div className="border-t border-border p-3 space-y-1">
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === '/profile'
                  ? 'bg-brand-gradient text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <UserCircleIcon className="w-5 h-5" />
              <span className="font-medium">{t('nav.profile')}</span>
            </Link>
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
