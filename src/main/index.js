import { app, BrowserWindow, ipcMain, screen, dialog, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { Database } from './database.js'

let mainWindow = null
let detailWindow = null
let detailWindowTodoId = null
let settingsWindow = null
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
      preload: join(__dirname, '../preload/index.js'),
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
      preload: join(__dirname, '../preload/index.js'),
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

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    settingsWindow.loadURL('http://localhost:5173/settings.html')
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'))
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
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
      preload: join(__dirname, '../preload/index.js'),
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

app.whenReady().then(() => {
  database = new Database()

  // External links
  ipcMain.handle('open-external', (_, url) => shell.openExternal(url))

  // Project operations
  ipcMain.handle('get-projects', () => database.getAllProjects())
  ipcMain.handle('get-project', (_, id) => database.getProject(id))
  ipcMain.handle('create-project', (_, name, color) => database.createProject(name, color))
  ipcMain.handle('update-project', (_, project) => database.updateProject(project))
  ipcMain.handle('delete-project', (_, id) => database.deleteProject(id))
  ipcMain.handle('restore-project', (_, id) => database.restoreProject(id))
  ipcMain.handle('permanently-delete-project', (_, id) => database.permanentlyDeleteProject(id))
  ipcMain.handle('get-deleted-projects', () => database.getDeletedProjects())

  // Category operations
  ipcMain.handle('get-categories', () => database.getAllCategories())
  ipcMain.handle('get-category', (_, id) => database.getCategory(id))
  ipcMain.handle('create-category', (_, name, color) => database.createCategory(name, color))
  ipcMain.handle('update-category', (_, category) => database.updateCategory(category))
  ipcMain.handle('delete-category', (_, id) => database.deleteCategory(id))

  // Status operations
  ipcMain.handle('get-statuses', () => database.getAllStatuses())
  ipcMain.handle('get-status', (_, id) => database.getStatus(id))
  ipcMain.handle('create-status', (_, name, color) => database.createStatus(name, color))
  ipcMain.handle('update-status', (_, status) => database.updateStatus(status))
  ipcMain.handle('delete-status', (_, id) => database.deleteStatus(id))

  // Person operations
  ipcMain.handle('get-persons', () => database.getAllPersons())
  ipcMain.handle('get-person', (_, id) => database.getPerson(id))
  ipcMain.handle('create-person', (_, person) => database.createPerson(person))
  ipcMain.handle('update-person', (_, person) => database.updatePerson(person))
  ipcMain.handle('delete-person', (_, id) => database.deletePerson(id))
  ipcMain.handle('reorder-persons', (_, ids) => database.reorderPersons(ids))

  // Todo-Person linking
  ipcMain.handle('get-todo-persons', (_, todoId) => database.getTodoPersons(todoId))
  ipcMain.handle('link-todo-person', (_, todoId, personId) => database.linkTodoPerson(todoId, personId))
  ipcMain.handle('unlink-todo-person', (_, todoId, personId) => database.unlinkTodoPerson(todoId, personId))
  ipcMain.handle('get-person-todos', (_, personId) => database.getPersonTodos(personId))

  // Project-Person linking
  ipcMain.handle('get-project-persons', (_, projectId) => database.getProjectPersons(projectId))
  ipcMain.handle('link-project-person', (_, projectId, personId, stakeholderData) => database.linkProjectPerson(projectId, personId, stakeholderData))
  ipcMain.handle('update-project-person-stakeholder', (_, projectId, personId, stakeholderData) => database.updateProjectPersonStakeholder(projectId, personId, stakeholderData))
  ipcMain.handle('unlink-project-person', (_, projectId, personId) => database.unlinkProjectPerson(projectId, personId))
  ipcMain.handle('get-person-projects', (_, personId) => database.getPersonProjects(personId))

  // Todo operations
  ipcMain.handle('get-todos', (_, projectId) => database.getAllTodos(projectId))
  ipcMain.handle('get-todo', (_, id) => database.getTodo(id))
  ipcMain.handle('create-todo', (_, title, projectId) => database.createTodo(title, projectId))
  ipcMain.handle('update-todo', (_, todo) => database.updateTodo(todo))
  ipcMain.on('update-todo-sync', (event, todo) => {
    console.log('Sync save requested for todo:', todo.id, todo.title)
    database.updateTodo(todo)
    console.log('Sync save completed')
    event.returnValue = true
  })
  ipcMain.handle('delete-todo', (_, id) => database.deleteTodo(id))
  ipcMain.handle('restore-todo', (_, id) => database.restoreTodo(id))
  ipcMain.handle('permanently-delete-todo', (_, id) => database.permanentlyDeleteTodo(id))
  ipcMain.handle('empty-trash', () => database.emptyTrash())
  ipcMain.handle('get-trash-count', () => database.getTrashCount())
  ipcMain.handle('reorder-todos', (_, ids) => database.reorderTodos(ids))
  ipcMain.handle('reorder-projects', (_, ids) => database.reorderProjects(ids))
  ipcMain.handle('reorder-categories', (_, ids) => database.reorderCategories(ids))
  ipcMain.handle('reorder-statuses', (_, ids) => database.reorderStatuses(ids))

  // Link operations
  ipcMain.handle('get-linked-todos', (_, todoId) => database.getLinkedTodos(todoId))
  ipcMain.handle('link-todos', (_, sourceId, targetId) => database.linkTodos(sourceId, targetId))
  ipcMain.handle('unlink-todos', (_, sourceId, targetId) => database.unlinkTodos(sourceId, targetId))
  ipcMain.handle('search-todos', (_, query, excludeId) => database.searchTodos(query, excludeId))

  // Subtask handlers
  ipcMain.handle('get-subtasks', (_, todoId) => database.getSubtasks(todoId))
  ipcMain.handle('create-subtask', (_, todoId, title) => database.createSubtask(todoId, title))
  ipcMain.handle('update-subtask', (_, subtask) => database.updateSubtask(subtask))
  ipcMain.handle('delete-subtask', (_, id) => database.deleteSubtask(id))
  ipcMain.handle('reorder-subtasks', (_, ids) => database.reorderSubtasks(ids))

  // Recurrence handler
  ipcMain.handle('create-next-recurrence', (_, todoId) => database.createNextRecurrence(todoId))

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
      const data = database.exportData()
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true, path: filePath }
    }
    return { success: false }
  })

  ipcMain.handle('import-data', async (_, mode = 'merge') => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Todo List Data',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (filePaths && filePaths.length > 0) {
      try {
        const fileContent = readFileSync(filePaths[0], 'utf-8')
        const importData = JSON.parse(fileContent)
        database.importData(importData, mode)
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }
    return { success: false }
  })

  ipcMain.handle('get-database-path', () => {
    return join(app.getPath('userData'), 'todos.db')
  })

  // Window management
  ipcMain.handle('open-detail', (_, todoId) => {
    createDetailWindow(todoId)
    // Notify main window that detail was opened in a window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('detail-opened-in-window', todoId)
    }
  })

  ipcMain.handle('close-detail-window', (_, todoId) => {
    // Close the detail window if it's open for this todo
    if (detailWindow && detailWindowTodoId === todoId && !detailWindow.isDestroyed()) {
      detailWindow.close()
    }
  })

  ipcMain.handle('open-settings', () => {
    createSettingsWindow()
  })

  ipcMain.handle('open-stakeholder-register', (_, projectId) => {
    createStakeholderWindow(projectId)
  })

  // Notify main window of updates
  ipcMain.on('todo-updated', () => {
    if (mainWindow) {
      mainWindow.webContents.send('refresh-todos')
    }
  })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
