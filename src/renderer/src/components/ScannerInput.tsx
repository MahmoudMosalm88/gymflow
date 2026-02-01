import { useEffect, useRef } from 'react'

interface ScannerInputProps {
  onScan: (value: string, method: 'scan' | 'manual') => void
}

export default function ScannerInput({ onScan }: ScannerInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const bufferRef = useRef<string>('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Focus the input on mount and when window gains focus
    const focusInput = () => {
      inputRef.current?.focus()
    }

    focusInput()
    window.addEventListener('focus', focusInput)

    // Also refocus when clicking anywhere on the page
    const handleClick = () => {
      setTimeout(focusInput, 100)
    }
    document.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('focus', focusInput)
      document.removeEventListener('click', handleClick)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // If Enter is pressed, process the scan
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = bufferRef.current.trim()
      if (value) {
        onScan(value, 'scan')
      }
      bufferRef.current = ''
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      return
    }

    // Add character to buffer
    if (e.key.length === 1) {
      bufferRef.current += e.key
    }

    // Set timeout to clear buffer if no more input (handles manual typing)
    timeoutRef.current = setTimeout(() => {
      bufferRef.current = ''
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }, 500)
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="scanner-input"
      onKeyDown={handleKeyDown}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label="Scanner input"
    />
  )
}
