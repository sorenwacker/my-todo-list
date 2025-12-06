import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
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

  // Category operations
  ipcMain.handle('get-categories', () => database.getAllCategories())
  ipcMain.handle('get-category', (_, id) => database.getCategory(id))
  ipcMain.handle('create-category', (_, name, color) => database.createCategory(name, color))
  ipcMain.handle('update-category', (_, category) => database.updateCategory(category))
  ipcMain.handle('delete-category', (_, id) => database.deleteCategory(id))

  // Todo operations
  ipcMain.handle('get-todos', (_, projectId) => database.getAllTodos(projectId))
  ipcMain.handle('get-todo', (_, id) => database.getTodo(id))
  ipcMain.handle('create-todo', (_, title, projectId) => database.createTodo(title, projectId))
  ipcMain.handle('update-todo', (_, todo) => database.updateTodo(todo))
  ipcMain.handle('delete-todo', (_, id) => database.deleteTodo(id))
  ipcMain.handle('reorder-todos', (_, ids) => database.reorderTodos(ids))

  // Link operations
  ipcMain.handle('get-linked-todos', (_, todoId) => database.getLinkedTodos(todoId))
  ipcMain.handle('link-todos', (_, sourceId, targetId) => database.linkTodos(sourceId, targetId))
  ipcMain.handle('unlink-todos', (_, sourceId, targetId) => database.unlinkTodos(sourceId, targetId))
  ipcMain.handle('search-todos', (_, query, excludeId) => database.searchTodos(query, excludeId))

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
