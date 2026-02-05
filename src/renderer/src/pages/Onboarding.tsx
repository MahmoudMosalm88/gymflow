import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../components/AuthLayout'
import WhatsAppConnectPanel from '../components/WhatsAppConnectPanel'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

interface OnboardingProps {
  onComplete: (token: string) => void
  onGoToLogin?: () => void
  onEnableTestMode?: () => void
  mode?: 'initial' | 'signup'
}

interface SettingsData {
  language: string
  session_cap_male: number
  session_cap_female: number
  test_mode: boolean
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
  warning_days_before_expiry: 3,
  warning_sessions_remaining: 3,
  scan_cooldown_seconds: 30,
  whatsapp_enabled: false
}

type Step = 'whatsapp' | 'account' | 'verify' | 'settings'

export default function Onboarding({
  onComplete,
  onGoToLogin,
  onEnableTestMode,
  mode = 'initial'
}: OnboardingProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState<Step>('whatsapp')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSentVia, setOtpSentVia] = useState<'whatsapp' | 'manual' | null>(null)
  const [manualCode, setManualCode] = useState<string | null>(null)
  const [settings, setSettings] = useState<SettingsData>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

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

  const handleWhatsAppContinue = async () => {
    setIsLoading(true)
    setError(null)
    setWarning(null)
    try {
      const status = await window.api.whatsapp.getStatus()
      if (!status?.authenticated) {
        setSettings((prev) => ({ ...prev, whatsapp_enabled: false }))
        setWarning(
          t(
            'auth.whatsappSkipWarning',
            'WhatsApp is not connected. You can continue and connect it later in Settings.'
          )
        )
        setStep('account')
        return
      }
      setSettings((prev) => ({ ...prev, whatsapp_enabled: true }))
      setStep('account')
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!name || !phone || !password) {
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
      const result = await window.api.owner.registerWithName(phone, password, name)
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
      if (mode === 'signup') {
        const loginResult = await window.api.owner.login(phone, password)
        if (!loginResult.success || !loginResult.token) {
          setError(loginResult.error || t('auth.loginFailed', 'Login failed'))
          return
        }
        onComplete(loginResult.token)
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

  const steps =
    mode === 'initial'
      ? [
          { key: 'whatsapp', label: t('auth.stepWhatsApp', 'WhatsApp') },
          { key: 'account', label: t('auth.stepAccount', 'Account') },
          { key: 'verify', label: t('auth.stepVerify', 'Verify') },
          { key: 'settings', label: t('auth.stepSettings', 'Settings') }
        ]
      : [
          { key: 'whatsapp', label: t('auth.stepWhatsApp', 'WhatsApp') },
          { key: 'account', label: t('auth.stepAccount', 'Account') },
          { key: 'verify', label: t('auth.stepVerify', 'Verify') }
        ]

  const currentStepIndex = steps.findIndex((item) => item.key === step)

  const renderStepper = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {steps.map((item, index) => {
          const isActive = index === currentStepIndex
          const isComplete = index < currentStepIndex
          return (
            <div key={item.key} className="flex items-center flex-1">
              <div
                className={`flex items-center gap-2 ${
                  index !== 0 ? 'ml-2' : ''
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'border border-primary text-primary'
                        : 'border border-border text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`font-medium ${
                    isActive || isComplete ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3 h-px bg-border" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  if (step === 'whatsapp') {
    return (
      <AuthLayout title={t('auth.connectWhatsAppTitle', 'Connect WhatsApp')}>
        {renderStepper()}
        <p className="mb-4 text-sm text-muted-foreground">
          {t(
            'auth.connectWhatsAppHelp',
            'Connect WhatsApp first so we can send you verification codes.'
          )}
        </p>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg">
            {error}
          </div>
        )}
        {warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
            {warning}
          </div>
        )}
        <WhatsAppConnectPanel />
        <div className="mt-4 space-y-3">
          <Button onClick={handleWhatsAppContinue} disabled={isLoading} className="w-full">
            {isLoading ? t('common.loading', 'Loading...') : t('auth.continue', 'Continue')}
          </Button>
          {onGoToLogin && (
            <Button onClick={onGoToLogin} variant="link" className="w-full">
              {t('auth.alreadyHaveAccount', 'Already have an account?')}
            </Button>
          )}
        </div>
      </AuthLayout>
    )
  }

  if (step === 'account') {
    return (
      <AuthLayout title={t('auth.onboardingTitle', 'Create owner account')}>
        {renderStepper()}
        <p className="mb-4 text-sm text-muted-foreground">
          {t('auth.accountHelp', 'Use your phone to sign in and manage the gym.')}
        </p>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">{t('auth.fullName', 'Full name')}</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder', 'Owner name')}
            />
          </div>
          <div>
            <Label className="mb-1 block">{t('auth.phone', 'Phone')}</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+201xxxxxxxxx"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('auth.phoneHint', 'Include country code, e.g. +201...')}
            </p>
          </div>
          <div>
            <Label className="mb-1 block">{t('auth.password', 'Password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('auth.passwordHint', 'Use at least 8 characters.')}
            </p>
          </div>
          <div>
            <Label className="mb-1 block">{t('auth.confirmPassword', 'Confirm Password')}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleRegister} disabled={isLoading} className="w-full">
            {isLoading ? t('common.loading', 'Loading...') : t('auth.createAccount', 'Create Account')}
          </Button>
          {onGoToLogin && (
            <Button onClick={onGoToLogin} variant="link" className="w-full">
              {t('auth.alreadyHaveAccount', 'Already have an account?')}
            </Button>
          )}
          {import.meta.env.DEV && onEnableTestMode && (
            <Button onClick={onEnableTestMode} variant="link" className="w-full">
              {t('auth.enableTestMode', 'Enable test mode')}
            </Button>
          )}
        </div>
      </AuthLayout>
    )
  }

  if (step === 'verify') {
    return (
      <AuthLayout title={t('auth.verifyTitle', 'Verify phone')}>
        {renderStepper()}
        <p className="mb-4 text-sm text-muted-foreground">
          {t('auth.verifyHelp', 'Enter the code we sent to your phone.')}
        </p>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg">
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
            <Label className="mb-1 block">{t('auth.otpCode', 'Verification Code')}</Label>
            <Input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
          </div>
          <Button onClick={handleVerify} disabled={isLoading} className="w-full">
            {isLoading ? t('common.loading', 'Loading...') : t('auth.verify', 'Verify')}
          </Button>
        </div>

      </AuthLayout>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-4">
          {renderStepper()}
          <div>
            <CardTitle className="text-2xl">
              {t('auth.setupSettings', 'Set up your gym settings')}
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('auth.settingsHelp', 'You can change these settings later in Settings.')}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg">
              {error}
            </div>
          )}

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.testMode')}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('settings.enableTestMode')}</span>
                <Switch
                  checked={settings.test_mode}
                  onCheckedChange={(checked) => setSettings({ ...settings, test_mode: checked })}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.general')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>{t('settings.language')}</Label>
                <Select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <option value="en">{t('settings.english')}</option>
                  <option value="ar">{t('settings.arabic')}</option>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.sessionRules')}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('settings.maleSessionCap')}</Label>
                  <Input
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.femaleSessionCap')}</Label>
                  <Input
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
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.warnings')}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('settings.daysBeforeExpiry')}</Label>
                  <Input
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.sessionsRemaining')}</Label>
                  <Input
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
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.scanner')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>{t('settings.cooldownSeconds')}</Label>
                <Input
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
                  className="max-w-xs"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.whatsapp')}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('settings.enableWhatsApp')}</span>
                <Switch
                  checked={settings.whatsapp_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, whatsapp_enabled: checked })
                  }
                />
              </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardContent className="flex justify-end pt-0">
          <Button onClick={handleComplete} disabled={isLoading}>
            {isLoading ? t('common.loading', 'Loading...') : t('auth.finishSetup', 'Finish Setup')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
