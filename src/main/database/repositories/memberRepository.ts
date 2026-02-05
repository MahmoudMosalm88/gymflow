import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../connection'

const SERIAL_PREFIX = 'GF-'
const SERIAL_PAD = 6

export interface Member {
  id: string
  name: string
  phone: string
  gender: 'male' | 'female'
  photo_path: string | null
  access_tier: 'A' | 'B'
  card_code: string | null
  created_at: number
  updated_at: number
}

export interface CreateMemberInput {
  name: string
  phone: string
  gender: 'male' | 'female'
  access_tier?: 'A' | 'B'
  photo_path?: string | null
  card_code?: string | null
}

export interface UpdateMemberInput {
  name?: string
  phone?: string
  gender?: 'male' | 'female'
  access_tier?: 'A' | 'B'
  photo_path?: string | null
  card_code?: string | null
}

function formatSerial(num: number): string {
  return `${SERIAL_PREFIX}${String(num).padStart(SERIAL_PAD, '0')}`
}

export function getMaxSerialNumber(): number {
  const db = getDatabase()
  const result = db
    .prepare(
      `SELECT MAX(CAST(SUBSTR(card_code, ${SERIAL_PREFIX.length + 1}) AS INTEGER)) as max
       FROM members
       WHERE card_code LIKE ?`
    )
    .get(`${SERIAL_PREFIX}%`) as { max: number | null } | undefined

  return result?.max ? Number(result.max) : 0
}

export function generateNextCardCode(): string {
  const next = getMaxSerialNumber() + 1
  return formatSerial(next)
}

export function normalizePhone(phone: string): string {
  if (!phone) return ''
  let cleaned = phone.replace(/[\s\-()]/g, '')

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2)
  } else if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = '+20' + cleaned.substring(1)
    } else {
      cleaned = '+20' + cleaned
    }
  }

  return cleaned
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('+')) {
    return /^\+\d{8,15}$/.test(cleaned)
  }
  if (cleaned.startsWith('00')) {
    return /^00\d{8,17}$/.test(cleaned)
  }
  return /^\d{8,15}$/.test(cleaned)
}

export function createMember(input: CreateMemberInput): Member {
  if (!validatePhone(input.phone)) {
    throw new Error(`Invalid phone number: ${input.phone}`)
  }

  const db = getDatabase()
  const id = uuidv4()
  const now = Math.floor(Date.now() / 1000)
  const normalizedPhone = normalizePhone(input.phone)
  let cardCode = input.card_code ? input.card_code.trim() : null
  if (!cardCode) {
    cardCode = generateNextCardCode()
  }
  if (cardCode) {
    let existing = getMemberByCardCode(cardCode)
    // Handle rare collision by incrementing serial until unique.
    while (existing) {
      const match = /^GF-(\d+)$/.exec(cardCode)
      const nextNumber = match ? Number(match[1]) + 1 : getMaxSerialNumber() + 1
      cardCode = formatSerial(nextNumber)
      existing = getMemberByCardCode(cardCode)
    }
  }

  db.prepare(
    `INSERT INTO members (id, name, phone, gender, photo_path, access_tier, card_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    normalizedPhone,
    input.gender,
    input.photo_path || null,
    input.access_tier || 'A',
    cardCode || null,
    now,
    now
  )

  return getMemberById(id)!
}

export function getMemberById(id: string): Member | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM members WHERE id = ?').get(id)
  return (result as Member) || null
}

export function getMemberByPhone(phone: string): Member | null {
  const db = getDatabase()
  const normalized = normalizePhone(phone)
  const result = db.prepare('SELECT * FROM members WHERE phone = ?').get(normalized)
  return (result as Member) || null
}

export function getMemberByCardCode(cardCode: string): Member | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM members WHERE card_code = ?').get(cardCode)
  return (result as Member) || null
}

export function getAllMembers(): Member[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM members ORDER BY created_at DESC').all() as Member[]
}

export function searchMembers(query: string): Member[] {
  const db = getDatabase()
  const normalized = normalizePhone(query)
  const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&')
  const likeQuery = `%${escapeLike(query)}%`
  return db
    .prepare(
      `SELECT * FROM members
       WHERE name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR phone = ?
       ORDER BY name ASC`
    )
    .all(likeQuery, likeQuery, normalized) as Member[]
}

export function updateMember(id: string, input: UpdateMemberInput): Member {
  const db = getDatabase()
  const fields: string[] = []
  const values: unknown[] = []

  if (input.name !== undefined) {
    fields.push('name = ?')
    values.push(input.name)
  }
  if (input.phone !== undefined) {
    if (!validatePhone(input.phone)) {
      throw new Error(`Invalid phone number: ${input.phone}`)
    }
    fields.push('phone = ?')
    values.push(normalizePhone(input.phone))
  }
  if (input.gender !== undefined) {
    fields.push('gender = ?')
    values.push(input.gender)
  }
  if (input.access_tier !== undefined) {
    fields.push('access_tier = ?')
    values.push(input.access_tier)
  }
  if (input.photo_path !== undefined) {
    fields.push('photo_path = ?')
    values.push(input.photo_path)
  }
  if (input.card_code !== undefined) {
    const nextCardCode = input.card_code ? input.card_code.trim() : null
    if (nextCardCode) {
      const existing = getMemberByCardCode(nextCardCode)
      if (existing && existing.id !== id) {
        throw new Error(`Card code already in use: ${nextCardCode}`)
      }
    }
    fields.push('card_code = ?')
    values.push(nextCardCode)
  }

  fields.push('updated_at = ?')
  values.push(Math.floor(Date.now() / 1000))
  values.push(id)

  db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  return getMemberById(id)!
}

export function deleteMember(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM members WHERE id = ?').run(id)
}
