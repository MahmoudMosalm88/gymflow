import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PrinterIcon, ShareIcon } from '@heroicons/react/24/outline'
import Modal from './Modal'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface QRCodeDisplayProps {
  memberId: string
  memberName: string
  onClose: () => void
}

export default function QRCodeDisplay({
  memberId,
  memberName,
  onClose
}: QRCodeDisplayProps): JSX.Element {
  const { t } = useTranslation()
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [qrValue, setQrValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [whatsAppStatus, setWhatsAppStatus] = useState<{ authenticated: boolean } | null>(null)

  useEffect(() => {
    generateQR()
  }, [memberId])

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await window.api.whatsapp.getStatus()
        setWhatsAppStatus(status as { authenticated: boolean })
      } catch {
        setWhatsAppStatus({ authenticated: false })
      }
    }
    loadStatus()
    const unsubscribe = window.api.whatsapp.onStatusChange((status: any) => {
      setWhatsAppStatus(status as { authenticated: boolean })
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const generateQR = async () => {
    try {
      const result = await window.api.qrcode.generate(memberId)
      if (result.success && result.dataUrl) {
        setQrDataUrl(result.dataUrl)
        setQrValue(result.code || memberId)
      } else {
        throw new Error(result.error || 'Failed to generate QR')
      }
    } catch (error) {
      console.error('Failed to generate QR:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${memberName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .card {
              border: 2px solid #000;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              width: 8.5cm;
              height: 5.5cm;
              box-sizing: border-box;
            }
            .name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .qr {
              width: 120px;
              height: 120px;
            }
            .serial {
              font-size: 12px;
              margin-top: 8px;
              font-family: monospace;
              letter-spacing: 1px;
            }
            .brand {
              font-size: 12px;
              color: #666;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="name">${memberName}</div>
            <img src="${qrDataUrl}" class="qr" alt="QR Code" />
            <div class="serial">${qrValue || memberId}</div>
            <div class="brand">GymFlow</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleSendWhatsApp = async () => {
    if (!whatsAppStatus?.authenticated) {
      setWhatsAppError(
        t(
          'qrCodeDisplay.whatsappNotConnected',
          'WhatsApp is not connected. Connect it in Settings first.'
        )
      )
      try {
        await window.api.app.openExternal('https://web.whatsapp.com')
      } catch {
        // ignore
      }
      return
    }
    setIsSendingWhatsApp(true)
    setWhatsAppError(null)

    try {
      await window.api.whatsapp.sendQRCode(memberId, memberName, qrDataUrl, qrValue || memberId)
      // Close modal after successful send
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      console.error('Failed to send QR via WhatsApp:', error)
      setWhatsAppError(String(error) || 'Failed to send QR code')
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  const handleCopyCode = async () => {
    setCopyStatus('idle')
    try {
      await navigator.clipboard.writeText(qrValue || memberId)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 1500)
    } catch (error) {
      console.error('Failed to copy QR payload:', error)
      setCopyStatus('failed')
      setTimeout(() => setCopyStatus('idle'), 1500)
    }
  }

  return (
    <Modal title={t('qrCodeDisplay.title')} onClose={onClose} closeLabel={t('common.close')}>
      {/* Error Message */}
      {whatsAppError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {whatsAppError}
        </div>
      )}

      {/* Content */}
      <div className="text-center">
        <p className="text-lg font-medium text-foreground mb-2">{memberName}</p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge variant={whatsAppStatus?.authenticated ? 'success' : 'secondary'}>
            {whatsAppStatus?.authenticated
              ? t('settings.connected')
              : t('settings.disconnected')}
          </Badge>
        </div>

        {isLoading ? (
          <div className="w-[300px] h-[300px] mx-auto bg-muted rounded-lg flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-gym-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="inline-block p-4 bg-background border-2 border-border rounded-xl">
            <img src={qrDataUrl} alt={t('qrCodeDisplay.title')} className="w-[250px] h-[250px]" />
          </div>
        )}

        <p className="text-sm text-muted-foreground mt-4">{t('qrCodeDisplay.scanInstructions')}</p>
        <div className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium">{t('qrCodeDisplay.codeLabel', 'Code')}:</span>{' '}
          <span className="font-mono break-all text-foreground">{qrValue || memberId}</span>
        </div>
        <div className="mt-3">
          <Button
            onClick={handleCopyCode}
            variant="outline"
          >
            {copyStatus === 'copied'
              ? t('qrCodeDisplay.copied', 'Copied')
              : copyStatus === 'failed'
                ? t('qrCodeDisplay.copyFailed', 'Copy failed')
                : t('qrCodeDisplay.copyCode', 'Copy Code')}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-6">
        <Button
          onClick={handlePrint}
          disabled={isLoading}
          className="flex-1"
        >
          <PrinterIcon className="w-5 h-5" />
          {t('qrCodeDisplay.printCard')}
        </Button>
        <Button
          onClick={handleSendWhatsApp}
          disabled={isLoading || isSendingWhatsApp}
          variant="secondary"
          className="flex-1"
        >
          <ShareIcon className="w-5 h-5" />
          {isSendingWhatsApp ? t('common.loading') : t('qrCodeDisplay.sendViaWhatsApp')}
        </Button>
      </div>
    </Modal>
  )
}
