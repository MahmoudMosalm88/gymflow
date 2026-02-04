import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PrinterIcon, ShareIcon } from '@heroicons/react/24/outline'
import Modal from './Modal'

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
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    generateQR()
  }, [memberId])

  const generateQR = async () => {
    try {
      const result = await window.api.qrcode.generate(memberId)
      if (result.success && result.dataUrl) {
        setQrDataUrl(result.dataUrl)
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
    setIsSendingWhatsApp(true)
    setWhatsAppError(null)

    try {
      await window.api.whatsapp.sendQRCode(memberId, memberName, qrDataUrl)
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
      await navigator.clipboard.writeText(memberId)
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
        <p className="text-lg font-medium text-gray-900 mb-4">{memberName}</p>

        {isLoading ? (
          <div className="w-[300px] h-[300px] mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-gym-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
            <img src={qrDataUrl} alt={t('qrCodeDisplay.title')} className="w-[250px] h-[250px]" />
          </div>
        )}

        <p className="text-sm text-gray-500 mt-4">{t('qrCodeDisplay.scanInstructions')}</p>
        <div className="mt-3 text-sm text-gray-600">
          <span className="font-medium">{t('qrCodeDisplay.codeLabel', 'Code')}:</span>{' '}
          <span className="font-mono break-all">{memberId}</span>
        </div>
        <div className="mt-3">
          <button
            onClick={handleCopyCode}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copyStatus === 'copied'
              ? t('qrCodeDisplay.copied', 'Copied')
              : copyStatus === 'failed'
                ? t('qrCodeDisplay.copyFailed', 'Copy failed')
                : t('qrCodeDisplay.copyCode', 'Copy Code')}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={handlePrint}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          <PrinterIcon className="w-5 h-5" />
          {t('qrCodeDisplay.printCard')}
        </button>
        <button
          onClick={handleSendWhatsApp}
          disabled={isLoading || isSendingWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
        >
          <ShareIcon className="w-5 h-5" />
          {isSendingWhatsApp ? t('common.loading') : t('qrCodeDisplay.sendViaWhatsApp')}
        </button>
      </div>
    </Modal>
  )
}
