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

  // Status operations
  getStatuses: () => ipcRenderer.invoke('get-statuses'),
  getStatus: (id) => ipcRenderer.invoke('get-status', id),
  createStatus: (name, color) => ipcRenderer.invoke('create-status', name, color),
  updateStatus: (status) => ipcRenderer.invoke('update-status', status),
  deleteStatus: (id) => ipcRenderer.invoke('delete-status', id),

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
  archiveTodo: (id) => ipcRenderer.invoke('archive-todo', id),
  archiveCompletedTodos: (projectId) => ipcRenderer.invoke('archive-completed-todos', projectId),
  unarchiveTodo: (id) => ipcRenderer.invoke('unarchive-todo', id),
  getArchiveCount: () => ipcRenderer.invoke('get-archive-count'),

  // Milestone operations (parent_id based - legacy)
  getChildTodos: (parentId) => ipcRenderer.invoke('get-child-todos', parentId),
  getMilestones: (projectId) => ipcRenderer.invoke('get-milestones', projectId),
  assignToMilestone: (todoId, milestoneId) => ipcRenderer.invoke('assign-to-milestone', todoId, milestoneId),
  unassignFromMilestone: (todoId) => ipcRenderer.invoke('unassign-from-milestone', todoId),

  // Milestone operations (many-to-many)
  getMilestoneTodos: (milestoneId) => ipcRenderer.invoke('get-milestone-todos', milestoneId),
  linkMilestoneTodo: (milestoneId, todoId) => ipcRenderer.invoke('link-milestone-todo', milestoneId, todoId),
  unlinkMilestoneTodo: (milestoneId, todoId) => ipcRenderer.invoke('unlink-milestone-todo', milestoneId, todoId),
  getAllMilestones: (projectId) => ipcRenderer.invoke('get-all-milestones', projectId),

  // Tag operations
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  getTodoTags: (todoId) => ipcRenderer.invoke('get-todo-tags', todoId),
  addTodoTag: (todoId, tagName) => ipcRenderer.invoke('add-todo-tag', todoId, tagName),
  removeTodoTag: (todoId, tagId) => ipcRenderer.invoke('remove-todo-tag', todoId, tagId),
  getProjectTags: (projectId) => ipcRenderer.invoke('get-project-tags', projectId),
  addProjectTag: (projectId, tagName) => ipcRenderer.invoke('add-project-tag', projectId, tagName),
  removeProjectTag: (projectId, tagId) => ipcRenderer.invoke('remove-project-tag', projectId, tagId),
  searchByTag: (tagName) => ipcRenderer.invoke('search-by-tag', tagName),

  reorderTodos: (ids) => ipcRenderer.invoke('reorder-todos', ids),
  reorderProjects: (ids) => ipcRenderer.invoke('reorder-projects', ids),
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

  // Recurrence operations
  createNextRecurrence: (todoId) => ipcRenderer.invoke('create-next-recurrence', todoId),

  // Export/Import operations
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (mode) => ipcRenderer.invoke('import-data', mode),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Events
  onRefreshTodos: (callback) => {
    ipcRenderer.on('refresh-todos', callback)
    return () => ipcRenderer.removeListener('refresh-todos', callback)
  },
  notifyTodoUpdated: () => ipcRenderer.send('todo-updated'),

  // Update operations
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateStatus: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('update-status', handler)
    return () => ipcRenderer.removeListener('update-status', handler)
  },

  // Undo/Redo operations
  undo: () => ipcRenderer.invoke('undo'),
  redo: () => ipcRenderer.invoke('redo'),
  getHistoryState: () => ipcRenderer.invoke('get-history-state'),
  onHistoryChanged: (callback) => {
    const handler = (_, state) => callback(state)
    ipcRenderer.on('history-changed', handler)
    return () => ipcRenderer.removeListener('history-changed', handler)
  }
})
