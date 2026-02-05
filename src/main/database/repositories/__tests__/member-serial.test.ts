import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase } from './testDb'

let db: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => db
}))

import { createMember, generateNextCardCode, getMemberByCardCode, updateMember } from '../memberRepository'

describe('Member serial generation', () => {
  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('generates GF-000001 when no members exist', () => {
    const next = generateNextCardCode()
    expect(next).toBe('GF-000001')
  })

  it('creates a member with an auto-generated serial when missing', () => {
    const member = createMember({
      name: 'Test Member',
      phone: '+201234567890',
      gender: 'male'
    })

    expect(member.card_code).toBe('GF-000001')
    const fetched = getMemberByCardCode('GF-000001')
    expect(fetched?.id).toBe(member.id)
  })

  it('increments serial based on max existing GF code', () => {
    createMember({
      name: 'Member One',
      phone: '+201234567891',
      gender: 'female',
      card_code: 'GF-000005'
    })

    const next = generateNextCardCode()
    expect(next).toBe('GF-000006')
  })

  it('rejects duplicate serial on update', () => {
    const memberA = createMember({
      name: 'Member A',
      phone: '+201234567892',
      gender: 'male',
      card_code: 'GF-000010'
    })
    const memberB = createMember({
      name: 'Member B',
      phone: '+201234567893',
      gender: 'female',
      card_code: 'GF-000011'
    })

    expect(() => updateMember(memberB.id, { card_code: memberA.card_code })).toThrow()
  })
})
