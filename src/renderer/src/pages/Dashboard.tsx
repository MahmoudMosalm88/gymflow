import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TrafficLight from '../components/TrafficLight'
import MemberCard from '../components/MemberCard'
import GuestPassCard from '../components/GuestPassCard'
import QuickSearch from '../components/QuickSearch'
import ScannerInput from '../components/ScannerInput'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

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
  guestPass?: {
    name: string
    phone: string | null
    code: string
    expires_at: number
    used_at: number | null
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
    <div className="min-h-full flex flex-col p-4 md:p-8 bg-muted/30">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-foreground">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboard.subtitle') || 'Manage member check-ins and attendance'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive flex justify-between items-center animate-slide-up shadow-md">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-destructive hover:text-destructive/80 font-bold text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8">
        {/* Left: Traffic Light + Member Display */}
        <Card className="flex-1 flex flex-col items-center justify-center">
          <CardContent className="w-full flex flex-col items-center justify-center py-10">
            <TrafficLight status={lastResult?.status || 'ready'} />

            {lastResult?.guestPass ? (
              <GuestPassCard guestPass={lastResult.guestPass} status={lastResult.status} />
            ) : lastResult?.member ? (
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
                <p className="text-2xl font-semibold text-foreground">
                  {t('dashboard.ready')}
                </p>
                <p className="text-base text-muted-foreground mt-3 max-w-md mx-auto">
                  {t('dashboard.scanInstructions')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Quick Search + Stats */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          {/* Quick Search */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.quickSearch')}</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickSearch onSelect={handleQuickSearch} />
            </CardContent>
          </Card>

          {/* Today's Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.todayStats')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Check-ins Stat */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-foreground font-medium">{t('dashboard.checkIns')}</span>
                <span className="text-3xl font-bold text-traffic-green">
                  {todayStats.checkIns}
                </span>
              </div>

              {/* Warnings Stat */}
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-foreground font-medium">{t('dashboard.warnings')}</span>
                <span className="text-3xl font-bold text-traffic-yellow">
                  {todayStats.warnings}
                </span>
              </div>

              {/* Denied Stat */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                <span className="text-foreground font-medium">{t('dashboard.denied')}</span>
                <span className="text-3xl font-bold text-traffic-red">
                  {todayStats.denied}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden Scanner Input */}
      <ScannerInput onScan={handleScan} />
    </div>
  )
}
