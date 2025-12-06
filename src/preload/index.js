import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Project operations
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProject: (id) => ipcRenderer.invoke('get-project', id),
  createProject: (name, color) => ipcRenderer.invoke('create-project', name, color),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),

  // Category operations
  getCategories: () => ipcRenderer.invoke('get-categories'),
  getCategory: (id) => ipcRenderer.invoke('get-category', id),
  createCategory: (name, color) => ipcRenderer.invoke('create-category', name, color),
  updateCategory: (category) => ipcRenderer.invoke('update-category', category),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

  // Todo operations
  getTodos: (projectId) => ipcRenderer.invoke('get-todos', projectId),
  getTodo: (id) => ipcRenderer.invoke('get-todo', id),
  createTodo: (title, projectId) => ipcRenderer.invoke('create-todo', title, projectId),
  updateTodo: (todo) => ipcRenderer.invoke('update-todo', todo),
  deleteTodo: (id) => ipcRenderer.invoke('delete-todo', id),
  reorderTodos: (ids) => ipcRenderer.invoke('reorder-todos', ids),

  // Link operations
  getLinkedTodos: (todoId) => ipcRenderer.invoke('get-linked-todos', todoId),
  linkTodos: (sourceId, targetId) => ipcRenderer.invoke('link-todos', sourceId, targetId),
  unlinkTodos: (sourceId, targetId) => ipcRenderer.invoke('unlink-todos', sourceId, targetId),
  searchTodos: (query, excludeId) => ipcRenderer.invoke('search-todos', query, excludeId),

  // Window operations
  openDetail: (todoId) => ipcRenderer.invoke('open-detail', todoId),

  // Events
  onRefreshTodos: (callback) => {
    ipcRenderer.on('refresh-todos', callback)
    return () => ipcRenderer.removeListener('refresh-todos', callback)
  },
  onLoadTodo: (callback) => {
    ipcRenderer.on('load-todo', (_, id) => callback(id))
    return () => ipcRenderer.removeListener('load-todo', callback)
  },
  notifyTodoUpdated: () => ipcRenderer.send('todo-updated')
})
