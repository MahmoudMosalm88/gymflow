import { randomBytes, randomInt } from 'crypto'
import { getDatabase } from '../connection'
import { normalizePhone } from './memberRepository'

export interface Owner {
  id: number
  phone: string
  name: string | null
  password_hash: string
  created_at: number
  verified_at: number | null
  last_login: number | null
}

export interface OwnerSession {
  id: number
  owner_id: number
  token: string
  created_at: number
  expires_at: number | null
  revoked_at: number | null
}

export interface OwnerOtp {
  id: number
  phone: string
  code: string
  purpose: 'verify' | 'reset'
  expires_at: number
  attempts: number
  created_at: number
  used_at: number | null
}

const OTP_TTL_SECONDS = 10 * 60
const OTP_REQUEST_WINDOW_SECONDS = 60
const OTP_REQUEST_LIMIT = 3
const OTP_MAX_ATTEMPTS = 5
const OTP_ATTEMPT_WINDOW_SECONDS = 15 * 60
const OTP_ATTEMPT_LIMIT = 3
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

export function getOwnerCount(): number {
  const db = getDatabase()
  const result = db.prepare('SELECT COUNT(*) as count FROM owners').get() as { count: number }
  return result.count
}

export function getOwnerByPhone(phone: string): Owner | null {
  const db = getDatabase()
  const normalized = normalizePhone(phone)
  const result = db.prepare('SELECT * FROM owners WHERE phone = ?').get(normalized)
  return (result as Owner) || null
}

export function getOwnerById(id: number): Owner | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM owners WHERE id = ?').get(id)
  return (result as Owner) || null
}

export function createOwner(phone: string, passwordHash: string, name?: string | null): Owner {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  const normalized = normalizePhone(phone)
  const normalizedName = name?.trim() || null

  const result = db
    .prepare(
      `INSERT INTO owners (phone, name, password_hash, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(normalized, normalizedName, passwordHash, now)

  return getOwnerById(result.lastInsertRowid as number)!
}

export function markOwnerVerified(ownerId: number): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  db.prepare('UPDATE owners SET verified_at = ? WHERE id = ?').run(now, ownerId)
}

export function updateOwnerPassword(ownerId: number, passwordHash: string): void {
  const db = getDatabase()
  db.prepare('UPDATE owners SET password_hash = ? WHERE id = ?').run(passwordHash, ownerId)
}

export function updateLastLogin(ownerId: number): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  db.prepare('UPDATE owners SET last_login = ? WHERE id = ?').run(now, ownerId)
}

export function createSession(ownerId: number): OwnerSession {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  const token = randomBytes(32).toString('hex')
  const expiresAt = now + SESSION_TTL_SECONDS

  const result = db
    .prepare(
      `INSERT INTO owner_sessions (owner_id, token, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(ownerId, token, now, expiresAt)

  return getSessionById(result.lastInsertRowid as number)!
}

export function getSessionByToken(token: string): OwnerSession | null {
  const db = getDatabase()
  const result = db
    .prepare('SELECT * FROM owner_sessions WHERE token = ?')
    .get(token)
  return (result as OwnerSession) || null
}

export function getSessionById(id: number): OwnerSession | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM owner_sessions WHERE id = ?').get(id)
  return (result as OwnerSession) || null
}

export function revokeSession(token: string): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  db.prepare('UPDATE owner_sessions SET revoked_at = ? WHERE token = ?').run(now, token)
}

export function deleteOwnerById(ownerId: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM owners WHERE id = ?').run(ownerId)
}

export function deleteOtpById(otpId: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM owner_otps WHERE id = ?').run(otpId)
}

export function createOtp(phone: string, purpose: 'verify' | 'reset'): OwnerOtp {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  const normalized = normalizePhone(phone)

  const recentCount = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM owner_otps
       WHERE phone = ? AND purpose = ? AND created_at > ?`
    )
    .get(normalized, purpose, now - OTP_REQUEST_WINDOW_SECONDS) as { count: number }

  if (recentCount.count >= OTP_REQUEST_LIMIT) {
    throw new Error('Too many OTP requests. Please wait before trying again.')
  }
  const code = String(randomInt(100000, 1000000))
  const expiresAt = now + OTP_TTL_SECONDS

  const result = db
    .prepare(
      `INSERT INTO owner_otps (phone, code, purpose, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
    )
    .run(normalized, code, purpose, expiresAt, now)

  return getOtpById(result.lastInsertRowid as number)!
}

export function getOtpById(id: number): OwnerOtp | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM owner_otps WHERE id = ?').get(id)
  return (result as OwnerOtp) || null
}

export function verifyOtp(phone: string, code: string, purpose: 'verify' | 'reset'): boolean {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  const normalized = normalizePhone(phone)

  const attemptCount = db
    .prepare(
      `SELECT COALESCE(SUM(attempts), 0) as count
       FROM owner_otps
       WHERE phone = ? AND created_at > ?`
    )
    .get(normalized, now - OTP_ATTEMPT_WINDOW_SECONDS) as { count: number }

  if (attemptCount.count >= OTP_ATTEMPT_LIMIT) {
    return false
  }

  const otp = db
    .prepare(
      `SELECT * FROM owner_otps
       WHERE phone = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(normalized, purpose, now) as OwnerOtp | undefined

  if (!otp) return false

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    db.prepare('UPDATE owner_otps SET used_at = ? WHERE id = ?').run(now, otp.id)
    return false
  }

  if (otp.code !== code) {
    const newAttempts = otp.attempts + 1
    db.prepare('UPDATE owner_otps SET attempts = ? WHERE id = ?').run(newAttempts, otp.id)
    if (newAttempts >= OTP_MAX_ATTEMPTS) {
      db.prepare('UPDATE owner_otps SET used_at = ? WHERE id = ?').run(now, otp.id)
    }
    return false
  }

  db.prepare('UPDATE owner_otps SET used_at = ? WHERE id = ?').run(now, otp.id)
  return true
}
