import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../components/AuthLayout'
import WhatsAppConnectPanel from '../components/WhatsAppConnectPanel'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

interface LoginProps {
  onSuccess: (token: string) => void
  onGoToSignUp?: () => void
}

type Mode = 'login' | 'requestReset' | 'reset'

export default function Login({
  onSuccess,
  onGoToSignUp
}: LoginProps): JSX.Element {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSentVia, setOtpSentVia] = useState<'whatsapp' | 'manual' | null>(null)
  const [manualCode, setManualCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.owner.login(phone, password)
      if (!result.success || !result.token) {
        setError(result.error || t('auth.loginFailed', 'Login failed'))
        return
      }
      onSuccess(result.token)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestReset = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const result = await window.api.owner.requestPasswordReset(phone)
      if (!result.success) {
        setError(result.error || t('auth.resetFailed', 'Failed to request reset'))
        return
      }
      setOtpSentVia(result.sentVia || null)
      setManualCode(result.code || null)
      setMode('reset')
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Passwords do not match'))
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.owner.resetPassword(phone, otpCode, newPassword)
      if (!result.success) {
        setError(result.error || t('auth.resetFailed', 'Failed to reset password'))
        return
      }
      setSuccessMessage(t('auth.resetSuccess', 'Password updated. Please log in.'))
      setMode('login')
      setOtpCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title={t('auth.loginTitle', 'Sign in to GymFlow')}>
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg animate-slide-up">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg animate-slide-up">
          {successMessage}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <Label htmlFor="login-phone" className="mb-2 block">{t('auth.phone', 'Phone')}</Label>
          <Input
            id="login-phone"
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+201xxxxxxxxx"
            autoComplete="tel"
          />
        </div>

        {mode === 'login' && (
          <>
            <div>
              <Label htmlFor="login-password" className="mb-2 block">{t('auth.password', 'Password')}</Label>
              <Input
                id="login-password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Button onClick={handleLogin} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin me-2" />
                  {t('common.loading', 'Loading...')}
                </>
              ) : (
                t('auth.login', 'Login')
              )}
            </Button>

            {onGoToSignUp && (
              <Button onClick={onGoToSignUp} variant="secondary" className="w-full">
                {t('auth.createAccount', 'Create Account')}
              </Button>
            )}

            <Button
              onClick={() => setMode('requestReset')}
              variant="link"
              className="w-full"
            >
              {t('auth.forgotPassword', 'Forgot password?')}
            </Button>
          </>
        )}

        {mode === 'requestReset' && (
          <>
            <Button onClick={handleRequestReset} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin me-2" />
                  {t('common.loading', 'Loading...')}
                </>
              ) : (
                t('auth.sendResetCode', 'Send reset code')
              )}
            </Button>
            <Button onClick={() => setMode('login')} variant="link" className="w-full">
              {t('auth.backToLogin', 'Back to login')}
            </Button>
          </>
        )}

        {mode === 'reset' && (
          <>
            {import.meta.env.DEV && otpSentVia === 'manual' && manualCode && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                {t('auth.otpManual', 'Your code is')}: <strong className="font-heading font-bold text-lg">{manualCode}</strong>
              </div>
            )}
            <div>
              <Label className="mb-2 block">{t('auth.otpCode', 'Verification Code')}</Label>
              <Input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">{t('auth.newPassword', 'New Password')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">{t('auth.confirmPassword', 'Confirm Password')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleResetPassword} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin me-2" />
                  {t('common.loading', 'Loading...')}
                </>
              ) : (
                t('auth.resetPassword', 'Reset Password')
              )}
            </Button>
            <Button onClick={() => setMode('login')} variant="link" className="w-full">
              {t('auth.backToLogin', 'Back to login')}
            </Button>
          </>
        )}
      </div>

      {!import.meta.env.DEV && <WhatsAppConnectPanel />}
    </AuthLayout>
  )
}
