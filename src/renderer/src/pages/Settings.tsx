import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as QRCode from 'qrcode'

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

export default function Settings(): JSX.Element {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState<SettingsData>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [whatsappStatus, setWhatsappStatus] = useState<{
    connected: boolean
    authenticated: boolean
    qrCode?: string | null
    error?: string | null
  }>({ connected: false, authenticated: false })
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await window.api.whatsapp.getStatus()
        setWhatsappStatus(status as any)
      } catch {
        // ignore
      }
    }
    loadStatus()

    const unsubscribeQr = window.api.whatsapp.onQRCode(async (qr: string) => {
      setWhatsappStatus((prev) => ({ ...prev, qrCode: qr, error: null }))
      try {
        const dataUrl = await QRCode.toDataURL(qr, { width: 260, margin: 1 })
        setQrDataUrl(dataUrl)
        setShowQr(true)
      } catch (error) {
        console.error('Failed to generate QR code:', error)
        setQrDataUrl(null)
        setWhatsappStatus((prev) => ({
          ...prev,
          error: 'Failed to generate QR code'
        }))
      }
    })

    const unsubscribeStatus = window.api.whatsapp.onStatusChange((status: any) => {
      setWhatsappStatus(status as any)
      // Close QR modal when authenticated, after a brief delay to show success
      if ((status as any).authenticated) {
        setTimeout(() => {
          setShowQr(false)
          setQrDataUrl(null)
        }, 500)
      }
    })

    return () => {
      unsubscribeQr()
      unsubscribeStatus()
    }
  }, [])

  const loadSettings = async () => {
    try {
      const data = await window.api.settings.getAll()
      setSettings({ ...defaultSettings, ...data })
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const languageChanged = settings.language !== i18n.language
      const settingsToSave: Record<string, unknown> = {
        language: settings.language,
        session_cap_male: settings.session_cap_male,
        session_cap_female: settings.session_cap_female,
        test_mode: settings.test_mode,
        access_hours_enabled: settings.access_hours_enabled,
        warning_days_before_expiry: settings.warning_days_before_expiry,
        warning_sessions_remaining: settings.warning_sessions_remaining,
        scan_cooldown_seconds: settings.scan_cooldown_seconds,
        whatsapp_enabled: settings.whatsapp_enabled
      }

      await window.api.settings.setAll(settingsToSave)

      // Reload to apply language change cleanly
      if (languageChanged) {
        setSaveMessage('Reloading to apply language...')
        setTimeout(() => window.location.reload(), 200)
        return
      }

      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage(`Failed to save settings: ${String(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDataFolder = async () => {
    try {
      await window.api.app.openDataFolder()
    } catch (error) {
      console.error('Failed to open data folder:', error)
    }
  }

  const handleWhatsAppConnect = async () => {
    try {
      await window.api.whatsapp.connect()
    } catch (error) {
      console.error('WhatsApp connect failed:', error)
    }
  }

  const handleWhatsAppDisconnect = async () => {
    try {
      await window.api.whatsapp.disconnect()
    } catch (error) {
      console.error('WhatsApp disconnect failed:', error)
    }
  }

  const handleBackup = async () => {
    try {
      const result = await window.api.app.backup()
      if (result.success) {
        setSaveMessage('Backup successful')
      } else {
        setSaveMessage(`Backup failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to backup database:', error)
      setSaveMessage('Backup failed')
    }
  }

  const handleRestore = async () => {
    try {
      const result = await window.api.app.restore()
      if (result.success) {
        setSaveMessage('Restore successful')
      } else {
        setSaveMessage(`Restore failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to restore database:', error)
      setSaveMessage('Restore failed')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('settings.title')}</h1>

      {saveMessage && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            saveMessage.includes('success')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {saveMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* General */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.general')}</h2>
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

        {/* Test Mode */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.testMode')}</h2>
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

        {/* Session Rules */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.sessionRules')}</h2>
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
                  setSettings({ ...settings, session_cap_male: parseInt(e.target.value) || 26 })
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
                  setSettings({ ...settings, session_cap_female: parseInt(e.target.value) || 30 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Warnings */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.warnings')}</h2>
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

        {/* Scanner */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.scanner')}</h2>
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
                setSettings({ ...settings, scan_cooldown_seconds: parseInt(e.target.value) || 30 })
              }
              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
            />
          </div>
        </section>

        {/* WhatsApp */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.whatsapp')}</h2>
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.whatsapp_enabled}
                onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-gray-700">{t('settings.enableWhatsApp')}</span>
            </label>
            <span
              className={`text-sm font-medium ${
                whatsappStatus.authenticated ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {whatsappStatus.authenticated ? t('settings.connected') : t('settings.disconnected')}
            </span>
          </div>
          <div className="flex gap-3">
            {!whatsappStatus.authenticated ? (
              <button
                onClick={handleWhatsAppConnect}
                className="px-4 py-2 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('settings.connect')}
              </button>
            ) : (
              <button
                onClick={handleWhatsAppDisconnect}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('settings.disconnect')}
              </button>
            )}
            {whatsappStatus.qrCode && !whatsappStatus.authenticated && (
              <button
                onClick={() => setShowQr(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('settings.showQr', 'Show QR')}
              </button>
            )}
          </div>
          {whatsappStatus.error && (
            <p className="mt-3 text-sm text-red-600">{whatsappStatus.error}</p>
          )}
        </section>

        {/* Data Management */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.data')}</h2>
          <div className="flex gap-4">
            <button
              onClick={handleOpenDataFolder}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('settings.openDataFolder')}
            </button>
            <button
              onClick={handleBackup}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('settings.backup')}
            </button>
            <button
              onClick={handleRestore}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('settings.restore')}
            </button>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? t('common.loading') : t('settings.save')}
          </button>
        </div>
      </div>

      {showQr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('settings.qrTitle', 'Scan QR')}</h3>
              <button onClick={() => setShowQr(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="WhatsApp QR" className="mx-auto w-64 h-64" />
            ) : (
              <div className="w-64 h-64 mx-auto flex items-center justify-center bg-gray-100 rounded-lg">
                {t('common.loading')}
              </div>
            )}
            <p className="text-sm text-gray-600 mt-3 text-center">
              {t('settings.qrHint', 'Open WhatsApp → Linked Devices → Scan this QR')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
