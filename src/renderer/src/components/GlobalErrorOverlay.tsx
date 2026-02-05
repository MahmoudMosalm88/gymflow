import { useEffect, useState } from 'react'

export default function GlobalErrorOverlay(): JSX.Element | null {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const msg = event.error?.message || event.message || 'Unknown error'
      console.error('Global error:', event.error || event.message)
      setMessage(msg)
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const msg =
        (event.reason && (event.reason.message || String(event.reason))) ||
        'Unhandled promise rejection'
      console.error('Unhandled rejection:', event.reason)
      setMessage(msg)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (!message) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-card rounded-xl p-6 max-w-lg w-full border border-border shadow-lg">
        <h2 className="text-lg font-semibold text-foreground mb-2">Error</h2>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  )
}
