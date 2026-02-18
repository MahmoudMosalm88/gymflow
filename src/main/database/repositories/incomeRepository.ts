import { getDatabase } from '../connection'

export interface IncomeSummary {
  totalRevenue: number
  expectedMonthly: number
}

export interface IncomeEntry {
  type: 'subscription' | 'guest_pass'
  name: string
  phone: string | null
  amount: number
  created_at: number
  plan_months?: number
  sessions_per_month?: number | null
  code?: string
}

export function getIncomeSummary(): IncomeSummary {
  const db = getDatabase()
  const subRow = db
    .prepare('SELECT COALESCE(SUM(price_paid), 0) as total FROM subscriptions WHERE price_paid IS NOT NULL')
    .get() as { total: number }
  const guestRow = db
    .prepare('SELECT COALESCE(SUM(price_paid), 0) as total FROM guest_passes WHERE price_paid IS NOT NULL')
    .get() as { total: number }

  const expectedRow = db
    .prepare(
      `SELECT COALESCE(SUM(price_paid / plan_months), 0) as expected
       FROM subscriptions
       WHERE is_active = 1
         AND price_paid IS NOT NULL
         AND plan_months > 0`
    )
    .get() as { expected: number }

  return {
    totalRevenue: Number(subRow.total || 0) + Number(guestRow.total || 0),
    expectedMonthly: Number(expectedRow.expected || 0)
  }
}

export interface MonthlyIncomeEntry {
  month: string               // 'YYYY-MM'
  revenue: number             // subscriptions + guest passes
  subscriptionRevenue: number
  guestRevenue: number
  count: number               // total transactions
}

export function getMonthlyIncome(): MonthlyIncomeEntry[] {
  const db = getDatabase()

  const subRows = db
    .prepare(
      `SELECT strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month,
              COALESCE(SUM(price_paid), 0) as revenue,
              COUNT(*) as count
         FROM subscriptions
        WHERE price_paid IS NOT NULL
        GROUP BY month`
    )
    .all() as Array<{ month: string; revenue: number; count: number }>

  const guestRows = db
    .prepare(
      `SELECT strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month,
              COALESCE(SUM(price_paid), 0) as revenue,
              COUNT(*) as count
         FROM guest_passes
        WHERE price_paid IS NOT NULL
        GROUP BY month`
    )
    .all() as Array<{ month: string; revenue: number; count: number }>

  const map = new Map<string, MonthlyIncomeEntry>()

  for (const r of subRows) {
    map.set(r.month, {
      month: r.month,
      revenue: Number(r.revenue),
      subscriptionRevenue: Number(r.revenue),
      guestRevenue: 0,
      count: r.count
    })
  }

  for (const r of guestRows) {
    const existing = map.get(r.month)
    if (existing) {
      existing.revenue += Number(r.revenue)
      existing.guestRevenue = Number(r.revenue)
      existing.count += r.count
    } else {
      map.set(r.month, {
        month: r.month,
        revenue: Number(r.revenue),
        subscriptionRevenue: 0,
        guestRevenue: Number(r.revenue),
        count: r.count
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month))
}

export function getRecentIncome(limit = 20): IncomeEntry[] {
  const db = getDatabase()

  const subscriptions = db
    .prepare(
      `SELECT
        s.id,
        s.price_paid,
        s.plan_months,
        s.sessions_per_month,
        s.created_at,
        m.name,
        m.phone
       FROM subscriptions s
       JOIN members m ON s.member_id = m.id
       WHERE s.price_paid IS NOT NULL`
    )
    .all() as Array<{
    id: number
    price_paid: number
    plan_months: number
    sessions_per_month: number | null
    created_at: number
    name: string
    phone: string | null
  }>

  const guests = db
    .prepare(
      `SELECT id, code, name, phone, price_paid, created_at
       FROM guest_passes
       WHERE price_paid IS NOT NULL`
    )
    .all() as Array<{
    id: string
    code: string
    name: string
    phone: string | null
    price_paid: number
    created_at: number
  }>

  const combined: IncomeEntry[] = [
    ...subscriptions.map((row) => ({
      type: 'subscription' as const,
      name: row.name,
      phone: row.phone,
      amount: Number(row.price_paid || 0),
      created_at: row.created_at,
      plan_months: row.plan_months,
      sessions_per_month: row.sessions_per_month ?? null
    })),
    ...guests.map((row) => ({
      type: 'guest_pass' as const,
      name: row.name,
      phone: row.phone,
      amount: Number(row.price_paid || 0),
      created_at: row.created_at,
      code: row.code
    }))
  ]

  return combined.sort((a, b) => b.created_at - a.created_at).slice(0, limit)
}
