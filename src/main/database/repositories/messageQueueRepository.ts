import { getDatabase } from '../connection'

export interface QueuedMessage {
  id: number
  member_id: string
  message_type: 'welcome' | 'renewal' | 'low_sessions'
  payload_json: string | null
  scheduled_at: number
  sent_at: number | null
  status: 'pending' | 'sent' | 'failed'
  attempts: number
  max_attempts: number
  last_attempt_at: number | null
  last_error: string | null
}

export interface CreateMessageInput {
  member_id: string
  message_type: 'welcome' | 'renewal' | 'low_sessions'
  payload?: Record<string, unknown>
  scheduled_at?: number // Defaults to now
}

export function createMessage(input: CreateMessageInput): QueuedMessage {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const result = db
    .prepare(
      `INSERT INTO message_queue (member_id, message_type, payload_json, scheduled_at, status)
       VALUES (?, ?, ?, ?, 'pending')`
    )
    .run(
      input.member_id,
      input.message_type,
      input.payload ? JSON.stringify(input.payload) : null,
      input.scheduled_at || now
    )

  return getMessageById(result.lastInsertRowid as number)!
}

export function getMessageById(id: number): QueuedMessage | null {
  const db = getDatabase()
  const result = db.prepare('SELECT * FROM message_queue WHERE id = ?').get(id)
  return (result as QueuedMessage) || null
}

export function getPendingMessages(limit = 10): QueuedMessage[] {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  return db
    .prepare(
      `SELECT * FROM message_queue
       WHERE status = 'pending'
         AND scheduled_at <= ?
         AND attempts < max_attempts
       ORDER BY scheduled_at ASC
       LIMIT ?`
    )
    .all(now, limit) as QueuedMessage[]
}

export function markAsSent(id: number): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  db.prepare(
    `UPDATE message_queue
     SET status = 'sent', sent_at = ?, last_attempt_at = ?, attempts = attempts + 1
     WHERE id = ?`
  ).run(now, now, id)
}

export function markAsFailed(id: number, error: string): void {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const message = getMessageById(id)
  if (!message) return

  const newStatus = message.attempts + 1 >= message.max_attempts ? 'failed' : 'pending'

  db.prepare(
    `UPDATE message_queue
     SET status = ?, last_attempt_at = ?, attempts = attempts + 1, last_error = ?
     WHERE id = ?`
  ).run(newStatus, now, error, id)
}

export function getQueueStats(): { pending: number; sent: number; failed: number } {
  const db = getDatabase()

  const result = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM message_queue`
    )
    .get() as { pending: number; sent: number; failed: number }

  return {
    pending: result.pending || 0,
    sent: result.sent || 0,
    failed: result.failed || 0
  }
}

export function getMessagesByMember(memberId: string): QueuedMessage[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM message_queue WHERE member_id = ? ORDER BY scheduled_at DESC')
    .all(memberId) as QueuedMessage[]
}

export function deleteOldMessages(daysOld: number): number {
  const db = getDatabase()
  const cutoff = Math.floor(Date.now() / 1000) - daysOld * 86400

  const result = db
    .prepare("DELETE FROM message_queue WHERE status = 'sent' AND sent_at < ?")
    .run(cutoff)

  return result.changes
}

export function hasRecentRenewalReminder(memberId: string, withinDays = 3): boolean {
  const db = getDatabase()
  const cutoff = Math.floor(Date.now() / 1000) - withinDays * 86400
  const row = db
    .prepare(
      `SELECT id FROM message_queue
        WHERE member_id = ?
          AND message_type = 'renewal'
          AND scheduled_at > ?
          AND status IN ('pending', 'sent')`
    )
    .get(memberId, cutoff)
  return !!row
}

export function requeueFailedMessages(): number {
  const db = getDatabase()

  const result = db
    .prepare(
      `UPDATE message_queue
       SET status = 'pending', attempts = 0, last_error = NULL
       WHERE status = 'failed'`
    )
    .run()

  return result.changes
}
