import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

// We'll mock the database connection for isolated tests
let db: Database.Database

// Constants matching the repository
const SECONDS_PER_DAY = 86400

// Mock module for connection
vi.mock('../../connection', () => ({
  getDatabase: () => db
}))

// Import after mocking
import {
  getOrCreateCurrentQuota,
  getCurrentQuota,
  incrementSessionsUsed,
  getSessionsRemaining,
  getQuotaHistory
} from '../quotaRepository'
function setupTestDatabase() {
  db = new Database(':memory:')

  // Create tables
  db.exec(`
    CREATE TABLE members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
      photo_path TEXT,
      access_tier TEXT CHECK(access_tier IN ('A', 'B')) DEFAULT 'A',
      card_code TEXT,
      address TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      plan_months INTEGER CHECK(plan_months IN (1, 3, 6, 12)) NOT NULL,
      price_paid REAL,
      sessions_per_month INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE quotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      cycle_start INTEGER NOT NULL,
      cycle_end INTEGER NOT NULL,
      sessions_used INTEGER DEFAULT 0,
      sessions_cap INTEGER DEFAULT 26
    );

    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE UNIQUE INDEX idx_one_active_subscription
      ON subscriptions(member_id) WHERE is_active = 1;
  `)

  // Set default settings
  db.prepare("INSERT INTO settings (key, value) VALUES ('session_cap_male', '26')").run()
  db.prepare("INSERT INTO settings (key, value) VALUES ('session_cap_female', '30')").run()
}

describe('Quota Repository', () => {
  beforeEach(() => {
    setupTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  describe('getOrCreateCurrentQuota', () => {
    it('should return null for member without subscription', () => {
      const memberId = uuidv4()
      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      const quota = getOrCreateCurrentQuota(memberId)
      expect(quota).toBeNull()
    })

    it('should create quota with correct session cap for male member', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Male User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)

      expect(quota).not.toBeNull()
      expect(quota!.sessions_cap).toBe(26)
      expect(quota!.sessions_used).toBe(0)
    })

    it('should create quota with correct session cap for female member', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Female User', '+201234567891', 'female')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)

      expect(quota).not.toBeNull()
      expect(quota!.sessions_cap).toBe(30)
    })

    it('should use subscription sessions_per_month when provided', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Custom User', '+201234567899', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, sessions_per_month, is_active) VALUES (?, ?, ?, 1, ?, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY, 12)

      const quota = getOrCreateCurrentQuota(memberId)
      expect(quota).not.toBeNull()
      expect(quota!.sessions_cap).toBe(12)
    })

    it('should return existing quota instead of creating new one', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY)

      const quota1 = getOrCreateCurrentQuota(memberId)
      const quota2 = getOrCreateCurrentQuota(memberId)

      expect(quota1!.id).toBe(quota2!.id)
    })

    it('should return null for expired subscription', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)
      const pastStart = now - 60 * SECONDS_PER_DAY
      const pastEnd = now - 30 * SECONDS_PER_DAY

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, pastStart, pastEnd)

      const quota = getOrCreateCurrentQuota(memberId)
      expect(quota).toBeNull()
    })
  })

  describe('Billing Cycle Calculation', () => {
    it('should calculate first cycle correctly (day 1 of subscription)', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      // Start today
      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)

      expect(quota).not.toBeNull()
      expect(quota!.cycle_start).toBe(now)
      expect(quota!.cycle_end).toBeLessThanOrEqual(now + 30 * SECONDS_PER_DAY)
    })

    it('should calculate cycle correctly mid-subscription (day 15)', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)
      const startDate = now - 15 * SECONDS_PER_DAY // Started 15 days ago

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, startDate, startDate + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)

      expect(quota).not.toBeNull()
      // Should still be in cycle 0 (first cycle)
      expect(quota!.cycle_start).toBe(startDate)
    })

    it('should create new cycle for 3-month subscription on day 31', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)
      const startDate = now - 31 * SECONDS_PER_DAY // Started 31 days ago

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      // 3-month subscription = 90 days
      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 3, 1)'
      ).run(memberId, startDate, startDate + 90 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)

      expect(quota).not.toBeNull()
      // Should be in cycle 1 (second cycle)
      const expectedCycleStart = startDate + 30 * SECONDS_PER_DAY
      expect(quota!.cycle_start).toBe(expectedCycleStart)
    })

    it('should cap cycle_end at subscription end date for partial final cycle', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)
      // Start 25 days into a 1-month subscription (5 days left)
      const startDate = now - 25 * SECONDS_PER_DAY
      const endDate = startDate + 30 * SECONDS_PER_DAY

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, startDate, endDate)

      const quota = getOrCreateCurrentQuota(memberId)

      expect(quota).not.toBeNull()
      // cycle_end should be capped at subscription end
      expect(quota!.cycle_end).toBeLessThanOrEqual(endDate)
    })

    it('should track multiple cycles independently', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)
      const startDate = now - 35 * SECONDS_PER_DAY // Started 35 days ago

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      // 3-month subscription
      const subResult = db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 3, 1)'
      ).run(memberId, startDate, startDate + 90 * SECONDS_PER_DAY)

      // Manually create a quota for the first cycle (simulating past usage)
      db.prepare(
        'INSERT INTO quotas (member_id, subscription_id, cycle_start, cycle_end, sessions_used, sessions_cap) VALUES (?, ?, ?, ?, 20, 26)'
      ).run(memberId, subResult.lastInsertRowid, startDate, startDate + 30 * SECONDS_PER_DAY)

      // Get current quota (should create new one for cycle 2)
      const quota = getOrCreateCurrentQuota(memberId)

      expect(quota).not.toBeNull()
      expect(quota!.sessions_used).toBe(0) // Fresh cycle
      expect(quota!.cycle_start).toBe(startDate + 30 * SECONDS_PER_DAY)

      // Check history shows both cycles
      const history = getQuotaHistory(memberId)
      expect(history.length).toBe(2)
    })
  })

  describe('Session Tracking', () => {
    it('should increment sessions_used correctly', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)
      expect(quota!.sessions_used).toBe(0)

      incrementSessionsUsed(quota!.id)

      const updated = getCurrentQuota(memberId)
      expect(updated!.sessions_used).toBe(1)
    })

    it('should calculate sessions remaining correctly', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)

      // Use 10 sessions
      for (let i = 0; i < 10; i++) {
        incrementSessionsUsed(quota!.id)
      }

      const remaining = getSessionsRemaining(memberId)
      expect(remaining).toBe(16) // 26 - 10
    })

    it('should return 0 remaining when all sessions used', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY)

      // Manually set sessions_used to cap
      const subResult = db.prepare('SELECT id FROM subscriptions WHERE member_id = ?').get(memberId) as { id: number }
      db.prepare(
        'INSERT INTO quotas (member_id, subscription_id, cycle_start, cycle_end, sessions_used, sessions_cap) VALUES (?, ?, ?, ?, 26, 26)'
      ).run(memberId, subResult.id, now, now + 30 * SECONDS_PER_DAY)

      const remaining = getSessionsRemaining(memberId)
      expect(remaining).toBe(0)
    })

    it('should respect custom session cap from settings', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)

      // Update session cap setting
      db.prepare("UPDATE settings SET value = '20' WHERE key = 'session_cap_male'").run()

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, now, now + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)
      expect(quota!.sessions_cap).toBe(20)
    })
  })

  describe('Edge Cases', () => {
    it('should handle subscription starting at exact midnight', () => {
      const memberId = uuidv4()
      // Midnight UTC
      const midnight = Math.floor(Date.now() / 1000)
      const midnightRounded = midnight - (midnight % SECONDS_PER_DAY)

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 1)'
      ).run(memberId, midnightRounded, midnightRounded + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)
      expect(quota).not.toBeNull()
      expect(quota!.cycle_start).toBe(midnightRounded)
    })

    it('should handle leap from cycle 0 to cycle 1 at exact boundary', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)
      // Exactly 30 days ago
      const startDate = now - 30 * SECONDS_PER_DAY

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      // 3-month subscription
      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 3, 1)'
      ).run(memberId, startDate, startDate + 90 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)

      expect(quota).not.toBeNull()
      // At exactly 30 days, should be in cycle 1
      expect(quota!.cycle_start).toBe(startDate + 30 * SECONDS_PER_DAY)
    })

    it('should handle member with no active subscription but inactive ones exist', () => {
      const memberId = uuidv4()
      const now = Math.floor(Date.now() / 1000)
      const pastStart = now - 60 * SECONDS_PER_DAY

      db.prepare(
        "INSERT INTO members (id, name, phone, gender) VALUES (?, 'Test User', '+201234567890', 'male')"
      ).run(memberId)

      // Inactive subscription
      db.prepare(
        'INSERT INTO subscriptions (member_id, start_date, end_date, plan_months, is_active) VALUES (?, ?, ?, 1, 0)'
      ).run(memberId, pastStart, pastStart + 30 * SECONDS_PER_DAY)

      const quota = getOrCreateCurrentQuota(memberId)
      expect(quota).toBeNull()
    })
  })
})
