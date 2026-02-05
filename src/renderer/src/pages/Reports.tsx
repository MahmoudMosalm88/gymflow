import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select } from '../components/ui/select'

interface DailyStat {
  date: string
  allowed: number
  warning: number
  denied: number
}

interface HourlyStat {
  hour: number
  count: number
}

interface TopMember {
  member_id: string
  name: string
  visits: number
}

interface DenialReason {
  reason_code: string
  count: number
}

interface Overview {
  memberCount: number
  activeSubscriptions: number
  expiredSubscriptions: number
  todayStats: { allowed: number; warning: number; denied: number }
  queueStats: { pending: number; sent: number; failed: number }
}

interface ExpiringSubscription {
  id: number
  member_id: string
  end_date: number
  name: string
  phone: string
}

interface LowSessionMember {
  member_id: string
  name: string
  phone: string
  sessions_remaining: number
}

export default function Reports() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([])
  const [topMembers, setTopMembers] = useState<TopMember[]>([])
  const [denialReasons, setDenialReasons] = useState<DenialReason[]>([])
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<ExpiringSubscription[]>([])
  const [lowSessionMembers, setLowSessionMembers] = useState<LowSessionMember[]>([])
  const [dateRange, setDateRange] = useState(30)

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [
        overviewData,
        dailyData,
        hourlyData,
        topMembersData,
        denialData,
        expiringData,
        lowSessionData
      ] = await Promise.all([
        window.api.reports.getOverview(),
        window.api.reports.getDailyStats(dateRange),
        window.api.reports.getHourlyDistribution(),
        window.api.reports.getTopMembers(dateRange, 10),
        window.api.reports.getDenialReasons(dateRange),
        window.api.reports.getExpiringSubscriptions(7),
        window.api.reports.getLowSessionMembers(3)
      ])

      setOverview(overviewData)
      setDailyStats(dailyData)
      setHourlyStats(hourlyData)
      setTopMembers(topMembersData)
      setDenialReasons(denialData)
      setExpiringSubscriptions(expiringData)
      setLowSessionMembers(lowSessionData)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const getReasonLabel = (code: string) => {
    const labels: Record<string, string> = {
      unknown_qr: t('reports.reason.unknownQr', 'Unknown QR'),
      expired: t('reports.reason.expired', 'Expired Subscription'),
      outside_hours: t('reports.reason.outsideHours', 'Outside Access Hours'),
      no_sessions: t('reports.reason.noSessions', 'No Sessions Left'),
      no_quota: t('reports.reason.noQuota', 'No Quota'),
      not_started: t('reports.reason.notStarted', 'Not Started Yet')
    }
    return labels[code] || code
  }

  const maxDailyTotal = Math.max(...dailyStats.map((d) => d.allowed + d.warning + d.denied), 1)
  const maxHourlyCount = Math.max(...hourlyStats.map((h) => h.count), 1)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-muted/30 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {t('reports.title', 'Reports')}
        </h1>
        <Select
          value={dateRange}
          onChange={(e) => setDateRange(Number(e.target.value))}
        >
          <option value={7}>{t('reports.range.7days', 'Last 7 days')}</option>
          <option value={30}>{t('reports.range.30days', 'Last 30 days')}</option>
          <option value={90}>{t('reports.range.90days', 'Last 90 days')}</option>
        </Select>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <OverviewCard
            icon={UserGroupIcon}
            label={t('reports.overview.members', 'Total Members')}
            value={overview.memberCount}
            color="blue"
          />
          <OverviewCard
            icon={CalendarIcon}
            label={t('reports.overview.active', 'Active Subscriptions')}
            value={overview.activeSubscriptions}
            color="green"
          />
          <OverviewCard
            icon={ArrowTrendingUpIcon}
            label={t('reports.overview.todayCheckins', "Today's Check-ins")}
            value={overview.todayStats.allowed + overview.todayStats.warning}
            color="purple"
          />
          <OverviewCard
            icon={ExclamationTriangleIcon}
            label={t('reports.overview.todayDenied', "Today's Denied")}
            value={overview.todayStats.denied}
            color="red"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendance Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              {t('reports.dailyAttendance', 'Daily Attendance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyStats.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  {t('reports.noData', 'No data available')}
                </p>
              </div>
            ) : (
              <div className="h-64 flex items-end gap-1">
                {dailyStats.slice(-14).map((day) => {
                  const dayTotal = day.allowed + day.warning + day.denied
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      {dayTotal === 0 ? (
                        <div className="w-full h-2 bg-muted rounded" title={`${formatDate(day.date)}: No data`} />
                      ) : (
                        <>
                          {day.allowed > 0 && (
                            <div
                              className="w-full bg-green-500 rounded-t"
                              style={{ height: `${(day.allowed / maxDailyTotal) * 100}%` }}
                              title={`Allowed: ${day.allowed}`}
                            />
                          )}
                          {day.warning > 0 && (
                            <div
                              className="w-full bg-yellow-500"
                              style={{ height: `${(day.warning / maxDailyTotal) * 100}%` }}
                              title={`Warning: ${day.warning}`}
                            />
                          )}
                          {day.denied > 0 && (
                            <div
                              className="w-full bg-red-500 rounded-b"
                              style={{ height: `${(day.denied / maxDailyTotal) * 100}%` }}
                              title={`Denied: ${day.denied}`}
                            />
                          )}
                        </>
                      )}
                      <span className="text-xs text-muted-foreground mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                        {formatDate(day.date)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex justify-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-muted-foreground">
                  {t('reports.legend.allowed', 'Allowed')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span className="text-muted-foreground">
                  {t('reports.legend.warning', 'Warning')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-muted-foreground">
                  {t('reports.legend.denied', 'Denied')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5" />
              {t('reports.hourlyDistribution', "Today's Hourly Distribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyStats.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  {t('reports.noData', 'No data available')}
                </p>
              </div>
            ) : (
              <div className="h-64 flex items-end gap-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const stat = hourlyStats.find((h) => h.hour === hour)
                  const count = stat?.count || 0
                  const height = (count / maxHourlyCount) * 100
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center">
                      {count === 0 ? (
                        <div className="w-full h-1 bg-muted rounded" title={`${hour}:00: No data`} />
                      ) : (
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                          title={`${hour}:00: ${count} check-ins`}
                        />
                      )}
                      {hour % 3 === 0 && (
                        <span className="text-xs text-muted-foreground mt-1">{hour}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Members */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{t('reports.topMembers', 'Most Active Members')}</CardTitle>
          </CardHeader>
          <CardContent>
            {topMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('reports.noData', 'No data available')}
              </p>
            ) : (
              <div className="space-y-2">
                {topMembers.map((member, index) => (
                  <div
                    key={member.member_id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index < 3
                          ? 'bg-yellow-400 text-yellow-900'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1 text-foreground">{member.name}</span>
                    <span className="text-sm font-medium text-blue-600">
                      {member.visits} {t('reports.visits', 'visits')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Denial Reasons */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{t('reports.denialReasons', 'Denial Reasons')}</CardTitle>
          </CardHeader>
          <CardContent>
            {denialReasons.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('reports.noDenials', 'No denials in this period')}
              </p>
            ) : (
              <div className="space-y-3">
                {denialReasons.map((reason) => {
                  const total = denialReasons.reduce((sum, r) => sum + r.count, 0)
                  const percentage = Math.round((reason.count / total) * 100)
                  return (
                    <div key={reason.reason_code}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">
                          {getReasonLabel(reason.reason_code)}
                        </span>
                        <span className="text-muted-foreground">
                          {reason.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Subscriptions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
              {t('reports.expiringSubscriptions', 'Expiring This Week')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringSubscriptions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t('reports.noExpiring', 'No subscriptions expiring soon')}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expiringSubscriptions.map((sub) => {
                  const daysLeft = Math.ceil(
                    (sub.end_date - Math.floor(Date.now() / 1000)) / 86400
                  )
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 rounded bg-yellow-50"
                    >
                      <div>
                        <div className="font-medium text-foreground">{sub.name}</div>
                        <div className="text-xs text-muted-foreground">{sub.phone}</div>
                      </div>
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded ${
                          daysLeft <= 1
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {daysLeft} {t('reports.daysLeft', 'days left')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
              {t('reports.lowSessions', 'Low Sessions Remaining')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowSessionMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t('reports.noLowSessions', 'No members with low sessions')}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowSessionMembers.map((member) => (
                  <div
                    key={member.member_id}
                    className="flex items-center justify-between p-2 rounded bg-orange-50"
                  >
                    <div>
                      <div className="font-medium text-foreground">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.phone}</div>
                    </div>
                    <span className="text-sm font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
                      {member.sessions_remaining} {t('reports.sessionsLeft', 'sessions')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: typeof UserGroupIcon
  label: string
  value: number
  color: 'blue' | 'green' | 'purple' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600'
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
