import { getDatabase } from '../connection'
import { getSubscriptionById } from './subscriptionRepository'

const SECONDS_PER_DAY = 86400

export interface SubscriptionFreeze {
  id: number
  subscription_id: number
  start_date: number
  end_date: number
  days: number
  created_at: number
}

export function getFreezeById(id: number): SubscriptionFreeze | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM subscription_freezes WHERE id = ?').get(id)
  return (result as SubscriptionFreeze) || null
}

export function getActiveFreeze(subscriptionId: number, atTime?: number): SubscriptionFreeze | null {
  const db = getDatabase()
  const now = atTime ?? Math.floor(Date.now() / 1000)
  const result = db
    .prepare(
      `SELECT * FROM subscription_freezes
       WHERE subscription_id = ? AND start_date <= ? AND end_date > ?
       ORDER BY start_date DESC
       LIMIT 1`
    )
    .get(subscriptionId, now, now)
  return (result as SubscriptionFreeze) || null
}

export function getFreezesBySubscriptionId(subscriptionId: number): SubscriptionFreeze[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM subscription_freezes WHERE subscription_id = ? ORDER BY start_date DESC')
    .all(subscriptionId) as SubscriptionFreeze[]
}

export function createSubscriptionFreeze(subscriptionId: number, days: number): SubscriptionFreeze {
  if (!Number.isFinite(days) || days < 1 || days > 7) {
    throw new Error('Freeze days must be between 1 and 7')
  }

  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const subscription = getSubscriptionById(subscriptionId)
  if (!subscription) {
    throw new Error('Subscription not found')
  }

  const active = getActiveFreeze(subscriptionId, now)
  if (active) {
    throw new Error('Subscription already frozen')
  }

  const startDate = now
  const endDate = now + days * SECONDS_PER_DAY

  const transaction = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO subscription_freezes (subscription_id, start_date, end_date, days, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(subscriptionId, startDate, endDate, days, now)

    db.prepare('UPDATE subscriptions SET end_date = end_date + ? WHERE id = ?').run(
      days * SECONDS_PER_DAY,
      subscriptionId
    )

    return result.lastInsertRowid as number
  })

  const freezeId = transaction()
  return getFreezeById(freezeId)!
}
