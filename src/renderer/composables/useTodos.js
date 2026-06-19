/**
 * Todos composable for managing todo items.
 * Provides reactive todo state that syncs with the database.
 */

import { reactive, computed, toRefs } from 'vue'

/**
 * Reactive todos state (private).
 */
const state = reactive({
  todos: [],
  allTodos: [],
  selectedTodoIds: new Set(),
  focusedTodoIndex: -1,
  _currentFilter: null,
  _searchQuery: '',
  _showCompleted: true,
  _sortBy: 'manual'
})

/**
 * Convert a todo object to plain data for API calls.
 * Strips out reactive wrappers and computed properties.
 * @param {Object} todo - The todo object to convert
 * @returns {Object} Plain todo object
 */
function toPlainTodo(todo) {
  return {
    id: todo.id,
    title: todo.title,
    notes: todo.notes,
    notes_sensitive: todo.notes_sensitive,
    end_date: todo.end_date,
    start_date: todo.start_date,
    completed: todo.completed,
    importance: todo.importance,
    project_id: todo.project_id,
    category_id: todo.category_id,
    status_id: todo.status_id,
    sort_order: todo.sort_order,
    type: todo.type,
    parent_id: todo.parent_id,
    topic_id: todo.topic_id,
    recurrence_type: todo.recurrence_type,
    recurrence_interval: todo.recurrence_interval,
    archived_at: todo.archived_at,
    deleted_at: todo.deleted_at
  }
}

/**
 * Load all todos from database.
 * Used for global operations and counts.
 */
async function loadAllTodos() {
  state.allTodos = await window.api.getTodos(null)
}

/**
 * Load todos for the current filter.
 * @param {number|string|null} filter - Project ID, 'inbox', 'trash', 'archive', or null for all
 */
async function loadTodos(filter) {
  state.todos = []
  state.todos = await window.api.getTodos(filter)
}

/**
 * Add a new todo.
 * @param {string} title - Todo title
 * @param {number|null} projectId - Project ID or null for inbox
 * @param {string} type - Todo type ('todo', 'note', 'milestone')
 * @param {Object} updates - Additional fields to set on creation
 */
async function addTodo(title, projectId = null, type = 'todo', updates = {}) {
  if (!title.trim()) return null

  const todo = await window.api.createTodo(title.trim(), projectId, type)

  if (todo && Object.keys(updates).length > 0) {
    const todoData = { ...todo, ...updates }
    await window.api.updateTodo(todoData)
  }

  await loadAllTodos()
  await loadTodos(state._currentFilter)
  return todo
}

/**
 * Delete a todo (move to trash).
 * @param {number} id - Todo ID
 */
async function deleteTodo(id) {
  await window.api.deleteTodo(id)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Toggle todo completion status.
 * Auto-sets end_date when completing if not already set.
 * Creates next recurrence for recurring tasks.
 * @param {Object} todo - The todo to toggle
 */
async function toggleComplete(todo) {
  const todoData = toPlainTodo(todo)
  const isCompleting = !todo.completed
  todoData.completed = isCompleting

  // Auto-set end_date when completing if empty
  if (isCompleting && !todoData.end_date) {
    todoData.end_date = new Date().toISOString().split('T')[0]
  }

  await window.api.updateTodo(todoData)

  // If completing a recurring task, create the next occurrence
  if (isCompleting && todo.recurrence_type) {
    await window.api.createNextRecurrence(todo.id)
  }

  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Archive a todo.
 * @param {number} id - Todo ID
 */
async function archiveTodo(id) {
  await window.api.archiveTodo(id)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Unarchive a todo.
 * @param {number} id - Todo ID
 */
async function unarchiveTodo(id) {
  await window.api.unarchiveTodo(id)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Restore a todo from trash.
 * @param {number} id - Todo ID
 */
async function restoreTodo(id) {
  await window.api.restoreTodo(id)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Permanently delete a todo.
 * Cannot be undone.
 * @param {number} id - Todo ID
 */
async function permanentlyDeleteTodo(id) {
  await window.api.permanentlyDeleteTodo(id)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Update todo title.
 * @param {Object} todo - The todo to update
 * @param {string} newTitle - New title
 */
async function handleUpdateTitle(todo, newTitle) {
  const todoData = toPlainTodo(todo)
  todoData.title = newTitle
  await window.api.updateTodo(todoData)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Update todo notes.
 * @param {Object} todo - The todo to update
 * @param {string} newNotes - New notes content
 */
async function handleUpdateNotes(todo, newNotes) {
  const todoData = toPlainTodo(todo)
  todoData.notes = newNotes
  await window.api.updateTodo(todoData)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Move todo to a different project.
 * @param {Object} todo - The todo to move
 * @param {number|null} projectId - Target project ID or null for inbox
 */
async function moveToProject(todo, projectId) {
  const todoData = toPlainTodo(todo)
  todoData.project_id = projectId
  await window.api.updateTodo(todoData)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Set a todo's due date.
 * The due date is stored in the `end_date` field; pass null to clear it.
 * @param {Object} todo - The todo to update
 * @param {string|null} date - Due date as `YYYY-MM-DD`, or null to clear
 */
async function setDueDate(todo, date) {
  const todoData = toPlainTodo(todo)
  todoData.end_date = date || null
  await window.api.updateTodo(todoData)
  await loadAllTodos()
  await loadTodos(state._currentFilter)
}

/**
 * Set internal filter state for computed properties.
 * @param {number|string|null} filter - Filter value
 */
function setCurrentFilter(filter) {
  state._currentFilter = filter
}

/**
 * Set search query for filtering.
 * @param {string} query - Search query
 */
function setSearchQuery(query) {
  state._searchQuery = query
}

/**
 * Set whether to show completed todos.
 * @param {boolean} show - Show completed flag
 */
function setShowCompleted(show) {
  state._showCompleted = show
}

/**
 * Set sort criteria.
 * @param {string} sortBy - Sort criteria ('created', 'alpha', or 'manual')
 */
function setSortBy(sortBy) {
  state._sortBy = sortBy
}

/**
 * Todos composable hook.
 * @returns {Object} Todos state and methods
 */
export function useTodos() {
  // Computed properties
  const filteredTodos = computed(() => {
    let todos = state._currentFilter === null ? state.allTodos : state.todos

    // Apply search query filter
    if (state._searchQuery.trim()) {
      const query = state._searchQuery.toLowerCase().trim()
      todos = todos.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(query)) ||
          (t.notes && t.notes.toLowerCase().includes(query))
      )
    }

    // Hide completed items if not showing them (but always show in archive/trash views)
    if (
      !state._showCompleted &&
      state._currentFilter !== 'archive' &&
      state._currentFilter !== 'trash'
    ) {
      todos = todos.filter((t) => !t.completed)
    }

    return todos
  })

  const sortedTodos = computed(() => {
    let sorted = [...filteredTodos.value]
    if (state._sortBy === 'created') {
      sorted.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at)
      })
    } else if (state._sortBy === 'alpha') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    }
    return sorted
  })

  const completedCount = computed(() => {
    const todos = state._currentFilter === null ? state.allTodos : state.todos
    return todos.filter((t) => t.completed).length
  })

  const focusedTodo = computed(() => {
    if (state.focusedTodoIndex >= 0 && state.focusedTodoIndex < state.todos.length) {
      return state.todos[state.focusedTodoIndex]
    }
    return null
  })

  return {
    // Reactive refs
    ...toRefs(state),

    // Computed properties
    filteredTodos,
    sortedTodos,
    completedCount,
    focusedTodo,

    // Methods
    loadTodos,
    loadAllTodos,
    addTodo,
    deleteTodo,
    toggleComplete,
    archiveTodo,
    unarchiveTodo,
    restoreTodo,
    permanentlyDeleteTodo,
    handleUpdateTitle,
    handleUpdateNotes,
    moveToProject,
    setDueDate,
    setCurrentFilter,
    setSearchQuery,
    setShowCompleted,
    setSortBy,

    // Utilities
    toPlainTodo
  }
}

export default useTodos
