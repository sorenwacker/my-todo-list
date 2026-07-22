import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { isPackaged: false, getVersion: () => '0.0.0' },
  dialog: { showMessageBox: vi.fn().mockResolvedValue({ response: 1 }) },
  shell: { openExternal: vi.fn() },
  BrowserWindow: { getAllWindows: () => [] }
}))

vi.mock('electron-updater', async () => {
  const { EventEmitter } = await import('node:events')
  const autoUpdater = new EventEmitter()
  autoUpdater.checkForUpdates = vi.fn().mockResolvedValue(null)
  autoUpdater.quitAndInstall = vi.fn()
  return { autoUpdater }
})

import { dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import {
  initAutoUpdater,
  shouldPromptForUpdate,
  SKIPPED_UPDATE_VERSION_KEY,
  RELEASES_URL
} from '../src/main/updater.js'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const fakeDb = () => ({
  getSetting: vi.fn().mockReturnValue(null),
  setSetting: vi.fn()
})

describe('shouldPromptForUpdate', () => {
  it('prompts for a version not seen before', () => {
    expect(shouldPromptForUpdate('1.2.3', null, new Set())).toBe(true)
  })

  it('does not prompt for a skipped version', () => {
    expect(shouldPromptForUpdate('1.2.3', '1.2.3', new Set())).toBe(false)
  })

  it('does not prompt twice for the same version in one run', () => {
    expect(shouldPromptForUpdate('1.2.3', null, new Set(['1.2.3']))).toBe(false)
  })
})

describe('initAutoUpdater', () => {
  beforeEach(() => {
    autoUpdater.removeAllListeners()
    vi.clearAllMocks()
    dialog.showMessageBox.mockResolvedValue({ response: 1 })
  })

  it('keeps automatic download on non-mac platforms', () => {
    initAutoUpdater(fakeDb(), 'win32')
    expect(autoUpdater.autoDownload).toBe(true)
  })

  it('disables automatic download in manual mode', () => {
    initAutoUpdater(fakeDb(), 'darwin')
    expect(autoUpdater.autoDownload).toBe(false)
  })

  it('prompts once when an update is available in manual mode', async () => {
    initAutoUpdater(fakeDb(), 'darwin')

    autoUpdater.emit('update-available', { version: '9.9.9' })
    await flushPromises()
    autoUpdater.emit('update-available', { version: '9.9.9' })
    await flushPromises()

    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1)
  })

  it('opens the releases page when the user chooses Download', async () => {
    dialog.showMessageBox.mockResolvedValue({ response: 0 })
    initAutoUpdater(fakeDb(), 'darwin')

    autoUpdater.emit('update-available', { version: '9.9.9' })
    await flushPromises()

    expect(shell.openExternal).toHaveBeenCalledWith(RELEASES_URL)
  })

  it('persists the version when the user chooses Skip This Version', async () => {
    dialog.showMessageBox.mockResolvedValue({ response: 2 })
    const db = fakeDb()
    initAutoUpdater(db, 'darwin')

    autoUpdater.emit('update-available', { version: '9.9.9' })
    await flushPromises()

    expect(db.setSetting).toHaveBeenCalledWith(SKIPPED_UPDATE_VERSION_KEY, '9.9.9')
  })

  it('does not prompt for a previously skipped version', async () => {
    const db = fakeDb()
    db.getSetting.mockReturnValue('9.9.9')
    initAutoUpdater(db, 'darwin')

    autoUpdater.emit('update-available', { version: '9.9.9' })
    await flushPromises()

    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  it('does not download anything in manual mode', async () => {
    initAutoUpdater(fakeDb(), 'darwin')

    autoUpdater.emit('update-available', { version: '9.9.9' })
    await flushPromises()

    expect(autoUpdater.autoDownload).toBe(false)
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled()
  })
})
