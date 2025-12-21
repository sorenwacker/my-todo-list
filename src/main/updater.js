import { autoUpdater } from 'electron-updater'
import { app, dialog, BrowserWindow } from 'electron'
import logger from './logger.js'

const log = logger.child({ module: 'updater' })

let updateDownloaded = false
let mainWindow = null

export function initAutoUpdater(win) {
  mainWindow = win

  // Configure auto-updater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates on startup (with delay to not slow down launch)
  setTimeout(() => {
    checkForUpdates()
  }, 5000)

  // Check for updates every 4 hours
  setInterval(() => {
    checkForUpdates()
  }, 4 * 60 * 60 * 1000)

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...')
    sendStatusToWindow('checking')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('Update available', { version: info.version })
    sendStatusToWindow('available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info('No updates available', { version: info.version })
    sendStatusToWindow('not-available', info)
  })

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error', { error: err.message })
    sendStatusToWindow('error', { message: err.message })
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info('Download progress', { percent: Math.round(progress.percent) })
    sendStatusToWindow('downloading', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded', { version: info.version })
    updateDownloaded = true
    sendStatusToWindow('downloaded', info)

    // Show notification to user
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded.`,
        detail: 'The update will be installed when you restart the app.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
    }
  })
}

export function checkForUpdates() {
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Failed to check for updates', { error: err.message })
    })
  } else {
    log.info('Skipping update check in development mode')
  }
}

export function quitAndInstall() {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall(false, true)
  }
}

function sendStatusToWindow(status, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, ...data })
  }
}

export function isUpdateDownloaded() {
  return updateDownloaded
}
