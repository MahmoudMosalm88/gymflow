import { getDatabase } from '../connection'

const DEFAULT_SETTINGS = {
  language: 'en',
  session_cap_male: 26,
  session_cap_female: 30,
  warning_days_before_expiry: 3,
  warning_sessions_remaining: 3,
  scan_cooldown_seconds: 30,
  next_card_serial: 1,
  whatsapp_enabled: false,
  whatsapp_batch_delay_min: 10,
  whatsapp_batch_delay_max: 15,
  whatsapp_template_welcome: 'Welcome to GymFlow, {{name}}! Your QR code is attached.',
  whatsapp_template_renewal:
    'Hi {{name}}, your subscription expires in {{days}} days. Please renew soon!',
  whatsapp_template_low_sessions:
    'Hi {{name}}, you have only {{sessions}} sessions remaining this cycle.'
} as const

type DefaultSettings = typeof DEFAULT_SETTINGS

function validateSettingValue(
  key: string,
  value: unknown,
  fallback: unknown
): unknown {
  switch (key) {
    case 'language':
    case 'whatsapp_template_welcome':
    case 'whatsapp_template_renewal':
    case 'whatsapp_template_low_sessions':
      return typeof value === 'string' ? value : fallback
    case 'session_cap_male':
    case 'session_cap_female':
    case 'warning_days_before_expiry':
    case 'warning_sessions_remaining':
    case 'scan_cooldown_seconds':
    case 'next_card_serial':
    case 'whatsapp_batch_delay_min':
    case 'whatsapp_batch_delay_max':
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback
    case 'whatsapp_enabled':
      return typeof value === 'boolean' ? value : fallback
    default:
      return value
  }
}

export function getSetting<T>(key: string, defaultValue?: T): T {
  const db = getDatabase()
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined

  if (!result) {
    const fallback =
      defaultValue !== undefined
        ? defaultValue
        : (DEFAULT_SETTINGS as Record<string, unknown>)[key]
    return fallback as T
  }

  try {
    const parsed = JSON.parse(result.value) as T
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
      const fallback =
        defaultValue !== undefined
          ? defaultValue
          : (DEFAULT_SETTINGS as Record<string, unknown>)[key]
      return validateSettingValue(key, parsed, fallback) as T
    }
    return parsed
  } catch {
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
      const fallback =
        defaultValue !== undefined
          ? defaultValue
          : (DEFAULT_SETTINGS as Record<string, unknown>)[key]
      return validateSettingValue(key, result.value, fallback) as T
    }
    return result.value as T
  }
}

export function setSetting(key: string, value: unknown): void {
  const db = getDatabase()
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, serialized)
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

  const validated: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const [key, value] of Object.entries(settings)) {
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
      validated[key] = validateSettingValue(
        key,
        value,
        (DEFAULT_SETTINGS as Record<string, unknown>)[key]
      )
    } else {
      validated[key] = value
    }
  }

  return validated
}

export function deleteSetting(key: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}

export function resetToDefaults(): void {
  const db = getDatabase()

  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    stmt.run(key, JSON.stringify(value))
  }
}
