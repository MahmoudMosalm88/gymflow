import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../connection'

const CODE_PREFIX = 'GP-'
const CODE_PAD = 6

export interface GuestPass {
  id: string
  code: string
  name: string
  phone: string | null
  price_paid: number | null
  created_at: number
  expires_at: number
  used_at: number | null
}

export interface CreateGuestPassInput {
  name: string
  phone?: string | null
  price_paid?: number | null
  validity_days?: number
  code?: string
}

function formatCode(num: number): string {
  return `${CODE_PREFIX}${String(num).padStart(CODE_PAD, '0')}`
}

function getMaxGuestPassNumber(): number {
  const db = getDatabase()
  const result = db
    .prepare(
      `SELECT MAX(CAST(SUBSTR(code, ${CODE_PREFIX.length + 1}) AS INTEGER)) as max
       FROM guest_passes
       WHERE code LIKE ?`
    )
    .get(`${CODE_PREFIX}%`) as { max: number | null } | undefined

  return result?.max ? Number(result.max) : 0
}

export function generateNextGuestPassCode(): string {
  return formatCode(getMaxGuestPassNumber() + 1)
}

export function createGuestPass(input: CreateGuestPassInput): GuestPass {
  if (!input.name || !input.name.trim()) {
    throw new Error('Guest name is required')
  }

  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  const validityDays = Math.min(Math.max(input.validity_days || 1, 1), 7)
  const expiresAt = now + validityDays * 86400

  let code = input.code ? input.code.trim().toUpperCase() : generateNextGuestPassCode()
  if (!code) {
    code = generateNextGuestPassCode()
  }

  let existing = getGuestPassByCode(code)
  while (existing) {
    const match = /^GP-(\d+)$/.exec(code)
    const nextNumber = match ? Number(match[1]) + 1 : getMaxGuestPassNumber() + 1
    code = formatCode(nextNumber)
    existing = getGuestPassByCode(code)
  }

  const id = uuidv4()
  db.prepare(
    `INSERT INTO guest_passes (id, code, name, phone, price_paid, created_at, expires_at, used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    code,
    input.name.trim(),
    input.phone?.trim() || null,
    input.price_paid ?? null,
    now,
    expiresAt,
    null
  )

  return getGuestPassById(id)!
}

export function getGuestPassById(id: string): GuestPass | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM guest_passes WHERE id = ?').get(id)
  return (result as GuestPass) || null
}

export function getGuestPassByCode(code: string): GuestPass | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM guest_passes WHERE code = ?').get(code.trim())
  return (result as GuestPass) || null
}

export function listGuestPasses(limit = 50): GuestPass[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM guest_passes ORDER BY created_at DESC LIMIT ?')
    .all(limit) as GuestPass[]
}

export function markGuestPassUsed(code: string): GuestPass | null {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)
  db.prepare(
    `UPDATE guest_passes
     SET used_at = ?
     WHERE code = ? AND used_at IS NULL`
  ).run(now, code.trim())

  return getGuestPassByCode(code)
}
