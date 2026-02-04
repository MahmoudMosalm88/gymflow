import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../components/AuthLayout'
import WhatsAppConnectPanel from '../components/WhatsAppConnectPanel'

interface LoginProps {
  onSuccess: (token: string) => void
  onEnableTestMode?: () => void
  onGoToSignUp?: () => void
}

type Mode = 'login' | 'requestReset' | 'reset'

export default function Login({
  onSuccess,
  onEnableTestMode,
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
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg animate-slide-up">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 rounded-lg animate-slide-up">
          {successMessage}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
            {t('auth.phone', 'Phone')}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            placeholder="+201xxxxxxxxx"
          />
        </div>

        {mode === 'login' && (
          <>
            <div>
              <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                {t('auth.password', 'Password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('common.loading', 'Loading...')}
                </>
              ) : (
                t('auth.login', 'Login')
              )}
            </button>

            {onGoToSignUp && (
              <button
                onClick={onGoToSignUp}
                className="btn btn-secondary w-full"
              >
                {t('auth.createAccount', 'Create Account')}
              </button>
            )}

            <button
              onClick={() => setMode('requestReset')}
              className="w-full text-sm text-brand-primary dark:text-brand-light hover:underline font-medium"
            >
              {t('auth.forgotPassword', 'Forgot password?')}
            </button>
            {import.meta.env.DEV && onEnableTestMode && (
              <button
                onClick={onEnableTestMode}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:underline"
              >
                {t('auth.enableTestMode', 'Enable test mode')}
              </button>
            )}
          </>
        )}

        {mode === 'requestReset' && (
          <>
            <button
              onClick={handleRequestReset}
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('common.loading', 'Loading...')}
                </>
              ) : (
                t('auth.sendResetCode', 'Send reset code')
              )}
            </button>
            <button
              onClick={() => setMode('login')}
              className="w-full text-sm text-gray-600 dark:text-gray-400 hover:underline"
            >
              {t('auth.backToLogin', 'Back to login')}
            </button>
          </>
        )}

        {mode === 'reset' && (
          <>
            {import.meta.env.DEV && otpSentVia === 'manual' && manualCode && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-200 rounded-lg">
                {t('auth.otpManual', 'Your code is')}: <strong className="font-heading font-bold text-lg">{manualCode}</strong>
              </div>
            )}
            <div>
              <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                {t('auth.otpCode', 'Verification Code')}
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                {t('auth.newPassword', 'New Password')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                {t('auth.confirmPassword', 'Confirm Password')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              onClick={handleResetPassword}
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('common.loading', 'Loading...')}
                </>
              ) : (
                t('auth.resetPassword', 'Reset Password')
              )}
            </button>
            <button
              onClick={() => setMode('login')}
              className="w-full text-sm text-gray-600 dark:text-gray-400 hover:underline"
            >
              {t('auth.backToLogin', 'Back to login')}
            </button>
          </>
        )}
      </div>

      {!import.meta.env.DEV && <WhatsAppConnectPanel />}
    </AuthLayout>
  )
}
