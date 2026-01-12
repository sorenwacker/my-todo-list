import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

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
  linkProjectPerson: (projectId, personId, stakeholderData) => ipcRenderer.invoke('link-project-person', projectId, personId, stakeholderData),
  updateProjectPersonStakeholder: (projectId, personId, stakeholderData) => ipcRenderer.invoke('update-project-person-stakeholder', projectId, personId, stakeholderData),
  unlinkProjectPerson: (projectId, personId) => ipcRenderer.invoke('unlink-project-person', projectId, personId),
  getPersonProjects: (personId) => ipcRenderer.invoke('get-person-projects', personId),

  // Todo operations
  getTodos: (projectId) => ipcRenderer.invoke('get-todos', projectId),
  getTodo: (id) => ipcRenderer.invoke('get-todo', id),
  createTodo: (title, projectId, type = 'todo') => ipcRenderer.invoke('create-todo', title, projectId, type),
  updateTodo: (todo, options) => ipcRenderer.invoke('update-todo', todo, options),
  updateTodoSync: (todo, options) => ipcRenderer.sendSync('update-todo-sync', todo, options),
  deleteTodo: (id) => ipcRenderer.invoke('delete-todo', id),
  restoreTodo: (id) => ipcRenderer.invoke('restore-todo', id),
  permanentlyDeleteTodo: (id) => ipcRenderer.invoke('permanently-delete-todo', id),
  emptyTrash: () => ipcRenderer.invoke('empty-trash'),
  getTrashCount: () => ipcRenderer.invoke('get-trash-count'),

  // Milestone operations (parent_id based - legacy)
  getChildTodos: (parentId) => ipcRenderer.invoke('get-child-todos', parentId),
  getMilestones: (projectId) => ipcRenderer.invoke('get-milestones', projectId),
  assignToMilestone: (todoId, milestoneId) => ipcRenderer.invoke('assign-to-milestone', todoId, milestoneId),
  unassignFromMilestone: (todoId) => ipcRenderer.invoke('unassign-from-milestone', todoId),

  // Milestone operations (many-to-many)
  getMilestoneTodos: (milestoneId) => ipcRenderer.invoke('get-milestone-todos', milestoneId),
  getMilestonePersons: (milestoneId) => ipcRenderer.invoke('get-milestone-persons', milestoneId),
  linkMilestoneTodo: (milestoneId, todoId) => ipcRenderer.invoke('link-milestone-todo', milestoneId, todoId),
  unlinkMilestoneTodo: (milestoneId, todoId) => ipcRenderer.invoke('unlink-milestone-todo', milestoneId, todoId),
  linkMilestonePerson: (milestoneId, personId, role) => ipcRenderer.invoke('link-milestone-person', milestoneId, personId, role),
  unlinkMilestonePerson: (milestoneId, personId) => ipcRenderer.invoke('unlink-milestone-person', milestoneId, personId),
  getAllMilestones: (projectId) => ipcRenderer.invoke('get-all-milestones', projectId),

  reorderTodos: (ids) => ipcRenderer.invoke('reorder-todos', ids),
  reorderProjects: (ids) => ipcRenderer.invoke('reorder-projects', ids),
  reorderCategories: (ids) => ipcRenderer.invoke('reorder-categories', ids),
  reorderStatuses: (ids) => ipcRenderer.invoke('reorder-statuses', ids),

  // Link operations
  getLinkedTodos: (todoId) => ipcRenderer.invoke('get-linked-todos', todoId),
  linkTodos: (sourceId, targetId) => ipcRenderer.invoke('link-todos', sourceId, targetId),
  unlinkTodos: (sourceId, targetId) => ipcRenderer.invoke('unlink-todos', sourceId, targetId),
  searchTodos: (query, excludeId) => ipcRenderer.invoke('search-todos', query, excludeId),

  // Global search
  globalSearch: (query) => ipcRenderer.invoke('global-search', query),

  // Settings operations
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),

  // Subtask operations
  getSubtasks: (todoId) => ipcRenderer.invoke('get-subtasks', todoId),
  getAllSubtasks: () => ipcRenderer.invoke('get-all-subtasks'),
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
  closeDetailWindow: (todoId) => ipcRenderer.invoke('close-detail-window', todoId),
  closeAllDetailWindows: () => ipcRenderer.invoke('close-all-detail-windows'),
  openStakeholderRegister: (projectId) => ipcRenderer.invoke('open-stakeholder-register', projectId),

  // Events
  onRefreshTodos: (callback) => {
    ipcRenderer.on('refresh-todos', callback)
    return () => ipcRenderer.removeListener('refresh-todos', callback)
  },
  onLoadTodo: (callback) => {
    ipcRenderer.on('load-todo', (_, id) => callback(id))
    return () => ipcRenderer.removeListener('load-todo', callback)
  },
  onSaveBeforeClose: (callback) => {
    ipcRenderer.on('save-before-close', callback)
    return () => ipcRenderer.removeListener('save-before-close', callback)
  },
  onDetailOpenedInWindow: (callback) => {
    ipcRenderer.on('detail-opened-in-window', (_, todoId) => callback(todoId))
    return () => ipcRenderer.removeListener('detail-opened-in-window', callback)
  },
  onEmbedTodo: (callback) => {
    ipcRenderer.on('embed-todo', (_, todoId) => callback(todoId))
    return () => ipcRenderer.removeListener('embed-todo', callback)
  },
  notifyTodoUpdated: () => ipcRenderer.send('todo-updated'),
  embedTodo: (todoId) => ipcRenderer.send('embed-todo', todoId),

  // Update operations
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_, data) => callback(data))
    return () => ipcRenderer.removeListener('update-status', callback)
  },

  // Undo/Redo operations
  undo: () => ipcRenderer.invoke('undo'),
  redo: () => ipcRenderer.invoke('redo'),
  getHistoryState: () => ipcRenderer.invoke('get-history-state'),
  onHistoryChanged: (callback) => {
    ipcRenderer.on('history-changed', (_, state) => callback(state))
    return () => ipcRenderer.removeListener('history-changed', callback)
  }
})
