import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TrafficLight from '../components/TrafficLight'
import MemberCard from '../components/MemberCard'
import QuickSearch from '../components/QuickSearch'
import ScannerInput from '../components/ScannerInput'

interface AttendanceResult {
  status: 'allowed' | 'warning' | 'denied' | 'ignored'
  reason?: string
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
  warnings?: string[]
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
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load today's stats on mount
  useEffect(() => {
    loadTodayStats()
  }, [])

  const loadTodayStats = async () => {
    try {
      const logs = await window.api.attendance.getTodayLogs()
      const stats = logs.reduce(
        (acc: TodayStats, log: { status: string }) => {
          if (log.status === 'allowed') acc.checkIns++
          else if (log.status === 'warning') acc.warnings++
          else if (log.status === 'denied') acc.denied++
          return acc
        },
        { checkIns: 0, warnings: 0, denied: 0 }
      )
      setTodayStats(stats)
    } catch (error) {
      console.error('Failed to load today stats:', error)
    }
  }

  const handleScan = useCallback(async (scannedValue: string, method: 'scan' | 'manual' = 'scan') => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const result = await window.api.attendance.check(scannedValue, method)
      setLastResult(result)

      // Update stats
      if (result.status === 'allowed') {
        setTodayStats((prev) => ({ ...prev, checkIns: prev.checkIns + 1 }))
      } else if (result.status === 'warning') {
        setTodayStats((prev) => ({ ...prev, warnings: prev.warnings + 1 }))
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
    } catch (error) {
      console.error('Scan error:', error)
      setLastResult({
        status: 'denied',
        reason: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const handleQuickSearch = (memberId: string) => {
    handleScan(memberId, 'manual')
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6">
        {/* Left: Traffic Light + Member Display */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg p-8">
          <TrafficLight status={lastResult?.status || 'ready'} />

          {lastResult?.member ? (
            <MemberCard
              member={lastResult.member}
              quota={lastResult.quota}
              warnings={lastResult.warnings}
              status={lastResult.status}
            />
          ) : (
            <div className="mt-8 text-center">
              <p className="text-xl text-gray-500">{t('dashboard.ready')}</p>
              <p className="text-sm text-gray-400 mt-2">{t('dashboard.scanInstructions')}</p>
            </div>
          )}
        </div>

        {/* Right: Quick Search + Stats */}
        <div className="w-80 flex flex-col gap-6">
          {/* Quick Search */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('dashboard.quickSearch')}
            </h2>
            <QuickSearch onSelect={handleQuickSearch} />
          </div>

          {/* Today's Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('dashboard.todayStats')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('dashboard.checkIns')}</span>
                <span className="text-2xl font-bold text-traffic-green">
                  {todayStats.checkIns}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('dashboard.warnings')}</span>
                <span className="text-2xl font-bold text-traffic-yellow">
                  {todayStats.warnings}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('dashboard.denied')}</span>
                <span className="text-2xl font-bold text-traffic-red">
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
