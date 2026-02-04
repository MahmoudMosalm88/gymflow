import { Client, LocalAuth } from 'whatsapp-web.js'
import { EventEmitter } from 'events'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'

export interface WhatsAppStatus {
  connected: boolean
  authenticated: boolean
  qrCode?: string | null
  error?: string | null
}

export class WhatsAppService extends EventEmitter {
  private client: Client | null = null
  private isReady: boolean = false
  private connectInFlight: Promise<{ success: boolean; error?: string }> | null = null
  private readonly authPath = join(app.getPath('userData'), 'wwebjs_auth')
  private status: WhatsAppStatus = {
    connected: false,
    authenticated: false,
    qrCode: null,
    error: null
  }

  constructor() {
    super()
    this.initialize()
  }

  private initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.authPath }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    })

    this.client.on('qr', (qr: string) => {
      console.log('WhatsApp QR Code received')
      this.status.qrCode = qr
      this.status.connected = true
      this.status.authenticated = false
      this.emit('qr', qr)
      this.emit('status', { ...this.status })
    })

    this.client.on('ready', () => {
      console.log('WhatsApp client is ready')
      this.isReady = true
      this.status.connected = true
      this.status.authenticated = true
      this.status.error = null
      this.emit('status', { ...this.status })
    })

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason)
      this.isReady = false
      this.status.connected = false
      this.status.authenticated = false
      this.status.error = String(reason || '')
      this.emit('status', { ...this.status })
    })

    this.client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failed:', msg)
      this.isReady = false
      this.status.connected = false
      this.status.authenticated = false
      this.status.error = msg
      this.emit('status', { ...this.status })
    })
  }

  private cleanupAuthLocks(): void {
    const sessionPath = join(this.authPath, 'session')
    const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie']
    for (const fileName of lockFiles) {
      const fullPath = join(sessionPath, fileName)
      if (existsSync(fullPath)) {
        try {
          rmSync(fullPath, { force: true })
        } catch {
          // ignore
        }
      }
    }
  }

  private async resetClient(): Promise<void> {
    if (this.client) {
      try {
        this.client.removeAllListeners()
        await this.client.destroy()
      } catch {
        // ignore
      }
      this.client = null
    }
    this.isReady = false
    this.status.connected = false
    this.status.authenticated = false
    this.status.qrCode = null
    this.initialize()
  }

  async connect(): Promise<{ success: boolean; error?: string }> {
    if (this.status.authenticated) {
      return { success: true }
    }

    if (this.connectInFlight) {
      return this.connectInFlight
    }

    this.connectInFlight = (async () => {
      const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WhatsApp connection timed out'))
          }, timeoutMs)
          promise
            .then((result) => {
              clearTimeout(timeout)
              resolve(result)
            })
            .catch((error) => {
              clearTimeout(timeout)
              reject(error)
            })
        })

      try {
        if (!this.client) {
          this.initialize()
        }
        await withTimeout(this.client!.initialize(), 30000)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        // Handle stale Chromium lock files from a previous crash.
        if (message.includes('already running') || message.includes('Singleton')) {
          try {
            this.cleanupAuthLocks()
            await this.resetClient()
            await withTimeout(this.client!.initialize(), 30000)
            this.status.error = null
            this.emit('status', { ...this.status })
            return { success: true }
          } catch (retryError) {
            const retryMessage =
              retryError instanceof Error ? retryError.message : String(retryError)
            this.status.error = retryMessage
            this.emit('status', { ...this.status })
            return { success: false, error: retryMessage }
          }
        }

        this.status.error = message
        this.emit('status', { ...this.status })
        return { success: false, error: message }
      } finally {
        this.connectInFlight = null
      }
    })()

    return this.connectInFlight
  }

  async disconnect(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.client) {
        await this.client.destroy()
        this.isReady = false
        this.client = null
      }
      this.status.connected = false
      this.status.authenticated = false
      this.status.qrCode = null
      this.emit('status', { ...this.status })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.status.error = message
      this.emit('status', { ...this.status })
      return { success: false, error: message }
    }
  }

  private formatPhoneForWhatsApp(phone: string): string {
    let cleaned = phone.replace(/[\s\-()]/g, '')

    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2)
    } else if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
      cleaned = '+20' + cleaned.substring(1)
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+20' + cleaned
    }

    const whatsappId = cleaned.replace('+', '') + '@c.us'
    return whatsappId
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready')
    }

    try {
      const whatsappId = this.formatPhoneForWhatsApp(phone)
      await this.client.sendMessage(whatsappId, message)
      return true
    } catch (error: any) {
      console.error('Failed to send WhatsApp message:', error)
      throw new Error(`Failed to send message: ${error.message}`)
    }
  }

  async sendImage(phone: string, imagePath: string, caption?: string): Promise<boolean> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready')
    }

    try {
      const MessageMedia = require('whatsapp-web.js').MessageMedia
      const whatsappId = this.formatPhoneForWhatsApp(phone)
      const media = MessageMedia.fromFilePath(imagePath)
      await this.client.sendMessage(whatsappId, media, { caption })
      return true
    } catch (error: any) {
      console.error('Failed to send WhatsApp image:', error)
      throw new Error(`Failed to send image: ${error.message}`)
    }
  }

  async isRegistered(phone: string): Promise<boolean> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client is not ready')
    }

    try {
      const whatsappId = this.formatPhoneForWhatsApp(phone)
      const numberId = whatsappId.replace('@c.us', '')
      const isRegistered = await this.client.isRegisteredUser(numberId)
      return isRegistered
    } catch (error: any) {
      console.error('Failed to check WhatsApp registration:', error)
      return false
    }
  }

  getStatus(): WhatsAppStatus {
    return { ...this.status }
  }

  async sendMembershipQR(phone: string, memberName: string, qrCodePath: string): Promise<boolean> {
    const message = `مرحباً ${memberName}!\n\nهذا هو رمز QR الخاص بعضويتك.\nيرجى إظهاره عند الدخول للنادي.`
    return await this.sendImage(phone, qrCodePath, message)
  }

  async sendRenewalReminder(
    phone: string,
    memberName: string,
    expiryDate: string
  ): Promise<boolean> {
    const message =
      `عزيزي/عزيزتي ${memberName},\n\n` +
      `تنتهي عضويتك في ${expiryDate}.\n` +
      `يرجى تجديد اشتراكك قريباً لتجنب انقطاع الخدمة.\n\n` +
      `شكراً لك!`

    return await this.sendMessage(phone, message)
  }

  async sendWelcomeMessage(phone: string, memberName: string, gymName: string): Promise<boolean> {
    const message =
      `مرحباً ${memberName}! 👋\n\n` +
      `نرحب بك في ${gymName}!\n` +
      `نتمنى لك تجربة رائعة معنا.\n\n` +
      `إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.`

    return await this.sendMessage(phone, message)
  }
}

export const whatsappService = new WhatsAppService()
