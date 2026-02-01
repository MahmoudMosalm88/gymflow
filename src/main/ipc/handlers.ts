import { ipcMain, shell, dialog, app } from 'electron'
import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import * as QRCode from 'qrcode'

// Database repositories
import * as memberRepo from '../database/repositories/memberRepository'
import * as subscriptionRepo from '../database/repositories/subscriptionRepository'
import * as quotaRepo from '../database/repositories/quotaRepository'
import * as logRepo from '../database/repositories/logRepository'
import * as settingsRepo from '../database/repositories/settingsRepository'
import * as messageQueueRepo from '../database/repositories/messageQueueRepository'
import * as ownerRepo from '../database/repositories/ownerRepository'

// Services
import { checkAttendance } from '../services/attendance'
import { getDatabase, getUserDataPath, getPhotosPath, closeDatabase, initDatabase } from '../database/connection'
import { whatsappService } from '../services/whatsapp'
import { BrowserWindow } from 'electron'
import { compareSync, hashSync } from 'bcryptjs'
import { logToFile } from '../utils/logger'

let whatsappForwardersRegistered = false

function registerWhatsAppForwarders(): void {
  if (whatsappForwardersRegistered) return
  whatsappForwardersRegistered = true

  whatsappService.on('qr', (qr: string) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('whatsapp:qr', qr)
    })
  })

  whatsappService.on('status', (status) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('whatsapp:status', status)
    })
  })
}

function parseStartDate(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined

  const parseNumericDate = (num: number): number | undefined => {
    if (!Number.isFinite(num)) return undefined
    // Epoch milliseconds
    if (num > 1e12) return Math.floor(num / 1000)
    // Epoch seconds
    if (num > 1e9) return Math.floor(num)
    // Excel serial date (days since 1899-12-30)
    if (num > 20000) {
      const excelEpoch = Date.UTC(1899, 11, 30)
      return Math.floor((excelEpoch + num * 86400000) / 1000)
    }
    return undefined
  }

  if (typeof value === 'number') {
    return parseNumericDate(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return parseNumericDate(Number(trimmed))
    }
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      return Math.floor(parsed.getTime() / 1000)
    }
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    return Math.floor(value.getTime() / 1000)
  }

  return undefined
}

async function sendOtpMessage(
  phone: string,
  code: string,
  purpose: 'verify' | 'reset'
): Promise<{ sentVia: 'whatsapp' | 'manual'; code?: string }> {
  const status = whatsappService.getStatus()
  const message =
    purpose === 'verify'
      ? `Your GymFlow verification code is ${code}`
      : `Your GymFlow password reset code is ${code}`

  if (status.authenticated) {
    const result = await whatsappService.sendMessage(phone, message)
    if (result.success) {
      return { sentVia: 'whatsapp' }
    }
  }

  return { sentVia: 'manual', code }
}

function getImportTemplatePath(): string {
  // Packaged app: template is bundled via extraResources
  if (app.isPackaged) {
    const packagedPath = join(process.resourcesPath, 'Docs', 'spreadsheet.xlsx')
    if (existsSync(packagedPath)) return packagedPath
    const fallbackPath = join(process.resourcesPath, 'spreadsheet.xlsx')
    if (existsSync(fallbackPath)) return fallbackPath
  }

  // Dev: Docs folder is at repo root (one level above gymflow)
  const devPath = join(process.cwd(), '..', 'Docs', 'spreadsheet.xlsx')
  if (existsSync(devPath)) return devPath

  throw new Error('Template spreadsheet not found')
}

export function registerIpcHandlers(): void {
  registerWhatsAppForwarders()

  // ============== OWNER AUTH ==============
  ipcMain.handle('owner:getStatus', (_, token?: string) => {
    const hasOwner = ownerRepo.getOwnerCount() > 0
    const onboardingComplete = settingsRepo.getSetting<boolean>('onboarding_complete', false)
    let authenticated = false
    let owner: { id: number; phone: string } | null = null

    if (token) {
      const session = ownerRepo.getSessionByToken(token)
      if (session && !session.revoked_at) {
        const now = Math.floor(Date.now() / 1000)
        if (!session.expires_at || session.expires_at > now) {
          const dbOwner = ownerRepo.getOwnerById(session.owner_id)
          if (dbOwner && dbOwner.verified_at) {
            authenticated = true
            owner = { id: dbOwner.id, phone: dbOwner.phone }
          }
        }
      }
    }

    return { hasOwner, onboardingComplete, authenticated, owner }
  })

  ipcMain.handle('owner:register', async (_, phone: string, password: string) => {
    const existing = ownerRepo.getOwnerByPhone(phone)
    if (existing) {
      return { success: false, error: 'Owner already exists' }
    }

    const passwordHash = hashSync(password, 10)
    const owner = ownerRepo.createOwner(phone, passwordHash)

    const otp = ownerRepo.createOtp(owner.phone, 'verify')
    const sent = await sendOtpMessage(owner.phone, otp.code, 'verify')

    return { success: true, ownerId: owner.id, ...sent }
  })

  ipcMain.handle(
    'owner:verifyOtp',
    (_, phone: string, code: string, purpose: 'verify' | 'reset' = 'verify') => {
      const ok = ownerRepo.verifyOtp(phone, code, purpose)
      if (!ok) {
        return { success: false, error: 'Invalid or expired code' }
      }

      if (purpose === 'verify') {
        const owner = ownerRepo.getOwnerByPhone(phone)
        if (owner) {
          ownerRepo.markOwnerVerified(owner.id)
        }
      }

      return { success: true }
    }
  )

  ipcMain.handle('owner:login', (_, phone: string, password: string) => {
    const owner = ownerRepo.getOwnerByPhone(phone)
    if (!owner) {
      return { success: false, error: 'Owner not found' }
    }
    if (!owner.verified_at) {
      return { success: false, error: 'Account not verified' }
    }
    const valid = compareSync(password, owner.password_hash)
    if (!valid) {
      return { success: false, error: 'Invalid credentials' }
    }

    const session = ownerRepo.createSession(owner.id)
    ownerRepo.updateLastLogin(owner.id)
    return { success: true, token: session.token }
  })

  ipcMain.handle('owner:logout', (_, token: string) => {
    ownerRepo.revokeSession(token)
    return { success: true }
  })

  ipcMain.handle('owner:requestPasswordReset', async (_, phone: string) => {
    const owner = ownerRepo.getOwnerByPhone(phone)
    if (!owner) {
      return { success: false, error: 'Owner not found' }
    }

    const otp = ownerRepo.createOtp(owner.phone, 'reset')
    const sent = await sendOtpMessage(owner.phone, otp.code, 'reset')

    return { success: true, ...sent }
  })

  ipcMain.handle(
    'owner:resetPassword',
    (_, phone: string, code: string, newPassword: string) => {
      const ok = ownerRepo.verifyOtp(phone, code, 'reset')
      if (!ok) {
        return { success: false, error: 'Invalid or expired code' }
      }

      const owner = ownerRepo.getOwnerByPhone(phone)
      if (!owner) {
        return { success: false, error: 'Owner not found' }
      }

      const passwordHash = hashSync(newPassword, 10)
      ownerRepo.updateOwnerPassword(owner.id, passwordHash)
      return { success: true }
    }
  )

  ipcMain.handle('owner:completeOnboarding', (_, settings: Record<string, unknown>) => {
    settingsRepo.setSettings(settings)
    settingsRepo.setSetting('onboarding_complete', true)
    return { success: true }
  })

  // ============== MEMBERS ==============
  ipcMain.handle('members:getAll', () => {
    return memberRepo.getAllMembers()
  })

  ipcMain.handle('members:getById', (_, id: string) => {
    return memberRepo.getMemberById(id)
  })

  ipcMain.handle('members:create', (_, data: memberRepo.CreateMemberInput) => {
    return memberRepo.createMember(data)
  })

  ipcMain.handle('members:update', (_, id: string, data: memberRepo.UpdateMemberInput) => {
    return memberRepo.updateMember(id, data)
  })

  ipcMain.handle('members:delete', (_, id: string) => {
    memberRepo.deleteMember(id)
    return { success: true }
  })

  ipcMain.handle('members:search', (_, query: string) => {
    return memberRepo.searchMembers(query)
  })

  // ============== SUBSCRIPTIONS ==============
  ipcMain.handle('subscriptions:getByMemberId', (_, memberId: string) => {
    return subscriptionRepo.getSubscriptionsByMemberId(memberId)
  })

  ipcMain.handle('subscriptions:create', (_, data: subscriptionRepo.CreateSubscriptionInput) => {
    return subscriptionRepo.createSubscription(data)
  })

  ipcMain.handle(
    'subscriptions:renew',
    (_, memberId: string, data: { plan_months: 1 | 3 | 6 | 12; price_paid?: number }) => {
      return subscriptionRepo.renewSubscription(memberId, data.plan_months, data.price_paid)
    }
  )

  ipcMain.handle('subscriptions:cancel', (_, id: number) => {
    subscriptionRepo.cancelSubscription(id)
    return { success: true }
  })

  // ============== ATTENDANCE ==============
  ipcMain.handle(
    'attendance:check',
    (_, scannedValue: string, method: 'scan' | 'manual' = 'scan') => {
      return checkAttendance(scannedValue, method)
    }
  )

  ipcMain.handle('attendance:getTodayLogs', () => {
    return logRepo.getTodayLogs()
  })

  ipcMain.handle('attendance:getLogsByMember', (_, memberId: string) => {
    return logRepo.getLogsByMember(memberId)
  })

  ipcMain.handle('attendance:getTodayStats', () => {
    return logRepo.getTodayStats()
  })

  // ============== QUOTAS ==============
  ipcMain.handle('quotas:getCurrentByMember', (_, memberId: string) => {
    return quotaRepo.getCurrentQuota(memberId)
  })

  ipcMain.handle('quotas:getHistory', (_, memberId: string) => {
    return quotaRepo.getQuotaHistory(memberId)
  })

  // ============== SETTINGS ==============
  ipcMain.handle('settings:get', (_, key: string) => {
    return settingsRepo.getSetting(key)
  })

  ipcMain.handle('settings:getAll', () => {
    return settingsRepo.getAllSettings()
  })

  ipcMain.handle('settings:set', (_, key: string, value: unknown) => {
    settingsRepo.setSetting(key, value)
    return { success: true }
  })

  ipcMain.handle('settings:setAll', (_, settings: Record<string, unknown>) => {
    settingsRepo.setSettings(settings)
    return { success: true }
  })

  ipcMain.handle('settings:resetDefaults', () => {
    settingsRepo.resetToDefaults()
    return { success: true }
  })

  // ============== WHATSAPP ==============
  ipcMain.handle('whatsapp:getStatus', () => {
    return whatsappService.getStatus()
  })

  ipcMain.handle('whatsapp:connect', async () => {
    return whatsappService.connect()
  })

  ipcMain.handle('whatsapp:disconnect', async () => {
    await whatsappService.disconnect()
    return { success: true }
  })

  ipcMain.handle('whatsapp:sendMessage', (_, memberId: string, type: string) => {
    // Queue the message
    messageQueueRepo.createMessage({
      member_id: memberId,
      message_type: type as 'welcome' | 'renewal' | 'low_sessions'
    })
    return { success: true }
  })

  ipcMain.handle('whatsapp:sendImmediate', async (_, memberId: string) => {
    return whatsappService.sendWelcomeMessage(memberId)
  })

  ipcMain.handle('whatsapp:getQueueStatus', () => {
    return messageQueueRepo.getQueueStats()
  })

  ipcMain.handle('whatsapp:getQueueMessages', (_, limit: number = 50) => {
    return messageQueueRepo.getPendingMessages(limit)
  })

  ipcMain.handle('whatsapp:requeueFailed', () => {
    const count = messageQueueRepo.requeueFailedMessages()
    return { success: true, count }
  })

  // ============== IMPORT ==============
  ipcMain.handle('import:parseExcel', async (_, filePath: string) => {
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

      const valid: Array<{
        row: number
        name: string
        phone: string
        gender: 'male' | 'female'
        access_tier: 'A' | 'B'
        plan_months: 1 | 3 | 6 | 12
        start_date?: string
        price_paid?: number
      }> = []

      const invalid: Array<{ row: number; errors: string[] }> = []

      data.forEach((row, index) => {
        const rowNumber = index + 2 // Account for header row
        const errors: string[] = []

        // Validate required fields
        const name = String(row.name || row.Name || '').trim()
        const phone = String(row.phone || row.Phone || '').trim()
        const gender = String(row.gender || row.Gender || '').toLowerCase()
        const accessTier = String(row.access_tier || row.AccessTier || row['Access Tier'] || 'A')
          .toUpperCase()
        const planMonths = Number(row.plan_months || row.PlanMonths || row['Plan Months'] || 1)
        const startDate = row.start_date || row.StartDate || row['Start Date']
        const pricePaid = row.price_paid || row.PricePaid || row['Price Paid']

        if (!name) errors.push('Name is required')
        if (!phone) errors.push('Phone is required')
        if (!['male', 'female'].includes(gender)) errors.push('Gender must be male or female')
        if (!['A', 'B'].includes(accessTier)) errors.push('Access tier must be A or B')
        if (![1, 3, 6, 12].includes(planMonths)) errors.push('Plan months must be 1, 3, 6, or 12')

        if (errors.length > 0) {
          invalid.push({ row: rowNumber, errors })
        } else {
          valid.push({
            row: rowNumber,
            name,
            phone,
            gender: gender as 'male' | 'female',
            access_tier: accessTier as 'A' | 'B',
            plan_months: planMonths as 1 | 3 | 6 | 12,
            start_date: startDate ? String(startDate) : undefined,
            price_paid: pricePaid ? Number(pricePaid) : undefined
          })
        }
      })

      return { valid, invalid, total: data.length }
    } catch (error) {
      return { valid: [], invalid: [], total: 0, error: String(error) }
    }
  })

  ipcMain.handle(
    'import:execute',
    async (
      _,
      data: Array<{
        name: string
        phone: string
        gender: 'male' | 'female'
        access_tier: 'A' | 'B'
        plan_months: 1 | 3 | 6 | 12
        start_date?: string
        price_paid?: number
        send_welcome?: boolean
      }>
    ) => {
      let success = 0
      let failed = 0
      const errors: Array<{ row: number; error: string }> = []

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        try {
          // Check if phone already exists
          const normalizedPhone = memberRepo.normalizePhone(row.phone)
          const existing = memberRepo.getMemberByPhone(normalizedPhone)
          if (existing) {
            errors.push({ row: i + 1, error: 'Phone number already exists' })
            failed++
            continue
          }

          // Create member
          const member = memberRepo.createMember({
            name: row.name,
            phone: row.phone,
            gender: row.gender,
            access_tier: row.access_tier
          })

          // Parse start date
          const startTimestamp = parseStartDate(row.start_date)

          // Create subscription
          subscriptionRepo.createSubscription({
            member_id: member.id,
            plan_months: row.plan_months,
            price_paid: row.price_paid,
            start_date: startTimestamp
          })

          // Queue welcome message if requested
          if (row.send_welcome) {
            messageQueueRepo.createMessage({
              member_id: member.id,
              message_type: 'welcome'
            })
          }

          success++
        } catch (error) {
          errors.push({ row: i + 1, error: String(error) })
          failed++
        }
      }

      return { success, failed, errors }
    }
  )

  ipcMain.handle('import:selectFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Excel File',
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' }
    }

    return { success: true, path: result.filePaths[0] }
  })

  ipcMain.handle('import:getTemplate', () => {
    // Return template column headers
    return 'name,phone,gender,access_tier,plan_months,start_date,price_paid'
  })

  ipcMain.handle('import:downloadTemplate', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Save Import Template',
      defaultPath: 'gymflow-import-template.csv',
      filters: [{ name: 'CSV File', extensions: ['csv'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' }
    }

    try {
      const XLSX = await import('xlsx')
      const templatePath = getImportTemplatePath()
      const workbook = XLSX.readFile(templatePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(worksheet)

      const { writeFileSync } = await import('fs')
      writeFileSync(result.filePath, csv, 'utf8')
      return { success: true, path: result.filePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // ============== APP ==============
  ipcMain.handle('app:openDataFolder', () => {
    shell.openPath(getUserDataPath())
    return { success: true }
  })

  ipcMain.handle('app:logError', (_event, payload: { message?: string; stack?: string; source?: string }) => {
    logToFile('ERROR', payload?.message || 'Renderer error', payload)
    return { success: true }
  })

  ipcMain.handle('app:backup', async (_, destPath?: string) => {
    const userDataPath = getUserDataPath()
    const dbPath = join(userDataPath, 'gymflow.db')

    if (!destPath) {
      const result = await dialog.showSaveDialog({
        title: 'Backup Database',
        defaultPath: `gymflow-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Cancelled' }
      }
      destPath = result.filePath
    }

    try {
      const database = getDatabase()
      await database.backup(destPath)
      return { success: true, path: destPath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('app:restore', async (_, srcPath?: string) => {
    if (!srcPath) {
      const result = await dialog.showOpenDialog({
        title: 'Restore Database',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Cancelled' }
      }
      srcPath = result.filePaths[0]
    }

    const userDataPath = getUserDataPath()
    const dbPath = join(userDataPath, 'gymflow.db')

    try {
      // Create backup first
      const backupPath = join(userDataPath, `gymflow-pre-restore-${Date.now()}.db`)
      if (existsSync(dbPath)) {
        const database = getDatabase()
        await database.backup(backupPath)
      }

      // Close DB before restore
      closeDatabase()

      copyFileSync(srcPath, dbPath)

      // Re-init DB after restore
      initDatabase()

      return { success: true, backupPath }
    } catch (error) {
      // Ensure DB is initialized even if restore fails
      try {
        initDatabase()
      } catch {
        // ignore
      }
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('app:getVersion', () => {
    return '1.0.0'
  })

  // ============== QR CODE ==============
  ipcMain.handle('qrcode:generate', async (_, memberId: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(memberId, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      return { success: true, dataUrl }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // ============== PHOTOS ==============
  ipcMain.handle('photos:save', async (_, dataUrl: string, memberId: string) => {
    try {
      const photosPath = getPhotosPath()
      const fileName = `${memberId}.jpg`
      const filePath = join(photosPath, fileName)

      // Convert data URL to buffer and save
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      const { writeFileSync } = await import('fs')
      writeFileSync(filePath, buffer)

      return { success: true, path: filePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // ============== REPORTS ==============
  ipcMain.handle('reports:getDailyStats', (_, days: number = 30) => {
    return logRepo.getDailyAttendanceStats(days)
  })

  ipcMain.handle('reports:getHourlyDistribution', () => {
    return logRepo.getHourlyDistribution()
  })

  ipcMain.handle('reports:getTopMembers', (_, days: number = 30, limit: number = 10) => {
    return logRepo.getTopMembers(days, limit)
  })

  ipcMain.handle('reports:getDenialReasons', (_, days: number = 30) => {
    return logRepo.getDenialReasons(days)
  })

  ipcMain.handle('reports:getOverview', () => {
    const memberCount = memberRepo.getAllMembers().length
    const activeSubscriptions = subscriptionRepo.getActiveSubscriptionCount()
    const expiredSubscriptions = subscriptionRepo.getExpiredSubscriptionCount()
    const todayStats = logRepo.getTodayStats()
    const queueStats = messageQueueRepo.getQueueStats()

    return {
      memberCount,
      activeSubscriptions,
      expiredSubscriptions,
      todayStats,
      queueStats
    }
  })

  ipcMain.handle('reports:getExpiringSubscriptions', (_, days: number = 7) => {
    return subscriptionRepo.getExpiringSubscriptions(days)
  })

  ipcMain.handle('reports:getLowSessionMembers', (_, threshold: number = 3) => {
    return quotaRepo.getMembersWithLowSessions(threshold)
  })
}
