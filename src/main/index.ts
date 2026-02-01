import { app, shell, BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { initDatabase, closeDatabase } from './database/connection'
import { registerIpcHandlers } from './ipc/handlers'
import { logToFile } from './utils/logger'
import { whatsappService } from './services/whatsapp'

let mainWindow: BrowserWindow | null = null

// Check if running in development mode (must be called after app is ready)
function isDev(): boolean {
  return !app.isPackaged
}

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logToFile('ERROR', 'did-fail-load', { errorCode, errorDescription, validatedURL })
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logToFile('ERROR', 'render-process-gone', details)
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

  // Enable F12 for DevTools in development
  if (isDev()) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        mainWindow?.webContents.toggleDevTools()
        event.preventDefault()
      }
    })
  }

  // Load the renderer
  if (isDev() && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Set app user model id for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId(isDev() ? process.execPath : 'com.gymflow')
  }

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
