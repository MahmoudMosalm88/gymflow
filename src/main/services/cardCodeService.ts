import { getSetting, setSetting } from '../database/repositories/settingsRepository'
import { getMaxSerialNumber } from '../database/repositories/memberRepository'

const SERIAL_PREFIX = 'GF-'
const SERIAL_PAD = 6

function formatSerial(num: number): string {
  return `${SERIAL_PREFIX}${String(num).padStart(SERIAL_PAD, '0')}`
}

function resolveNextSerial(): number {
  const maxExisting = getMaxSerialNumber()
  let next = getSetting<number>('next_card_serial', 1)
  if (!Number.isFinite(next) || next < 1) {
    next = 1
  }
  if (next <= maxExisting) {
    next = maxExisting + 1
  }
  return next
}

export function getNextCardSerialPreview(): string {
  const next = resolveNextSerial()
  return formatSerial(next)
}

export function allocateCardCodes(count: number): {
  codes: string[]
  from: string
  to: string
  startNumber: number
  endNumber: number
} {
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error('Count must be a positive number')
  }

  const startNumber = resolveNextSerial()
  const endNumber = startNumber + count - 1
  const codes = Array.from({ length: count }, (_, index) =>
    formatSerial(startNumber + index)
  )

  setSetting('next_card_serial', endNumber + 1)

  return {
    codes,
    from: formatSerial(startNumber),
    to: formatSerial(endNumber),
    startNumber,
    endNumber
  }
}
