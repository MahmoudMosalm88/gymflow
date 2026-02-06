import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase } from './testDb'

let db: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => db
}))

import { createMember } from '../memberRepository'
import { createSubscription } from '../subscriptionRepository'
import { createGuestPass } from '../guestPassRepository'
import { getIncomeSummary, getRecentIncome } from '../incomeRepository'

describe('Income Repository', () => {
  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('calculates total and expected monthly income', () => {
    const member = createMember({
      name: 'Paying Member',
      phone: '+201111111111',
      gender: 'female',
      card_code: 'GF-000101'
    })

    createSubscription({
      member_id: member.id,
      plan_months: 3,
      price_paid: 120,
      sessions_per_month: 20
    })

    createGuestPass({
      name: 'Guest',
      price_paid: 10,
      validity_days: 1
    })

    const summary = getIncomeSummary()
    expect(summary.totalRevenue).toBe(130)
    expect(summary.expectedMonthly).toBe(40)
  })

  it('returns recent income entries', () => {
    const member = createMember({
      name: 'Member Two',
      phone: '+201222222222',
      gender: 'male',
      card_code: 'GF-000102'
    })

    createSubscription({
      member_id: member.id,
      plan_months: 1,
      price_paid: 50,
      sessions_per_month: 15
    })

    const guest = createGuestPass({
      name: 'Trial',
      price_paid: 5,
      validity_days: 1
    })

    const entries = getRecentIncome()
    const codes = entries.map((entry) => entry.code)
    expect(entries.length).toBeGreaterThanOrEqual(2)
    expect(codes).toContain(guest.code)
  })
})
