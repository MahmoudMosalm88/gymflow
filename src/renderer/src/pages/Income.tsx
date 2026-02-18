import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'

interface IncomeSummary {
  totalRevenue: number
  expectedMonthly: number
}

interface IncomeEntry {
  type: 'subscription' | 'guest_pass'
  name: string
  phone: string | null
  amount: number
  created_at: number
  plan_months?: number
  sessions_per_month?: number | null
  code?: string
}

interface MonthlyIncomeEntry {
  month: string
  revenue: number
  subscriptionRevenue: number
  guestRevenue: number
  count: number
}

export default function Income(): JSX.Element {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<IncomeSummary | null>(null)
  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [monthly, setMonthly] = useState<MonthlyIncomeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [summaryData, recent, monthlyData] = await Promise.all([
          window.api.income.getSummary(),
          window.api.income.getRecent(10),
          window.api.income.getMonthly()
        ])
        setSummary(summaryData)
        setEntries(recent || [])
        setMonthly(monthlyData || [])
      } catch (error) {
        console.error('Failed to load income:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const formatAmount = (value: number) => new Intl.NumberFormat().format(value)

  const formatMonth = (month: string) =>
    new Date(month + '-01').toLocaleDateString(undefined, { year: 'numeric', month: 'long' })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-muted/30 min-h-full">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('income.title', 'Income')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('income.subtitle', 'Track total revenue and expected monthly income.')}
        </p>
      </div>

      {/* Summary — compact inline row */}
      {summary && (
        <div className="flex flex-wrap gap-8 p-4 rounded-lg border border-border bg-card">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t('income.total', 'Total Revenue')}
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatAmount(summary.totalRevenue)}
            </div>
          </div>
          <div className="w-px bg-border self-stretch" />
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t('income.expected', 'Expected Monthly')}
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatAmount(summary.expectedMonthly)}
            </div>
          </div>
        </div>
      )}

      {/* Monthly breakdown — primary view */}
      <Card>
        <CardHeader>
          <CardTitle>{t('income.monthly', 'Monthly Breakdown')}</CardTitle>
          <CardDescription>{t('income.monthlyHint', 'Income grouped by calendar month')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : monthly.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('income.none', 'No income records yet.')}</div>
          ) : (
            <div className="overflow-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-2">{t('income.month', 'Month')}</th>
                    <th className="text-end px-4 py-2">{t('income.revenue', 'Revenue')}</th>
                    <th className="text-end px-4 py-2">{t('income.subscriptions', 'Subscriptions')}</th>
                    <th className="text-end px-4 py-2">{t('income.guestPassesShort', 'Guest Passes')}</th>
                    <th className="text-end px-4 py-2">{t('income.count', 'Payments')}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row) => (
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

      {/* Recent Payments — secondary, reduced to 10 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('income.recent', 'Recent Payments')}</CardTitle>
          <CardDescription>{t('income.recentHint', 'Last 10 transactions')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('income.none', 'No income records yet.')}</div>
          ) : (
            <div className="overflow-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-2">{t('income.date', 'Date')}</th>
                    <th className="text-start px-4 py-2">{t('income.type', 'Type')}</th>
                    <th className="text-start px-4 py-2">{t('income.name', 'Name')}</th>
                    <th className="text-start px-4 py-2">{t('income.amount', 'Amount')}</th>
                    <th className="text-start px-4 py-2">{t('income.details', 'Details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={`${entry.type}-${idx}`} className="border-t border-border hover:bg-muted/50">
                      <td className="px-4 py-2 text-foreground">
                        {new Date(entry.created_at * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        {entry.type === 'subscription'
                          ? t('income.subscription', 'Subscription')
                          : t('income.guestPass', 'Guest Pass')}
                      </td>
                      <td className="px-4 py-2 text-foreground">{entry.name}</td>
                      <td className="px-4 py-2 text-foreground">{formatAmount(entry.amount)}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {entry.type === 'subscription'
                          ? `${entry.plan_months} ${t('memberDetail.months')}, ${entry.sessions_per_month ?? '-'} ${t('memberDetail.sessionsPerMonth', 'Sessions / month')}`
                          : `${t('guestPasses.code', 'Code')}: ${entry.code || '-'}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
