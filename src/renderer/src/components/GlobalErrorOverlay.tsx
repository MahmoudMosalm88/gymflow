import { useEffect, useState } from 'react'

export default function GlobalErrorOverlay(): JSX.Element | null {
  const [rawMessage, setRawMessage] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const msg = event.error?.message || event.message || 'Unknown error'
      console.error('Global error:', event.error || event.message)
      setRawMessage(msg)
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const msg =
        (event.reason && (event.reason.message || String(event.reason))) ||
        'Unhandled promise rejection'
      console.error('Unhandled rejection:', event.reason)
      setRawMessage(msg)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (!rawMessage) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-card p-6 max-w-lg w-full border border-border shadow-lg">
        {/* Bilingual — this component may render before i18n is ready */}
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Something went wrong / حدث خطأ غير متوقع
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please reload the app to continue. / يرجى إعادة تحميل التطبيق للمتابعة.
        </p>

        {/* Optional technical details toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          {showDetails && (
            <pre className="mt-2 p-2 bg-muted text-xs text-muted-foreground text-start overflow-auto max-h-32">
              {rawMessage}
            </pre>
          )}
        </div>

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Reload / إعادة تحميل
        </button>
      </div>
    </div>
  )
}
