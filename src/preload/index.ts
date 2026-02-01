import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  // Member operations
  members: {
    getAll: () => ipcRenderer.invoke('members:getAll'),
    getById: (id: string) => ipcRenderer.invoke('members:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('members:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('members:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('members:delete', id),
    search: (query: string) => ipcRenderer.invoke('members:search', query)
  },

  // Owner auth operations
  owner: {
    getStatus: (token?: string) => ipcRenderer.invoke('owner:getStatus', token),
    register: (phone: string, password: string) =>
      ipcRenderer.invoke('owner:register', phone, password),
    verifyOtp: (phone: string, code: string, purpose?: 'verify' | 'reset') =>
      ipcRenderer.invoke('owner:verifyOtp', phone, code, purpose),
    login: (phone: string, password: string) =>
      ipcRenderer.invoke('owner:login', phone, password),
    logout: (token: string) => ipcRenderer.invoke('owner:logout', token),
    requestPasswordReset: (phone: string) =>
      ipcRenderer.invoke('owner:requestPasswordReset', phone),
    resetPassword: (phone: string, code: string, newPassword: string) =>
      ipcRenderer.invoke('owner:resetPassword', phone, code, newPassword),
    completeOnboarding: (settings: Record<string, unknown>) =>
      ipcRenderer.invoke('owner:completeOnboarding', settings)
  },

  // Subscription operations
  subscriptions: {
    getByMemberId: (memberId: string) => ipcRenderer.invoke('subscriptions:getByMemberId', memberId),
    create: (data: unknown) => ipcRenderer.invoke('subscriptions:create', data),
    renew: (memberId: string, data: unknown) =>
      ipcRenderer.invoke('subscriptions:renew', memberId, data),
    cancel: (id: number) => ipcRenderer.invoke('subscriptions:cancel', id)
  },

  // Attendance operations
  attendance: {
    check: (scannedValue: string, method?: 'scan' | 'manual') =>
      ipcRenderer.invoke('attendance:check', scannedValue, method),
    getTodayLogs: () => ipcRenderer.invoke('attendance:getTodayLogs'),
    getLogsByMember: (memberId: string) =>
      ipcRenderer.invoke('attendance:getLogsByMember', memberId),
    getTodayStats: () => ipcRenderer.invoke('attendance:getTodayStats')
  },

  // Quota operations
  quotas: {
    getCurrentByMember: (memberId: string) =>
      ipcRenderer.invoke('quotas:getCurrentByMember', memberId),
    getHistory: (memberId: string) => ipcRenderer.invoke('quotas:getHistory', memberId)
  },

  // Settings operations
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    setAll: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:setAll', settings),
    resetDefaults: () => ipcRenderer.invoke('settings:resetDefaults')
  },

  // WhatsApp operations
  whatsapp: {
    getStatus: () => ipcRenderer.invoke('whatsapp:getStatus'),
    connect: () => ipcRenderer.invoke('whatsapp:connect'),
    disconnect: () => ipcRenderer.invoke('whatsapp:disconnect'),
    sendMessage: (memberId: string, type: string) =>
      ipcRenderer.invoke('whatsapp:sendMessage', memberId, type),
    sendImmediate: (memberId: string) => ipcRenderer.invoke('whatsapp:sendImmediate', memberId),
    getQueueStatus: () => ipcRenderer.invoke('whatsapp:getQueueStatus'),
    getQueueMessages: (limit?: number) => ipcRenderer.invoke('whatsapp:getQueueMessages', limit),
    requeueFailed: () => ipcRenderer.invoke('whatsapp:requeueFailed'),
    onQRCode: (callback: (qr: string) => void) => {
      const handler = (_: unknown, qr: string) => callback(qr)
      ipcRenderer.on('whatsapp:qr', handler)
      return () => ipcRenderer.removeListener('whatsapp:qr', handler)
    },
    onStatusChange: (callback: (status: unknown) => void) => {
      const handler = (_: unknown, status: unknown) => callback(status)
      ipcRenderer.on('whatsapp:status', handler)
      return () => ipcRenderer.removeListener('whatsapp:status', handler)
    }
  },

  // Import operations
  import: {
    selectFile: () => ipcRenderer.invoke('import:selectFile'),
    parseExcel: (filePath: string) => ipcRenderer.invoke('import:parseExcel', filePath),
    execute: (data: unknown[]) => ipcRenderer.invoke('import:execute', data),
    getTemplate: () => ipcRenderer.invoke('import:getTemplate'),
    downloadTemplate: () => ipcRenderer.invoke('import:downloadTemplate')
  },

  // App operations
  app: {
    openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
    backup: (destPath?: string) => ipcRenderer.invoke('app:backup', destPath),
    restore: (srcPath?: string) => ipcRenderer.invoke('app:restore', srcPath),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    logError: (payload: { message?: string; stack?: string; source?: string }) =>
      ipcRenderer.invoke('app:logError', payload)
  },

  // QR Code operations
  qrcode: {
    generate: (memberId: string) => ipcRenderer.invoke('qrcode:generate', memberId)
  },

  // Photo operations
  photos: {
    save: (dataUrl: string, memberId: string) =>
      ipcRenderer.invoke('photos:save', dataUrl, memberId)
  },

  // Reports operations
  reports: {
    getDailyStats: (days?: number) => ipcRenderer.invoke('reports:getDailyStats', days),
    getHourlyDistribution: () => ipcRenderer.invoke('reports:getHourlyDistribution'),
    getTopMembers: (days?: number, limit?: number) =>
      ipcRenderer.invoke('reports:getTopMembers', days, limit),
    getDenialReasons: (days?: number) => ipcRenderer.invoke('reports:getDenialReasons', days),
    getOverview: () => ipcRenderer.invoke('reports:getOverview'),
    getExpiringSubscriptions: (days?: number) =>
      ipcRenderer.invoke('reports:getExpiringSubscriptions', days),
    getLowSessionMembers: (threshold?: number) =>
      ipcRenderer.invoke('reports:getLowSessionMembers', threshold)
  }
}

// Expose to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}

// TypeScript declaration for the API
export type API = typeof api
