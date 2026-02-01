import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import MemberForm from './pages/MemberForm'
import MemberDetail from './pages/MemberDetail'
import Subscriptions from './pages/Subscriptions'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Import from './pages/Import'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'

function App(): JSX.Element {
  const { i18n } = useTranslation()
  const [authState, setAuthState] = useState<'loading' | 'onboarding' | 'login' | 'app'>('loading')
  const [sessionToken, setSessionToken] = useState<string | null>(
    localStorage.getItem('session_token')
  )

  // Handle RTL direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  useEffect(() => {
    // Load saved language from settings (if available)
    const loadLanguage = async () => {
      try {
        const saved = await window.api.settings.get('language')
        if (saved && typeof saved === 'string' && saved !== i18n.language) {
          i18n.changeLanguage(saved)
        }
      } catch {
        // Ignore if settings not available yet
      }
    }
    loadLanguage()
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const testMode = await window.api.settings.get('test_mode')
        if (testMode === true) {
          setAuthState('app')
          return
        }

        const status = await window.api.owner.getStatus(sessionToken || undefined)
        if (!status.hasOwner || !status.onboardingComplete) {
          setAuthState('onboarding')
        } else if (status.authenticated) {
          setAuthState('app')
        } else {
          if (sessionToken) {
            localStorage.removeItem('session_token')
            setSessionToken(null)
          }
          setAuthState('login')
        }
      } catch {
        setAuthState('login')
      }
    }
    checkAuth()
  }, [sessionToken])

  const handleAuthSuccess = (token: string) => {
    localStorage.setItem('session_token', token)
    setSessionToken(token)
    setAuthState('app')
  }

  const handleEnableTestMode = async () => {
    try {
      await window.api.settings.set('test_mode', true)
      window.location.reload()
    } catch {
      // ignore
    }
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (authState === 'onboarding') {
    return (
      <Onboarding
        onComplete={handleAuthSuccess}
        onGoToLogin={() => setAuthState('login')}
        onEnableTestMode={handleEnableTestMode}
      />
    )
  }

  if (authState === 'login') {
    return (
      <Login
        onSuccess={handleAuthSuccess}
        onEnableTestMode={handleEnableTestMode}
      />
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/members/new" element={<MemberForm />} />
        <Route path="/members/:id" element={<MemberDetail />} />
        <Route path="/members/:id/edit" element={<MemberForm />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </Layout>
  )
}

export default App
