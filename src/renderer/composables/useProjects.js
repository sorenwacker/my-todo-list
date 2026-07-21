/**
 * Projects composable for managing projects state and operations.
 * Provides reactive project state, CRUD operations, and computed properties.
 */

import { reactive, computed, readonly, toRefs } from 'vue'
import { entityColorPalette } from '../utils/helpers.js'

/**
 * Reactive projects state (private).
 */
const state = reactive({
  projects: [],
  editingProject: null,
  editingProjectTags: [],
  _allTodos: []
})

/**
 * Load projects from database.
 */
async function loadProjects() {
  state.projects = await window.api.getProjects()
}

/**
 * Add a new project.
 * @param {string} name - Project name
 * @returns {Promise<void>}
 */
async function addProject(name) {
  if (!name.trim()) {
    return
  }
  const randomColor = entityColorPalette[Math.floor(Math.random() * entityColorPalette.length)]
  await window.api.createProject(name.trim(), randomColor)
  await loadProjects()
}

/**
 * Start editing a project.
 * @param {Object} project - Project to edit
 */
async function editProject(project) {
  state.editingProject = { ...project }
  if (project.id) {
    state.editingProjectTags = await window.api.getProjectTags(project.id)
  } else {
    state.editingProjectTags = []
  }
}

/**
 * Cancel editing a project.
 */
function cancelEditProject() {
  state.editingProject = null
  state.editingProjectTags = []
}

/**
 * Save project changes.
 * @param {Function} loadAllTodos - Callback to reload all todos
 * @param {Function} loadTodos - Callback to reload filtered todos
 */
async function saveProject(loadAllTodos, loadTodos) {
  try {
    if (!state.editingProject) return
    // Convert reactive proxy to plain object for IPC
    const projectData = {
      id: state.editingProject.id,
      name: state.editingProject.name,
      color: state.editingProject.color
    }
    await window.api.updateProject(projectData)
    await loadProjects()
    await loadAllTodos()
    await loadTodos()
    state.editingProject = null
  } catch (error) {
    console.error('Failed to save project:', error)
    throw error
  }
}

/**
 * Persist a project's notes and update local state.
 *
 * Notes are saved independently of name/color so the project notes pane does
 * not interfere with the edit-project modal.
 *
 * @param {number} id - Project ID
 * @param {string} notes - Markdown notes content
 */
async function updateProjectNotes(id, notes) {
  await window.api.updateProjectNotes(id, notes)
  const project = state.projects.find((p) => p.id === id)
  if (project) {
    project.notes = notes
  }
}

/**
 * Delete a project with confirmation.
 * @param {string|number|null} currentFilter - Current filter value
 * @param {Function} setFilter - Function to set the filter
 * @param {Function} loadAllTodos - Callback to reload all todos
 * @param {Function} loadTodos - Callback to reload filtered todos
 */
async function deleteProjectConfirm(currentFilter, setFilter, loadAllTodos, loadTodos) {
  if (confirm(`Delete project "${state.editingProject.name}"? Todos will be moved to Inbox.`)) {
    await window.api.deleteProject(state.editingProject.id)
    if (currentFilter === state.editingProject.id) {
      setFilter(null)
    }
    state.editingProject = null
    await loadProjects()
    await loadAllTodos()
    await loadTodos()
  }
}

/**
 * Handle project drag end (reordering).
 */
async function onProjectDragEnd() {
  const ids = state.projects.map((p) => p.id)
  await window.api.reorderProjects(ids)
}

/**
 * Add a tag to the editing project.
 * @param {string} tagName - Tag name to add
 * @param {Function} loadAllTags - Callback to reload all tags
 */
async function addProjectTag(tagName, loadAllTags) {
  if (!state.editingProject?.id || !tagName.trim()) return
  await window.api.addProjectTag(state.editingProject.id, tagName.trim())
  state.editingProjectTags = await window.api.getProjectTags(state.editingProject.id)
  await loadAllTags()
}

/**
 * Remove a tag from the editing project.
 * @param {number} tagId - Tag ID to remove
 */
async function removeProjectTag(tagId) {
  if (!state.editingProject?.id) return
  await window.api.removeProjectTag(state.editingProject.id, tagId)
  state.editingProjectTags = await window.api.getProjectTags(state.editingProject.id)
}

/**
 * Set the all todos array for computed properties.
 * @param {Array} todos - All todos
 */
function setAllTodos(todos) {
  state._allTodos = todos
}

/**
 * Projects composable hook.
 * @returns {Object} Projects state and methods
 */
export function useProjects() {
  // Computed properties
  const projectCounts = computed(() => {
    const counts = {}
    for (const project of state.projects) {
      const projectTodos = state._allTodos.filter((t) => t.project_id === project.id)
      const total = projectTodos.length
      const done = projectTodos.filter((t) => t.completed).length
      counts[project.id] = { done, total }
    }
    return counts
  })

  return {
    // Reactive refs
    ...toRefs(state),

    // Computed properties
    projectCounts,

    // Constants
    projectColors: readonly(entityColorPalette),

    // Methods
    loadProjects,
    addProject,
    editProject,
    cancelEditProject,
    saveProject,
    updateProjectNotes,
    deleteProjectConfirm,
    onProjectDragEnd,
    addProjectTag,
    removeProjectTag,
    setAllTodos
  }
}

export default useProjects
