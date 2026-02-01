import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../connection'

export interface Member {
  id: string
  name: string
  phone: string
  gender: 'male' | 'female'
  photo_path: string | null
  access_tier: 'A' | 'B'
  created_at: number
  updated_at: number
}

export interface CreateMemberInput {
  name: string
  phone: string
  gender: 'male' | 'female'
  photo_path?: string
  access_tier?: 'A' | 'B'
}

export interface UpdateMemberInput {
  name?: string
  phone?: string
  gender?: 'male' | 'female'
  photo_path?: string | null
  access_tier?: 'A' | 'B'
}

export function getAllMembers(): Member[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM members ORDER BY created_at DESC').all() as Member[]
}

export function getMemberById(id: string): Member | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM members WHERE id = ?').get(id)
  return (result as Member) || null
}

export function getMemberByPhone(phone: string): Member | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone)
  return (result as Member) || null
}

export function searchMembers(query: string): Member[] {
  const db = getDatabase()
  const searchPattern = `%${query}%`
  return db
    .prepare(
      `SELECT * FROM members
       WHERE name LIKE ? OR phone LIKE ?
       ORDER BY name ASC
       LIMIT 50`
    )
    .all(searchPattern, searchPattern) as Member[]
}

export function createMember(input: CreateMemberInput): Member {
  const db = getDatabase()
  const id = uuidv4()
  const now = Math.floor(Date.now() / 1000)

  // Normalize phone number
  const normalizedPhone = normalizePhone(input.phone)

  db.prepare(
    `INSERT INTO members (id, name, phone, gender, photo_path, access_tier, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name.trim(),
    normalizedPhone,
    input.gender,
    input.photo_path || null,
    input.access_tier || 'A',
    now,
    now
  )

  return getMemberById(id)!
}

export function updateMember(id: string, input: UpdateMemberInput): Member {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const updates: string[] = ['updated_at = ?']
  const values: (string | number | null)[] = [now]

  if (input.name !== undefined) {
    updates.push('name = ?')
    values.push(input.name.trim())
  }

  if (input.phone !== undefined) {
    updates.push('phone = ?')
    values.push(normalizePhone(input.phone))
  }

  if (input.gender !== undefined) {
    updates.push('gender = ?')
    values.push(input.gender)
  }

  if (input.photo_path !== undefined) {
    updates.push('photo_path = ?')
    values.push(input.photo_path)
  }

  if (input.access_tier !== undefined) {
    updates.push('access_tier = ?')
    values.push(input.access_tier)
  }

  values.push(id)

  db.prepare(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  return getMemberById(id)!
}

export function deleteMember(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM members WHERE id = ?').run(id)
}

export function getMemberCount(): number {
  const db = getDatabase()
  const result = db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number }
  return result.count
}

// Phone normalization for Egyptian numbers
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Handle various formats
  if (normalized.startsWith('+')) {
    // Already has country code
    return normalized
  }

  if (normalized.startsWith('00')) {
    // Replace 00 with +
    return '+' + normalized.slice(2)
  }

  if (normalized.startsWith('20')) {
    // Has country code without +
    return '+' + normalized
  }

  if (normalized.startsWith('0')) {
    // Local format, add Egypt country code
    return '+2' + normalized
  }

  // Assume it's missing everything
  return '+20' + normalized
}
