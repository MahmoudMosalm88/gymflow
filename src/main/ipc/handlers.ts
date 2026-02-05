import { ipcMain, shell, dialog, app, BrowserWindow } from 'electron'
import { copyFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync, rmSync } from 'fs'
import { join, resolve, relative, isAbsolute } from 'path'
import * as QRCode from 'qrcode'
import { compareSync, hashSync } from 'bcryptjs'

import * as memberRepo from '../database/repositories/memberRepository'
import * as subscriptionRepo from '../database/repositories/subscriptionRepository'
import * as quotaRepo from '../database/repositories/quotaRepository'
import * as logRepo from '../database/repositories/logRepository'
import * as settingsRepo from '../database/repositories/settingsRepository'
import * as messageQueueRepo from '../database/repositories/messageQueueRepository'
import * as ownerRepo from '../database/repositories/ownerRepository'
import * as guestPassRepo from '../database/repositories/guestPassRepository'
import * as freezeRepo from '../database/repositories/subscriptionFreezeRepository'
import * as incomeRepo from '../database/repositories/incomeRepository'

import { checkAttendance } from '../services/attendance'
import { getDatabase, getUserDataPath, getPhotosPath, closeDatabase, initDatabase } from '../database/connection'
import { whatsappService } from '../services/whatsapp'
import { logToFile } from '../utils/logger'
import { getSecureItem, setSecureItem, deleteSecureItem } from '../secureStore'

let whatsappForwardersRegistered = false

function registerWhatsAppForwarders(): void {
  if (whatsappForwardersRegistered) return
  whatsappForwardersRegistered = true

  whatsappService.on('qr', (qr: string) => {
    BrowserWindow.getAllWindows().forEach((win) => win.webContents.send('whatsapp:qr', qr))
  })

  whatsappService.on('status', (status) => {
    BrowserWindow.getAllWindows().forEach((win) =>
      win.webContents.send('whatsapp:status', status)
    )
  })
}

function parseStartDate(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined

  const parseNumericDate = (num: number): number | undefined => {
    if (!Number.isFinite(num)) return undefined
    if (num > 1e12) return Math.floor(num / 1000)
    if (num > 1e9) return Math.floor(num)
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
  purpose: 'verify' | 'reset',
  allowManualInProduction: boolean = false
): Promise<{ sentVia: 'whatsapp' | 'manual'; code?: string }> {
  const status = whatsappService.getStatus()
  const message =
    purpose === 'verify'
      ? `Your GymFlow verification code is ${code}`
      : `Your GymFlow password reset code is ${code}`

  if (status.authenticated) {
    try {
      const ok = await whatsappService.sendMessage(phone, message)
      if (ok) return { sentVia: 'whatsapp' }
    } catch {
      // ignore and fall back to manual
    }
  }

  // Only allow manual OTP in production during first-time onboarding.
  if (app.isPackaged && !allowManualInProduction) return { sentVia: 'manual' }

  return { sentVia: 'manual', code }
}

function getImportTemplatePath(): string {
  if (app.isPackaged) {
    const packagedPath = join(process.resourcesPath, 'Docs', 'spreadsheet.xlsx')
    if (existsSync(packagedPath)) return packagedPath
    const fallbackPath = join(process.resourcesPath, 'spreadsheet.xlsx')
    if (existsSync(fallbackPath)) return fallbackPath
  }

  const devPath = join(process.cwd(), '..', 'Docs', 'spreadsheet.xlsx')
  if (existsSync(devPath)) return devPath

  throw new Error('Template spreadsheet not found')
}

function ensurePathInBaseDir(baseDir: string, targetPath: string): void {
  const resolvedBase = resolve(baseDir)
  const resolvedTarget = resolve(targetPath)
  const relativePath = relative(resolvedBase, resolvedTarget)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Invalid photo path')
  }
}

function copyDirSync(source: string, destination: string): void {
  if (!existsSync(source)) return
  if (existsSync(destination)) {
    rmSync(destination, { recursive: true, force: true })
  }
  mkdirSync(destination, { recursive: true })

  const entries = readdirSync(source)
  for (const entry of entries) {
    const srcPath = join(source, entry)
    const destPath = join(destination, entry)
    const stat = statSync(srcPath)
    if (stat.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

export function registerIpcHandlers(): void {
  registerWhatsAppForwarders()

  // ============== OWNER AUTH ==============
  ipcMain.handle('owner:getStatus', (_event, token?: string) => {
    const hasOwner = ownerRepo.getOwnerCount() > 0
    const onboardingComplete = settingsRepo.getSetting<boolean>('onboarding_complete', false)

    if (!hasOwner) {
      return { hasOwner: false, onboardingComplete: false, authenticated: false }
    }

    if (!token) {
      return { hasOwner: true, onboardingComplete, authenticated: false }
    }

    const session = ownerRepo.getSessionByToken(token)
    if (!session || session.revoked_at) {
      return { hasOwner: true, onboardingComplete, authenticated: false }
    }

    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at <= now) {
      return { hasOwner: true, onboardingComplete, authenticated: false }
    }

    const owner = ownerRepo.getOwnerById(session.owner_id)
    return {
      hasOwner: true,
      onboardingComplete,
      authenticated: true,
      owner: owner ? { id: owner.id, phone: owner.phone } : null
    }
  })

  ipcMain.handle('owner:register', async (_event, phone: string, password: string, name?: string) => {
    const existing = ownerRepo.getOwnerByPhone(phone)
    if (existing) return { success: false, error: 'Owner already exists' }

    const hasOwner = ownerRepo.getOwnerCount() > 0
    const onboardingComplete = settingsRepo.getSetting<boolean>('onboarding_complete', false)
    const allowManualOtp = !hasOwner && !onboardingComplete

    const passwordHash = hashSync(password, 10)
    const owner = ownerRepo.createOwner(phone, passwordHash, name)
    const otp = ownerRepo.createOtp(phone, 'verify')
    const sent = await sendOtpMessage(phone, otp.code, 'verify', allowManualOtp)

    if (app.isPackaged && sent.sentVia !== 'whatsapp' && !allowManualOtp) {
      // Don't leave behind unverifiable accounts or OTPs in production if delivery failed.
      try {
        ownerRepo.deleteOtpById(otp.id)
      } catch {
        // ignore
      }
      try {
        ownerRepo.deleteOwnerById(owner.id)
      } catch {
        // ignore
      }
      return { success: false, error: 'WhatsApp not connected' }
    }

    return { success: true, ownerId: owner.id, ...sent }
  })

  ipcMain.handle('owner:verifyOtp', (_event, phone: string, code: string, purpose?: 'verify' | 'reset') => {
    const ok = ownerRepo.verifyOtp(phone, code, purpose || 'verify')
    if (!ok) return { success: false, error: 'Invalid or expired code' }

    if ((purpose || 'verify') === 'verify') {
      const owner = ownerRepo.getOwnerByPhone(phone)
      if (owner) ownerRepo.markOwnerVerified(owner.id)
    }

    return { success: true }
  })

  ipcMain.handle('owner:login', (_event, phone: string, password: string) => {
    const owner = ownerRepo.getOwnerByPhone(phone)
    if (!owner) return { success: false, error: 'Owner not found' }
    if (!owner.verified_at) return { success: false, error: 'Account not verified' }

    const ok = compareSync(password, owner.password_hash)
    if (!ok) return { success: false, error: 'Invalid credentials' }

    const session = ownerRepo.createSession(owner.id)
    ownerRepo.updateLastLogin(owner.id)
    return { success: true, token: session.token }
  })

  ipcMain.handle('owner:logout', (_event, token: string) => {
    ownerRepo.revokeSession(token)
    return { success: true }
  })

  // ============== SECURE STORE (RENDERER TOKEN) ==============
  ipcMain.handle('secureStore:get', (_event, key: string) => {
    try {
      return { success: true, value: getSecureItem(key) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('secureStore:set', (_event, key: string, value: string) => {
    try {
      setSecureItem(key, value)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('secureStore:delete', (_event, key: string) => {
    try {
      deleteSecureItem(key)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('owner:requestPasswordReset', async (_event, phone: string) => {
    const owner = ownerRepo.getOwnerByPhone(phone)
    if (!owner) return { success: false, error: 'Owner not found' }

    if (app.isPackaged && !whatsappService.getStatus().authenticated) {
      return { success: false, error: 'WhatsApp not connected' }
    }

    const otp = ownerRepo.createOtp(phone, 'reset')
    const sent = await sendOtpMessage(phone, otp.code, 'reset', false)

    if (app.isPackaged && sent.sentVia !== 'whatsapp') {
      try {
        ownerRepo.deleteOtpById(otp.id)
      } catch {
        // ignore
      }
      return { success: false, error: 'WhatsApp not connected' }
    }

    return { success: true, ...sent }
  })

  ipcMain.handle(
    'owner:resetPassword',
    (_event, phone: string, code: string, newPassword: string) => {
      const ok = ownerRepo.verifyOtp(phone, code, 'reset')
      if (!ok) return { success: false, error: 'Invalid or expired code' }

      const owner = ownerRepo.getOwnerByPhone(phone)
      if (!owner) return { success: false, error: 'Owner not found' }

      const passwordHash = hashSync(newPassword, 10)
      ownerRepo.updateOwnerPassword(owner.id, passwordHash)
      return { success: true }
    }
  )

  ipcMain.handle('owner:completeOnboarding', (_event, settings: Record<string, unknown>) => {
    settingsRepo.setSettings(settings)
    settingsRepo.setSetting('onboarding_complete', true)
    return { success: true }
  })

  // ============== MEMBERS ==============
  ipcMain.handle('members:getAll', () => memberRepo.getAllMembers())
  ipcMain.handle('members:getById', (_event, id: string) => memberRepo.getMemberById(id))
  ipcMain.handle('members:getNextSerial', () => memberRepo.generateNextCardCode())
  ipcMain.handle('members:create', (_event, data) => memberRepo.createMember(data))
  ipcMain.handle('members:update', (_event, id: string, data) => memberRepo.updateMember(id, data))
  ipcMain.handle('members:delete', (_event, id: string) => memberRepo.deleteMember(id))
  ipcMain.handle('members:search', (_event, query: string) => memberRepo.searchMembers(query))

  // ============== SUBSCRIPTIONS ==============
  ipcMain.handle('subscriptions:getByMemberId', (_event, memberId: string) =>
    subscriptionRepo.getSubscriptionsByMemberId(memberId)
  )
  ipcMain.handle('subscriptions:create', (_event, data) => {
    const sessionsPerMonth =
      data?.sessions_per_month !== undefined && Number.isFinite(Number(data.sessions_per_month))
        ? Number(data.sessions_per_month)
        : undefined
    return subscriptionRepo.createSubscription({
      ...data,
      sessions_per_month: sessionsPerMonth
    })
  })
  ipcMain.handle('subscriptions:renew', (_event, memberId: string, data) => {
    const sessionsPerMonth =
      data?.sessions_per_month !== undefined && Number.isFinite(Number(data.sessions_per_month))
        ? Number(data.sessions_per_month)
        : undefined
    return subscriptionRepo.renewSubscription(
      memberId,
      data.plan_months,
      data.price_paid,
      sessionsPerMonth
    )
  })
  ipcMain.handle('subscriptions:cancel', (_event, id: number) =>
    subscriptionRepo.cancelSubscription(id)
  )
  ipcMain.handle('subscriptions:updatePricePaid', (_event, id: number, pricePaid: number | null) =>
    subscriptionRepo.updateSubscriptionPricePaid(id, pricePaid)
  )
  ipcMain.handle('subscriptions:freeze', (_event, subscriptionId: number, days: number) =>
    freezeRepo.createSubscriptionFreeze(subscriptionId, days)
  )
  ipcMain.handle('subscriptions:getFreezes', (_event, subscriptionId: number) =>
    freezeRepo.getFreezesBySubscriptionId(subscriptionId)
  )

  // ============== ATTENDANCE ==============
  ipcMain.handle('attendance:check', (_event, scannedValue: string, method?: 'scan' | 'manual') =>
    checkAttendance(scannedValue, method || 'scan')
  )
  ipcMain.handle('attendance:getTodayLogs', () => logRepo.getTodayLogs())
  ipcMain.handle('attendance:getLogsByMember', (_event, memberId: string) =>
    logRepo.getLogsByMember(memberId)
  )
  ipcMain.handle('attendance:getTodayStats', () => logRepo.getTodayStats())

  // ============== QUOTAS ==============
  ipcMain.handle('quotas:getCurrentByMember', (_event, memberId: string) =>
    quotaRepo.getCurrentQuota(memberId)
  )
  ipcMain.handle('quotas:getHistory', (_event, memberId: string) =>
    quotaRepo.getQuotaHistory(memberId)
  )

  // ============== GUEST PASSES ==============
  ipcMain.handle('guestpasses:create', (_event, data) => guestPassRepo.createGuestPass(data))
  ipcMain.handle('guestpasses:list', (_event, limit?: number) =>
    guestPassRepo.listGuestPasses(limit || 50)
  )
  ipcMain.handle('guestpasses:getByCode', (_event, code: string) =>
    guestPassRepo.getGuestPassByCode(code)
  )
  ipcMain.handle('guestpasses:markUsed', (_event, code: string) =>
    guestPassRepo.markGuestPassUsed(code)
  )

  // ============== SETTINGS ==============
  ipcMain.handle('settings:get', (_event, key: string) => settingsRepo.getSetting(key))
  ipcMain.handle('settings:getAll', () => settingsRepo.getAllSettings())
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) =>
    settingsRepo.setSetting(key, value)
  )
  ipcMain.handle('settings:setAll', (_event, settings: Record<string, unknown>) =>
    settingsRepo.setSettings(settings)
  )
  ipcMain.handle('settings:resetDefaults', () => settingsRepo.resetToDefaults())

  // ============== WHATSAPP ==============
  ipcMain.handle('whatsapp:getStatus', () => whatsappService.getStatus())
  ipcMain.handle('whatsapp:connect', async () => whatsappService.connect())
  ipcMain.handle('whatsapp:disconnect', async () => whatsappService.disconnect())
  ipcMain.handle('whatsapp:getQueueStatus', () => messageQueueRepo.getQueueStats())
  ipcMain.handle('whatsapp:getQueueMessages', (_event, limit?: number) =>
    messageQueueRepo.getPendingMessages(limit)
  )
  ipcMain.handle('whatsapp:requeueFailed', () => {
    const count = messageQueueRepo.requeueFailedMessages()
    return { success: true, count }
  })

  ipcMain.handle('whatsapp:sendMessage', async (_event, memberId: string, type: string) => {
    try {
      const member = memberRepo.getMemberById(memberId)
      if (!member) return { success: false, error: 'Member not found' }

      if (type === 'welcome') {
        const template = settingsRepo.getSetting<string>(
          'whatsapp_template_welcome',
          'Welcome to GymFlow, {{name}}!'
        )
        const message = template.replace('{{name}}', member.name)
        await whatsappService.sendMessage(member.phone, message)
        return { success: true }
      }

      if (type === 'renewal') {
        const subscription = subscriptionRepo.getActiveSubscription(memberId)
        if (!subscription) return { success: false, error: 'No active subscription' }
        const now = Math.floor(Date.now() / 1000)
        const days = Math.max(0, Math.ceil((subscription.end_date - now) / 86400))
        const template = settingsRepo.getSetting<string>(
          'whatsapp_template_renewal',
          'Hi {{name}}, your subscription expires in {{days}} days.'
        )
        const message = template.replace('{{name}}', member.name).replace('{{days}}', String(days))
        await whatsappService.sendMessage(member.phone, message)
        return { success: true }
      }

      if (type === 'low_sessions') {
        const quota = quotaRepo.getCurrentQuota(memberId)
        if (!quota) return { success: false, error: 'No active quota' }
        const sessions = Math.max(0, quota.sessions_cap - quota.sessions_used)
        const template = settingsRepo.getSetting<string>(
          'whatsapp_template_low_sessions',
          'Hi {{name}}, you have only {{sessions}} sessions remaining.'
        )
        const message = template
          .replace('{{name}}', member.name)
          .replace('{{sessions}}', String(sessions))
        await whatsappService.sendMessage(member.phone, message)
        return { success: true }
      }

      return { success: false, error: 'Unknown message type' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('whatsapp:sendImmediate', async (_event, memberId: string) => {
    try {
      const member = memberRepo.getMemberById(memberId)
      if (!member) return { success: false, error: 'Member not found' }
      const message = settingsRepo.getSetting<string>(
        'whatsapp_template_welcome',
        'Welcome to GymFlow, {{name}}!'
      )
      await whatsappService.sendMessage(member.phone, message.replace('{{name}}', member.name))
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'whatsapp:sendQRCode',
    async (
      _event,
      memberId: string,
      memberName: string,
      qrDataUrl: string,
      code?: string
    ) => {
      try {
        const member = memberRepo.getMemberById(memberId)
        if (!member) return { success: false, error: 'Member not found' }

        const userDataPath = getUserDataPath()
        const tempDir = join(userDataPath, 'temp')
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true })
        }
        const filePath = join(tempDir, `${memberId}-qr.png`)
        const base64Data = qrDataUrl.replace(/^data:image\/\w+;base64,/, '')
        writeFileSync(filePath, Buffer.from(base64Data, 'base64'))

        const cardCode = (code && code.trim()) || member.card_code?.trim() || memberId
        const ok = await whatsappService.sendMembershipQR(member.phone, memberName, filePath, cardCode)
        return { success: ok }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }
  )

  // ============== IMPORT ==============
  ipcMain.handle('import:selectFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Import File',
      filters: [{ name: 'Excel or CSV', extensions: ['xlsx', 'xls', 'csv'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' }
    }

    return { success: true, path: result.filePaths[0] }
  })

  ipcMain.handle('import:parseExcel', async (_event, filePath: string) => {
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Array<
        Record<string, unknown>
      >

      const valid: Array<Record<string, unknown>> = []
      const invalid: Array<{ row: number; errors: string[] }> = []

      rows.forEach((row, index) => {
        const rowNumber = index + 2
        const getValue = (key: string) =>
          row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()]

        const name = (getValue('name') ?? getValue('Name') ?? getValue('Full_Name') ?? row['الاسم']) as string
        const phone = (getValue('phone') ?? getValue('Phone') ?? getValue('Phone_Number') ?? row['رقم الهاتف']) as string
        const genderRaw = (getValue('gender') ?? getValue('Gender')) as string
        const accessTierRaw = (getValue('access_tier') ?? getValue('Access_Tier')) as string
        const planMonthsRaw =
          getValue('plan_months') ?? getValue('Plan_Months') ?? getValue('Plan_Duration_Months')
        const sessionsPerMonthRaw = getValue('sessions_per_month') ?? getValue('Sessions_Per_Month')
        const startDateRaw = getValue('start_date') ?? getValue('Start_Date')
        const priceRaw = getValue('price_paid') ?? getValue('Price_Paid')
        const cardCodeRaw = getValue('card_code') ?? getValue('Card_Code') ?? row['رمز البطاقة']
        const addressRaw = getValue('address') ?? getValue('Address') ?? row['العنوان']

        const errors: string[] = []

        const gender = String(genderRaw || '').toLowerCase()
        const access_tier = String(accessTierRaw || 'A').toUpperCase()
        const plan_months = Number(planMonthsRaw)
        const sessions_per_month =
          sessionsPerMonthRaw !== undefined && sessionsPerMonthRaw !== null && String(sessionsPerMonthRaw).trim() !== ''
            ? Number(sessionsPerMonthRaw)
            : undefined
        const start_date = parseStartDate(startDateRaw)
        const price_paid =
          priceRaw !== undefined && priceRaw !== null && String(priceRaw).trim() !== ''
            ? Number(priceRaw)
            : undefined
        const card_code = cardCodeRaw ? String(cardCodeRaw).trim() : ''
        const address = addressRaw ? String(addressRaw).trim() : ''

        if (!name) errors.push('Name is required')
        if (!phone) errors.push('Phone is required')
        if (!['male', 'female'].includes(gender)) errors.push('Gender must be male or female')
        if (!['A', 'B'].includes(access_tier)) errors.push('Access tier must be A or B')
        if (![1, 3, 6, 12].includes(plan_months))
          errors.push('Plan months must be 1, 3, 6, or 12')
        if (
          sessions_per_month !== undefined &&
          (!Number.isFinite(sessions_per_month) || sessions_per_month < 1)
        ) {
          errors.push('Sessions per month must be a positive number')
        }

        if (errors.length > 0) {
          invalid.push({ row: rowNumber, errors })
          return
        }

        valid.push({
          row: rowNumber,
          name,
          phone,
          gender,
          access_tier,
          plan_months,
          sessions_per_month,
          start_date,
          price_paid,
          card_code,
          address
        })
      })

      return { valid, invalid, total: rows.length }
    } catch (error) {
      return { valid: [], invalid: [], total: 0, error: String(error) }
    }
  })

  ipcMain.handle('import:execute', async (_event, rows: Array<Record<string, unknown>>) => {
    const errors: Array<{ row: number; error: string }> = []
    let success = 0
    let failed = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const member = memberRepo.getMemberByPhone(String(row.phone))
        let memberId: string

        if (member) {
          const updated = memberRepo.updateMember(member.id, {
            name: row.name as string,
            phone: row.phone as string,
            gender: row.gender as 'male' | 'female',
            access_tier: (row.access_tier as 'A' | 'B') || 'A',
            card_code: (row.card_code as string) || undefined,
            address: (row.address as string) || undefined
          })
          memberId = updated.id
        } else {
          const created = memberRepo.createMember({
            name: row.name as string,
            phone: row.phone as string,
            gender: row.gender as 'male' | 'female',
            access_tier: (row.access_tier as 'A' | 'B') || 'A',
            card_code: (row.card_code as string) || undefined,
            address: (row.address as string) || undefined
          })
          memberId = created.id
        }

        subscriptionRepo.createSubscription({
          member_id: memberId,
          plan_months: row.plan_months as 1 | 3 | 6 | 12,
          price_paid: row.price_paid as number | undefined,
          start_date: row.start_date as number | undefined,
          sessions_per_month: row.sessions_per_month as number | undefined
        })

        success++
      } catch (error) {
        failed++
        errors.push({ row: i + 1, error: String(error) })
      }
    }

    return { success, failed, errors }
  })

  ipcMain.handle('import:getTemplate', () => {
    return getImportTemplatePath()
  })

  ipcMain.handle('import:downloadTemplate', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Save Import Template',
      defaultPath: 'members-template.csv',
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

  ipcMain.handle('app:openExternal', (_event, url: string) => {
    shell.openExternal(url)
    return { success: true }
  })

  ipcMain.handle('app:backup', async (_event, destPath?: string) => {
    const userDataPath = getUserDataPath()
    const dbPath = join(userDataPath, 'gymflow.db')
    const photosPath = getPhotosPath()

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
      // Backup photos to a sidecar folder
      const photosBackupPath = `${destPath}.photos`
      if (existsSync(photosPath)) {
        copyDirSync(photosPath, photosBackupPath)
      }
      return { success: true, path: destPath, photosPath: photosBackupPath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('app:restore', async (_event, srcPath?: string) => {
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
    const photosPath = getPhotosPath()

    try {
      const backupPath = join(userDataPath, `gymflow-pre-restore-${Date.now()}.db`)
      if (existsSync(dbPath)) {
        const database = getDatabase()
        await database.backup(backupPath)
      }

      closeDatabase()
      copyFileSync(srcPath, dbPath)
      initDatabase()

      const photosBackupPath = `${srcPath}.photos`
      if (existsSync(photosBackupPath)) {
        copyDirSync(photosBackupPath, photosPath)
      }

      return { success: true, backupPath }
    } catch (error) {
      try {
        initDatabase()
      } catch {
        // ignore
      }
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('app:logError', (_event, payload: { message?: string; stack?: string; source?: string }) => {
    logToFile('ERROR', payload?.message || 'Renderer error', payload)
    return { success: true }
  })

  // ============== QR CODE ==============
  ipcMain.handle('qrcode:generate', async (_event, memberId: string) => {
    try {
      const member = memberRepo.getMemberById(memberId)
      const qrValue = member?.card_code?.trim() || memberId
      const dataUrl = await QRCode.toDataURL(qrValue, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      })
      return { success: true, dataUrl, code: qrValue }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // ============== PHOTOS ==============
  ipcMain.handle('photos:save', async (_event, dataUrl: string, memberId: string) => {
    try {
      const photosPath = getPhotosPath()
      if (!existsSync(photosPath)) {
        mkdirSync(photosPath, { recursive: true })
      }
      const fileName = `${memberId}.jpg`
      const filePath = join(photosPath, fileName)
      ensurePathInBaseDir(photosPath, filePath)
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
      return { success: true, path: filePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // ============== REPORTS ==============
  ipcMain.handle('reports:getDailyStats', (_event, days: number = 30) =>
    logRepo.getDailyAttendanceStats(days)
  )
  ipcMain.handle('reports:getHourlyDistribution', () => logRepo.getHourlyDistribution())
  ipcMain.handle('reports:getTopMembers', (_event, days: number = 30, limit: number = 10) =>
    logRepo.getTopMembers(days, limit)
  )
  ipcMain.handle('reports:getDenialReasons', (_event, days: number = 30) =>
    logRepo.getDenialReasons(days)
  )
  ipcMain.handle('reports:getOverview', () => {
    const memberCount = memberRepo.getAllMembers().length
    const activeSubscriptions = subscriptionRepo.getActiveSubscriptionCount()
    const expiredSubscriptions = subscriptionRepo.getExpiredSubscriptionCount()
    const todayStats = logRepo.getTodayStats()
    const queueStats = messageQueueRepo.getQueueStats()
    return { memberCount, activeSubscriptions, expiredSubscriptions, todayStats, queueStats }
  })
  ipcMain.handle('reports:getExpiringSubscriptions', (_event, days: number = 7) =>
    subscriptionRepo.getExpiringSubscriptions(days)
  )
  ipcMain.handle('reports:getLowSessionMembers', (_event, threshold: number = 3) =>
    quotaRepo.getMembersWithLowSessions(threshold)
  )

  // ============== INCOME ==============
  ipcMain.handle('income:getSummary', () => incomeRepo.getIncomeSummary())
  ipcMain.handle('income:getRecent', (_event, limit?: number) =>
    incomeRepo.getRecentIncome(limit || 20)
  )
}
