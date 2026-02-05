import { getDatabase } from '../connection'
import { getActiveSubscription } from './subscriptionRepository'
import { getMemberById } from './memberRepository'
import { getSetting } from './settingsRepository'

export interface Quota {
  id: number
  member_id: string
  subscription_id: number
  cycle_start: number
  cycle_end: number
  sessions_used: number
  sessions_cap: number
}

const SECONDS_PER_DAY = 86400
const CYCLE_LENGTH_DAYS = 30

export function getQuotaById(id: number): Quota | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM quotas WHERE id = ?').get(id)
  return (result as Quota) || null
}

export function getCurrentQuota(memberId: string): Quota | null {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const result = db
    .prepare(
      `SELECT * FROM quotas
       WHERE member_id = ? AND cycle_start <= ? AND cycle_end > ?
       ORDER BY cycle_start DESC
       LIMIT 1`
    )
    .get(memberId, now, now)

  return (result as Quota) || null
}

export function getQuotaHistory(memberId: string): Quota[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM quotas WHERE member_id = ? ORDER BY cycle_start DESC')
    .all(memberId) as Quota[]
}

export function getOrCreateCurrentQuota(memberId: string): Quota | null {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  // Get active subscription
  const subscription = getActiveSubscription(memberId)
  if (!subscription) {
    return null
  }

  // Subscription not started yet
  if (subscription.start_date > now) {
    return null
  }

  // Check if subscription is expired
  if (subscription.end_date <= now) {
    return null
  }

  // Calculate current cycle based on subscription start date
  const cycleIndex = Math.floor((now - subscription.start_date) / (CYCLE_LENGTH_DAYS * SECONDS_PER_DAY))
  const cycleStart = subscription.start_date + cycleIndex * CYCLE_LENGTH_DAYS * SECONDS_PER_DAY
  const cycleEnd = cycleStart + CYCLE_LENGTH_DAYS * SECONDS_PER_DAY

  // Check if cycle end exceeds subscription end - cap it
  const effectiveCycleEnd = Math.min(cycleEnd, subscription.end_date)

  // Try to find existing quota for this cycle
  let quota = db
    .prepare(
      `SELECT * FROM quotas
       WHERE subscription_id = ? AND cycle_start = ?`
    )
    .get(subscription.id, cycleStart) as Quota | undefined

  if (!quota) {
    // Create new quota
    const member = getMemberById(memberId)
    if (!member) return null

    // Get session cap based on gender
    const sessionCap =
      subscription.sessions_per_month && subscription.sessions_per_month > 0
        ? subscription.sessions_per_month
        : member.gender === 'male'
          ? getSetting<number>('session_cap_male', 26)
          : getSetting<number>('session_cap_female', 30)

    const result = db
      .prepare(
        `INSERT INTO quotas (member_id, subscription_id, cycle_start, cycle_end, sessions_used, sessions_cap)
         VALUES (?, ?, ?, ?, 0, ?)`
      )
      .run(memberId, subscription.id, cycleStart, effectiveCycleEnd, sessionCap)

    quota = getQuotaById(result.lastInsertRowid as number)!
  }

  return quota
}

export function incrementSessionsUsed(quotaId: number): void {
  const db = getDatabase()
  db.prepare('UPDATE quotas SET sessions_used = sessions_used + 1 WHERE id = ?').run(quotaId)
}

export function getSessionsRemaining(memberId: string): number {
  const quota = getCurrentQuota(memberId)
  if (!quota) return 0
  return Math.max(0, quota.sessions_cap - quota.sessions_used)
}

export function getMembersWithLowSessions(threshold: number): Array<{
  member_id: string
  name: string
  phone: string
  sessions_remaining: number
}> {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  return db
    .prepare(
      `SELECT
        q.member_id,
        m.name,
        m.phone,
        (q.sessions_cap - q.sessions_used) as sessions_remaining
       FROM quotas q
       JOIN members m ON q.member_id = m.id
       JOIN subscriptions s ON q.subscription_id = s.id
       WHERE s.is_active = 1
         AND q.cycle_start <= ? AND q.cycle_end > ?
         AND (q.sessions_cap - q.sessions_used) <= ?
         AND (q.sessions_cap - q.sessions_used) > 0
       ORDER BY sessions_remaining ASC`
    )
    .all(now, now, threshold) as Array<{
    member_id: string
    name: string
    phone: string
    sessions_remaining: number
  }>
}
