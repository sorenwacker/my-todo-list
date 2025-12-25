import { app, BrowserWindow, ipcMain, screen, dialog, shell, globalShortcut, session } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { Database } from './database.js'
import logger from './logger.js'
import { initAutoUpdater, checkForUpdates } from './updater.js'
import history from './history.js'
import {
  ValidationError,
  validateId,
  validateOptionalId,
  validateString,
  validateOptionalColor,
  validateIdArray,
  validateTodo,
  validateProject,
  validateCategory,
  validateStatus,
  validatePerson,
  validateSubtask,
  validateStakeholderData,
  validateSearchQuery,
  validateImportMode,
  validateUrl
} from './validators.js'

const log = logger.child({ module: 'main' })

/**
 * Wrapper for IPC handlers that adds validation and error handling with logging
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
let detailWindow = null
let detailWindowTodoId = null
let stakeholderWindow = null
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

function createDetailWindow(todoId) {
  // If a detail window is already open for this specific todo, just focus it
  if (detailWindow && detailWindowTodoId === todoId) {
    detailWindow.focus()
    return
  }

  // If a detail window is open for a different todo, update it to show the new todo
  if (detailWindow && detailWindowTodoId !== todoId) {
    detailWindowTodoId = todoId
    detailWindow.focus()
    detailWindow.webContents.send('load-todo', todoId)
    return
  }

  // Create new detail window
  detailWindowTodoId = todoId
  detailWindow = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    detailWindow.loadURL(`http://localhost:5173/detail.html?id=${todoId}`)
  } else {
    detailWindow.loadFile(join(__dirname, '../renderer/detail.html'), {
      query: { id: todoId.toString() }
    })
  }

  // Save before closing - execute save directly
  detailWindow.on('close', async (e) => {
    if (detailWindow && !detailWindow.isDestroyed() && !detailWindow.webContents.isDestroyed()) {
      e.preventDefault()
      console.log('Detail window closing, executing save...')
      try {
        // Execute save directly in the renderer
        const saved = await detailWindow.webContents.executeJavaScript(`
          (function() {
            try {
              if (window.api && window.api.updateTodoSync) {
                const app = document.querySelector('#app').__vue_app__;
                if (app) {
                  const instance = app._instance;
                  if (instance && instance.proxy && instance.proxy.todo) {
                    console.log('Saving todo via executeJavaScript');
                    // Create plain object copy to avoid Vue reactive issues
                    const todoData = JSON.parse(JSON.stringify(instance.proxy.todo));
                    window.api.updateTodoSync(todoData);
                    window.api.notifyTodoUpdated();
                    return true;
                  }
                }
              }
            } catch (e) {
              console.error('Error in executeJavaScript save:', e);
            }
            return false;
          })();
        `)
        console.log('Save completed:', saved, '- closing window')
      } catch (err) {
        console.error('Error saving before close:', err)
      }
      detailWindow.destroy()
    }
  })

  detailWindow.on('closed', () => {
    detailWindow = null
    detailWindowTodoId = null
  })
}

function createStakeholderWindow(projectId) {
  if (stakeholderWindow) {
    stakeholderWindow.focus()
    return
  }

  stakeholderWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    stakeholderWindow.loadURL(`http://localhost:5173/stakeholder-register.html?projectId=${projectId}`)
  } else {
    stakeholderWindow.loadFile(join(__dirname, '../renderer/stakeholder-register.html'), {
      query: { projectId: projectId.toString() }
    })
  }

  stakeholderWindow.on('closed', () => {
    stakeholderWindow = null
  })
}

// Ensure consistent userData path in dev and production
// In dev, Electron uses 'Electron' as the app name, but we want 'todo'
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  const { join } = require('path')
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
          "script-src 'self' 'unsafe-inline' 'unsafe-eval';" +
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
      validateString(name, 'name', 200),
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

  // Category operations
  ipcMain.handle('get-categories', () => database.getAllCategories())
  ipcMain.handle('get-category', handleWithValidation((_, id) => {
    return database.getCategory(validateId(id))
  }))
  ipcMain.handle('create-category', handleWithValidation((_, name, color) => {
    return database.createCategory(
      validateString(name, 'name', 100),
      validateOptionalColor(color)
    )
  }))
  ipcMain.handle('update-category', handleWithValidation((_, category) => {
    return database.updateCategory(validateCategory(category))
  }))
  ipcMain.handle('delete-category', handleWithValidation((_, id) => {
    return database.deleteCategory(validateId(id))
  }))

  // Status operations
  ipcMain.handle('get-statuses', () => database.getAllStatuses())
  ipcMain.handle('get-status', handleWithValidation((_, id) => {
    return database.getStatus(validateId(id))
  }))
  ipcMain.handle('create-status', handleWithValidation((_, name, color) => {
    return database.createStatus(
      validateString(name, 'name', 100),
      validateOptionalColor(color)
    )
  }))
  ipcMain.handle('update-status', handleWithValidation((_, status) => {
    return database.updateStatus(validateStatus(status))
  }))
  ipcMain.handle('delete-status', handleWithValidation((_, id) => {
    return database.deleteStatus(validateId(id))
  }))

  // Person operations
  ipcMain.handle('get-persons', () => database.getAllPersons())
  ipcMain.handle('get-person', handleWithValidation((_, id) => {
    return database.getPerson(validateId(id))
  }))
  ipcMain.handle('create-person', handleWithValidation((_, person) => {
    return database.createPerson(validatePerson(person))
  }))
  ipcMain.handle('update-person', handleWithValidation((_, person) => {
    return database.updatePerson(validatePerson(person))
  }))
  ipcMain.handle('delete-person', handleWithValidation((_, id) => {
    return database.deletePerson(validateId(id))
  }))
  ipcMain.handle('reorder-persons', handleWithValidation((_, ids) => {
    return database.reorderPersons(validateIdArray(ids))
  }))

  // Todo-Person linking
  ipcMain.handle('get-todo-persons', handleWithValidation((_, todoId) => {
    return database.getTodoPersons(validateId(todoId))
  }))
  ipcMain.handle('link-todo-person', handleWithValidation((_, todoId, personId) => {
    return database.linkTodoPerson(validateId(todoId), validateId(personId))
  }))
  ipcMain.handle('unlink-todo-person', handleWithValidation((_, todoId, personId) => {
    return database.unlinkTodoPerson(validateId(todoId), validateId(personId))
  }))
  ipcMain.handle('get-person-todos', handleWithValidation((_, personId) => {
    return database.getPersonTodos(validateId(personId))
  }))

  // Project-Person linking
  ipcMain.handle('get-project-persons', handleWithValidation((_, projectId) => {
    return database.getProjectPersons(validateId(projectId))
  }))
  ipcMain.handle('link-project-person', handleWithValidation((_, projectId, personId, stakeholderData) => {
    return database.linkProjectPerson(
      validateId(projectId),
      validateId(personId),
      validateStakeholderData(stakeholderData)
    )
  }))
  ipcMain.handle('update-project-person-stakeholder', handleWithValidation((_, projectId, personId, stakeholderData) => {
    return database.updateProjectPersonStakeholder(
      validateId(projectId),
      validateId(personId),
      validateStakeholderData(stakeholderData)
    )
  }))
  ipcMain.handle('unlink-project-person', handleWithValidation((_, projectId, personId) => {
    return database.unlinkProjectPerson(validateId(projectId), validateId(personId))
  }))
  ipcMain.handle('get-person-projects', handleWithValidation((_, personId) => {
    return database.getPersonProjects(validateId(personId))
  }))

  // Todo operations
  ipcMain.handle('get-todos', handleWithValidation((_, projectId) => {
    // projectId can be null, 'inbox', or a number
    if (projectId === null || projectId === 'inbox') {
      return database.getAllTodos(projectId)
    }
    return database.getAllTodos(validateId(projectId))
  }))
  ipcMain.handle('get-todo', handleWithValidation((_, id) => {
    return database.getTodo(validateId(id))
  }))
  ipcMain.handle('create-todo', handleWithValidation((_, title, projectId) => {
    const validTitle = validateString(title, 'title', 500)
    const validProjectId = validateOptionalId(projectId)
    const todo = database.createTodo(validTitle, validProjectId)
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
  ipcMain.handle('update-todo', handleWithValidation((_, todo) => {
    const validTodo = validateTodo(todo)
    const oldTodo = database.getTodo(validTodo.id)
    const result = database.updateTodo(validTodo)

    // Record in history (only if there was an actual change)
    if (oldTodo && JSON.stringify(oldTodo) !== JSON.stringify(result)) {
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
  ipcMain.on('update-todo-sync', (event, todo) => {
    try {
      const validatedTodo = validateTodo(todo)
      console.log('Sync save requested for todo:', validatedTodo.id, validatedTodo.title)
      const oldTodo = database.getTodo(validatedTodo.id)
      database.updateTodo(validatedTodo)

      // Record in history
      if (oldTodo && JSON.stringify(oldTodo) !== JSON.stringify(validatedTodo)) {
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

      console.log('Sync save completed')
      event.returnValue = true
    } catch (error) {
      console.error('Sync save validation error:', error.message)
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
    return database.restoreTodo(validateId(id))
  }))
  ipcMain.handle('permanently-delete-todo', handleWithValidation((_, id) => {
    return database.permanentlyDeleteTodo(validateId(id))
  }))
  ipcMain.handle('empty-trash', () => database.emptyTrash())
  ipcMain.handle('get-trash-count', () => database.getTrashCount())
  ipcMain.handle('reorder-todos', handleWithValidation((_, ids) => {
    return database.reorderTodos(validateIdArray(ids))
  }))
  ipcMain.handle('reorder-projects', handleWithValidation((_, ids) => {
    return database.reorderProjects(validateIdArray(ids))
  }))
  ipcMain.handle('reorder-categories', handleWithValidation((_, ids) => {
    return database.reorderCategories(validateIdArray(ids))
  }))
  ipcMain.handle('reorder-statuses', handleWithValidation((_, ids) => {
    return database.reorderStatuses(validateIdArray(ids))
  }))

  // Link operations
  ipcMain.handle('get-linked-todos', handleWithValidation((_, todoId) => {
    return database.getLinkedTodos(validateId(todoId))
  }))
  ipcMain.handle('link-todos', handleWithValidation((_, sourceId, targetId) => {
    return database.linkTodos(validateId(sourceId), validateId(targetId))
  }))
  ipcMain.handle('unlink-todos', handleWithValidation((_, sourceId, targetId) => {
    return database.unlinkTodos(validateId(sourceId), validateId(targetId))
  }))
  ipcMain.handle('search-todos', handleWithValidation((_, query, excludeId) => {
    return database.searchTodos(
      validateSearchQuery(query),
      validateOptionalId(excludeId)
    )
  }))

  // Subtask handlers
  ipcMain.handle('get-subtasks', handleWithValidation((_, todoId) => {
    return database.getSubtasks(validateId(todoId))
  }))
  ipcMain.handle('create-subtask', handleWithValidation((_, todoId, title) => {
    return database.createSubtask(
      validateId(todoId),
      validateString(title, 'title', 500)
    )
  }))
  ipcMain.handle('update-subtask', handleWithValidation((_, subtask) => {
    console.log('update-subtask called:', subtask)
    const result = database.updateSubtask(validateSubtask(subtask))
    console.log('update-subtask result:', result)
    return result
  }))
  ipcMain.handle('delete-subtask', handleWithValidation((_, id) => {
    return database.deleteSubtask(validateId(id))
  }))
  ipcMain.handle('reorder-subtasks', handleWithValidation((_, ids) => {
    return database.reorderSubtasks(validateIdArray(ids))
  }))

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
        // Limit file size to 50MB
        if (fileContent.length > 50 * 1024 * 1024) {
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

  // Window management
  ipcMain.handle('open-detail', handleWithValidation((_, todoId) => {
    const validatedId = validateId(todoId)
    createDetailWindow(validatedId)
    // Notify main window that detail was opened in a window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('detail-opened-in-window', validatedId)
    }
  }))

  ipcMain.handle('close-detail-window', handleWithValidation((_, todoId) => {
    const validatedId = validateId(todoId)
    // Close the detail window if it's open for this todo
    if (detailWindow && detailWindowTodoId === validatedId && !detailWindow.isDestroyed()) {
      detailWindow.close()
    }
  }))

  ipcMain.handle('open-stakeholder-register', handleWithValidation((_, projectId) => {
    createStakeholderWindow(validateId(projectId))
  }))

  // Notify main window of updates
  ipcMain.on('todo-updated', () => {
    if (mainWindow) {
      mainWindow.webContents.send('refresh-todos')
    }
  })

  // Embed todo from detached window back to main window
  ipcMain.on('embed-todo', (event, todoId) => {
    if (mainWindow) {
      mainWindow.webContents.send('embed-todo', todoId)
      mainWindow.focus()
    }
    // Close the detail window that sent this message
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    if (senderWindow && senderWindow !== mainWindow) {
      senderWindow.close()
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
