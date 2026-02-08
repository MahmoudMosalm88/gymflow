import { app, shell, BrowserWindow, globalShortcut, session, nativeImage } from 'electron'
import { join } from 'path'
import { initDatabase, closeDatabase } from './database/connection'
import { registerIpcHandlers } from './ipc/handlers'
import { logToFile } from './utils/logger'
import { whatsappService } from './services/whatsapp'
import { startAutoUpdater } from './services/autoUpdater'

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
  
  // Disconnect WhatsApp service
  try {
    await whatsappService.disconnect()
    console.log('WhatsApp service disconnected')
  } catch (error) {
    console.error('Error disconnecting WhatsApp service:', error)
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
