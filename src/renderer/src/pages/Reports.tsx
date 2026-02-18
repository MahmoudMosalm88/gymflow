import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Select } from '../components/ui/select'
import { Badge } from '../components/ui/badge'

// ── Types ──────────────────────────────────────────────────────────────────

interface Overview {
  memberCount: number
  activeSubscriptions: number
  expiredSubscriptions: number
  todayStats: { allowed: number; warning: number; denied: number }
  queueStats: { pending: number; sent: number; failed: number }
}
interface DailyStat { date: string; allowed: number; warning: number; denied: number }
interface HourlyStat { hour: number; count: number }
interface TopMember { member_id: string; name: string; visits: number }
interface DenialReason { reason_code: string; count: number }
interface ExpiringSubscription { id: number; member_id: string; end_date: number; name: string; phone: string }
interface LowSessionMember { member_id: string; name: string; phone: string; sessions_remaining: number }
interface DeniedMember { member_id: string; name: string; phone: string; reason_code: string; denial_count: number; last_denied_at: number }
interface MonthlyIncome {
  month: string
  revenue: number
  subscriptionRevenue: number
  guestRevenue: number
  count: number
}
interface IncomeSummary { totalRevenue: number; expectedMonthly: number }

// ── Navigation config ──────────────────────────────────────────────────────

type TabKey =
  | 'overview'
  | 'daily' | 'hourly'
  | 'top' | 'expiring' | 'low-sessions'
  | 'income-summary' | 'income-monthly'
  | 'denial-reasons' | 'denied-members'

interface GroupDef {
  key: string
  label: string
  tabs: { key: TabKey; label: string }[]
}

const DAYS_TABS: TabKey[] = ['daily', 'top', 'denial-reasons', 'expiring', 'denied-members']

// ── Component ─────────────────────────────────────────────────────────────

export default function Reports(): JSX.Element {
  const { t } = useTranslation()
  const [activeGroup, setActiveGroup] = useState('overview')
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [days, setDays] = useState(30)
  const [isLoading, setIsLoading] = useState(false)

  // Tab-scoped data
  const [overview, setOverview] = useState<Overview | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([])
  const [topMembers, setTopMembers] = useState<TopMember[]>([])
  const [denialReasons, setDenialReasons] = useState<DenialReason[]>([])
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<ExpiringSubscription[]>([])
  const [lowSessionMembers, setLowSessionMembers] = useState<LowSessionMember[]>([])
  const [deniedMembers, setDeniedMembers] = useState<DeniedMember[]>([])
  const [incomeSummary, setIncomeSummary] = useState<IncomeSummary | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncome[]>([])

  const GROUPS: GroupDef[] = [
    {
      key: 'overview', label: t('reports.group.overview', 'Overview'),
      tabs: [{ key: 'overview', label: t('reports.group.overview', 'Overview') }]
    },
    {
      key: 'attendance', label: t('reports.group.attendance', 'Attendance'),
      tabs: [
        { key: 'daily', label: t('reports.dailyAttendance', 'Daily Stats') },
        { key: 'hourly', label: t('reports.hourlyDistribution', 'Hourly') },
      ]
    },
    {
      key: 'members', label: t('reports.group.members', 'Members'),
      tabs: [
        { key: 'top', label: t('reports.topMembers', 'Top Members') },
        { key: 'expiring', label: t('reports.expiringSubscriptions', 'Expiring Subs') },
        { key: 'low-sessions', label: t('reports.lowSessions', 'Low Sessions') },
      ]
    },
    {
      key: 'revenue', label: t('reports.group.revenue', 'Revenue'),
      tabs: [
        { key: 'income-summary', label: t('income.total', 'Summary') },
        { key: 'income-monthly', label: t('income.monthly', 'Monthly') },
      ]
    },
    {
      key: 'access', label: t('reports.group.access', 'Access Control'),
      tabs: [
        { key: 'denial-reasons', label: t('reports.denialReasons', 'Denial Reasons') },
        { key: 'denied-members', label: t('reports.deniedMembers', 'Denied Members') },
      ]
    },
  ]

  // Load data whenever the active tab or days filter changes
  useEffect(() => {
    loadTab(activeTab, days)
  }, [activeTab, days])

  const loadTab = async (tab: TabKey, daysCount: number) => {
    setIsLoading(true)
    try {
      switch (tab) {
        case 'overview': {
          const data = await window.api.reports.getOverview()
          setOverview(data)
          break
        }
        case 'daily': {
          const data = await window.api.reports.getDailyStats(daysCount)
          setDailyStats(data || [])
          break
        }
        case 'hourly': {
          const data = await window.api.reports.getHourlyDistribution()
          setHourlyStats(data || [])
          break
        }
        case 'top': {
          const data = await window.api.reports.getTopMembers(daysCount, 10)
          setTopMembers(data || [])
          break
        }
        case 'expiring': {
          const data = await window.api.reports.getExpiringSubscriptions(daysCount)
          setExpiringSubscriptions(data || [])
          break
        }
        case 'low-sessions': {
          const data = await window.api.reports.getLowSessionMembers(3)
          setLowSessionMembers(data || [])
          break
        }
        case 'denial-reasons': {
          const data = await window.api.reports.getDenialReasons(daysCount)
          setDenialReasons(data || [])
          break
        }
        case 'denied-members': {
          const data = await window.api.reports.getDeniedMembers(daysCount)
          setDeniedMembers(data || [])
          break
        }
        case 'income-summary': {
          const data = await window.api.income.getSummary()
          setIncomeSummary(data)
          break
        }
        case 'income-monthly': {
          const data = await window.api.income.getMonthly()
          setMonthlyIncome(data || [])
          break
        }
      }
    } catch (err) {
      console.error('Failed to load report tab:', tab, err)
    } finally {
      setIsLoading(false)
    }
  }

  const switchGroup = (group: GroupDef) => {
    setActiveGroup(group.key)
    setActiveTab(group.tabs[0].key)
  }

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab)
  }

  const activeGroupDef = GROUPS.find((g) => g.key === activeGroup)!

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const formatAmount = (v: number) => new Intl.NumberFormat().format(Math.round(v))

  const formatMonth = (m: string) =>
    new Date(m + '-01').toLocaleDateString(undefined, { year: 'numeric', month: 'short' })

  const getReasonLabel = (code: string) => {
    const labels: Record<string, string> = {
      unknown_qr: t('reports.reason.unknownQr', 'Unknown QR'),
      expired: t('reports.reason.expired', 'Expired'),
      no_sessions: t('reports.reason.noSessions', 'No Sessions'),
      no_quota: t('reports.reason.noQuota', 'No Quota'),
      not_started: t('reports.reason.notStarted', 'Not Started'),
      frozen: t('reports.reason.frozen', 'Frozen'),
      guest_used: t('reports.reason.guestUsed', 'Guest Pass Used'),
      guest_expired: t('reports.reason.guestExpired', 'Guest Pass Expired'),
    }
    return labels[code] || code
  }

  return (
    <div className="p-4 md:p-6 space-y-4 bg-muted/30 min-h-full">
      <h1 className="text-2xl font-bold text-foreground">{t('reports.title', 'Reports')}</h1>

      {/* ── Navigation ──────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Primary group tabs — horizontal row */}
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((group) => (
            <button
              key={group.key}
              onClick={() => switchGroup(group)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                activeGroup === group.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>
        {/* Secondary sub-tabs — shown below when group has multiple views */}
        {activeGroupDef.tabs.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeGroupDef.tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Days filter ─────────────────────────────────────── */}
      {DAYS_TABS.includes(activeTab) && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{t('reports.period', 'Period')}:</span>
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
            <option value={7}>{t('reports.range.7days', 'Last 7 days')}</option>
            <option value={30}>{t('reports.range.30days', 'Last 30 days')}</option>
            <option value={90}>{t('reports.range.90days', 'Last 90 days')}</option>
          </Select>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <TabContent
          tab={activeTab}
          overview={overview}
          dailyStats={dailyStats}
          hourlyStats={hourlyStats}
          topMembers={topMembers}
          denialReasons={denialReasons}
          expiringSubscriptions={expiringSubscriptions}
          lowSessionMembers={lowSessionMembers}
          deniedMembers={deniedMembers}
          incomeSummary={incomeSummary}
          monthlyIncome={monthlyIncome}
          formatDate={formatDate}
          formatAmount={formatAmount}
          formatMonth={formatMonth}
          getReasonLabel={getReasonLabel}
        />
      )}
    </div>
  )
}

// ── Tab content renderer ───────────────────────────────────────────────────

function TabContent({
  tab, overview, dailyStats, hourlyStats, topMembers, denialReasons,
  expiringSubscriptions, lowSessionMembers, deniedMembers, incomeSummary, monthlyIncome,
  formatDate, formatAmount, formatMonth, getReasonLabel
}: {
  tab: TabKey
  overview: Overview | null
  dailyStats: DailyStat[]
  hourlyStats: HourlyStat[]
  topMembers: TopMember[]
  denialReasons: DenialReason[]
  expiringSubscriptions: ExpiringSubscription[]
  lowSessionMembers: LowSessionMember[]
  deniedMembers: DeniedMember[]
  incomeSummary: IncomeSummary | null
  monthlyIncome: MonthlyIncome[]
  formatDate: (d: string) => string
  formatAmount: (n: number) => string
  formatMonth: (m: string) => string
  getReasonLabel: (code: string) => string
}) {
  const { t } = useTranslation()
  const maxDailyTotal = Math.max(...dailyStats.map((d) => d.allowed + d.warning + d.denied), 1)
  const maxHourlyCount = Math.max(...hourlyStats.map((h) => h.count), 1)

  if (tab === 'overview') {
    if (!overview) return <EmptyState text={t('reports.noData', 'No data available')} />
    return (
      <div className="space-y-6">
        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label={t('reports.overview.members', 'Total Members')} value={overview.memberCount} color="blue" />
          <StatCard label={t('reports.overview.active', 'Active Subs')} value={overview.activeSubscriptions} color="green" />
          <StatCard label={t('reports.overview.todayCheckins', "Today's Check-ins")} value={overview.todayStats.allowed + overview.todayStats.warning} color="purple" />
          <StatCard label={t('reports.overview.todayDenied', "Today's Denied")} value={overview.todayStats.denied} color="red" />
        </div>
        {/* Today breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{t('reports.todayBreakdown', "Today's Breakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">{t('reports.legend.allowed', 'Allowed')}</span>
                <span className="text-sm font-semibold text-foreground">{overview.todayStats.allowed}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-muted-foreground">{t('reports.legend.warning', 'Warning')}</span>
                <span className="text-sm font-semibold text-foreground">{overview.todayStats.warning}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">{t('reports.legend.denied', 'Denied')}</span>
                <span className="text-sm font-semibold text-foreground">{overview.todayStats.denied}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('reports.overview.expired', 'Expired Subs')}</span>
                <span className="text-sm font-semibold text-foreground">{overview.expiredSubscriptions}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* WhatsApp queue */}
        {overview.queueStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{t('reports.whatsappQueue', 'WhatsApp Queue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('reports.queue.pending', 'Pending')}</span>
                  <span className="text-sm font-semibold text-amber-400">{overview.queueStats.pending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('reports.queue.sent', 'Sent')}</span>
                  <span className="text-sm font-semibold text-emerald-400">{overview.queueStats.sent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('reports.queue.failed', 'Failed')}</span>
                  <span className="text-sm font-semibold text-red-400">{overview.queueStats.failed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (tab === 'daily') {
    const visibleDays = dailyStats.slice(-14)
    const periodTotal = visibleDays.reduce((s, d) => s + d.allowed + d.warning + d.denied, 0)
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.dailyAttendance', 'Daily Attendance')}</CardTitle>
          <CardDescription>
            {t('reports.dailyHint', 'Last 14 days')} · {periodTotal} {t('reports.totalVisits', 'total visits')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <EmptyState text={t('reports.noData', 'No data available')} />
          ) : (
            <>
              {/* Chart — bars + axis in one scrollable row */}
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1.5" style={{ height: '180px', minWidth: 'fit-content' }}>
                  {visibleDays.map((day) => {
                    const total = day.allowed + day.warning + day.denied
                    const barHeightPct = total === 0 ? 0 : (total / maxDailyTotal) * 148
                    const dayNum = new Date(day.date).getDate()
                    const monthLabel = new Date(day.date).toLocaleDateString(undefined, { month: 'short' })
                    // Show month label only on the 1st or first bar of the dataset
                    const showMonth = dayNum === 1 || day.date === visibleDays[0].date
                    return (
                      <div key={day.date} className="flex flex-col items-center gap-0" style={{ width: '28px' }}>
                        {/* Bar area — fixed 148px tall, bars grow from bottom */}
                        <div className="flex flex-col justify-end w-full" style={{ height: '148px' }}>
                          {total === 0 ? (
                            <div className="w-full rounded-sm bg-border/40" style={{ height: '3px' }} title={`${formatDate(day.date)}: No visits`} />
                          ) : (
                            <div
                              className="w-full flex flex-col overflow-hidden rounded-sm"
                              style={{ height: `${barHeightPct}px` }}
                              title={`${formatDate(day.date)}: ${day.allowed} allowed · ${day.warning} warning · ${day.denied} denied`}
                            >
                              {day.denied > 0 && (
                                <div className="w-full bg-red-500" style={{ flex: day.denied }} />
                              )}
                              {day.warning > 0 && (
                                <div className="w-full bg-amber-500" style={{ flex: day.warning }} />
                              )}
                              {day.allowed > 0 && (
                                <div className="w-full bg-emerald-500" style={{ flex: day.allowed }} />
                              )}
                            </div>
                          )}
                        </div>
                        {/* Day number axis */}
                        <span className="text-[10px] text-muted-foreground leading-none mt-1.5">{dayNum}</span>
                        {/* Month label — only on month boundary */}
                        <span className="text-[9px] text-muted-foreground/60 leading-none">
                          {showMonth ? monthLabel : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 text-xs">
                {[
                  { color: 'bg-emerald-500', label: t('reports.legend.allowed', 'Allowed') },
                  { color: 'bg-amber-500', label: t('reports.legend.warning', 'Warning') },
                  { color: 'bg-red-500', label: t('reports.legend.denied', 'Denied') },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  if (tab === 'hourly') {
    const peakHour = hourlyStats.reduce((best, h) => h.count > (best?.count ?? 0) ? h : best, hourlyStats[0])
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.hourlyDistribution', "Today's Hourly Distribution")}</CardTitle>
          {peakHour && peakHour.count > 0 && (
            <CardDescription>
              {t('reports.peakHour', 'Peak hour')}: {peakHour.hour}:00–{peakHour.hour + 1}:00 · {peakHour.count} {t('reports.visits', 'visits')}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hourlyStats.length === 0 ? (
            <EmptyState text={t('reports.noData', 'No data available')} />
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-1" style={{ height: '180px', minWidth: 'fit-content' }}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const stat = hourlyStats.find((h) => h.hour === hour)
                  const count = stat?.count ?? 0
                  const barH = count === 0 ? 3 : Math.max((count / maxHourlyCount) * 148, 6)
                  const isPeak = peakHour && hour === peakHour.hour
                  return (
                    <div key={hour} className="flex flex-col items-center gap-0" style={{ width: '24px' }}>
                      <div className="flex flex-col justify-end w-full" style={{ height: '148px' }}>
                        <div
                          className={`w-full rounded-sm transition-colors ${
                            count === 0
                              ? 'bg-border/40'
                              : isPeak
                                ? 'bg-primary'
                                : 'bg-primary/60 hover:bg-primary/80'
                          }`}
                          style={{ height: `${barH}px` }}
                          title={`${hour}:00 — ${count} visits`}
                        />
                      </div>
                      {/* Show label every 3 hours */}
                      <span className="text-[10px] text-muted-foreground leading-none mt-1.5">
                        {hour % 3 === 0 ? hour : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (tab === 'top') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.topMembers', 'Most Active Members')}</CardTitle>
        </CardHeader>
        <CardContent>
          {topMembers.length === 0 ? (
            <EmptyState text={t('reports.noData', 'No data available')} />
          ) : (
            <div className="space-y-1">
              {topMembers.map((member, index) => (
                <div key={member.member_id} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted/50">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index < 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="flex-1 text-foreground">{member.name}</span>
                  <span className="text-sm font-medium text-primary">{member.visits} {t('reports.visits', 'visits')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (tab === 'expiring') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.expiringSubscriptions', 'Expiring Subscriptions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {expiringSubscriptions.length === 0 ? (
            <EmptyState text={t('reports.noExpiring', 'No subscriptions expiring soon')} />
          ) : (
            <div className="space-y-2">
              {expiringSubscriptions.map((sub) => {
                const daysLeft = Math.ceil((sub.end_date - Math.floor(Date.now() / 1000)) / 86400)
                return (
                  <div key={sub.id} className="flex items-center justify-between px-3 py-2 rounded bg-amber-500/10">
                    <div>
                      <div className="font-medium text-foreground">{sub.name}</div>
                      <div className="text-xs text-muted-foreground">{sub.phone}</div>
                    </div>
                    <Badge variant={daysLeft <= 1 ? 'destructive' : 'warning'}>
                      {daysLeft}d
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (tab === 'low-sessions') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.lowSessions', 'Low Sessions Remaining')}</CardTitle>
        </CardHeader>
        <CardContent>
          {lowSessionMembers.length === 0 ? (
            <EmptyState text={t('reports.noLowSessions', 'No members with low sessions')} />
          ) : (
            <div className="space-y-2">
              {lowSessionMembers.map((member) => (
                <div key={member.member_id} className="flex items-center justify-between px-3 py-2 rounded bg-amber-500/10">
                  <div>
                    <div className="font-medium text-foreground">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.phone}</div>
                  </div>
                  <Badge variant="warning">{member.sessions_remaining} {t('reports.sessionsLeft', 'left')}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (tab === 'income-summary') {
    if (!incomeSummary) return <EmptyState text={t('reports.noData', 'No data available')} />
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label={t('income.total', 'Total Revenue')} value={formatAmount(incomeSummary.totalRevenue)} color="green" />
        <StatCard label={t('income.expected', 'Expected Monthly')} value={formatAmount(incomeSummary.expectedMonthly)} color="blue" />
      </div>
    )
  }

  if (tab === 'income-monthly') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('income.monthly', 'Monthly Breakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyIncome.length === 0 ? (
            <EmptyState text={t('income.none', 'No income records yet.')} />
          ) : (
            <div className="overflow-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-2">{t('income.month', 'Month')}</th>
                    <th className="text-end px-4 py-2">{t('income.revenue', 'Revenue')}</th>
                    <th className="text-end px-4 py-2">{t('income.subscriptions', 'Subs')}</th>
                    <th className="text-end px-4 py-2">{t('income.guestPassesShort', 'Guests')}</th>
                    <th className="text-end px-4 py-2">{t('income.count', 'Payments')}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyIncome.map((row) => (
                    <tr key={row.month} className="border-t border-border hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium text-foreground">{formatMonth(row.month)}</td>
                      <td className="px-4 py-2 text-end font-semibold text-foreground">{formatAmount(row.revenue)}</td>
                      <td className="px-4 py-2 text-end text-muted-foreground">{formatAmount(row.subscriptionRevenue)}</td>
                      <td className="px-4 py-2 text-end text-muted-foreground">{formatAmount(row.guestRevenue)}</td>
                      <td className="px-4 py-2 text-end text-muted-foreground">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (tab === 'denial-reasons') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.denialReasons', 'Denial Reasons')}</CardTitle>
        </CardHeader>
        <CardContent>
          {denialReasons.length === 0 ? (
            <EmptyState text={t('reports.noDenials', 'No denials in this period')} />
          ) : (
            <div className="space-y-4">
              {denialReasons.map((reason) => {
                const total = denialReasons.reduce((sum, r) => sum + r.count, 0)
                const pct = Math.round((reason.count / total) * 100)
                return (
                  <div key={reason.reason_code}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{getReasonLabel(reason.reason_code)}</span>
                      <span className="text-muted-foreground">{reason.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (tab === 'denied-members') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('reports.deniedMembers', 'Denied Members')}</CardTitle>
          <CardDescription>{t('reports.deniedMembersHint', 'Members who were refused entry in this period')}</CardDescription>
        </CardHeader>
        <CardContent>
          {deniedMembers.length === 0 ? (
            <EmptyState text={t('reports.noDeniedMembers', 'No denied entries in this period')} />
          ) : (
            <div className="space-y-2">
              {deniedMembers.map((member) => {
                const timeAgo = formatTimeAgo(member.last_denied_at)
                return (
                  <div key={member.member_id} className="flex items-center justify-between px-3 py-2.5 rounded bg-red-500/10">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.phone}</div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 ms-3 shrink-0">
                      <Badge variant="destructive">{getReasonLabel(member.reason_code)}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {member.denial_count}× · {timeAgo}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimeAgo(unixTimestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unixTimestamp
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">{text}</div>
  )
}

function StatCard({
  label, value, color
}: {
  label: string
  value: number | string
  color: 'blue' | 'green' | 'purple' | 'red'
}) {
  const colorMap = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
  }
  return (
    <Card>
      <CardContent className="py-4">
        <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}
