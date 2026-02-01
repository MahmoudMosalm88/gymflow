import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../components/AuthLayout'

interface OnboardingProps {
  onComplete: (token: string) => void
  onGoToLogin?: () => void
  onEnableTestMode?: () => void
}

interface SettingsData {
  language: string
  session_cap_male: number
  session_cap_female: number
  test_mode: boolean
  access_hours_enabled: boolean
  warning_days_before_expiry: number
  warning_sessions_remaining: number
  scan_cooldown_seconds: number
  whatsapp_enabled: boolean
}

const defaultSettings: SettingsData = {
  language: 'en',
  session_cap_male: 26,
  session_cap_female: 30,
  test_mode: false,
  access_hours_enabled: false,
  warning_days_before_expiry: 3,
  warning_sessions_remaining: 3,
  scan_cooldown_seconds: 30,
  whatsapp_enabled: false
}

type Step = 'account' | 'verify' | 'settings'

export default function Onboarding({
  onComplete,
  onGoToLogin,
  onEnableTestMode
}: OnboardingProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState<Step>('account')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSentVia, setOtpSentVia] = useState<'whatsapp' | 'manual' | null>(null)
  const [manualCode, setManualCode] = useState<string | null>(null)
  const [settings, setSettings] = useState<SettingsData>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await window.api.settings.getAll()
        setSettings({ ...defaultSettings, ...data })
      } catch {
        // ignore
      }
    }
    loadSettings()
  }, [])

  const handleRegister = async () => {
    if (!phone || !password) {
      setError(t('auth.required', 'All fields are required'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match'))
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.owner.register(phone, password)
      if (!result.success) {
        setError(result.error || t('auth.registerFailed', 'Registration failed'))
        return
      }
      setOtpSentVia(result.sentVia || null)
      setManualCode(result.code || null)
      setStep('verify')
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!otpCode) {
      setError(t('auth.enterCode', 'Enter the code'))
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.owner.verifyOtp(phone, otpCode, 'verify')
      if (!result.success) {
        setError(result.error || t('auth.invalidCode', 'Invalid or expired code'))
        return
      }
      setStep('settings')
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await window.api.owner.completeOnboarding({
        ...settings,
        onboarding_complete: true
      })

      if (settings.language !== i18n.language) {
        i18n.changeLanguage(settings.language)
      }

      const loginResult = await window.api.owner.login(phone, password)
      if (!loginResult.success || !loginResult.token) {
        setError(loginResult.error || t('auth.loginFailed', 'Login failed'))
        return
      }
      onComplete(loginResult.token)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'account') {
    return (
      <AuthLayout title={t('auth.onboardingTitle', 'Create owner account')}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.phone', 'Phone')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
              placeholder="+201xxxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password', 'Password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.confirmPassword', 'Confirm Password')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? t('common.loading', 'Loading...') : t('auth.createAccount', 'Create Account')}
          </button>
          {onGoToLogin && (
            <button
              onClick={onGoToLogin}
              className="w-full text-sm text-gray-600 hover:underline"
            >
              {t('auth.alreadyHaveAccount', 'Already have an account?')}
            </button>
          )}
          {onEnableTestMode && (
            <button
              onClick={onEnableTestMode}
              className="w-full text-sm text-gray-600 hover:underline"
            >
              {t('auth.enableTestMode', 'Enable test mode')}
            </button>
          )}
        </div>
      </AuthLayout>
    )
  }

  if (step === 'verify') {
    return (
      <AuthLayout title={t('auth.verifyTitle', 'Verify phone')}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {otpSentVia === 'manual' && manualCode && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
            {t('auth.otpManual', 'Your code is')}: <strong>{manualCode}</strong>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.otpCode', 'Verification Code')}
            </label>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={isLoading}
            className="w-full py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? t('common.loading', 'Loading...') : t('auth.verify', 'Verify')}
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t('auth.setupSettings', 'Set up your gym settings')}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <section className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.testMode')}</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.test_mode}
                onChange={(e) => setSettings({ ...settings, test_mode: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-gray-700">{t('settings.enableTestMode')}</span>
            </label>
          </section>
          <section className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.general')}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.language')}
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
              >
                <option value="en">{t('settings.english')}</option>
                <option value="ar">{t('settings.arabic')}</option>
              </select>
            </div>
          </section>

          <section className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.sessionRules')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.maleSessionCap')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.session_cap_male}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      session_cap_male: parseInt(e.target.value) || 26
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.femaleSessionCap')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.session_cap_female}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      session_cap_female: parseInt(e.target.value) || 30
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.warnings')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.daysBeforeExpiry')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.warning_days_before_expiry}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      warning_days_before_expiry: parseInt(e.target.value) || 3
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.sessionsRemaining')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.warning_sessions_remaining}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      warning_sessions_remaining: parseInt(e.target.value) || 3
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.scanner')}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.cooldownSeconds')}
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={settings.scan_cooldown_seconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scan_cooldown_seconds: parseInt(e.target.value) || 30
                  })
                }
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
              />
            </div>
          </section>

          <section className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.whatsapp')}</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.whatsapp_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, whatsapp_enabled: e.target.checked })
                }
                className="h-4 w-4"
              />
              <span className="text-gray-700">{t('settings.enableWhatsApp')}</span>
            </label>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleComplete}
            disabled={isLoading}
            className="px-6 py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? t('common.loading', 'Loading...') : t('auth.finishSetup', 'Finish Setup')}
          </button>
        </div>
      </div>
    </div>
  )
}
