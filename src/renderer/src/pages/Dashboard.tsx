import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TrafficLight from '../components/TrafficLight'
import MemberCard from '../components/MemberCard'
import QuickSearch from '../components/QuickSearch'
import ScannerInput from '../components/ScannerInput'

interface AttendanceResult {
  status: 'allowed' | 'warning' | 'denied' | 'ignored'
  reasonCode?: string
  member?: {
    id: string
    name: string
    phone: string
    gender: 'male' | 'female'
    photo_path: string | null
    access_tier: 'A' | 'B'
  }
  quota?: {
    sessions_used: number
    sessions_cap: number
  }
  warnings?: Array<{ key: string; params?: Record<string, unknown> }>
}

interface TodayStats {
  checkIns: number
  warnings: number
  denied: number
}

export default function Dashboard(): JSX.Element {
  const { t } = useTranslation()
  const [lastResult, setLastResult] = useState<AttendanceResult | null>(null)
  const [todayStats, setTodayStats] = useState<TodayStats>({
    checkIns: 0,
    warnings: 0,
    denied: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadTodayStats = useCallback(async () => {
    try {
      const stats = await window.api.attendance.getTodayStats()
      setTodayStats({
        checkIns: stats.allowed + stats.warning,
        warnings: stats.warning,
        denied: stats.denied
      })
    } catch (error) {
      console.error('Failed to load today stats:', error)
    }
  }, [])

  // Load today's stats on mount and cleanup
  useEffect(() => {
    loadTodayStats()

    return () => {
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current)
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    }
  }, [loadTodayStats])

  const handleScan = useCallback(async (scannedValue: string, method: 'scan' | 'manual' = 'scan') => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.attendance.check(scannedValue, method)
      setLastResult(result)

      // Update stats
      if (result.status === 'allowed') {
        setTodayStats((prev) => ({ ...prev, checkIns: prev.checkIns + 1 }))
      } else if (result.status === 'warning') {
        setTodayStats((prev) => ({
          ...prev,
          checkIns: prev.checkIns + 1,
          warnings: prev.warnings + 1
        }))
      } else if (result.status === 'denied') {
        setTodayStats((prev) => ({ ...prev, denied: prev.denied + 1 }))
      }

      // Clear result after 5 seconds
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current)
      }
      clearTimeoutRef.current = setTimeout(() => {
        setLastResult(null)
      }, 5000)
    } catch (err) {
      console.error('Scan error:', err)
      const errorMsg = String(err) || t('common.error')
      setError(errorMsg)
      setLastResult(null)
      
      // Clear error after 5 seconds
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError(null)
      }, 5000)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, t])

  const handleQuickSearch = (memberId: string) => {
    handleScan(memberId, 'manual')
  }

  return (
    <div className="min-h-full flex flex-col p-4 md:p-8 bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-gray-900 dark:text-white">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('dashboard.subtitle') || 'Manage member check-ins and attendance'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-200 flex justify-between items-center animate-slide-up shadow-md">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8">
        {/* Left: Traffic Light + Member Display */}
        <div className="flex-1 flex flex-col items-center justify-center card">
          <TrafficLight status={lastResult?.status || 'ready'} />

          {lastResult?.member ? (
            <MemberCard
              member={lastResult.member}
              quota={lastResult.quota}
              warnings={lastResult.warnings}
              status={lastResult.status}
            />
          ) : (
            <div className="mt-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-brand-gradient rounded-2xl flex items-center justify-center">
                <span className="text-4xl">📱</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {t('dashboard.ready')}
              </p>
              <p className="text-base text-gray-600 dark:text-gray-400 mt-3 max-w-md mx-auto">
                {t('dashboard.scanInstructions')}
              </p>
            </div>
          )}
        </div>

        {/* Right: Quick Search + Stats */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          {/* Quick Search */}
          <div className="card">
            <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-white mb-4">
              {t('dashboard.quickSearch')}
            </h2>
            <QuickSearch onSelect={handleQuickSearch} />
          </div>

          {/* Today's Stats */}
          <div className="card">
            <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-white mb-6">
              {t('dashboard.todayStats')}
            </h2>
            <div className="space-y-5">
              {/* Check-ins Stat */}
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <span className="text-gray-700 dark:text-gray-200 font-medium">{t('dashboard.checkIns')}</span>
                <span className="text-3xl font-bold text-traffic-green">
                  {todayStats.checkIns}
                </span>
              </div>

              {/* Warnings Stat */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <span className="text-gray-700 dark:text-gray-200 font-medium">{t('dashboard.warnings')}</span>
                <span className="text-3xl font-bold text-traffic-yellow">
                  {todayStats.warnings}
                </span>
              </div>

              {/* Denied Stat */}
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <span className="text-gray-700 dark:text-gray-200 font-medium">{t('dashboard.denied')}</span>
                <span className="text-3xl font-bold text-traffic-red">
                  {todayStats.denied}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Scanner Input */}
      <ScannerInput onScan={handleScan} />
    </div>
  )
}
