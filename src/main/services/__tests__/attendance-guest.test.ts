import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase } from '../../database/repositories/__tests__/testDb'

let db: Database.Database

vi.mock('../../database/connection', () => ({
  getDatabase: () => db
}))

import { checkAttendance } from '../attendance'
import { createGuestPass } from '../../database/repositories/guestPassRepository'
import { createMember } from '../../database/repositories/memberRepository'
import { createSubscription } from '../../database/repositories/subscriptionRepository'
import { createSubscriptionFreeze } from '../../database/repositories/subscriptionFreezeRepository'

describe('Attendance - guest passes and freezes', () => {
  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('allows a guest pass once, then denies as used', () => {
    const pass = createGuestPass({ name: 'Visitor', validity_days: 1 })

    const first = checkAttendance(pass.code)
    expect(first.status).toBe('allowed')
    expect(first.reasonCode).toBe('guest_pass')

    const second = checkAttendance(pass.code)
    expect(second.status).toBe('denied')
    expect(second.reasonCode).toBe('guest_used')
  })

  it('denies expired guest pass', () => {
    const pass = createGuestPass({ name: 'Expired', validity_days: 1 })
    db.prepare('UPDATE guest_passes SET expires_at = ? WHERE id = ?').run(
      Math.floor(Date.now() / 1000) - 10,
      pass.id
    )

    const result = checkAttendance(pass.code)
    expect(result.status).toBe('denied')
    expect(result.reasonCode).toBe('guest_expired')
  })

  it('denies check-in during subscription freeze', () => {
    const member = createMember({
      name: 'Frozen Member',
      phone: '+201234560000',
      gender: 'male',
      card_code: '00004'
    })

    const subscription = createSubscription({
      member_id: member.id,
      plan_months: 1,
      price_paid: 100,
      sessions_per_month: 10
    })

    createSubscriptionFreeze(subscription.id, 3)

    const result = checkAttendance(member.card_code || member.id)
    expect(result.status).toBe('denied')
    expect(result.reasonCode).toBe('frozen')
  })
})
