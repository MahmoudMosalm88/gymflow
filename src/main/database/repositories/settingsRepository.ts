import { getDatabase } from '../connection'

export function getSetting<T>(key: string, defaultValue?: T): T {
  const db = getDatabase()
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined

  if (!result) {
    return defaultValue as T
  }

  try {
    return JSON.parse(result.value) as T
  } catch {
    return result.value as T
  }
}

export function setSetting(key: string, value: unknown): void {
  const db = getDatabase()
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)

  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  ).run(key, serialized)
}

export function setSettings(settings: Record<string, unknown>): void {
  const db = getDatabase()

  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const transaction = db.transaction((entries: Array<[string, unknown]>) => {
    for (const [key, value] of entries) {
      if (value === undefined) continue
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      if (serialized === undefined) {
        throw new Error(`Unable to serialize setting "${key}"`)
      }
      stmt.run(key, serialized)
    }
  })

  transaction(Object.entries(settings))
}

export function getAllSettings(): Record<string, unknown> {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string
    value: string
  }>

  const settings: Record<string, unknown> = {}

  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value)
    } catch {
      settings[row.key] = row.value
    }
  }

  return settings
}

export function deleteSetting(key: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}

export function resetToDefaults(): void {
  const db = getDatabase()

  const defaultSettings: Record<string, unknown> = {
    language: 'en',
    session_cap_male: 26,
    session_cap_female: 30,
    test_mode: false,
    access_hours_enabled: false,
    access_hours_male: [{ start: '06:00', end: '23:00' }],
    access_hours_female: [
      { start: '10:00', end: '14:00' },
      { start: '18:00', end: '22:00' }
    ],
    warning_days_before_expiry: 3,
    warning_sessions_remaining: 3,
    scan_cooldown_seconds: 30,
    whatsapp_enabled: false,
    whatsapp_batch_delay_min: 10,
    whatsapp_batch_delay_max: 15,
    whatsapp_template_welcome:
      'Welcome to GymFlow, {{name}}! Your QR code is attached.',
    whatsapp_template_renewal:
      'Hi {{name}}, your subscription expires in {{days}} days. Please renew soon!',
    whatsapp_template_low_sessions:
      'Hi {{name}}, you have only {{sessions}} sessions remaining this cycle.'
  }

  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')

  for (const [key, value] of Object.entries(defaultSettings)) {
    stmt.run(key, JSON.stringify(value))
  }
}
