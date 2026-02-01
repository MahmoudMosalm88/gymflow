import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../components/AuthLayout'

interface LoginProps {
  onSuccess: (token: string) => void
  onEnableTestMode?: () => void
}

type Mode = 'login' | 'requestReset' | 'reset'

export default function Login({ onSuccess, onEnableTestMode }: LoginProps): JSX.Element {
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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {successMessage}
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

        {mode === 'login' && (
          <>
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

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? t('common.loading', 'Loading...') : t('auth.login', 'Login')}
            </button>

            <button
              onClick={() => setMode('requestReset')}
              className="w-full text-sm text-gym-primary hover:underline"
            >
              {t('auth.forgotPassword', 'Forgot password?')}
            </button>
            {onEnableTestMode && (
              <button
                onClick={onEnableTestMode}
                className="w-full text-sm text-gray-600 hover:underline"
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
              className="w-full py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? t('common.loading', 'Loading...') : t('auth.sendResetCode', 'Send reset code')}
            </button>
            <button
              onClick={() => setMode('login')}
              className="w-full text-sm text-gray-600 hover:underline"
            >
              {t('auth.backToLogin', 'Back to login')}
            </button>
          </>
        )}

        {mode === 'reset' && (
          <>
            {otpSentVia === 'manual' && manualCode && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
                {t('auth.otpManual', 'Your code is')}: <strong>{manualCode}</strong>
              </div>
            )}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.newPassword', 'New Password')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              onClick={handleResetPassword}
              disabled={isLoading}
              className="w-full py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? t('common.loading', 'Loading...') : t('auth.resetPassword', 'Reset Password')}
            </button>
            <button
              onClick={() => setMode('login')}
              className="w-full text-sm text-gray-600 hover:underline"
            >
              {t('auth.backToLogin', 'Back to login')}
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
