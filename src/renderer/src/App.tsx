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
import GuestPasses from './pages/GuestPasses'
import Income from './pages/Income'
import Settings from './pages/Settings'
import Import from './pages/Import'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'

function App(): JSX.Element {
  const { i18n } = useTranslation()
  const [authState, setAuthState] = useState<'loading' | 'onboarding' | 'login' | 'signup' | 'app'>(
    'loading'
  )
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [tokenLoaded, setTokenLoaded] = useState(false)

  // Handle RTL direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  useEffect(() => {
    const loadToken = async () => {
      try {
        const res = await window.api.secureStore.get('session_token')
        if (res && res.success && typeof res.value === 'string') {
          setSessionToken(res.value)
        }
      } catch {
        // ignore
      } finally {
        setTokenLoaded(true)
      }
    }
    loadToken()
  }, [])

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
      if (!tokenLoaded) return
      try {
        const testMode = await window.api.settings.get('test_mode')
        if (testMode === true) {
          if (import.meta.env.DEV) {
            setAuthState('app')
            return
          }

          // Never allow test mode in packaged builds; it can lock users out of auth flows.
          try {
            await window.api.settings.set('test_mode', false)
          } catch {
            // ignore
          }
        }

        const status = await window.api.owner.getStatus(sessionToken || undefined)
        if (!status.hasOwner || !status.onboardingComplete) {
          setAuthState('onboarding')
        } else if (status.authenticated) {
          setAuthState('app')
        } else {
          if (sessionToken) {
            await window.api.secureStore.delete('session_token')
            setSessionToken(null)
          }
          setAuthState('login')
        }
      } catch {
        setAuthState('login')
      }
    }
    checkAuth()
  }, [sessionToken, tokenLoaded])

  const handleAuthSuccess = async (token: string) => {
    try {
      await window.api.secureStore.set('session_token', token)
    } catch {
      // ignore (token will still live in memory for this session)
    }
    setSessionToken(token)
    setAuthState('app')
  }

  const handleGoToSignUp = () => {
    setAuthState('signup')
  }

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await window.api.owner.logout(sessionToken)
      }
    } catch {
      // ignore
    }
    try {
      await window.api.secureStore.delete('session_token')
    } catch {
      // ignore
    }
    setSessionToken(null)
    setAuthState('login')
  }

  const handleEnableTestMode = async () => {
    try {
      await window.api.settings.set('test_mode', true)
      window.location.reload()
    } catch {
      // ignore
    }
  }

  if (authState === 'loading' || !tokenLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
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

  if (authState === 'signup') {
    return (
      <Onboarding
        mode="signup"
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
        onGoToSignUp={handleGoToSignUp}
        onEnableTestMode={handleEnableTestMode}
      />
    )
  }

  return (
    <Layout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/members/new" element={<MemberForm />} />
        <Route path="/members/:id" element={<MemberDetail />} />
        <Route path="/members/:id/edit" element={<MemberForm />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/guest-passes" element={<GuestPasses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/income" element={<Income />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/import" element={<Import />} />
      </Routes>
    </Layout>
  )
}

export default App
