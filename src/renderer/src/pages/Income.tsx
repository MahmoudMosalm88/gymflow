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

export default function Income(): JSX.Element {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<IncomeSummary | null>(null)
  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [summaryData, recent] = await Promise.all([
          window.api.income.getSummary(),
          window.api.income.getRecent(20)
        ])
        setSummary(summaryData)
        setEntries(recent || [])
      } catch (error) {
        console.error('Failed to load income:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat().format(value)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-muted/30 min-h-full">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('income.title', 'Income')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('income.subtitle', 'Track total revenue and expected monthly income.')}
        </p>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('income.total', 'Total Revenue')}</CardTitle>
              <CardDescription>{t('income.totalHint', 'All recorded payments')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {formatAmount(summary.totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('income.expected', 'Expected Monthly')}</CardTitle>
              <CardDescription>{t('income.expectedHint', 'Active subscriptions only')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {formatAmount(summary.expectedMonthly)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('income.recent', 'Recent Payments')}</CardTitle>
          <CardDescription>{t('income.recentHint', 'Subscriptions and guest passes')}</CardDescription>
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
                    <tr key={`${entry.type}-${idx}`} className="border-t border-border">
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
                          ? `${entry.plan_months} ${t('memberDetail.months')}, ${entry.sessions_per_month ?? '-'} ${t(
                              'memberDetail.sessionsPerMonth',
                              'Sessions / month'
                            )}`
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
