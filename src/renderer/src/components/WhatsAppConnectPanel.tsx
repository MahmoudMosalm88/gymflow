import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as QRCode from 'qrcode'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import ConfirmDialog from './ConfirmDialog'

type WhatsAppStatus = {
  connected: boolean
  authenticated: boolean
  qrCode?: string | null
  error?: string | null
}

export default function WhatsAppConnectPanel(): JSX.Element {
  const { t } = useTranslation()

  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    authenticated: false
  })
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [lastQrAt, setLastQrAt] = useState<number | null>(null)

  const isConnected = status.authenticated
  const hasQr = Boolean(qrDataUrl)

  const statusLabel = useMemo(() => {
    if (isConnected) return t('settings.connected')
    if (isConnecting) return t('common.loading', 'Connecting...')
    return t('settings.disconnected')
  }, [isConnected, isConnecting, t])

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const initial = (await window.api.whatsapp.getStatus()) as WhatsAppStatus
        setStatus(initial)
        if (initial?.qrCode) {
          try {
            const dataUrl = await QRCode.toDataURL(initial.qrCode, { width: 220, margin: 1 })
            setQrDataUrl(dataUrl)
            setLastQrAt(Date.now())
          } catch {
            setQrDataUrl(null)
          }
        }
        if (!initial?.authenticated) {
          setIsConnecting(true)
          await openWhatsAppWeb()
          const result = await window.api.whatsapp.connect()
          if (result && 'error' in result && result.error) {
            setStatus((prev) => ({ ...prev, error: result.error as string }))
          }
        }
      } catch {
        // ignore
      } finally {
        setIsConnecting(false)
      }
    }

    loadStatus()

    const unsubscribeQr = window.api.whatsapp.onQRCode(async (qr: string) => {
      setStatus((prev) => ({ ...prev, qrCode: qr, error: null }))
      try {
        const dataUrl = await QRCode.toDataURL(qr, { width: 220, margin: 1 })
        setQrDataUrl(dataUrl)
        setLastQrAt(Date.now())
      } catch (error) {
        console.error('Failed to generate WhatsApp QR code:', error)
        setQrDataUrl(null)
        setStatus((prev) => ({ ...prev, error: t('settings.qrGenerateFailed', 'Failed to generate QR code') }))
      }
    })

    const unsubscribeStatus = window.api.whatsapp.onStatusChange((next: any) => {
      setStatus(next as WhatsAppStatus)
      if ((next as WhatsAppStatus).authenticated) {
        setIsConnecting(false)
      }
      if ((next as WhatsAppStatus).authenticated) {
        setTimeout(() => setQrDataUrl(null), 500)
      }
    })

    return () => {
      unsubscribeQr()
      unsubscribeStatus()
    }
  }, [])

  const openWhatsAppWeb = async () => {
    try {
      await window.api.app.openExternal('https://web.whatsapp.com')
    } catch {
      // ignore
    }
  }

  const handleConnect = async () => {
    if (isConnecting) return
    setIsConnecting(true)
    try {
      await openWhatsAppWeb()
      const result = await window.api.whatsapp.connect()
      if (result && 'error' in result && result.error) {
        setStatus((prev) => ({ ...prev, error: result.error as string }))
      }
    } catch {
      // ignore (status updates will surface errors)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await window.api.whatsapp.disconnect()
    } catch {
      // ignore
    }
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">
              {t('settings.whatsapp', 'WhatsApp')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                'auth.whatsappOtpHelp',
                'Connect WhatsApp to receive verification and reset codes.'
              )}
            </p>
          </div>
          <span
            className={`text-sm font-medium ${
              status.authenticated ? 'text-emerald-400' : 'text-muted-foreground'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          {!status.authenticated ? (
            <Button type="button" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? t('common.loading', 'Loading...') : t('settings.connect')}
            </Button>
          ) : (
            <Button type="button" onClick={() => setShowDisconnectConfirm(true)} variant="secondary">
              {t('settings.disconnect')}
            </Button>
          )}

          {status.qrCode && !status.authenticated && (
            <span className="text-sm text-muted-foreground">
              {t('auth.whatsappScanQr', 'Scan the QR below')}
            </span>
          )}
        </div>

        {!isConnected && (
          <div className="mt-4 flex flex-col items-center gap-3">
            {hasQr ? (
              <img
                src={qrDataUrl!}
                alt="WhatsApp QR"
                className="w-56 h-56 rounded-lg border border-border bg-background"
              />
            ) : (
              <div className="w-56 h-56 rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
                {isConnecting
                  ? t('common.loading', 'Connecting...')
                  : t('auth.whatsappScanQr', 'Waiting for QR')}
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              {t('settings.qrHint', 'Open WhatsApp → Linked Devices → Scan this QR')}
            </p>
            {!hasQr && !isConnecting && (
              <Button type="button" onClick={handleConnect} variant="outline">
                {t('settings.connect')}
              </Button>
            )}
            {lastQrAt && !isConnected && (
              <p className="text-xs text-muted-foreground">
                {t('auth.qrFresh', 'QR last updated')}: {new Date(lastQrAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {status.error && <p className="mt-3 text-sm text-red-400">{status.error}</p>}

        {showDisconnectConfirm && (
          <ConfirmDialog
            title={t('settings.disconnect')}
            message={t('common.confirmDisconnect')}
            confirmLabel={t('settings.disconnect')}
            variant="danger"
            onConfirm={() => {
              setShowDisconnectConfirm(false)
              handleDisconnect()
            }}
            onCancel={() => setShowDisconnectConfirm(false)}
          />
        )}
      </CardContent>
    </Card>
  )
}
