import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CameraIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface PhotoCaptureProps {
  currentPhoto: string | null
  onCapture: (photoPath: string) => void
  onRemove: () => void
}

export default function PhotoCapture({
  currentPhoto,
  onCapture,
  onRemove
}: PhotoCaptureProps): JSX.Element {
  const { t } = useTranslation()
  const [isCapturing, setIsCapturing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCapturing(true)
    } catch (error) {
      console.error('Failed to access camera:', error)
      alert('Failed to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    // Convert to blob and save
    canvas.toBlob(async (blob) => {
      if (!blob) return

      // For now, create a data URL (in production, save to file system)
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        onCapture(dataUrl)
        stopCamera()
      }
      reader.readAsDataURL(blob)
    }, 'image/jpeg', 0.8)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      onCapture(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      {/* Current Photo or Placeholder */}
      {!isCapturing && (
        <div className="relative w-40 h-40 mx-auto">
          <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
            {currentPhoto ? (
              <img
                src={currentPhoto.startsWith('data:') ? currentPhoto : `file://${currentPhoto}`}
                alt="Member photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <CameraIcon className="w-12 h-12" />
              </div>
            )}
          </div>
          {currentPhoto && (
            <button
              onClick={onRemove}
              className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Camera Preview */}
      {isCapturing && (
        <div className="relative w-full max-w-md mx-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {!isCapturing ? (
          <>
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <CameraIcon className="w-5 h-5" />
              {t('memberForm.capturePhoto')}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowUpTrayIcon className="w-5 h-5" />
              {t('memberForm.uploadPhoto')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={capturePhoto}
              className="flex items-center gap-2 px-4 py-2 bg-traffic-green text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <CameraIcon className="w-5 h-5" />
              Capture
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
