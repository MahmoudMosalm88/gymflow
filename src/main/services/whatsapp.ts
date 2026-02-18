import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { EventEmitter } from 'events'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, mkdirSync } from 'fs'
import pino from 'pino'

export interface WhatsAppStatus {
  connected: boolean
  authenticated: boolean
  qrCode?: string | null
  error?: string | null
}

export class WhatsAppService extends EventEmitter {
  private sock: WASocket | null = null
  private saveCreds: (() => Promise<void>) | null = null
  private isReady: boolean = false
  private intentionalDisconnect: boolean = false
  private connectInFlight: Promise<{ success: boolean; error?: string }> | null = null
  private readonly authPath = join(app.getPath('userData'), 'baileys_auth')
  private status: WhatsAppStatus = {
    connected: false,
    authenticated: false,
    qrCode: null,
    error: null
  }

  constructor() {
    super()
    mkdirSync(this.authPath, { recursive: true })
  }

  private async initSocket(): Promise<void> {
    // Tear down any existing socket cleanly (no logout — preserve creds)
    if (this.sock) {
      try {
        this.sock.end(new Error('cleanup'))
      } catch {
        // ignore
      }
      this.sock = null
      this.isReady = false
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.authPath)
    this.saveCreds = saveCreds

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['GymFlow', 'Chrome', '1.0.0']
    })
    this.sock = sock

    sock.ev.on('creds.update', () => this.saveCreds?.())

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this.status.qrCode = qr
        this.status.connected = true
        this.status.authenticated = false
        this.emit('qr', qr)
        this.emit('status', { ...this.status })
      }

      if (connection === 'open') {
        this.isReady = true
        this.status.connected = true
        this.status.authenticated = true
        this.status.qrCode = null
        this.status.error = null
        this.emit('status', { ...this.status })
      }

      if (connection === 'close') {
        this.isReady = false
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode
        const loggedOut = code === DisconnectReason.loggedOut

        this.status.connected = false
        this.status.authenticated = false
        this.status.qrCode = null
        this.status.error = loggedOut ? 'Logged out' : null
        this.emit('status', { ...this.status })

        if (!this.intentionalDisconnect && !loggedOut) {
          // Auto-reconnect after 3 s on unexpected drops
          setTimeout(() => this.initSocket().catch(() => {}), 3000)
        }
      }
    })
  }

  async connect(): Promise<{ success: boolean; error?: string }> {
    if (this.status.authenticated) return { success: true }
    if (this.connectInFlight) return this.connectInFlight

    this.intentionalDisconnect = false

    this.connectInFlight = (async () => {
      try {
        await this.initSocket()
        this.connectInFlight = null
        return { success: true }
      } catch (error) {
        this.connectInFlight = null
        const message = error instanceof Error ? error.message : String(error)
        this.status.error = message
        this.emit('status', { ...this.status })
        return { success: false, error: message }
      }
    })()

    return this.connectInFlight
  }

  async disconnect(): Promise<{ success: boolean; error?: string }> {
    this.intentionalDisconnect = true
    try {
      if (this.sock) {
        await this.sock.logout()
        this.sock = null
      }
      this.isReady = false
      this.status = { connected: false, authenticated: false, qrCode: null, error: null }
      this.emit('status', { ...this.status })
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.status.error = message
      this.emit('status', { ...this.status })
      return { success: false, error: message }
    }
  }

  // Soft close — preserves credentials for next launch (call on app quit)
  async cleanup(): Promise<void> {
    this.intentionalDisconnect = true
    try {
      if (this.sock) {
        this.sock.end(new Error('cleanup'))
        this.sock = null
      }
    } catch {
      // ignore
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

    // Baileys uses @s.whatsapp.net (not @c.us)
    return cleaned.replace('+', '') + '@s.whatsapp.net'
  }

  getStatus(): WhatsAppStatus {
    return { ...this.status }
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp client is not ready')
    }
    await this.sock.sendMessage(this.formatPhoneForWhatsApp(phone), { text: message })
    return true
  }

  async sendImage(phone: string, imagePath: string, caption?: string): Promise<boolean> {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp client is not ready')
    }
    await this.sock.sendMessage(this.formatPhoneForWhatsApp(phone), {
      image: readFileSync(imagePath),
      caption
    })
    return true
  }

  async isRegistered(phone: string): Promise<boolean> {
    if (!this.sock || !this.isReady) return false
    try {
      const results = await this.sock.onWhatsApp(phone.replace(/[\s\-()]/g, ''))
      return Boolean(results?.[0]?.exists)
    } catch {
      return false
    }
  }

  async sendMembershipQR(
    phone: string,
    memberName: string,
    qrCodePath: string,
    cardCode?: string
  ): Promise<boolean> {
    const codeLine = cardCode ? `\nرقم العضوية: ${cardCode}` : ''
    return this.sendImage(
      phone,
      qrCodePath,
      `مرحباً ${memberName}!\n\nهذا هو رمز QR الخاص بعضويتك.${codeLine}\nيرجى إظهاره عند الدخول للنادي.`
    )
  }

  async sendRenewalReminder(
    phone: string,
    memberName: string,
    expiryDate: string
  ): Promise<boolean> {
    return this.sendMessage(
      phone,
      `عزيزي/عزيزتي ${memberName},\n\nتنتهي عضويتك في ${expiryDate}.\nيرجى تجديد اشتراكك قريباً لتجنب انقطاع الخدمة.\n\nشكراً لك!`
    )
  }

  async sendWelcomeMessage(phone: string, memberName: string, gymName: string): Promise<boolean> {
    return this.sendMessage(
      phone,
      `مرحباً ${memberName}! 👋\n\nنرحب بك في ${gymName}!\nنتمنى لك تجربة رائعة معنا.\n\nإذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.`
    )
  }
}

export const whatsappService = new WhatsAppService()
