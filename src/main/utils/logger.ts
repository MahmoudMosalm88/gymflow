import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

type LogLevel = 'INFO' | 'WARN' | 'ERROR'

function safeStringify(value: unknown): string {
  try {
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function getLogFilePath(): string | null {
  if (!app.isReady()) return null
  const logDir = join(app.getPath('userData'), 'logs')
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  return join(logDir, 'gymflow.log')
}

export function logToFile(level: LogLevel, message: string, meta?: unknown): void {
  try {
    const logPath = getLogFilePath()
    if (!logPath) return
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] [${level}] ${message}${
      meta !== undefined ? ` | ${safeStringify(meta)}` : ''
    }\n`
    appendFileSync(logPath, line)
  } catch {
    // ignore logging failures
  }
}
