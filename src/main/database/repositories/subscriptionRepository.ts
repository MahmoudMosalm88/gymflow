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
  is_active: number
  created_at: number
}

export interface CreateSubscriptionInput {
  member_id: string
  plan_months: 1 | 3 | 6 | 12
  price_paid?: number
  start_date?: number // Unix timestamp, defaults to now
}

const SECONDS_PER_DAY = 86400
const DAYS_PER_MONTH = 30

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
  const now = Math.floor(Date.now() / 1000)
  const startDate = input.start_date || now

  // Calculate end date based on plan months (30 days per month)
  const durationDays = input.plan_months * DAYS_PER_MONTH
  const endDate = startDate + durationDays * SECONDS_PER_DAY

  // Deactivate any existing active subscriptions for this member
  db.prepare('UPDATE subscriptions SET is_active = 0 WHERE member_id = ? AND is_active = 1').run(
    input.member_id
  )

  // Create new subscription
  const result = db
    .prepare(
      `INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, price_paid, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    )
    .run(input.member_id, startDate, endDate, input.plan_months, input.price_paid || null, now)

  const subscriptionId = result.lastInsertRowid as number

  return getSubscriptionById(subscriptionId)!
}

export function renewSubscription(
  memberId: string,
  planMonths: 1 | 3 | 6 | 12,
  pricePaid?: number
): Subscription {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  
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
    
    // 4. Calculate new subscription dates
    const startDate = now
    const durationDays = planMonths * DAYS_PER_MONTH
    const endDate = startDate + durationDays * SECONDS_PER_DAY
    
    // 5. Create the new subscription
    const result = db
      .prepare(
        `INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, price_paid, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`
      )
      .run(memberId, startDate, endDate, planMonths, pricePaid || null, now)
    
    const newSubscriptionId = result.lastInsertRowid as number
    
    // 6. Create the first quota cycle for the new subscription
    const cycleStart = startDate
    const cycleEnd = Math.min(cycleStart + DAYS_PER_MONTH * SECONDS_PER_DAY, endDate)
    
    const member = getMemberById(memberId)
    if (!member) {
      throw new Error(`Member ${memberId} not found`)
    }
    
    // Get session cap based on gender
    const sessionCap =
      member.gender === 'male'
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
