import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase } from './testDb'

let db: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => db
}))

import { createOwner, createOtp, verifyOtp, markOwnerVerified, getOwnerByPhone } from '../ownerRepository'

const hash = 'fake-hash'

describe('Owner auth flow', () => {
  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('registers owner and verifies OTP', () => {
    const owner = createOwner('+201234000000', hash, 'Owner')
    const otp = createOtp('+201234000000', 'verify')

    const ok = verifyOtp('+201234000000', otp.code, 'verify')
    expect(ok).toBe(true)

    markOwnerVerified(owner.id)
    const updated = getOwnerByPhone('+201234000000')
    expect(updated?.verified_at).toBeTruthy()
  })

  it('rejects invalid OTP', () => {
    createOwner('+201234000001', hash, 'Owner')
    createOtp('+201234000001', 'verify')

    const ok = verifyOtp('+201234000001', '000000', 'verify')
    expect(ok).toBe(false)
  })
})
