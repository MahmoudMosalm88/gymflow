import { ElectronAPI } from '@electron-toolkit/preload'

interface MembersAPI {
  getAll: () => Promise<Member[]>
  getById: (id: string) => Promise<Member | null>
  create: (data: CreateMemberInput) => Promise<Member>
  update: (id: string, data: UpdateMemberInput) => Promise<Member>
  delete: (id: string) => Promise<void>
  search: (query: string) => Promise<Member[]>
}

interface SubscriptionsAPI {
  getByMemberId: (memberId: string) => Promise<Subscription[]>
  create: (data: CreateSubscriptionInput) => Promise<Subscription>
  renew: (memberId: string, data: RenewSubscriptionInput) => Promise<Subscription>
  cancel: (id: number) => Promise<void>
}

interface AttendanceAPI {
  check: (scannedValue: string, method?: 'scan' | 'manual') => Promise<AttendanceResult>
  getTodayLogs: () => Promise<Log[]>
  getLogsByMember: (memberId: string) => Promise<Log[]>
  getTodayStats: () => Promise<{ allowed: number; warning: number; denied: number }>
}

interface QuotasAPI {
  getCurrentByMember: (memberId: string) => Promise<Quota | null>
  getHistory: (memberId: string) => Promise<Quota[]>
}

interface SettingsAPI {
  get: (key: string) => Promise<unknown>
  getAll: () => Promise<Record<string, unknown>>
  set: (key: string, value: unknown) => Promise<void>
  setAll: (settings: Record<string, unknown>) => Promise<void>
  resetDefaults: () => Promise<void>
}

interface WhatsAppAPI {
  getStatus: () => Promise<WhatsAppStatus>
  connect: () => Promise<void>
  disconnect: () => Promise<{ success: boolean }>
  sendMessage: (memberId: string, type: string) => Promise<{ success: boolean }>
  sendImmediate: (memberId: string) => Promise<{ success: boolean; error?: string }>
  getQueueStatus: () => Promise<QueueStatus>
  getQueueMessages: (limit?: number) => Promise<unknown[]>
  requeueFailed: () => Promise<{ success: boolean; count: number }>
  onQRCode: (callback: (qr: string) => void) => () => void
  onStatusChange: (callback: (status: unknown) => void) => () => void
}

interface ImportAPI {
  selectFile: () => Promise<{ success: boolean; path?: string; error?: string }>
  parseExcel: (filePath: string) => Promise<ImportPreview>
  execute: (data: unknown[]) => Promise<ImportResult>
  getTemplate: () => Promise<string>
  downloadTemplate: () => Promise<{ success: boolean; path?: string; error?: string }>
}

interface AppAPI {
  openDataFolder: () => Promise<void>
  backup: (destPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>
  restore: (srcPath?: string) => Promise<{ success: boolean; backupPath?: string; error?: string }>
  getVersion: () => Promise<string>
  logError: (payload: { message?: string; stack?: string; source?: string }) => Promise<{ success: boolean }>
}

interface QRCodeAPI {
  generate: (memberId: string) => Promise<{ success: boolean; dataUrl?: string; error?: string }>
}

interface PhotosAPI {
  save: (dataUrl: string, memberId: string) => Promise<{ success: boolean; path?: string; error?: string }>
}

interface ReportsAPI {
  getDailyStats: (days?: number) => Promise<Array<{ date: string; allowed: number; warning: number; denied: number }>>
  getHourlyDistribution: () => Promise<Array<{ hour: number; count: number }>>
  getTopMembers: (days?: number, limit?: number) => Promise<Array<{ member_id: string; name: string; visits: number }>>
  getDenialReasons: (days?: number) => Promise<Array<{ reason_code: string; count: number }>>
  getOverview: () => Promise<{
    memberCount: number
    activeSubscriptions: number
    expiredSubscriptions: number
    todayStats: { allowed: number; warning: number; denied: number }
    queueStats: QueueStatus
  }>
  getExpiringSubscriptions: (days?: number) => Promise<Array<{
    member_id: string
    member_name: string
    end_date: number
    days_remaining: number
  }>>
  getLowSessionMembers: (threshold?: number) => Promise<Array<{
    member_id: string
    member_name: string
    sessions_remaining: number
    sessions_cap: number
  }>>
}

interface API {
  owner: OwnerAPI
  members: MembersAPI
  subscriptions: SubscriptionsAPI
  attendance: AttendanceAPI
  quotas: QuotasAPI
  settings: SettingsAPI
  whatsapp: WhatsAppAPI
  import: ImportAPI
  app: AppAPI
  qrcode: QRCodeAPI
  photos: PhotosAPI
  reports: ReportsAPI
}

interface OwnerStatus {
  hasOwner: boolean
  onboardingComplete: boolean
  authenticated: boolean
  owner?: { id: number; phone: string } | null
}

interface OwnerAPI {
  getStatus: (token?: string) => Promise<OwnerStatus>
  register: (phone: string, password: string) => Promise<{
    success: boolean
    ownerId?: number
    sentVia?: 'whatsapp' | 'manual'
    code?: string
    error?: string
  }>
  verifyOtp: (phone: string, code: string, purpose?: 'verify' | 'reset') => Promise<{
    success: boolean
    error?: string
  }>
  login: (phone: string, password: string) => Promise<{
    success: boolean
    token?: string
    error?: string
  }>
  logout: (token: string) => Promise<{ success: boolean }>
  requestPasswordReset: (phone: string) => Promise<{
    success: boolean
    sentVia?: 'whatsapp' | 'manual'
    code?: string
    error?: string
  }>
  resetPassword: (phone: string, code: string, newPassword: string) => Promise<{
    success: boolean
    error?: string
  }>
  completeOnboarding: (settings: Record<string, unknown>) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}

// Type definitions for domain objects
interface Member {
  id: string
  name: string
  phone: string
  gender: 'male' | 'female'
  photo_path: string | null
  access_tier: 'A' | 'B'
  created_at: number
  updated_at: number
}

interface Subscription {
  id: number
  member_id: string
  start_date: number
  end_date: number
  plan_months: 1 | 3 | 6 | 12
  price_paid: number | null
  is_active: number
  created_at: number
}

interface Quota {
  id: number
  member_id: string
  subscription_id: number
  cycle_start: number
  cycle_end: number
  sessions_used: number
  sessions_cap: number
}

interface Log {
  id: number
  member_id: string | null
  scanned_value: string
  method: 'scan' | 'manual'
  timestamp: number
  status: 'allowed' | 'denied' | 'warning'
  reason_code: string | null
}

interface AttendanceResult {
  status: 'allowed' | 'warning' | 'denied' | 'ignored'
  reason?: string
  member?: Member
  subscription?: Subscription
  quota?: Quota
  warnings?: string[]
}

interface WhatsAppStatus {
  connected: boolean
  authenticated: boolean
  qrCode?: string | null
  error?: string | null
}

interface QueueStatus {
  pending: number
  sent: number
  failed: number
}

interface ImportPreview {
  valid: unknown[]
  invalid: { row: number; errors: string[] }[]
  total: number
}

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

interface CreateMemberInput {
  name: string
  phone: string
  gender: 'male' | 'female'
  photo_path?: string
  access_tier?: 'A' | 'B'
}

interface UpdateMemberInput {
  name?: string
  phone?: string
  gender?: 'male' | 'female'
  photo_path?: string
  access_tier?: 'A' | 'B'
}

interface CreateSubscriptionInput {
  member_id: string
  plan_months: 1 | 3 | 6 | 12
  price_paid?: number
  start_date?: number
}

interface RenewSubscriptionInput {
  plan_months: 1 | 3 | 6 | 12
  price_paid?: number
}
