import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface Member {
  id: string
  name: string
  phone: string
}

interface QuickSearchProps {
  onSelect: (memberId: string) => void
}

export default function QuickSearch({ onSelect }: QuickSearchProps): JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Member[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await window.api.members.search(query)
          setResults(data.slice(0, 5))
          setIsOpen(true)
          setSelectedIndex(0)
        } catch (error) {
          console.error('Search failed:', error)
        }
      }, 300)
    } else {
      setResults([])
      setIsOpen(false)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleSelect = (member: Member) => {
    onSelect(member.id)
    setQuery('')
    setResults([])
    setIsOpen(false)
    // Return focus to scanner after a short delay
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('.scanner-input')?.focus()
    }, 100)
  }

  return (
    <div className="relative">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            const next = e.relatedTarget as HTMLElement | null
            setTimeout(() => setIsOpen(false), 200)
            if (!next || next === document.body || next === document.documentElement) {
              setTimeout(() => {
                document.querySelector<HTMLInputElement>('.scanner-input')?.focus()
              }, 0)
            }
          }}
          placeholder={t('dashboard.searchPlaceholder')}
          className="input-field pl-12"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl max-h-72 overflow-auto">
          {results.map((member, index) => (
            <button
              key={member.id}
              onClick={() => handleSelect(member)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                index === selectedIndex
                  ? 'bg-brand-light/20 dark:bg-brand-light/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-semibold text-gray-900 dark:text-white truncate">
                  {member.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{member.phone}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl p-6 text-center text-gray-600 dark:text-gray-400">
          {t('common.noResults')}
        </div>
      )}
    </div>
  )
}
