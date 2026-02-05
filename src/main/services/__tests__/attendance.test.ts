import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase } from '../../database/repositories/__tests__/testDb'

let db: Database.Database

vi.mock('../../database/connection', () => ({
  getDatabase: () => db
}))

import { checkAttendance } from '../attendance'
import { createMember } from '../../database/repositories/memberRepository'
import { createSubscription } from '../../database/repositories/subscriptionRepository'

const SECONDS_PER_DAY = 86400

describe('Attendance by serial', () => {
  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('allows check-in when serial is valid and subscription active', () => {
    const now = Math.floor(Date.now() / 1000)
    const member = createMember({
      name: 'Serial Member',
      phone: '+201234567800',
      gender: 'male',
      card_code: 'GF-000123'
    })

    createSubscription({
      member_id: member.id,
      plan_months: 1,
      start_date: now - 60
    })

    const result = checkAttendance('GF-000123', 'scan')
    expect(result.status).toBe('allowed')
    expect(result.member?.id).toBe(member.id)
  })

  it('denies check-in for expired subscription', () => {
    const now = Math.floor(Date.now() / 1000)
    const member = createMember({
      name: 'Expired Member',
      phone: '+201234567801',
      gender: 'female',
      card_code: 'GF-000124'
    })

    createSubscription({
      member_id: member.id,
      plan_months: 1,
      start_date: now - 60 * SECONDS_PER_DAY
    })

    const result = checkAttendance('GF-000124', 'scan')
    expect(result.status).toBe('denied')
    expect(result.reasonCode).toBe('expired')
  })

  it('ignores duplicate scans within cooldown', () => {
    const now = Math.floor(Date.now() / 1000)
    const member = createMember({
      name: 'Cooldown Member',
      phone: '+201234567802',
      gender: 'male',
      card_code: 'GF-000125'
    })

    createSubscription({
      member_id: member.id,
      plan_months: 1,
      start_date: now - 60
    })

    const first = checkAttendance('GF-000125', 'scan')
    const second = checkAttendance('GF-000125', 'scan')

    expect(first.status).toBe('allowed')
    expect(second.status).toBe('ignored')
    expect(second.reasonCode).toBe('cooldown')
  })
})
