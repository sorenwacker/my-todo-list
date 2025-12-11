import { contextBridge, ipcRenderer, shell } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // External links
  openExternal: (url) => shell.openExternal(url),

  // Project operations
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProject: (id) => ipcRenderer.invoke('get-project', id),
  createProject: (name, color) => ipcRenderer.invoke('create-project', name, color),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  restoreProject: (id) => ipcRenderer.invoke('restore-project', id),
  permanentlyDeleteProject: (id) => ipcRenderer.invoke('permanently-delete-project', id),
  getDeletedProjects: () => ipcRenderer.invoke('get-deleted-projects'),

  // Category operations
  getCategories: () => ipcRenderer.invoke('get-categories'),
  getCategory: (id) => ipcRenderer.invoke('get-category', id),
  createCategory: (name, symbol) => ipcRenderer.invoke('create-category', name, symbol),
  updateCategory: (category) => ipcRenderer.invoke('update-category', category),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

  // Status operations
  getStatuses: () => ipcRenderer.invoke('get-statuses'),
  getStatus: (id) => ipcRenderer.invoke('get-status', id),
  createStatus: (name, color) => ipcRenderer.invoke('create-status', name, color),
  updateStatus: (status) => ipcRenderer.invoke('update-status', status),
  deleteStatus: (id) => ipcRenderer.invoke('delete-status', id),

  // Person operations
  getPersons: () => ipcRenderer.invoke('get-persons'),
  getPerson: (id) => ipcRenderer.invoke('get-person', id),
  createPerson: (person) => ipcRenderer.invoke('create-person', person),
  updatePerson: (person) => ipcRenderer.invoke('update-person', person),
  deletePerson: (id) => ipcRenderer.invoke('delete-person', id),
  reorderPersons: (ids) => ipcRenderer.invoke('reorder-persons', ids),

  // Todo-Person linking
  getTodoPersons: (todoId) => ipcRenderer.invoke('get-todo-persons', todoId),
  linkTodoPerson: (todoId, personId) => ipcRenderer.invoke('link-todo-person', todoId, personId),
  unlinkTodoPerson: (todoId, personId) => ipcRenderer.invoke('unlink-todo-person', todoId, personId),
  getPersonTodos: (personId) => ipcRenderer.invoke('get-person-todos', personId),

  // Project-Person linking
  getProjectPersons: (projectId) => ipcRenderer.invoke('get-project-persons', projectId),
  linkProjectPerson: (projectId, personId) => ipcRenderer.invoke('link-project-person', projectId, personId),
  unlinkProjectPerson: (projectId, personId) => ipcRenderer.invoke('unlink-project-person', projectId, personId),
  getPersonProjects: (personId) => ipcRenderer.invoke('get-person-projects', personId),

  // Todo operations
  getTodos: (projectId) => ipcRenderer.invoke('get-todos', projectId),
  getTodo: (id) => ipcRenderer.invoke('get-todo', id),
  createTodo: (title, projectId) => ipcRenderer.invoke('create-todo', title, projectId),
  updateTodo: (todo) => ipcRenderer.invoke('update-todo', todo),
  deleteTodo: (id) => ipcRenderer.invoke('delete-todo', id),
  restoreTodo: (id) => ipcRenderer.invoke('restore-todo', id),
  permanentlyDeleteTodo: (id) => ipcRenderer.invoke('permanently-delete-todo', id),
  emptyTrash: () => ipcRenderer.invoke('empty-trash'),
  getTrashCount: () => ipcRenderer.invoke('get-trash-count'),
  reorderTodos: (ids) => ipcRenderer.invoke('reorder-todos', ids),
  reorderProjects: (ids) => ipcRenderer.invoke('reorder-projects', ids),
  reorderCategories: (ids) => ipcRenderer.invoke('reorder-categories', ids),
  reorderStatuses: (ids) => ipcRenderer.invoke('reorder-statuses', ids),

  // Link operations
  getLinkedTodos: (todoId) => ipcRenderer.invoke('get-linked-todos', todoId),
  linkTodos: (sourceId, targetId) => ipcRenderer.invoke('link-todos', sourceId, targetId),
  unlinkTodos: (sourceId, targetId) => ipcRenderer.invoke('unlink-todos', sourceId, targetId),
  searchTodos: (query, excludeId) => ipcRenderer.invoke('search-todos', query, excludeId),

  // Subtask operations
  getSubtasks: (todoId) => ipcRenderer.invoke('get-subtasks', todoId),
  createSubtask: (todoId, title) => ipcRenderer.invoke('create-subtask', todoId, title),
  updateSubtask: (subtask) => ipcRenderer.invoke('update-subtask', subtask),
  deleteSubtask: (id) => ipcRenderer.invoke('delete-subtask', id),
  reorderSubtasks: (ids) => ipcRenderer.invoke('reorder-subtasks', ids),

  // Recurrence operations
  createNextRecurrence: (todoId) => ipcRenderer.invoke('create-next-recurrence', todoId),

  // Export/Import operations
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (mode) => ipcRenderer.invoke('import-data', mode),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),

  // Window operations
  openDetail: (todoId) => ipcRenderer.invoke('open-detail', todoId),
  openSettings: () => ipcRenderer.invoke('open-settings'),

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
