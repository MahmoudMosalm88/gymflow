import { useEffect, useId, useMemo, useRef } from 'react'

type Focusable = HTMLElement & { disabled?: boolean }

function getFocusableElements(container: HTMLElement): Focusable[] {
  const nodes = Array.from(
    container.querySelectorAll<Focusable>(
      [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(',')
    )
  )
  return nodes.filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false
    const style = window.getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none'
  })
}

interface ModalProps {
  title: string
  children: React.ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg'
  initialFocusRef?: React.RefObject<HTMLElement>
  closeLabel?: string
  showCloseButton?: boolean
}

export default function Modal({
  title,
  children,
  onClose,
  size = 'md',
  initialFocusRef,
  closeLabel = 'Close',
  showCloseButton = true
}: ModalProps): JSX.Element {
  const reactId = useId()
  const titleId = useMemo(() => `modal-title-${reactId}`, [reactId])
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastActiveRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    lastActiveRef.current = document.activeElement as HTMLElement | null

    const focusInitial = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
        return
      }
      if (showCloseButton && closeButtonRef.current) {
        closeButtonRef.current.focus()
        return
      }
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = getFocusableElements(dialog)
      if (focusables.length > 0) {
        focusables[0].focus()
      } else {
        dialog.focus()
      }
    }

    focusInitial()

    const onKeyDown = (e: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (!dialog) return

      const active = document.activeElement
      const isFocusInside = !!active && dialog.contains(active)
      if (!isFocusInside) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      const focusables = getFocusableElements(dialog)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement as Focusable | null

      if (e.shiftKey) {
        if (!current || current === first || !dialog.contains(current)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (!current || current === last || !dialog.contains(current)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      const lastActive = lastActiveRef.current
      if (lastActive && document.contains(lastActive)) {
        lastActive.focus()
      }
    }
  }, [initialFocusRef, onClose])

  const maxWidth =
    size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-background rounded-2xl shadow-2xl shadow-black/30 w-full ${maxWidth} p-8 border border-border/50 animate-slide-up`}
      >
        <div className="flex items-start justify-between gap-6 mb-6">
          <h2 id={titleId} className="text-2xl font-heading font-bold text-foreground">
            {title}
          </h2>
          {showCloseButton && (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="p-2 -m-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-lg"
              aria-label={closeLabel}
            >
              <span aria-hidden="true" className="text-2xl">✕</span>
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
