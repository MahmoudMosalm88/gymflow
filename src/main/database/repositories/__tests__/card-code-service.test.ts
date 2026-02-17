import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDatabase } from './testDb'

let db: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => db
}))

import { setSetting, getSetting } from '../settingsRepository'
import { createMember } from '../memberRepository'
import { allocateCardCodes, getNextCardSerialPreview } from '../../../services/cardCodeService'

describe('Card code batch allocation', () => {
  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('allocates contiguous codes and increments next_card_serial', () => {
    setSetting('next_card_serial', 1)
    const batch = allocateCardCodes(3)
    expect(batch.from).toBe('00001')
    expect(batch.to).toBe('00003')
    expect(batch.codes).toEqual(['00001', '00002', '00003'])
    expect(getSetting<number>('next_card_serial')).toBe(4)
  })

  it('bumps next_card_serial beyond max existing member code', () => {
    createMember({
      name: 'Member',
      phone: '+201234567811',
      gender: 'male',
      card_code: '00010'
    })
    setSetting('next_card_serial', 1)
    const preview = getNextCardSerialPreview()
    expect(preview).toBe('00011')

    const batch = allocateCardCodes(2)
    expect(batch.from).toBe('00011')
    expect(batch.to).toBe('00012')
    expect(getSetting<number>('next_card_serial')).toBe(13)
  })
})
