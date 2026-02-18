import { app, shell, BrowserWindow, globalShortcut, session, nativeImage } from 'electron'
import { join } from 'path'
import { initDatabase, closeDatabase } from './database/connection'
import { registerIpcHandlers } from './ipc/handlers'
import { logToFile } from './utils/logger'
import { whatsappService } from './services/whatsapp'
import { startAutoUpdater } from './services/autoUpdater'
import { getExpiringSubscriptions } from './database/repositories/subscriptionRepository'
import {
  hasRecentRenewalReminder,
  createMessage
} from './database/repositories/messageQueueRepository'

let mainWindow: BrowserWindow | null = null
let rendererRestartCount = 0
let lastRendererCrashAt = 0

const MAX_RENDERER_RESTARTS = 3
const RENDERER_RESTART_WINDOW_MS = 60_000

const DEFAULT_DEV_ORIGIN = 'http://127.0.0.1:5176'

function getDevOrigin(): string {
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (!rendererUrl) return DEFAULT_DEV_ORIGIN
  try {
    return new URL(rendererUrl).origin
  } catch {
    return DEFAULT_DEV_ORIGIN
  }
}

function buildCsp(isDevMode: boolean, devOrigin: string): string {
  if (isDevMode) {
    return [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${devOrigin}`,
      `style-src 'self' 'unsafe-inline' ${devOrigin} https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      `connect-src 'self' ws: ${devOrigin}`
    ].join('; ')
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'"
  ].join('; ')
}

function installCsp(): void {
  const devOrigin = getDevOrigin()
  const isDevMode = isDev()
  const policy = buildCsp(isDevMode, devOrigin)

  console.log('CSP installed:', { isDevMode, devOrigin })
  logToFile('INFO', 'CSP installed', { isDevMode, devOrigin })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders ?? {}
    responseHeaders['Content-Security-Policy'] = [policy]
    callback({ responseHeaders })
  })
}

// Check if running in development mode (must be called after app is ready)
// Also checks for ELECTRON_RENDERER_URL which electron-vite dev always sets,
// so dev mode is detected even when app.isPackaged is unreliable
function isDev(): boolean {
  return !app.isPackaged || !!process.env['ELECTRON_RENDERER_URL']
}

function loadRenderer(): void {
  if (!mainWindow) return
  if (isDev() && process.env['ELECTRON_RENDERER_URL']) {
    console.log('Loading renderer from dev server:', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const filePath = join(__dirname, '../renderer/index.html')
    console.log('Loading renderer from file:', filePath)
    mainWindow.loadFile(filePath)
  }
}

function scheduleRendererReload(trigger: string): void {
  if (!mainWindow) return
  const now = Date.now()
  if (now - lastRendererCrashAt > RENDERER_RESTART_WINDOW_MS) {
    rendererRestartCount = 0
  }
  lastRendererCrashAt = now
  rendererRestartCount += 1

  if (rendererRestartCount > MAX_RENDERER_RESTARTS) {
    logToFile('ERROR', 'Renderer restart limit reached', { trigger })
    return
  }

  logToFile('WARN', 'Reloading renderer after failure', {
    trigger,
    attempt: rendererRestartCount
  })

  setTimeout(() => {
    loadRenderer()
  }, 1000)
}

function createWindow(): void {
  // Create the browser window
  const iconPath = join(__dirname, '../../build/icon.png')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#f5f5f5',
    autoHideMenuBar: true,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Safety: show window after 10s even if ready-to-show didn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      logToFile('WARN', 'Showing window via fallback timeout (ready-to-show did not fire)')
      mainWindow.show()
    }
  }, 10_000)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logToFile('ERROR', 'did-fail-load', { errorCode, errorDescription, validatedURL })
    scheduleRendererReload('did-fail-load')
  })

  mainWindow.webContents.on('did-finish-load', () => {
    logToFile('INFO', 'renderer loaded', { url: mainWindow?.webContents.getURL() })
    mainWindow?.webContents.setZoomFactor(1)
    mainWindow?.webContents.setVisualZoomLevelLimits(1, 1).catch(() => undefined)
    mainWindow?.show()
    mainWindow?.focus()
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logToFile('ERROR', 'render-process-gone', details)
    scheduleRendererReload('render-process-gone')
  })

  mainWindow.webContents.on('unresponsive', () => {
    logToFile('WARN', 'renderer unresponsive')
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logToFile('ERROR', 'renderer console', { level, message, line, sourceId })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Allow about:blank (used for print windows)
    if (details.url === 'about:blank') {
      return { action: 'allow' }
    }
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Always allow F12 for DevTools (essential for debugging)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // Load the renderer
  loadRenderer()
}

// ── Renewal reminder scheduler ───────────────────────────────────────────────
// Runs once 60 s after startup, then every 6 h.
// Sends a WhatsApp reminder to any member whose subscription expires within
// 3 days, unless they already received a reminder in the last 3 days.

async function runRenewalReminders(): Promise<void> {
  const status = whatsappService.getStatus()
  if (!status.authenticated) return // WhatsApp not connected — skip silently

  const expiring = getExpiringSubscriptions(3) // subs expiring in next 3 days
  if (expiring.length === 0) return

  const now = Math.floor(Date.now() / 1000)

  for (const sub of expiring) {
    // Type cast: getExpiringSubscriptions JOINs members so name/phone are present
    const phone = (sub as unknown as Record<string, string>).phone
    const name = (sub as unknown as Record<string, string>).name

    if (!phone) continue
    if (hasRecentRenewalReminder(sub.member_id)) continue

    // Format expiry date for the message (e.g. "18/02/2026")
    const expiryDate = new Date(sub.end_date * 1000).toLocaleDateString('ar-SA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    try {
      const sent = await whatsappService.sendRenewalReminder(phone, name, expiryDate)
      if (sent) {
        createMessage({
          member_id: sub.member_id,
          message_type: 'renewal',
          scheduled_at: now,
          payload: { expiryDate, phone, name }
        })
        logToFile('INFO', 'Renewal reminder sent', { memberId: sub.member_id, name, expiryDate })
      }
    } catch (err) {
      logToFile('ERROR', 'Renewal reminder failed', { memberId: sub.member_id, err })
    }
  }
}

function startRenewalReminderScheduler(): void {
  // First run after 60 s (give app time to restore WhatsApp session)
  setTimeout(() => runRenewalReminders().catch(console.error), 60_000)
  // Then every 6 hours
  setInterval(() => runRenewalReminders().catch(console.error), 6 * 60 * 60 * 1000)
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Set app icon for macOS dock
  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(join(__dirname, '../../build/icon.png'))
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon)
  }

  // Set app user model id for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId(isDev() ? process.execPath : 'com.gymflow')
  }

  installCsp()

  // Initialize database
  console.log('Initializing database...')
  try {
    initDatabase()
    console.log('Database initialized successfully')
    logToFile('INFO', 'Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    logToFile('ERROR', 'Failed to initialize database', error)
    
    // FATAL: Cannot continue without database
    const { dialog } = require('electron')
    dialog.showErrorBox(
      'Database Initialization Failed',
      `GymFlow cannot start because the database failed to initialize.\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nThe application will now exit.`
    )
    app.quit()
    return
  }

  // Register IPC handlers
  console.log('Registering IPC handlers...')
  registerIpcHandlers()
  console.log('IPC handlers registered')
  logToFile('INFO', 'IPC handlers registered')

  // Start renewal reminder scheduler
  startRenewalReminderScheduler()

  // Create window
  createWindow()
  if (!isDev()) {
    startAutoUpdater()
  }

  app.on('activate', function () {
    // On macOS re-create window when dock icon is clicked and no other windows open
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Close database connection when app is quitting
app.on('will-quit', async () => {
  console.log('Cleaning up resources before quit...')
  
  // Unregister all global shortcuts
  globalShortcut.unregisterAll()
  console.log('Global shortcuts unregistered')
  
  // Close WhatsApp socket cleanly (preserves credentials for next launch)
  try {
    await whatsappService.cleanup()
    console.log('WhatsApp service cleaned up')
  } catch (error) {
    console.error('Error cleaning up WhatsApp service:', error)
  }
  
  // Close database connection
  console.log('Closing database connection...')
  closeDatabase()
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  logToFile('ERROR', 'uncaughtException', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
  logToFile('ERROR', 'unhandledRejection', reason)
})
