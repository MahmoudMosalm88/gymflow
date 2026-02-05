import Database from 'better-sqlite3'

export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:')

  db.exec(`
    CREATE TABLE members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
      photo_path TEXT,
      access_tier TEXT CHECK(access_tier IN ('A', 'B')) DEFAULT 'A',
      card_code TEXT,
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
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE UNIQUE INDEX idx_one_active_subscription
      ON subscriptions(member_id) WHERE is_active = 1;

    CREATE TABLE quotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      cycle_start INTEGER NOT NULL,
      cycle_end INTEGER NOT NULL,
      sessions_used INTEGER DEFAULT 0,
      sessions_cap INTEGER NOT NULL
    );

    CREATE TABLE logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT REFERENCES members(id),
      scanned_value TEXT NOT NULL,
      method TEXT CHECK(method IN ('scan', 'manual')) DEFAULT 'scan',
      timestamp INTEGER DEFAULT (unixepoch()),
      status TEXT CHECK(status IN ('allowed', 'denied', 'warning', 'ignored')) NOT NULL,
      reason_code TEXT
    );

    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      verified_at INTEGER,
      last_login INTEGER
    );

    CREATE TABLE owner_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      expires_at INTEGER,
      revoked_at INTEGER
    );

    CREATE TABLE owner_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT CHECK(purpose IN ('verify', 'reset')) NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      used_at INTEGER
    );
  `)

  db.prepare("INSERT INTO settings (key, value) VALUES ('session_cap_male', '26')").run()
  db.prepare("INSERT INTO settings (key, value) VALUES ('session_cap_female', '30')").run()
  db.prepare("INSERT INTO settings (key, value) VALUES ('scan_cooldown_seconds', '30')").run()
  db.prepare("INSERT INTO settings (key, value) VALUES ('access_hours_enabled', 'false')").run()
  db.prepare("INSERT INTO settings (key, value) VALUES ('warning_days_before_expiry', '3')").run()
  db.prepare("INSERT INTO settings (key, value) VALUES ('warning_sessions_remaining', '3')").run()

  return db
}
