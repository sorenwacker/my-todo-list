import { app, BrowserWindow, ipcMain, screen, dialog, shell, globalShortcut, session } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { Database } from './database.js'
import logger from './logger.js'
import { initAutoUpdater, checkForUpdates } from './updater.js'
import history from './history.js'
import {
  MAX_LENGTH,
  MAX_IMPORT_FILE_SIZE
} from '../config/constants.js'
import {
  ValidationError,
  validateId,
  validateOptionalId,
  validateString,
  validateOptionalColor,
  validateIdArray,
  validateTodo,
  validateProject,
  validateStatus,
  validateSearchQuery,
  validateImportMode,
  validateUrl,
  validateTodoType,
  validateSettingKey,
  validateSettingValue
} from './validators.js'

const log = logger.child({ module: 'main' })

/**
 * Wraps IPC handlers with validation and error handling.
 *
 * This function provides centralized error handling for all IPC handlers,
 * ensuring validation errors and general errors are properly logged with context.
 *
 * @param {Function} handler - The async IPC handler function to wrap
 * @param {string} [handlerName='unknown'] - Name of the handler for logging purposes
 * @returns {Function} Wrapped handler function with error handling
 */
function handleWithValidation(handler, handlerName = 'unknown') {
  return async (...args) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ValidationError) {
        log.warn('Validation error in IPC handler', {
          handler: handlerName,
          message: error.message
        })
        throw error
      }
      log.error('Error in IPC handler', {
        handler: handlerName,
        error
      })
      throw error
    }
  }
}

let mainWindow = null
let database = null

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  const iconPath = process.env.NODE_ENV === 'development'
    ? join(app.getAppPath(), 'resources/icon-512.png')
    : join(process.resourcesPath, 'resources/icon-512.png')

  mainWindow = new BrowserWindow({
    width,
    height,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.maximize()

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/index.html')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}


// Ensure consistent userData path in dev and production
// In dev, Electron uses 'Electron' as the app name, but we want 'todo'
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  const userDataPath = join(app.getPath('appData'), 'todo')
  app.setPath('userData', userDataPath)
}

app.whenReady().then(() => {
  log.info('Application starting')
  database = new Database()
  log.info('Database initialized')

  // Configure Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';" +
          "script-src 'self' 'unsafe-inline';" +
          "style-src 'self' 'unsafe-inline';" +
          "img-src 'self' data: blob:;" +
          "font-src 'self' data:;" +
          "connect-src 'self' https://api.github.com https://github.com;" +
          "frame-src 'none';" +
          "object-src 'none';" +
          "base-uri 'self';"
        ]
      }
    })
  })
  log.info('Content Security Policy configured')

  // External links
  ipcMain.handle('open-external', handleWithValidation((_, url) => {
    return shell.openExternal(validateUrl(url))
  }))

  // Project operations
  ipcMain.handle('get-projects', () => database.getAllProjects())
  ipcMain.handle('get-project', handleWithValidation((_, id) => {
    return database.getProject(validateId(id))
  }))
  ipcMain.handle('create-project', handleWithValidation((_, name, color) => {
    return database.createProject(
      validateString(name, 'name', MAX_LENGTH.PROJECT_NAME),
      validateOptionalColor(color)
    )
  }))
  ipcMain.handle('update-project', handleWithValidation((_, project) => {
    return database.updateProject(validateProject(project))
  }))
  ipcMain.handle('delete-project', handleWithValidation((_, id) => {
    return database.deleteProject(validateId(id))
  }))
  ipcMain.handle('restore-project', handleWithValidation((_, id) => {
    return database.restoreProject(validateId(id))
  }))
  ipcMain.handle('permanently-delete-project', handleWithValidation((_, id) => {
    return database.permanentlyDeleteProject(validateId(id))
  }))
  ipcMain.handle('get-deleted-projects', () => database.getDeletedProjects())


  // Status operations
  ipcMain.handle('get-statuses', () => database.getAllStatuses())
  ipcMain.handle('get-status', handleWithValidation((_, id) => {
    return database.getStatus(validateId(id))
  }))
  ipcMain.handle('create-status', handleWithValidation((_, name, color) => {
    return database.createStatus(
      validateString(name, 'name', MAX_LENGTH.STATUS_NAME),
      validateOptionalColor(color)
    )
  }))
  ipcMain.handle('update-status', handleWithValidation((_, status) => {
    return database.updateStatus(validateStatus(status))
  }))
  ipcMain.handle('delete-status', handleWithValidation((_, id) => {
    return database.deleteStatus(validateId(id))
  }))




  // Milestone operations
  ipcMain.handle('get-milestone-todos', handleWithValidation((_, milestoneId) => {
    return database.getMilestoneTodos(validateId(milestoneId))
  }))
  ipcMain.handle('link-milestone-todo', handleWithValidation((_, milestoneId, todoId) => {
    return database.linkMilestoneTodo(validateId(milestoneId), validateId(todoId))
  }))
  ipcMain.handle('unlink-milestone-todo', handleWithValidation((_, milestoneId, todoId) => {
    return database.unlinkMilestoneTodo(validateId(milestoneId), validateId(todoId))
  }))
  ipcMain.handle('get-all-milestones', handleWithValidation((_, projectId) => {
    return database.getAllMilestones(validateOptionalId(projectId))
  }))

  // Tag operations
  ipcMain.handle('get-all-tags', handleWithValidation(() => {
    return database.getAllTags()
  }))
  ipcMain.handle('get-todo-tags', handleWithValidation((_, todoId) => {
    return database.getTodoTags(validateId(todoId))
  }))
  ipcMain.handle('add-todo-tag', handleWithValidation((_, todoId, tagName) => {
    return database.addTodoTag(validateId(todoId), validateString(tagName, 'tagName', MAX_LENGTH.TAG_NAME))
  }))
  ipcMain.handle('remove-todo-tag', handleWithValidation((_, todoId, tagId) => {
    return database.removeTodoTag(validateId(todoId), validateId(tagId))
  }))
  ipcMain.handle('get-project-tags', handleWithValidation((_, projectId) => {
    return database.getProjectTags(validateId(projectId))
  }))
  ipcMain.handle('add-project-tag', handleWithValidation((_, projectId, tagName) => {
    return database.addProjectTag(validateId(projectId), validateString(tagName, 'tagName', MAX_LENGTH.TAG_NAME))
  }))
  ipcMain.handle('remove-project-tag', handleWithValidation((_, projectId, tagId) => {
    return database.removeProjectTag(validateId(projectId), validateId(tagId))
  }))
  ipcMain.handle('search-by-tag', handleWithValidation((_, tagName) => {
    return database.searchByTag(validateString(tagName, 'tagName', MAX_LENGTH.TAG_NAME))
  }))

  // Todo operations
  ipcMain.handle('get-todos', handleWithValidation((_, projectId) => {
    // projectId can be null, 'inbox', 'archive', 'trash', or a number
    if (projectId === null || projectId === 'inbox' || projectId === 'archive' || projectId === 'trash') {
      return database.getAllTodos(projectId)
    }
    return database.getAllTodos(validateId(projectId))
  }))
  ipcMain.handle('get-todo', handleWithValidation((_, id) => {
    return database.getTodo(validateId(id))
  }))
  ipcMain.handle('create-todo', handleWithValidation((_, title, projectId, type = 'todo') => {
    const validTitle = validateString(title, 'title', MAX_LENGTH.TODO_TITLE)
    const validProjectId = validateOptionalId(projectId)
    const validType = validateTodoType(type)
    const todo = database.createTodo(validTitle, validProjectId, validType)
    const todoId = todo.id

    // Record in history
    history.push({
      type: 'create-todo',
      description: `Create "${validTitle}"`,
      undo: () => database.deleteTodo(todoId),
      redo: () => database.restoreTodo(todoId)
    })

    // Notify UI of history change
    if (mainWindow) {
      mainWindow.webContents.send('history-changed', history.getState())
    }

    return todo
  }))
  ipcMain.handle('update-todo', handleWithValidation((_, todo, options = {}) => {
    const validTodo = validateTodo(todo)
    const oldTodo = database.getTodo(validTodo.id)
    const result = database.updateTodo(validTodo)

    // Record in history (only if there was an actual change and not skipped)
    if (!options.skipHistory && oldTodo && JSON.stringify(oldTodo) !== JSON.stringify(result)) {
      history.push({
        type: 'update-todo',
        description: `Update "${result.title}"`,
        undo: () => database.updateTodo(oldTodo),
        redo: () => database.updateTodo(validTodo)
      })

      // Notify UI of history change
      if (mainWindow) {
        mainWindow.webContents.send('history-changed', history.getState())
      }
    }

    return result
  }))
  ipcMain.on('update-todo-sync', (event, todo, options = {}) => {
    try {
      const validatedTodo = validateTodo(todo)
      log.debug('Sync save requested for todo', { id: validatedTodo.id, title: validatedTodo.title })
      const oldTodo = database.getTodo(validatedTodo.id)
      database.updateTodo(validatedTodo)

      // Record in history (skip if auto-save to avoid undo/redo issues)
      if (!options.skipHistory && oldTodo && JSON.stringify(oldTodo) !== JSON.stringify(validatedTodo)) {
        history.push({
          type: 'update-todo',
          description: `Update "${validatedTodo.title}"`,
          undo: () => database.updateTodo(oldTodo),
          redo: () => database.updateTodo(validatedTodo)
        })

        // Notify UI of history change
        if (mainWindow) {
          mainWindow.webContents.send('history-changed', history.getState())
        }
      }

      log.debug('Sync save completed')
      event.returnValue = true
    } catch (error) {
      log.error('Sync save validation error', { error: error.message })
      event.returnValue = false
    }
  })
  ipcMain.handle('delete-todo', handleWithValidation((_, id) => {
    const validId = validateId(id)
    const todo = database.getTodo(validId)
    const result = database.deleteTodo(validId)

    // Record in history
    if (todo) {
      history.push({
        type: 'delete-todo',
        description: `Delete "${todo.title}"`,
        undo: () => database.restoreTodo(validId),
        redo: () => database.deleteTodo(validId)
      })

      // Notify UI of history change
      if (mainWindow) {
        mainWindow.webContents.send('history-changed', history.getState())
      }
    }

    return result
  }))
  ipcMain.handle('restore-todo', handleWithValidation((_, id) => {
    const validId = validateId(id)
    const todo = database.getTodo(validId)
    const result = database.restoreTodo(validId)

    if (todo) {
      history.push({
        type: 'restore-todo',
        description: `Restore "${todo.title}"`,
        undo: () => database.deleteTodo(validId),
        redo: () => database.restoreTodo(validId)
      })
      if (mainWindow) {
        mainWindow.webContents.send('history-changed', history.getState())
      }
    }
    return result
  }))
  ipcMain.handle('archive-todo', handleWithValidation((_, id) => {
    const validId = validateId(id)
    const todo = database.getTodo(validId)
    const result = database.archiveTodo(validId)

    if (todo) {
      history.push({
        type: 'archive-todo',
        description: `Archive "${todo.title}"`,
        undo: () => database.unarchiveTodo(validId),
        redo: () => database.archiveTodo(validId)
      })
      if (mainWindow) {
        mainWindow.webContents.send('history-changed', history.getState())
      }
    }
    return result
  }))
  ipcMain.handle('archive-completed-todos', handleWithValidation((_, projectId) => {
    // Get completed todos before archiving for undo
    const completedIds = database.getCompletedTodoIds(projectId)
    const count = database.archiveCompletedTodos(projectId)

    if (count > 0) {
      history.push({
        type: 'archive-completed',
        description: `Archive ${count} completed item${count > 1 ? 's' : ''}`,
        undo: () => completedIds.forEach(id => database.unarchiveTodo(id)),
        redo: () => completedIds.forEach(id => database.archiveTodo(id))
      })
      if (mainWindow) {
        mainWindow.webContents.send('history-changed', history.getState())
      }
    }
    return count
  }))
  ipcMain.handle('unarchive-todo', handleWithValidation((_, id) => {
    const validId = validateId(id)
    const todo = database.getTodo(validId)
    const result = database.unarchiveTodo(validId)

    if (todo) {
      history.push({
        type: 'unarchive-todo',
        description: `Unarchive "${todo.title}"`,
        undo: () => database.archiveTodo(validId),
        redo: () => database.unarchiveTodo(validId)
      })
      if (mainWindow) {
        mainWindow.webContents.send('history-changed', history.getState())
      }
    }
    return result
  }))
  ipcMain.handle('get-archive-count', handleWithValidation(() => {
    return database.getArchiveCount()
  }))
  ipcMain.handle('permanently-delete-todo', handleWithValidation((_, id) => {
    return database.permanentlyDeleteTodo(validateId(id))
  }))
  ipcMain.handle('empty-trash', () => database.emptyTrash())
  ipcMain.handle('get-trash-count', () => database.getTrashCount())

  // Milestone operations
  ipcMain.handle('get-child-todos', handleWithValidation((_, parentId) => {
    return database.getChildTodos(validateId(parentId))
  }))
  ipcMain.handle('get-milestones', handleWithValidation((_, projectId) => {
    if (projectId === null) {
      return database.getAllMilestones()
    }
    return database.getAllMilestones(validateId(projectId))
  }))
  ipcMain.handle('assign-to-milestone', handleWithValidation((_, todoId, milestoneId) => {
    return database.assignToMilestone(validateId(todoId), milestoneId ? validateId(milestoneId) : null)
  }))
  ipcMain.handle('unassign-from-milestone', handleWithValidation((_, todoId) => {
    return database.unassignFromMilestone(validateId(todoId))
  }))

  ipcMain.handle('reorder-todos', handleWithValidation((_, ids) => {
    return database.reorderTodos(validateIdArray(ids))
  }))
  ipcMain.handle('reorder-projects', handleWithValidation((_, ids) => {
    return database.reorderProjects(validateIdArray(ids))
  }))
  ipcMain.handle('reorder-statuses', handleWithValidation((_, ids) => {
    return database.reorderStatuses(validateIdArray(ids))
  }))

  // Link operations
  ipcMain.handle('get-linked-todos', handleWithValidation((_, todoId) => {
    return database.getLinkedTodos(validateId(todoId))
  }))
  ipcMain.handle('link-todos', handleWithValidation((_, sourceId, targetId) => {
    const validSourceId = validateId(sourceId)
    const validTargetId = validateId(targetId)
    const result = database.linkTodos(validSourceId, validTargetId)

    // Record in history
    history.push({
      type: 'link-todos',
      description: 'Link items',
      undo: () => database.unlinkTodos(validSourceId, validTargetId),
      redo: () => database.linkTodos(validSourceId, validTargetId)
    })

    if (mainWindow) {
      mainWindow.webContents.send('history-changed', history.getState())
    }

    return result
  }))
  ipcMain.handle('unlink-todos', handleWithValidation((_, sourceId, targetId) => {
    const validSourceId = validateId(sourceId)
    const validTargetId = validateId(targetId)
    const result = database.unlinkTodos(validSourceId, validTargetId)

    // Record in history
    history.push({
      type: 'unlink-todos',
      description: 'Unlink items',
      undo: () => database.linkTodos(validSourceId, validTargetId),
      redo: () => database.unlinkTodos(validSourceId, validTargetId)
    })

    if (mainWindow) {
      mainWindow.webContents.send('history-changed', history.getState())
    }

    return result
  }))
  ipcMain.handle('search-todos', handleWithValidation((_, query, excludeId) => {
    return database.searchTodos(
      validateSearchQuery(query),
      validateOptionalId(excludeId)
    )
  }))

  // Global search handler
  ipcMain.handle('global-search', handleWithValidation((_, query) => {
    return database.globalSearch(validateSearchQuery(query))
  }))

  // Settings handlers
  ipcMain.handle('get-setting', handleWithValidation((_, key) => {
    return database.getSetting(validateSettingKey(key))
  }))
  ipcMain.handle('set-setting', handleWithValidation((_, key, value) => {
    const validKey = validateSettingKey(key)
    const validValue = validateSettingValue(validKey, value)
    return database.setSetting(validKey, validValue)
  }))
  ipcMain.handle('get-all-settings', () => {
    return database.getAllSettings()
  })

  // Recurrence handler
  ipcMain.handle('create-next-recurrence', handleWithValidation((_, todoId) => {
    return database.createNextRecurrence(validateId(todoId))
  }))

  // Export/Import handlers
  ipcMain.handle('export-data', async () => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Todo List Data',
      defaultPath: `todo-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (filePath) {
      try {
        const data = database.exportData()
        writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
        log.info('Data exported successfully', { path: filePath })
        return { success: true, path: filePath }
      } catch (error) {
        log.error('Failed to export data', { error, path: filePath })
        return { success: false, error: error.message }
      }
    }
    return { success: false }
  })

  ipcMain.handle('import-data', async (_, mode = 'merge') => {
    const validatedMode = validateImportMode(mode)
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Todo List Data',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (filePaths && filePaths.length > 0) {
      const importPath = filePaths[0]
      try {
        const fileContent = readFileSync(importPath, 'utf-8')
        // Limit file size to prevent memory issues
        if (fileContent.length > MAX_IMPORT_FILE_SIZE) {
          log.warn('Import file too large', { path: importPath, size: fileContent.length })
          return { success: false, error: 'File too large (max 50MB)' }
        }
        const importData = JSON.parse(fileContent)
        database.importData(importData, validatedMode)
        log.info('Data imported successfully', { path: importPath, mode: validatedMode })
        return { success: true }
      } catch (error) {
        log.error('Failed to import data', { error, path: importPath })
        return { success: false, error: error.message }
      }
    }
    return { success: false }
  })

  ipcMain.handle('get-database-path', () => {
    return join(app.getPath('userData'), 'todos.db')
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })


  // Notify main window of updates
  ipcMain.on('todo-updated', () => {
    if (mainWindow) {
      mainWindow.webContents.send('refresh-todos')
    }
  })

  createMainWindow()
  log.info('Main window created')

  // Initialize auto-updater
  initAutoUpdater(mainWindow)

  // IPC handler for manual update check
  ipcMain.handle('check-for-updates', () => {
    checkForUpdates()
  })

  // Undo/Redo handlers
  ipcMain.handle('undo', async () => {
    const action = await history.undo()
    if (mainWindow) {
      if (action) {
        mainWindow.webContents.send('refresh-todos')
      }
      mainWindow.webContents.send('history-changed', history.getState())
    }
    return history.getState()
  })

  ipcMain.handle('redo', async () => {
    const action = await history.redo()
    if (mainWindow) {
      if (action) {
        mainWindow.webContents.send('refresh-todos')
      }
      mainWindow.webContents.send('history-changed', history.getState())
    }
    return history.getState()
  })

  ipcMain.handle('get-history-state', () => {
    return history.getState()
  })

  // Register global keyboard shortcuts
  app.whenReady().then(() => {
    // Cmd/Ctrl+Z for undo
    globalShortcut.register('CommandOrControl+Z', async () => {
      if (mainWindow && mainWindow.isFocused()) {
        const action = await history.undo()
        if (action) {
          mainWindow.webContents.send('refresh-todos')
          mainWindow.webContents.send('history-changed', history.getState())
        }
      }
    })

    // Cmd/Ctrl+Shift+Z for redo
    globalShortcut.register('CommandOrControl+Shift+Z', async () => {
      if (mainWindow && mainWindow.isFocused()) {
        const action = await history.redo()
        if (action) {
          mainWindow.webContents.send('refresh-todos')
          mainWindow.webContents.send('history-changed', history.getState())
        }
      }
    })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      log.info('Reactivating application')
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  log.info('All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', { error })
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection', { reason: String(reason) })
})
