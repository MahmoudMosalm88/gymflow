import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as QRCode from 'qrcode'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Select } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Badge } from '../components/ui/badge'
import { Textarea } from '../components/ui/textarea'
import { Separator } from '../components/ui/separator'

interface SettingsData {
  language: string
  session_cap_male: number
  session_cap_female: number
  warning_days_before_expiry: number
  warning_sessions_remaining: number
  scan_cooldown_seconds: number
  whatsapp_enabled: boolean
  whatsapp_batch_delay_min: number
  whatsapp_batch_delay_max: number
  whatsapp_template_welcome: string
  whatsapp_template_renewal: string
  whatsapp_template_low_sessions: string
}

const defaultSettings: SettingsData = {
  language: 'en',
  session_cap_male: 26,
  session_cap_female: 30,
  warning_days_before_expiry: 3,
  warning_sessions_remaining: 3,
  scan_cooldown_seconds: 30,
  whatsapp_enabled: false,
  whatsapp_batch_delay_min: 10,
  whatsapp_batch_delay_max: 15,
  whatsapp_template_welcome: 'Welcome to GymFlow, {{name}}! Your QR code is attached.',
  whatsapp_template_renewal: 'Hi {{name}}, your subscription expires in {{days}} days. Please renew soon!',
  whatsapp_template_low_sessions:
    'Hi {{name}}, you have only {{sessions}} sessions remaining this cycle.'
}

export default function Settings(): JSX.Element {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState<SettingsData>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveIsSuccess, setSaveIsSuccess] = useState(false)
  const [cardCount, setCardCount] = useState<string>('100')
  const [cardPreview, setCardPreview] = useState<string>('')
  const [cardBatch, setCardBatch] = useState<{
    from: string
    to: string
    pdfPath: string
    csvPath?: string
  } | null>(null)
  const [cardBatchLoading, setCardBatchLoading] = useState(false)
  const [cardBatchError, setCardBatchError] = useState<string | null>(null)
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
    const loadPreview = async () => {
      try {
        const result = await window.api.cards.getNextPreview()
        if (result?.success && result.next) {
          setCardPreview(String(result.next))
        }
      } catch {
        // ignore
      }
    }
    loadPreview()
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
          error: t('settings.qrGenerateFailed', 'Failed to generate QR code')
        }))
      }
    })

    const unsubscribeStatus = window.api.whatsapp.onStatusChange((status: any) => {
      setWhatsappStatus(status as any)
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
        warning_days_before_expiry: settings.warning_days_before_expiry,
        warning_sessions_remaining: settings.warning_sessions_remaining,
        scan_cooldown_seconds: settings.scan_cooldown_seconds,
        whatsapp_enabled: settings.whatsapp_enabled,
        whatsapp_batch_delay_min: settings.whatsapp_batch_delay_min,
        whatsapp_batch_delay_max: settings.whatsapp_batch_delay_max,
        whatsapp_template_welcome: settings.whatsapp_template_welcome,
        whatsapp_template_renewal: settings.whatsapp_template_renewal,
        whatsapp_template_low_sessions: settings.whatsapp_template_low_sessions
      }

      await window.api.settings.setAll(settingsToSave)

      if (languageChanged) {
        setSaveMessage(t('settings.reloading', 'Reloading to apply language...'))
        setTimeout(() => window.location.reload(), 200)
        return
      }

      setSaveIsSuccess(true)
      setSaveMessage(t('settings.saveSuccess', 'Settings saved successfully!'))
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveIsSuccess(false)
      setSaveMessage(t('settings.saveFailed', 'Failed to save settings'))
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
        setSaveMessage(t('settings.backupSuccess', 'Backup successful'))
      } else {
        setSaveMessage(t('settings.backupFailed', 'Backup failed'))
      }
    } catch (error) {
      console.error('Failed to backup database:', error)
      setSaveMessage(t('settings.backupFailed', 'Backup failed'))
    }
  }

  const handleRestore = async () => {
    try {
      const result = await window.api.app.restore()
      if (result.success) {
        setSaveMessage(t('settings.restoreSuccess', 'Restore successful'))
      } else {
        setSaveMessage(t('settings.restoreFailed', 'Restore failed'))
      }
    } catch (error) {
      console.error('Failed to restore database:', error)
      setSaveMessage(t('settings.restoreFailed', 'Restore failed'))
    }
  }

  const handleGenerateCards = async () => {
    setCardBatchError(null)
    const count = Number(cardCount)
    if (!Number.isFinite(count) || count <= 0) {
      setCardBatchError(t('settings.cardsCountError', 'Enter a valid count'))
      return
    }
    setCardBatchLoading(true)
    try {
      const result = await window.api.cards.generateBatch({ count })
      if (result?.success) {
        setCardBatch({
          from: result.from,
          to: result.to,
          pdfPath: result.pdfPath,
          csvPath: result.csvPath
        })
        const preview = await window.api.cards.getNextPreview()
        if (preview?.success && preview.next) {
          setCardPreview(String(preview.next))
        }
      } else {
        setCardBatchError(result?.error || t('common.error'))
      }
    } catch (error) {
      console.error('Failed to generate card batch:', error)
      setCardBatchError(t('common.error'))
    } finally {
      setCardBatchLoading(false)
    }
  }

  const handleOpenBatchFolder = async () => {
    if (!cardBatch?.pdfPath) return
    try {
      await window.api.app.showItemInFolder(cardBatch.pdfPath)
    } catch (error) {
      console.error('Failed to open batch folder:', error)
    }
  }


  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-muted/30 min-h-full">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle', 'Manage GymFlow preferences and integrations.')}</p>
      </div>

      {saveMessage && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            saveIsSuccess
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}
        >
          {saveMessage}
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t('settings.tabGeneral', 'General')}</TabsTrigger>
          <TabsTrigger value="rules">{t('settings.tabRules', 'Rules')}</TabsTrigger>
          <TabsTrigger value="whatsapp">{t('settings.tabWhatsApp', 'WhatsApp')}</TabsTrigger>
          <TabsTrigger value="data">{t('settings.tabData', 'Data')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.general')}</CardTitle>
              <CardDescription>{t('settings.generalDesc', 'Language and account settings.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>{t('settings.language')}</Label>
                <Select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <option value="en">{t('settings.english')}</option>
                  <option value="ar">{t('settings.arabic')}</option>
                </Select>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.sessionRules')}</CardTitle>
                <CardDescription>{t('settings.sessionRulesDesc', 'Default limits by gender.')}</CardDescription>
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
                <CardDescription>{t('settings.warningsDesc', 'When to show yellow warnings.')}</CardDescription>
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
                <CardDescription>{t('settings.scannerDesc', 'Scan cooldown settings.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
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
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.whatsapp')}</CardTitle>
              <CardDescription>{t('settings.whatsappDesc', 'Connect WhatsApp Web and manage QR access.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.whatsapp_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, whatsapp_enabled: checked })
                    }
                  />
                  <div>
                    <Label>{t('settings.enableWhatsApp')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.whatsappAutoHint', 'Enable WhatsApp automation and QR delivery')}
                    </p>
                  </div>
                </div>
                <Badge variant={whatsappStatus.authenticated ? 'success' : 'secondary'}>
                  {whatsappStatus.authenticated ? t('settings.connected') : t('settings.disconnected')}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3">
                {!whatsappStatus.authenticated ? (
                  <Button onClick={handleWhatsAppConnect}>{t('settings.connect')}</Button>
                ) : (
                  <Button variant="secondary" onClick={handleWhatsAppDisconnect}>
                    {t('settings.disconnect')}
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.api.app.openExternal('https://web.whatsapp.com')}>
                  {t('settings.openWhatsAppWeb', 'Open WhatsApp Web')}
                </Button>
                {whatsappStatus.qrCode && !whatsappStatus.authenticated && (
                  <Button variant="outline" onClick={() => setShowQr(true)}>
                    {t('settings.showQr', 'Show QR')}
                  </Button>
                )}
              </div>

              {whatsappStatus.error && (
                <div className="text-sm text-red-400">{whatsappStatus.error}</div>
              )}

              <Separator />

              <div className="grid gap-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label>{t('settings.whatsappBatchMin', 'Batch delay min (minutes)')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={settings.whatsapp_batch_delay_min}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          whatsapp_batch_delay_min: parseInt(e.target.value) || 10
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                  <Label>{t('settings.whatsappBatchMax', 'Batch delay max (minutes)')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={settings.whatsapp_batch_delay_max}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          whatsapp_batch_delay_max: parseInt(e.target.value) || 15
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('settings.welcomeTemplate', 'Welcome message template')}</Label>
                  <Textarea
                    value={settings.whatsapp_template_welcome}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp_template_welcome: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.whatsappTemplateHint', 'Use {{name}} for member name.')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('settings.renewalTemplate', 'Renewal reminder template')}</Label>
                  <Textarea
                    value={settings.whatsapp_template_renewal}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp_template_renewal: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.whatsappTemplateRenewalHint', 'Use {{name}} and {{days}}.')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('settings.lowSessionsTemplate', 'Low sessions template')}</Label>
                  <Textarea
                    value={settings.whatsapp_template_low_sessions}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp_template_low_sessions: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.whatsappTemplateSessionsHint', 'Use {{name}} and {{sessions}}.')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.cardsTitle', 'Pre-Printed Cards')}</CardTitle>
                <CardDescription>
                  {t('settings.cardsDescription', 'Generate A4 QR code sheets for printing.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.cardsCount', 'How many codes?')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={cardCount}
                      onChange={(e) => setCardCount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.cardsNext', 'Next code')}</Label>
                    <Input value={cardPreview} readOnly placeholder="00001" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleGenerateCards} disabled={cardBatchLoading}>
                    {cardBatchLoading
                      ? t('common.loading')
                      : t('settings.cardsGenerate', 'Generate PDF')}
                  </Button>
                  {cardBatch?.pdfPath && (
                    <Button variant="outline" onClick={handleOpenBatchFolder}>
                      {t('settings.cardsOpenFolder', 'Open folder')}
                    </Button>
                  )}
                </div>

                {cardBatch && (
                  <div className="text-sm text-muted-foreground">
                    {t('settings.cardsGenerated', 'Generated')} {cardBatch.from} → {cardBatch.to}
                    {cardBatch.csvPath ? ` (${t('settings.cardsCsv', 'CSV included')})` : ''}
                  </div>
                )}

                {cardBatchError && (
                  <div className="text-sm text-red-400">{cardBatchError}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.data')}</CardTitle>
                <CardDescription>{t('settings.dataDesc', 'Backup, restore, and data location.')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleOpenDataFolder}>
                  {t('settings.openDataFolder')}
                </Button>
                <Button variant="outline" onClick={handleBackup}>
                  {t('settings.backup')}
                </Button>
                <Button variant="outline" onClick={handleRestore}>
                  {t('settings.restore')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('common.loading') : t('settings.save')}
        </Button>
      </div>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.qrTitle', 'Scan QR')}</DialogTitle>
          </DialogHeader>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="WhatsApp QR" className="mx-auto w-64 h-64" />
          ) : (
            <div className="w-64 h-64 mx-auto flex items-center justify-center bg-muted rounded-lg">
              {t('common.loading')}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-3 text-center">
            {t('settings.qrHint', 'Open WhatsApp → Linked Devices → Scan this QR')}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
