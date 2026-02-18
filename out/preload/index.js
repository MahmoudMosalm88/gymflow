"use strict";
const electron = require("electron");
const api = {
  // Member operations
  members: {
    getAll: () => electron.ipcRenderer.invoke("members:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("members:getById", id),
    getNextSerial: () => electron.ipcRenderer.invoke("members:getNextSerial"),
    create: (data) => electron.ipcRenderer.invoke("members:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("members:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("members:delete", id),
    search: (query) => electron.ipcRenderer.invoke("members:search", query)
  },
  // Card batch operations
  cards: {
    getNextPreview: () => electron.ipcRenderer.invoke("cards:getNextPreview"),
    generateBatch: (data) => electron.ipcRenderer.invoke("cards:generateBatch", data)
  },
  // Owner auth operations
  owner: {
    getStatus: (token) => electron.ipcRenderer.invoke("owner:getStatus", token),
    register: (phone, password) => electron.ipcRenderer.invoke("owner:register", phone, password),
    registerWithName: (phone, password, name) => electron.ipcRenderer.invoke("owner:register", phone, password, name),
    verifyOtp: (phone, code, purpose) => electron.ipcRenderer.invoke("owner:verifyOtp", phone, code, purpose),
    login: (phone, password) => electron.ipcRenderer.invoke("owner:login", phone, password),
    logout: (token) => electron.ipcRenderer.invoke("owner:logout", token),
    requestPasswordReset: (phone) => electron.ipcRenderer.invoke("owner:requestPasswordReset", phone),
    resetPassword: (phone, code, newPassword) => electron.ipcRenderer.invoke("owner:resetPassword", phone, code, newPassword),
    completeOnboarding: (settings) => electron.ipcRenderer.invoke("owner:completeOnboarding", settings),
    changePassword: (token, currentPassword, newPassword) => electron.ipcRenderer.invoke("owner:changePassword", token, currentPassword, newPassword)
  },
  // Secure storage (for auth token etc.)
  secureStore: {
    get: (key) => electron.ipcRenderer.invoke("secureStore:get", key),
    set: (key, value) => electron.ipcRenderer.invoke("secureStore:set", key, value),
    delete: (key) => electron.ipcRenderer.invoke("secureStore:delete", key)
  },
  // Subscription operations
  subscriptions: {
    getByMemberId: (memberId) => electron.ipcRenderer.invoke("subscriptions:getByMemberId", memberId),
    create: (data) => electron.ipcRenderer.invoke("subscriptions:create", data),
    renew: (memberId, data) => electron.ipcRenderer.invoke("subscriptions:renew", memberId, data),
    cancel: (id) => electron.ipcRenderer.invoke("subscriptions:cancel", id),
    updatePricePaid: (id, pricePaid) => electron.ipcRenderer.invoke("subscriptions:updatePricePaid", id, pricePaid),
    freeze: (subscriptionId, days) => electron.ipcRenderer.invoke("subscriptions:freeze", subscriptionId, days),
    getFreezes: (subscriptionId) => electron.ipcRenderer.invoke("subscriptions:getFreezes", subscriptionId)
  },
  // Attendance operations
  attendance: {
    check: (scannedValue, method) => electron.ipcRenderer.invoke("attendance:check", scannedValue, method),
    getTodayLogs: () => electron.ipcRenderer.invoke("attendance:getTodayLogs"),
    getLogsByMember: (memberId) => electron.ipcRenderer.invoke("attendance:getLogsByMember", memberId),
    getTodayStats: () => electron.ipcRenderer.invoke("attendance:getTodayStats")
  },
  // Quota operations
  quotas: {
    getCurrentByMember: (memberId) => electron.ipcRenderer.invoke("quotas:getCurrentByMember", memberId),
    getHistory: (memberId) => electron.ipcRenderer.invoke("quotas:getHistory", memberId)
  },
  // Guest pass operations
  guestpasses: {
    create: (data) => electron.ipcRenderer.invoke("guestpasses:create", data),
    list: (limit) => electron.ipcRenderer.invoke("guestpasses:list", limit),
    getByCode: (code) => electron.ipcRenderer.invoke("guestpasses:getByCode", code),
    markUsed: (code) => electron.ipcRenderer.invoke("guestpasses:markUsed", code)
  },
  // Settings operations
  settings: {
    get: (key) => electron.ipcRenderer.invoke("settings:get", key),
    getAll: () => electron.ipcRenderer.invoke("settings:getAll"),
    set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
    setAll: (settings) => electron.ipcRenderer.invoke("settings:setAll", settings),
    resetDefaults: () => electron.ipcRenderer.invoke("settings:resetDefaults")
  },
  // WhatsApp operations
  whatsapp: {
    getStatus: () => electron.ipcRenderer.invoke("whatsapp:getStatus"),
    connect: () => electron.ipcRenderer.invoke("whatsapp:connect"),
    disconnect: () => electron.ipcRenderer.invoke("whatsapp:disconnect"),
    sendMessage: (memberId, type) => electron.ipcRenderer.invoke("whatsapp:sendMessage", memberId, type),
    sendQRCode: (memberId, memberName, qrDataUrl, code) => electron.ipcRenderer.invoke("whatsapp:sendQRCode", memberId, memberName, qrDataUrl, code),
    sendImmediate: (memberId) => electron.ipcRenderer.invoke("whatsapp:sendImmediate", memberId),
    getQueueStatus: () => electron.ipcRenderer.invoke("whatsapp:getQueueStatus"),
    getQueueMessages: (limit) => electron.ipcRenderer.invoke("whatsapp:getQueueMessages", limit),
    requeueFailed: () => electron.ipcRenderer.invoke("whatsapp:requeueFailed"),
    onQRCode: (callback) => {
      const handler = (_, qr) => callback(qr);
      electron.ipcRenderer.on("whatsapp:qr", handler);
      return () => electron.ipcRenderer.removeListener("whatsapp:qr", handler);
    },
    onStatusChange: (callback) => {
      const handler = (_, status) => callback(status);
      electron.ipcRenderer.on("whatsapp:status", handler);
      return () => electron.ipcRenderer.removeListener("whatsapp:status", handler);
    }
  },
  // Import operations
  import: {
    selectFile: () => electron.ipcRenderer.invoke("import:selectFile"),
    parseExcel: (filePath) => electron.ipcRenderer.invoke("import:parseExcel", filePath),
    execute: (data) => electron.ipcRenderer.invoke("import:execute", data),
    getTemplate: () => electron.ipcRenderer.invoke("import:getTemplate"),
    downloadTemplate: () => electron.ipcRenderer.invoke("import:downloadTemplate")
  },
  // App operations
  app: {
    openDataFolder: () => electron.ipcRenderer.invoke("app:openDataFolder"),
    showItemInFolder: (filePath) => electron.ipcRenderer.invoke("app:showItemInFolder", filePath),
    openExternal: (url) => electron.ipcRenderer.invoke("app:openExternal", url),
    backup: (destPath) => electron.ipcRenderer.invoke("app:backup", destPath),
    restore: (srcPath) => electron.ipcRenderer.invoke("app:restore", srcPath),
    getVersion: () => electron.ipcRenderer.invoke("app:getVersion"),
    logError: (payload) => electron.ipcRenderer.invoke("app:logError", payload)
  },
  // QR Code operations
  qrcode: {
    generate: (memberId) => electron.ipcRenderer.invoke("qrcode:generate", memberId)
  },
  // Photo operations
  photos: {
    save: (dataUrl, memberId) => electron.ipcRenderer.invoke("photos:save", dataUrl, memberId)
  },
  // Reports operations
  reports: {
    getDailyStats: (days) => electron.ipcRenderer.invoke("reports:getDailyStats", days),
    getHourlyDistribution: () => electron.ipcRenderer.invoke("reports:getHourlyDistribution"),
    getTopMembers: (days, limit) => electron.ipcRenderer.invoke("reports:getTopMembers", days, limit),
    getDenialReasons: (days) => electron.ipcRenderer.invoke("reports:getDenialReasons", days),
    getOverview: () => electron.ipcRenderer.invoke("reports:getOverview"),
    getExpiringSubscriptions: (days) => electron.ipcRenderer.invoke("reports:getExpiringSubscriptions", days),
    getLowSessionMembers: (threshold) => electron.ipcRenderer.invoke("reports:getLowSessionMembers", threshold),
    getDeniedMembers: (days) => electron.ipcRenderer.invoke("reports:getDeniedMembers", days)
  },
  // Income operations
  income: {
    getSummary: () => electron.ipcRenderer.invoke("income:getSummary"),
    getRecent: (limit) => electron.ipcRenderer.invoke("income:getRecent", limit),
    getMonthly: () => electron.ipcRenderer.invoke("income:getMonthly")
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.api = api;
}
