import { useEffect, useRef } from 'react'

interface ScannerInputProps {
  onScan: (value: string, method: 'scan' | 'manual') => void
  autoFocus?: boolean
}

export default function ScannerInput({ onScan, autoFocus = true }: ScannerInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const bufferRef = useRef<string>('')
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => {
    if (!autoFocus) return
    const focusInputIfIdle = () => {
      const active = document.activeElement as HTMLElement | null
      const isIdle =
        !active ||
        active === document.body ||
        active === document.documentElement

      if (isIdle) {
        inputRef.current?.focus()
      }
    }

    focusInputIfIdle()
    window.addEventListener('focus', focusInputIfIdle)

    return () => {
      window.removeEventListener('focus', focusInputIfIdle)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [autoFocus])

  const clearBuffer = () => {
    bufferRef.current = ''
    if (inputRef.current) inputRef.current.value = ''
  }

  const scheduleClear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      clearBuffer()
    }, 800)
  }

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    bufferRef.current = e.currentTarget.value
    scheduleClear()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Clear any existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // If Enter is pressed, process the scan
    if (e.key === 'Enter') {
      e.preventDefault()
      const scannedValue = e.currentTarget.value.trim()
      if (scannedValue) {
        onScan(scannedValue, 'scan')
      }
      clearBuffer()
      return
    }

    // Set timeout to clear buffer if no more input (handles manual typing)
    scheduleClear()
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="scanner-input"
      defaultValue=""
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label="Scanner input"
    />
  )
}
