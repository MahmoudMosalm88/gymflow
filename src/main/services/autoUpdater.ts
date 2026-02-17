import { app, dialog, shell } from 'electron'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { basename, extname, join } from 'path'
import { request as httpsRequest } from 'https'
import { request as httpRequest } from 'http'
import { logToFile } from '../utils/logger'

const UPDATE_URL = 'https://update-server.run.app/api/version'
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const DOWNLOAD_TIMEOUT_MS = 30_000
const UPDATE_TIMEOUT_MS = 15_000

type UpdateInfo = {
  version?: string
  downloadUrl?: string
  download_url?: string
  url?: string
  feedUrl?: string
  feed_url?: string
  notes?: string
  downloads?: Record<string, string>
}

let updateTimer: NodeJS.Timeout | null = null
let updateInFlight: Promise<void> | null = null

function compareVersions(a: string, b: string): number {
  const toParts = (value: string) =>
    value
      .split('-')[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isFinite(part) ? part : 0))
  const partsA = toParts(a)
  const partsB = toParts(b)
  const length = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

function resolveDownloadUrl(info: UpdateInfo): string | null {
  if (info.downloadUrl) return info.downloadUrl
  if (info.download_url) return info.download_url
  if (info.url) return info.url
  if (info.downloads) {
    const platformKey =
      process.platform === 'win32'
        ? 'win'
        : process.platform === 'darwin'
          ? 'mac'
          : 'linux'
    return info.downloads[platformKey] || info.downloads[process.platform] || null
  }
  return null
}

function resolveFeedUrl(info: UpdateInfo): string | null {
  return info.feedUrl || info.feed_url || null
}

function fetchJson(url: string, timeoutMs: number): Promise<UpdateInfo> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? httpsRequest : httpRequest
    const req = client(url, { method: 'GET' }, (res) => {
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`Update check failed (${res.statusCode})`))
        res.resume()
        return
      }
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as UpdateInfo)
        } catch (error) {
          reject(error)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Update check timed out'))
    })
    req.end()
  })
}

function downloadFile(url: string, destinationDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? httpsRequest : httpRequest
    const req = client(url, { method: 'GET' }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        resolve(downloadFile(res.headers.location, destinationDir))
        return
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`Update download failed (${res.statusCode})`))
        res.resume()
        return
      }

      if (!existsSync(destinationDir)) {
        mkdirSync(destinationDir, { recursive: true })
      }
      const fileName = basename(new URL(url).pathname) || `update-${Date.now()}`
      const filePath = join(destinationDir, fileName)
      const fileStream = createWriteStream(filePath)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close(() => resolve(filePath))
      })
      fileStream.on('error', (error) => {
        reject(error)
      })
    })
    req.on('error', reject)
    req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
      req.destroy(new Error('Update download timed out'))
    })
    req.end()
  })
}

async function launchInstaller(filePath: string): Promise<void> {
  const extension = extname(filePath).toLowerCase()
  try {
    if (process.platform === 'win32' || process.platform === 'linux') {
      await shell.openPath(filePath)
      app.relaunch()
      app.exit(0)
      return
    }

    if (process.platform === 'darwin') {
      await shell.openPath(filePath)
      app.relaunch()
      app.exit(0)
      return
    }
  } catch (error) {
    logToFile('ERROR', 'Failed to launch installer', { error: String(error), filePath })
  }

  if (extension) {
    throw new Error('Unsupported update package')
  }
}

async function checkForUpdates(): Promise<void> {
  if (updateInFlight) {
    return updateInFlight
  }

  updateInFlight = (async () => {
    try {
      const info = await fetchJson(UPDATE_URL, UPDATE_TIMEOUT_MS)
      if (!info.version) {
        logToFile('WARN', 'Update response missing version')
        return
      }

      const currentVersion = app.getVersion()
      if (compareVersions(info.version, currentVersion) <= 0) {
        return
      }

      await dialog.showMessageBox({
        type: 'info',
        message: 'Update available',
        detail: `A newer version (${info.version}) is available. GymFlow will update now.`,
        buttons: ['OK']
      })

      const feedUrl = resolveFeedUrl(info)
      if (feedUrl) {
        const { autoUpdater } = await import('electron')
        autoUpdater.setFeedURL({ url: feedUrl })
        autoUpdater.on('update-downloaded', () => {
          autoUpdater.quitAndInstall()
        })
        autoUpdater.checkForUpdates()
        return
      }

      const downloadUrl = resolveDownloadUrl(info)
      if (!downloadUrl) {
        logToFile('ERROR', 'Update response missing download URL')
        return
      }

      const downloadDir = join(app.getPath('userData'), 'updates')
      const filePath = await downloadFile(downloadUrl, downloadDir)
      await launchInstaller(filePath)
    } catch (error) {
      logToFile('ERROR', 'Auto-updater failed', { error: String(error) })
    } finally {
      updateInFlight = null
    }
  })()

  return updateInFlight
}

export function startAutoUpdater(): void {
  if (updateTimer) return
  checkForUpdates()
  updateTimer = setInterval(() => {
    checkForUpdates()
  }, UPDATE_CHECK_INTERVAL_MS)
}
