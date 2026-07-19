/**
 * Statuses composable for managing status state and operations.
 * Provides reactive status management with database synchronization.
 */

import { ref, computed } from 'vue'

/**
 * Status colors palette.
 */
const STATUS_COLORS = [
  // Blues
  '#1a73e8',
  '#4285f4',
  '#0d47a1',
  '#039be5',
  '#00acc1',
  // Greens
  '#0f9d58',
  '#34a853',
  '#00897b',
  '#43a047',
  '#7cb342',
  // Reds & Pinks
  '#d93025',
  '#ea4335',
  '#c2185b',
  '#e91e63',
  '#f06292',
  // Oranges & Yellows
  '#f9a825',
  '#ff8f00',
  '#ef6c00',
  '#ff7043',
  '#ffb300',
  // Purples
  '#7b1fa2',
  '#9c27b0',
  '#673ab7',
  '#5e35b1',
  '#7e57c2',
  // Neutrals
  '#455a64',
  '#607d8b',
  '#78909c',
  '#546e7a',
  '#37474f'
]

/**
 * Reactive state (private).
 */
const state = ref({
  statuses: [],
  editingStatus: null,
  statusesCollapsed: localStorage.getItem('statuses-collapsed') === 'true',
  _initialized: false,
  _loading: false
})

/**
 * Load statuses from database.
 * Only loads once unless force is true.
 * @param {boolean} force - Force reload even if already initialized
 */
async function loadStatuses(force = false) {
  if (state.value._initialized && !force) return
  if (state.value._loading) return

  state.value._loading = true
  try {
    state.value.statuses = await window.api.getStatuses()
    state.value._initialized = true
  } catch (error) {
    console.error('Failed to load statuses:', error)
  } finally {
    state.value._loading = false
  }
}

/**
 * Add a new status.
 * @param {string} name - Status name
 */
async function addStatus(name) {
  if (!name?.trim()) {
    return
  }

  const randomColor = STATUS_COLORS[Math.floor(Math.random() * STATUS_COLORS.length)]
  await window.api.createStatus(name.trim(), randomColor)
  await loadStatuses(true)
}

/**
 * Start editing a status.
 * @param {Object} status - Status to edit
 */
function editStatus(status) {
  state.value.editingStatus = { ...status }
}

/**
 * Cancel editing a status.
 */
function cancelEditStatus() {
  state.value.editingStatus = null
}

/**
 * Save the currently editing status.
 * @param {Function} onSuccess - Optional callback after successful save
 */
async function saveStatus(onSuccess) {
  try {
    if (!state.value.editingStatus) return

    const statusData = {
      id: state.value.editingStatus.id,
      name: state.value.editingStatus.name,
      color: state.value.editingStatus.color
    }

    await window.api.updateStatus(statusData)
    await loadStatuses(true)
    state.value.editingStatus = null

    if (onSuccess) {
      await onSuccess()
    }
  } catch (error) {
    console.error('Failed to save status:', error)
    throw error
  }
}

/**
 * Delete a status with confirmation.
 * @param {Function} onSuccess - Optional callback after successful deletion
 */
async function deleteStatusConfirm(onSuccess) {
  if (!state.value.editingStatus) return

  if (confirm(`Delete status "${state.value.editingStatus.name}"?`)) {
    await window.api.deleteStatus(state.value.editingStatus.id)
    state.value.editingStatus = null
    await loadStatuses(true)

    if (onSuccess) {
      await onSuccess()
    }
  }
}

/**
 * Handle status drag and drop reordering.
 */
async function onStatusDragEnd() {
  const ids = state.value.statuses.map((s) => s.id)
  await window.api.reorderStatuses(ids)
}

/**
 * Toggle statuses section collapsed state.
 */
function toggleStatusesCollapsed() {
  state.value.statusesCollapsed = !state.value.statusesCollapsed
  localStorage.setItem('statuses-collapsed', state.value.statusesCollapsed)
}

/**
 * Get status counts from todos.
 * @param {Array} allTodos - All todos to count from
 * @returns {Object} Status counts map
 */
function getStatusCounts(allTodos) {
  const counts = {}
  for (const status of state.value.statuses) {
    counts[status.id] = allTodos.filter((t) => t.status_id === status.id).length
  }
  return counts
}

/**
 * Statuses composable hook.
 * @returns {Object} Statuses state and methods
 */
export function useStatuses() {
  return {
    // State
    statuses: computed(() => state.value.statuses),
    editingStatus: computed({
      get: () => state.value.editingStatus,
      set: (val) => {
        state.value.editingStatus = val
      }
    }),
    statusesCollapsed: computed(() => state.value.statusesCollapsed),
    statusColors: STATUS_COLORS,

    // Methods
    loadStatuses,
    addStatus,
    editStatus,
    cancelEditStatus,
    saveStatus,
    deleteStatusConfirm,
    onStatusDragEnd,
    toggleStatusesCollapsed,
    getStatusCounts,

    // State flags
    isInitialized: () => state.value._initialized,
    isLoading: () => state.value._loading
  }
}

export default useStatuses
