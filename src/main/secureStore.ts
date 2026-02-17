import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs'
import { dirname, join } from 'path'

const STORE_FILE = join(app.getPath('userData'), 'secure-store.json')
const ALLOWED_KEYS = new Set(['session_token'])

type SecureStoreData = Record<string, string>

function loadStore(): SecureStoreData {
  if (!existsSync(STORE_FILE)) {
    return {}
  }

  try {
    const raw = readFileSync(STORE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as SecureStoreData
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveStore(store: SecureStoreData): void {
  const dir = dirname(STORE_FILE)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(STORE_FILE, JSON.stringify(store), { encoding: 'utf8', mode: 0o600 })
}

function ensureAllowedKey(key: string): void {
  if (!ALLOWED_KEYS.has(key)) {
    throw new Error('Invalid secure storage key')
  }
}

function requireEncryption(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage encryption is not available')
  }
}

export function getSecureItem(key: string): string | null {
  ensureAllowedKey(key)
  requireEncryption()

  const store = loadStore()
  const encrypted = store[key]
  if (!encrypted) {
    return null
  }

  const buffer = Buffer.from(encrypted, 'base64')
  return safeStorage.decryptString(buffer)
}

export function setSecureItem(key: string, value: string): void {
  ensureAllowedKey(key)
  requireEncryption()

  const store = loadStore()
  const encrypted = safeStorage.encryptString(value)
  store[key] = encrypted.toString('base64')
  saveStore(store)
}

export function deleteSecureItem(key: string): void {
  ensureAllowedKey(key)

  if (!existsSync(STORE_FILE)) {
    return
  }

  const store = loadStore()
  if (!(key in store)) {
    return
  }

  delete store[key]

  if (Object.keys(store).length === 0) {
    rmSync(STORE_FILE, { force: true })
    return
  }

  saveStore(store)
}
