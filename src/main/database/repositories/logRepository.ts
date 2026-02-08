import { getDatabase } from '../connection'

export interface Log {
  id: number
  member_id: string | null
  scanned_value: string
  method: 'scan' | 'manual'
  timestamp: number
  status: 'allowed' | 'denied' | 'warning'
  reason_code: string | null
}

export interface CreateLogInput {
  member_id: string | null
  scanned_value: string
  method: 'scan' | 'manual'
  status: 'allowed' | 'denied' | 'warning'
  reason_code?: string
}

export function createLog(input: CreateLogInput): Log {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const result = db
    .prepare(
      `INSERT INTO logs (member_id, scanned_value, method, timestamp, status, reason_code)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.member_id,
      input.scanned_value,
      input.method,
      now,
      input.status,
      input.reason_code || null
    )

  return getLogById(result.lastInsertRowid as number)!
}

export function getLogById(id: number): Log | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM logs WHERE id = ?').get(id)
  return (result as Log) || null
}

export function getTodayLogs(): Log[] {
  const db = getDatabase()
  const startOfDay = getStartOfDay()

  return db
    .prepare('SELECT * FROM logs WHERE timestamp >= ? ORDER BY timestamp DESC')
    .all(startOfDay) as Log[]
}

export function getLogsByMember(memberId: string, limit = 100): Log[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM logs WHERE member_id = ? ORDER BY timestamp DESC LIMIT ?')
    .all(memberId, limit) as Log[]
}

export function getLastSuccessfulScan(scannedValue: string, withinSeconds: number): Log | null {
  const db = getDatabase()
  const cutoff = Math.floor(Date.now() / 1000) - withinSeconds

  const result = db
    .prepare(
      `SELECT * FROM logs
       WHERE scanned_value = ?
         AND timestamp >= ?
         AND status IN ('allowed', 'warning')
       ORDER BY timestamp DESC
       LIMIT 1`
    )
    .get(scannedValue, cutoff)

  return (result as Log) || null
}

export function hasSuccessfulCheckInToday(memberId: string): boolean {
  const db = getDatabase()
  const startOfDay = getStartOfDay()

  const result = db
    .prepare(
      `SELECT 1
       FROM logs
       WHERE member_id = ?
         AND timestamp >= ?
         AND status IN ('allowed', 'warning')
       LIMIT 1`
    )
    .get(memberId, startOfDay)

  return !!result
}

export function getTodayStats(): { allowed: number; warning: number; denied: number } {
  const db = getDatabase()
  const startOfDay = getStartOfDay()

  const result = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'allowed' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied
       FROM logs
       WHERE timestamp >= ?`
    )
    .get(startOfDay) as { allowed: number; warning: number; denied: number }

  return {
    allowed: result.allowed || 0,
    warning: result.warning || 0,
    denied: result.denied || 0
  }
}

export function getLogsByDateRange(
  startTimestamp: number,
  endTimestamp: number
): Log[] {
  const db = getDatabase()
  return db
    .prepare(
      'SELECT * FROM logs WHERE timestamp >= ? AND timestamp < ? ORDER BY timestamp DESC'
    )
    .all(startTimestamp, endTimestamp) as Log[]
}

export function getAttendanceByMemberInRange(
  memberId: string,
  startTimestamp: number,
  endTimestamp: number
): number {
  const db = getDatabase()
  const result = db
    .prepare(
      `SELECT COUNT(*) as count FROM logs
       WHERE member_id = ?
         AND timestamp >= ? AND timestamp < ?
         AND status IN ('allowed', 'warning')`
    )
    .get(memberId, startTimestamp, endTimestamp) as { count: number }

  return result.count
}

function getStartOfDay(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor(now.getTime() / 1000)
}

// Reports-specific queries
export function getDailyAttendanceStats(days: number): Array<{
  date: string
  allowed: number
  warning: number
  denied: number
}> {
  const db = getDatabase()
  const startTimestamp = Math.floor(Date.now() / 1000) - days * 86400

  return db
    .prepare(
      `SELECT
        date(timestamp, 'unixepoch', 'localtime') as date,
        SUM(CASE WHEN status = 'allowed' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied
       FROM logs
       WHERE timestamp >= ?
       GROUP BY date
       ORDER BY date ASC`
    )
    .all(startTimestamp) as Array<{
    date: string
    allowed: number
    warning: number
    denied: number
  }>
}

export function getHourlyDistribution(): Array<{ hour: number; count: number }> {
  const db = getDatabase()
  const startOfDay = getStartOfDay()

  return db
    .prepare(
      `SELECT
        CAST(strftime('%H', timestamp, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as count
       FROM logs
       WHERE timestamp >= ? AND status IN ('allowed', 'warning')
       GROUP BY hour
       ORDER BY hour ASC`
    )
    .all(startOfDay) as Array<{ hour: number; count: number }>
}

export function getTopMembers(days: number, limit: number): Array<{
  member_id: string
  name: string
  visits: number
}> {
  const db = getDatabase()
  const startTimestamp = Math.floor(Date.now() / 1000) - days * 86400

  return db
    .prepare(
      `SELECT
        l.member_id,
        m.name,
        COUNT(*) as visits
       FROM logs l
       JOIN members m ON l.member_id = m.id
       WHERE l.timestamp >= ?
         AND l.status IN ('allowed', 'warning')
         AND l.member_id IS NOT NULL
       GROUP BY l.member_id
       ORDER BY visits DESC
       LIMIT ?`
    )
    .all(startTimestamp, limit) as Array<{
    member_id: string
    name: string
    visits: number
  }>
}

export function getDenialReasons(days: number): Array<{
  reason_code: string
  count: number
}> {
  const db = getDatabase()
  const startTimestamp = Math.floor(Date.now() / 1000) - days * 86400

  return db
    .prepare(
      `SELECT
        reason_code,
        COUNT(*) as count
       FROM logs
       WHERE timestamp >= ?
         AND status = 'denied'
         AND reason_code IS NOT NULL
       GROUP BY reason_code
       ORDER BY count DESC`
    )
    .all(startTimestamp) as Array<{
    reason_code: string
    count: number
  }>
}
