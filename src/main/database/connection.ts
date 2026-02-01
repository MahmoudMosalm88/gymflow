import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync } from 'fs'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    // Lazily initialize if app is ready
    if (app.isReady()) {
      return initDatabase()
    }
    throw new Error('Database not initialized. App is not ready.')
  }
  return db
}

export function initDatabase(): Database.Database {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'gymflow.db')

  // Ensure directory exists
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  // Create photos directory
  const photosPath = join(userDataPath, 'photos')
  if (!existsSync(photosPath)) {
    mkdirSync(photosPath, { recursive: true })
  }

  // Initialize database
  db = new Database(dbPath)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Run migrations
  runMigrations(db)

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function runMigrations(database: Database.Database): void {
  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at INTEGER DEFAULT (unixepoch())
    )
  `)

  // Get applied migrations
  const appliedMigrations = database
    .prepare('SELECT name FROM migrations')
    .all()
    .map((row: { name: string }) => row.name)

  // Migration: Initial schema
  if (!appliedMigrations.includes('001_initial_schema')) {
    console.log('Applying migration: 001_initial_schema')

    database.exec(`
      -- Members table
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
        photo_path TEXT,
        access_tier TEXT CHECK(access_tier IN ('A', 'B')) DEFAULT 'A',
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      -- Subscriptions table
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        start_date INTEGER NOT NULL,
        end_date INTEGER NOT NULL,
        plan_months INTEGER CHECK(plan_months IN (1, 3, 6, 12)) NOT NULL,
        price_paid REAL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );

      -- Enforce ONE active subscription per member
      CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_subscription
        ON subscriptions(member_id) WHERE is_active = 1;

      -- Session quotas (per billing cycle)
      CREATE TABLE IF NOT EXISTS quotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        cycle_start INTEGER NOT NULL,
        cycle_end INTEGER NOT NULL,
        sessions_used INTEGER DEFAULT 0,
        sessions_cap INTEGER NOT NULL,
        UNIQUE(subscription_id, cycle_start)
      );

      -- Attendance logs (supports unknown scans)
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT REFERENCES members(id),
        scanned_value TEXT NOT NULL,
        method TEXT CHECK(method IN ('scan', 'manual')) DEFAULT 'scan',
        timestamp INTEGER DEFAULT (unixepoch()),
        status TEXT CHECK(status IN ('allowed', 'denied', 'warning')) NOT NULL,
        reason_code TEXT
      );

      -- WhatsApp message queue
      CREATE TABLE IF NOT EXISTS message_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT NOT NULL REFERENCES members(id),
        message_type TEXT NOT NULL,
        payload_json TEXT,
        scheduled_at INTEGER NOT NULL,
        sent_at INTEGER,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        last_attempt_at INTEGER,
        last_error TEXT
      );

      -- App settings (key-value store)
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON subscriptions(end_date);
      CREATE INDEX IF NOT EXISTS idx_quotas_member ON quotas(member_id, cycle_end);
      CREATE INDEX IF NOT EXISTS idx_logs_member ON logs(member_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_queue_status ON message_queue(status, scheduled_at);
    `)

    // Record migration
    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('001_initial_schema')
    console.log('Migration 001_initial_schema applied successfully')
  }

  // Migration: Owner authentication + sessions
  if (!appliedMigrations.includes('002_owner_auth')) {
    console.log('Applying migration: 002_owner_auth')

    database.exec(`
      CREATE TABLE IF NOT EXISTS owners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        verified_at INTEGER,
        last_login INTEGER
      );

      CREATE TABLE IF NOT EXISTS owner_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER,
        revoked_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS owner_otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        purpose TEXT CHECK(purpose IN ('verify', 'reset')) NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        used_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone);
      CREATE INDEX IF NOT EXISTS idx_owner_sessions_token ON owner_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_owner_otps_phone ON owner_otps(phone, purpose);
    `)

    database.prepare('INSERT INTO migrations (name) VALUES (?)').run('002_owner_auth')
    console.log('Migration 002_owner_auth applied successfully')
  }

  // Insert default settings if not exist
  const insertSetting = database.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )

  const defaultSettings = [
    ['language', '"en"'],
    ['session_cap_male', '26'],
    ['session_cap_female', '30'],
    ['test_mode', 'false'],
    ['onboarding_complete', 'false'],
    ['access_hours_enabled', 'false'],
    ['access_hours_male', '[{"start": "06:00", "end": "23:00"}]'],
    ['access_hours_female', '[{"start": "10:00", "end": "14:00"}, {"start": "18:00", "end": "22:00"}]'],
    ['warning_days_before_expiry', '3'],
    ['warning_sessions_remaining', '3'],
    ['scan_cooldown_seconds', '30'],
    ['whatsapp_enabled', 'false'],
    ['whatsapp_batch_delay_min', '10'],
    ['whatsapp_batch_delay_max', '15'],
    ['whatsapp_template_welcome', '"Welcome to GymFlow, {{name}}! Your QR code is attached."'],
    ['whatsapp_template_renewal', '"Hi {{name}}, your subscription expires in {{days}} days. Please renew soon!"'],
    ['whatsapp_template_low_sessions', '"Hi {{name}}, you have only {{sessions}} sessions remaining this cycle."']
  ]

  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value)
  }
}

export function getPhotosPath(): string {
  return join(app.getPath('userData'), 'photos')
}

export function getUserDataPath(): string {
  return app.getPath('userData')
}
