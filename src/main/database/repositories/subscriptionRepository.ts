import { getDatabase } from '../connection'
import { getMemberById } from './memberRepository'
import { getSetting } from './settingsRepository'

export interface Subscription {
  id: number
  member_id: string
  start_date: number
  end_date: number
  plan_months: 1 | 3 | 6 | 12
  price_paid: number | null
  sessions_per_month: number | null
  is_active: number
  created_at: number
}

export interface CreateSubscriptionInput {
  member_id: string
  plan_months: 1 | 3 | 6 | 12
  price_paid?: number
  sessions_per_month?: number
  start_date?: number // Unix timestamp, defaults to now
}

const SECONDS_PER_DAY = 86400

// Add N calendar months to a Unix timestamp (seconds).
// Uses JavaScript's Date so Feb/Mar/Apr etc. are handled correctly.
function addCalendarMonths(unixSeconds: number, months: number): number {
  const d = new Date(unixSeconds * 1000)
  d.setMonth(d.getMonth() + months)
  return Math.floor(d.getTime() / 1000)
}

export function getSubscriptionsByMemberId(memberId: string): Subscription[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM subscriptions WHERE member_id = ? ORDER BY created_at DESC')
    .all(memberId) as Subscription[]
}

export function getActiveSubscription(memberId: string): Subscription | null {
  const db = getDatabase()
  const result = db
    .prepare('SELECT * FROM subscriptions WHERE member_id = ? AND is_active = 1')
    .get(memberId)
  return (result as Subscription) || null
}

export function getSubscriptionById(id: number): Subscription | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id)
  return (result as Subscription) || null
}

export function createSubscription(input: CreateSubscriptionInput): Subscription {
  const db = getDatabase()
  const transaction = db.transaction(() => {
    const now = Math.floor(Date.now() / 1000)
    const startDate = input.start_date || now
    if (
      input.sessions_per_month !== undefined &&
      (!Number.isFinite(input.sessions_per_month) || input.sessions_per_month < 1)
    ) {
      throw new Error('Sessions per month must be a positive number')
    }

    // Calculate end date using real calendar months
    const endDate = addCalendarMonths(startDate, input.plan_months)

    // Deactivate any existing active subscriptions for this member
    db.prepare('UPDATE subscriptions SET is_active = 0 WHERE member_id = ? AND is_active = 1').run(
      input.member_id
    )

    // Create new subscription
    const result = db
      .prepare(
        `INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, price_paid, sessions_per_month, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
      )
      .run(
        input.member_id,
        startDate,
        endDate,
        input.plan_months,
        input.price_paid || null,
        input.sessions_per_month || null,
        now
      )

    return result.lastInsertRowid as number
  })

  const subscriptionId = transaction()
  return getSubscriptionById(subscriptionId)!
}

export function renewSubscription(
  memberId: string,
  planMonths: 1 | 3 | 6 | 12,
  pricePaid?: number,
  sessionsPerMonth?: number
): Subscription {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  if (
    sessionsPerMonth !== undefined &&
    (!Number.isFinite(sessionsPerMonth) || sessionsPerMonth < 1)
  ) {
    throw new Error('Sessions per month must be a positive number')
  }
  
  // Use a transaction to ensure atomicity
  const transaction = db.transaction(() => {
    // 1. Get the current active subscription (if any)
    const oldSubscription = getActiveSubscription(memberId)
    
    // 2. End the current quota cycle (if exists)
    if (oldSubscription) {
      // Find and end any active quota cycles for the old subscription
      db.prepare(
        `UPDATE quotas 
         SET cycle_end = ?
         WHERE subscription_id = ? 
           AND cycle_start <= ? 
           AND cycle_end > ?`
      ).run(now, oldSubscription.id, now, now)
      
      // 3. Deactivate the old subscription
      db.prepare('UPDATE subscriptions SET is_active = 0 WHERE id = ?').run(oldSubscription.id)
    }
    
    // 4. Calculate new subscription dates using real calendar months
    const startDate = now
    const endDate = addCalendarMonths(startDate, planMonths)
    
    // 5. Create the new subscription
    const result = db
      .prepare(
        `INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, price_paid, sessions_per_month, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
      )
      .run(memberId, startDate, endDate, planMonths, pricePaid || null, sessionsPerMonth || null, now)
    
    const newSubscriptionId = result.lastInsertRowid as number
    
    // 6. Create the first quota cycle for the new subscription
    const cycleStart = startDate
    const cycleEnd = Math.min(addCalendarMonths(cycleStart, 1), endDate)
    
    const member = getMemberById(memberId)
    if (!member) {
      throw new Error(`Member ${memberId} not found`)
    }
    
    // Get session cap based on gender
    const sessionCap =
      sessionsPerMonth && sessionsPerMonth > 0
        ? sessionsPerMonth
        : member.gender === 'male'
          ? getSetting<number>('session_cap_male', 26)
          : getSetting<number>('session_cap_female', 30)
    
    db.prepare(
      `INSERT INTO quotas (member_id, subscription_id, cycle_start, cycle_end, sessions_used, sessions_cap)
       VALUES (?, ?, ?, ?, 0, ?)`
    ).run(memberId, newSubscriptionId, cycleStart, cycleEnd, sessionCap)
    
    return newSubscriptionId
  })
  
  // Execute the transaction and return the new subscription
  const newSubscriptionId = transaction()
  return getSubscriptionById(newSubscriptionId)!
}

export function cancelSubscription(id: number): void {
  const db = getDatabase()
  db.prepare('UPDATE subscriptions SET is_active = 0 WHERE id = ?').run(id)
}

export function updateSubscriptionPricePaid(id: number, pricePaid: number | null): Subscription | null {
  const db = getDatabase()
  db.prepare('UPDATE subscriptions SET price_paid = ? WHERE id = ?').run(pricePaid, id)
  return getSubscriptionById(id)
}

export function getExpiringSubscriptions(daysThreshold: number): Subscription[] {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  const thresholdDate = now + daysThreshold * SECONDS_PER_DAY

  return db
    .prepare(
      `SELECT s.*, m.name, m.phone
       FROM subscriptions s
       JOIN members m ON s.member_id = m.id
       WHERE s.is_active = 1
         AND s.start_date <= ?
         AND s.end_date <= ?
         AND s.end_date > ?
       ORDER BY s.end_date ASC`
    )
    .all(now, thresholdDate, now) as Subscription[]
}

export function getActiveSubscriptionCount(): number {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  const result = db
    .prepare(
      'SELECT COUNT(*) as count FROM subscriptions WHERE is_active = 1 AND start_date <= ? AND end_date >= ?'
    )
    .get(now, now) as { count: number }
  return result.count
}

export function getExpiredSubscriptionCount(): number {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  const result = db
    .prepare(
      'SELECT COUNT(*) as count FROM subscriptions WHERE is_active = 1 AND end_date < ?'
    )
    .get(now) as { count: number }
  return result.count
}
