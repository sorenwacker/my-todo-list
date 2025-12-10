import { app, BrowserWindow, ipcMain, screen, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { Database } from './database.js'

let mainWindow = null
let detailWindow = null
let database = null

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width,
    height,
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
  if (detailWindow) {
    detailWindow.focus()
    detailWindow.webContents.send('load-todo', todoId)
    return
  }

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

  detailWindow.on('closed', () => {
    detailWindow = null
  })
}

app.whenReady().then(() => {
  database = new Database()

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

  // Todo operations
  ipcMain.handle('get-todos', (_, projectId) => database.getAllTodos(projectId))
  ipcMain.handle('get-todo', (_, id) => database.getTodo(id))
  ipcMain.handle('create-todo', (_, title, projectId) => database.createTodo(title, projectId))
  ipcMain.handle('update-todo', (_, todo) => database.updateTodo(todo))
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
