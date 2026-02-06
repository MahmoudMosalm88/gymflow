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
    expect(next).toBe('00001')
  })

  it('requires a card code when creating a member', () => {
    expect(() =>
      createMember({
        name: 'Test Member',
        phone: '+201234567890',
        gender: 'male'
      })
    ).toThrow('Card code is required')
  })

  it('increments serial based on max existing GF code', () => {
    createMember({
      name: 'Member One',
      phone: '+201234567891',
      gender: 'female',
      card_code: '00005'
    })

    const next = generateNextCardCode()
    expect(next).toBe('00006')
  })

  it('creates a member when a card code is provided', () => {
    const member = createMember({
      name: 'Member With Card',
      phone: '+201234567899',
      gender: 'male',
      card_code: '00020'
    })

    expect(member.card_code).toBe('00020')
    const fetched = getMemberByCardCode('00020')
    expect(fetched?.id).toBe(member.id)
  })

  it('rejects duplicate serial on update', () => {
    const memberA = createMember({
      name: 'Member A',
      phone: '+201234567892',
      gender: 'male',
      card_code: '00010'
    })
    const memberB = createMember({
      name: 'Member B',
      phone: '+201234567893',
      gender: 'female',
      card_code: '00011'
    })

    expect(() => updateMember(memberB.id, { card_code: memberA.card_code })).toThrow()
  })
})
