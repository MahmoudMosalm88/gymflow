import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { XMarkIcon, PrinterIcon, ShareIcon } from '@heroicons/react/24/outline'

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

  useEffect(() => {
    generateQR()
  }, [memberId])

  const generateQR = async () => {
    try {
      // In production, this would call the backend to generate QR
      // For now, use a placeholder or generate client-side
      const QRCode = await import('qrcode')
      const dataUrl = await QRCode.toDataURL(memberId, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      setQrDataUrl(dataUrl)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('qrCodeDisplay.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

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
              <img src={qrDataUrl} alt="QR Code" className="w-[250px] h-[250px]" />
            </div>
          )}

          <p className="text-sm text-gray-500 mt-4">
            {t('qrCodeDisplay.scanInstructions')}
          </p>
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
      </div>
    </div>
  )
}
