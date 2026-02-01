import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js'
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { EventEmitter } from 'events'
import { getMemberById } from '../database/repositories/memberRepository'
import { getActiveSubscription } from '../database/repositories/subscriptionRepository'
import { getCurrentQuota } from '../database/repositories/quotaRepository'
import { getSetting } from '../database/repositories/settingsRepository'
import {
  getPendingMessages,
  markAsSent,
  markAsFailed,
  QueuedMessage
} from '../database/repositories/messageQueueRepository'

export interface WhatsAppStatus {
  connected: boolean
  authenticated: boolean
  qrCode: string | null
  error: string | null
}

class WhatsAppService extends EventEmitter {
  private client: Client | null = null
  private status: WhatsAppStatus = {
    connected: false,
    authenticated: false,
    qrCode: null,
    error: null
  }
  private isProcessingQueue = false
  private queueInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
  }

  async initialize(): Promise<void> {
    if (this.client) {
      return
    }

    const dataPath = app.getPath('userData')
    const authPath = join(dataPath, 'whatsapp-auth')

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: authPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    })

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    if (!this.client) return

    this.client.on('qr', (qr: string) => {
      console.log('WhatsApp QR code received')
      this.status.qrCode = qr
      this.status.authenticated = false
      this.emit('qr', qr)
      this.emit('status', this.status)
    })

    this.client.on('ready', () => {
      console.log('WhatsApp client is ready')
      this.status.connected = true
      this.status.authenticated = true
      this.status.qrCode = null
      this.status.error = null
      this.emit('ready')
      this.emit('status', this.status)

      // Start queue processor
      this.startQueueProcessor()
    })

    this.client.on('authenticated', () => {
      console.log('WhatsApp authenticated')
      this.status.authenticated = true
      this.status.qrCode = null
      this.emit('authenticated')
      this.emit('status', this.status)
    })

    this.client.on('auth_failure', (message: string) => {
      console.error('WhatsApp auth failure:', message)
      this.status.authenticated = false
      this.status.error = message
      this.emit('auth_failure', message)
      this.emit('status', this.status)
    })

    this.client.on('disconnected', (reason: string) => {
      console.log('WhatsApp disconnected:', reason)
      this.status.connected = false
      this.status.authenticated = false
      this.emit('disconnected', reason)
      this.emit('status', this.status)

      // Stop queue processor
      this.stopQueueProcessor()
    })
  }

  async connect(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.client) {
        await this.initialize()
      }

      await this.client!.initialize()
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.status.error = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  async disconnect(): Promise<void> {
    this.stopQueueProcessor()

    if (this.client) {
      try {
        await this.client.destroy()
      } catch (error) {
        console.error('Error destroying WhatsApp client:', error)
      }
      this.client = null
    }

    this.status = {
      connected: false,
      authenticated: false,
      qrCode: null,
      error: null
    }

    this.emit('status', this.status)
  }

  getStatus(): WhatsAppStatus {
    return { ...this.status }
  }

  async sendMessage(
    phone: string,
    message: string,
    mediaBase64?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.client || !this.status.authenticated) {
      return { success: false, error: 'WhatsApp not connected' }
    }

    try {
      // Format phone number for WhatsApp (remove +, add @c.us)
      const formattedPhone = phone.replace(/\+/g, '') + '@c.us'

      if (mediaBase64) {
        const media = new MessageMedia('image/png', mediaBase64, 'qrcode.png')
        await this.client.sendMessage(formattedPhone, media, { caption: message })
      } else {
        await this.client.sendMessage(formattedPhone, message)
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  private startQueueProcessor(): void {
    if (this.queueInterval) return

    // Check queue every 30 seconds
    this.queueInterval = setInterval(() => {
      this.processQueue()
    }, 30000)

    // Process immediately on start
    this.processQueue()
  }

  private stopQueueProcessor(): void {
    if (this.queueInterval) {
      clearInterval(this.queueInterval)
      this.queueInterval = null
    }
    this.isProcessingQueue = false
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.status.authenticated) return

    const whatsappEnabled = getSetting<boolean>('whatsapp_enabled', false)
    if (!whatsappEnabled) return

    this.isProcessingQueue = true

    try {
      const messages = getPendingMessages(5)

      for (const msg of messages) {
        await this.processMessage(msg)

        // Random delay between messages (10-15 seconds default)
        const minDelay = getSetting<number>('whatsapp_batch_delay_min', 10) * 1000
        const maxDelay = getSetting<number>('whatsapp_batch_delay_max', 15) * 1000
        const delay = minDelay + Math.random() * (maxDelay - minDelay)

        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    } catch (error) {
      console.error('Error processing message queue:', error)
    } finally {
      this.isProcessingQueue = false
    }
  }

  private async processMessage(msg: QueuedMessage): Promise<void> {
    const member = getMemberById(msg.member_id)
    if (!member) {
      markAsFailed(msg.id, 'Member not found')
      return
    }

    try {
      const messageText = this.buildMessageText(msg, member)
      let mediaBase64: string | undefined

      // For welcome messages, include QR code
      if (msg.message_type === 'welcome') {
        const QRCode = await import('qrcode')
        const qrDataUrl = await QRCode.toDataURL(member.id, {
          width: 300,
          margin: 2
        })
        // Extract base64 from data URL
        mediaBase64 = qrDataUrl.replace(/^data:image\/\w+;base64,/, '')
      }

      const result = await this.sendMessage(member.phone, messageText, mediaBase64)

      if (result.success) {
        markAsSent(msg.id)
        this.emit('message_sent', { messageId: msg.id, memberId: member.id })
      } else {
        markAsFailed(msg.id, result.error || 'Unknown error')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      markAsFailed(msg.id, errorMessage)
    }
  }

  private buildMessageText(
    msg: QueuedMessage,
    member: { id: string; name: string; phone: string }
  ): string {
    let template: string

    switch (msg.message_type) {
      case 'welcome':
        template = getSetting<string>(
          'whatsapp_template_welcome',
          'Welcome to GymFlow, {{name}}! Your QR code is attached.'
        )
        break
      case 'renewal':
        template = getSetting<string>(
          'whatsapp_template_renewal',
          'Hi {{name}}, your subscription expires in {{days}} days. Please renew soon!'
        )
        break
      case 'low_sessions':
        template = getSetting<string>(
          'whatsapp_template_low_sessions',
          'Hi {{name}}, you have only {{sessions}} sessions remaining this cycle.'
        )
        break
      default:
        template = 'Hello {{name}}!'
    }

    // Replace placeholders
    let message = template.replace(/\{\{name\}\}/g, member.name)

    // Get additional data for placeholders
    if (msg.message_type === 'renewal') {
      const subscription = getActiveSubscription(member.id)
      if (subscription) {
        const now = Math.floor(Date.now() / 1000)
        const daysRemaining = Math.ceil((subscription.end_date - now) / 86400)
        message = message.replace(/\{\{days\}\}/g, String(daysRemaining))
      }
    }

    if (msg.message_type === 'low_sessions') {
      const quota = getCurrentQuota(member.id)
      if (quota) {
        const sessionsRemaining = quota.sessions_cap - quota.sessions_used
        message = message.replace(/\{\{sessions\}\}/g, String(sessionsRemaining))
      }
    }

    // Parse payload for additional replacements
    if (msg.payload_json) {
      try {
        const payload = JSON.parse(msg.payload_json)
        for (const [key, value] of Object.entries(payload)) {
          message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return message
  }

  // Manually trigger sending a message to a specific member
  async sendWelcomeMessage(
    memberId: string
  ): Promise<{ success: boolean; error?: string }> {
    const member = getMemberById(memberId)
    if (!member) {
      return { success: false, error: 'Member not found' }
    }

    const template = getSetting<string>(
      'whatsapp_template_welcome',
      'Welcome to GymFlow, {{name}}! Your QR code is attached.'
    )
    const message = template.replace(/\{\{name\}\}/g, member.name)

    // Generate QR code
    const QRCode = await import('qrcode')
    const qrDataUrl = await QRCode.toDataURL(memberId, { width: 300, margin: 2 })
    const mediaBase64 = qrDataUrl.replace(/^data:image\/\w+;base64,/, '')

    return this.sendMessage(member.phone, message, mediaBase64)
  }
}

// Singleton instance
export const whatsappService = new WhatsAppService()
