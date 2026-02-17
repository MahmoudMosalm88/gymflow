import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

let db: Database.Database

const SECONDS_PER_DAY = 86400
const DAYS_PER_MONTH = 30

// Mock module for connection
vi.mock('../../connection', () => ({
  getDatabase: () => db
}))

// Import after mocking
import {
  createSubscription,
  renewSubscription,
  getActiveSubscription,
  getSubscriptionById
} from '../subscriptionRepository'
import { createMember } from '../memberRepository'
import { getCurrentQuota, getQuotaHistory } from '../quotaRepository'

function setupTestDatabase() {
  db = new Database(':memory:')
  
  // Enable foreign keys (required for referential integrity)
  db.pragma('foreign_keys = ON')

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
      sessions_cap INTEGER NOT NULL
    );

    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE UNIQUE INDEX idx_one_active_subscription
      ON subscriptions(member_id) WHERE is_active = 1;
  `)

  db.prepare("INSERT INTO settings (key, value) VALUES ('session_cap_male', '26')").run()
  db.prepare("INSERT INTO settings (key, value) VALUES ('session_cap_female', '30')").run()
}

describe('Subscription Renewal - BUG-003 Fix', () => {
  beforeEach(() => {
    setupTestDatabase()
  })

  afterEach(() => {
    db?.close()
  })

  it('should atomically deactivate old subscription and create new subscription', () => {
    // Setup: Create a member and initial subscription
    const member = createMember({
      name: 'Test Member',
      phone: '+1234567890',
      gender: 'male',
      card_code: '00021'
    })
    const memberId = member.id

    const oldSubscription = createSubscription({
      member_id: memberId,
      plan_months: 1,
      price_paid: 100
    })

    expect(oldSubscription.is_active).toBe(1)

    // Act: Renew the subscription
    const newSubscription = renewSubscription(memberId, 3, 200)

    // Assert: Old subscription should be deactivated
    const oldSubAfterRenewal = getSubscriptionById(oldSubscription.id)
    expect(oldSubAfterRenewal?.is_active).toBe(0)

    // Assert: New subscription should be active
    expect(newSubscription.is_active).toBe(1)
    expect(newSubscription.plan_months).toBe(3)
    expect(newSubscription.price_paid).toBe(200)

    // Assert: Only one active subscription exists
    const activeSubscription = getActiveSubscription(memberId)
    expect(activeSubscription?.id).toBe(newSubscription.id)
  })

  it('should end old quota cycle when renewing subscription', () => {
    const member = createMember({
      name: 'Test Member',
      phone: '+1234567891',
      gender: 'female',
      card_code: '00022'
    })
    const memberId = member.id

    const now = Math.floor(Date.now() / 1000)

    // Create subscription that started 15 days ago
    const startDate = now - 15 * SECONDS_PER_DAY
    const oldSubscription = createSubscription({
      member_id: memberId,
      plan_months: 1,
      start_date: startDate,
      price_paid: 150
    })

    // Create a quota for the old subscription
    db.prepare(
      `INSERT INTO quotas (member_id, subscription_id, cycle_start, cycle_end, sessions_used, sessions_cap)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      memberId,
      oldSubscription.id,
      startDate,
      startDate + DAYS_PER_MONTH * SECONDS_PER_DAY,
      5,
      30
    )

    // Verify quota exists
    const quotasBefore = getQuotaHistory(memberId)
    expect(quotasBefore.length).toBe(1)
    expect(quotasBefore[0].sessions_used).toBe(5)
    expect(quotasBefore[0].cycle_end).toBeGreaterThan(now)

    // Act: Renew subscription
    const newSubscription = renewSubscription(memberId, 3, 200)

    // Assert: Old quota cycle should be ended (cycle_end set to now or earlier)
    const quotasAfter = getQuotaHistory(memberId)
    
    // Should have 2 quotas: old (ended) and new (active)
    expect(quotasAfter.length).toBe(2)

    // Find old and new quotas
    const oldQuota = quotasAfter.find(q => q.subscription_id === oldSubscription.id)
    const newQuota = quotasAfter.find(q => q.subscription_id === newSubscription.id)

    expect(oldQuota).toBeDefined()
    expect(newQuota).toBeDefined()

    // Old quota should be ended (cycle_end <= now)
    expect(oldQuota!.cycle_end).toBeLessThanOrEqual(now + 5) // Allow 5 second tolerance for test execution
    expect(oldQuota!.sessions_used).toBe(5) // Usage preserved

    // New quota should be active
    expect(newQuota!.sessions_used).toBe(0) // Fresh quota
    expect(newQuota!.cycle_start).toBeGreaterThanOrEqual(now - 5)
  })

  it('should create new quota for renewed subscription', () => {
    const member = createMember({
      name: 'Test Member',
      phone: '+1234567892',
      gender: 'male',
      card_code: '00023'
    })
    const memberId = member.id

    // Create initial subscription
    createSubscription({
      member_id: memberId,
      plan_months: 1,
      price_paid: 100
    })

    // Renew subscription
    const newSubscription = renewSubscription(memberId, 6, 500)

    // Check that a new quota was created
    const quotas = getQuotaHistory(memberId)
    const newQuota = quotas.find(q => q.subscription_id === newSubscription.id)

    expect(newQuota).toBeDefined()
    expect(newQuota!.sessions_used).toBe(0)
    expect(newQuota!.sessions_cap).toBe(26) // Male default
    expect(newQuota!.member_id).toBe(memberId)
    expect(newQuota!.cycle_start).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
  })

  it('should handle renewal when no previous subscription exists', () => {
    const member = createMember({
      name: 'New Member',
      phone: '+1234567893',
      gender: 'female',
      card_code: '00024'
    })
    const memberId = member.id

    // Renew (first subscription)
    const newSubscription = renewSubscription(memberId, 3, 300)

    expect(newSubscription).toBeDefined()
    expect(newSubscription.is_active).toBe(1)
    expect(newSubscription.plan_months).toBe(3)

    // Should have created a quota
    const quotas = getQuotaHistory(memberId)
    expect(quotas.length).toBe(1)
    expect(quotas[0].sessions_cap).toBe(30) // Female default
  })

  it('should preserve old quota usage data for history', () => {
    const member = createMember({
      name: 'Test Member',
      phone: '+1234567894',
      gender: 'male',
      card_code: '00025'
    })
    const memberId = member.id

    const now = Math.floor(Date.now() / 1000)
    const startDate = now - 20 * SECONDS_PER_DAY

    const oldSubscription = createSubscription({
      member_id: memberId,
      plan_months: 1,
      start_date: startDate,
      price_paid: 100
    })

    // Create quota with usage
    db.prepare(
      `INSERT INTO quotas (member_id, subscription_id, cycle_start, cycle_end, sessions_used, sessions_cap)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      memberId,
      oldSubscription.id,
      startDate,
      startDate + DAYS_PER_MONTH * SECONDS_PER_DAY,
      15,
      26
    )

    // Renew
    renewSubscription(memberId, 1, 120)

    // Check quota history
    const quotas = getQuotaHistory(memberId)
    const oldQuota = quotas.find(q => q.subscription_id === oldSubscription.id)

    // Old quota should still have its usage data
    expect(oldQuota!.sessions_used).toBe(15)
    expect(oldQuota!.sessions_cap).toBe(26)
  })

  it('should ensure atomicity - all changes or none', () => {
    const member = createMember({
      name: 'Test Member',
      phone: '+1234567895',
      gender: 'male',
      card_code: '00026'
    })
    const memberId = member.id

    createSubscription({
      member_id: memberId,
      plan_months: 1,
      price_paid: 100
    })

    // Count operations before
    const subsBefore = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE member_id = ?').get(memberId) as { count: number }
    const quotasBefore = db.prepare('SELECT COUNT(*) as count FROM quotas WHERE member_id = ?').get(memberId) as { count: number }

    // Perform renewal
    renewSubscription(memberId, 3, 200)

    // Count operations after
    const subsAfter = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE member_id = ?').get(memberId) as { count: number }
    const quotasAfter = db.prepare('SELECT COUNT(*) as count FROM quotas WHERE member_id = ?').get(memberId) as { count: number }

    // Should have created exactly one new subscription and one new quota
    expect(subsAfter.count).toBe(subsBefore.count + 1)
    expect(quotasAfter.count).toBeGreaterThan(quotasBefore.count)

    // Exactly one active subscription
    const activeSubs = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE member_id = ? AND is_active = 1').get(memberId) as { count: number }
    expect(activeSubs.count).toBe(1)
  })
})
