/**
 * Projects composable for managing projects state and operations.
 * Provides reactive project state, CRUD operations, and computed properties.
 */

import { reactive, computed, readonly, toRefs } from 'vue'

/**
 * Project color palette.
 */
const PROJECT_COLORS = [
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
 * Reactive projects state (private).
 */
const state = reactive({
  projects: [],
  editingProject: null,
  editingProjectTags: [],
  newProjectName: '',
  showProjectInput: false,
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
    cancelAddProject()
    return
  }
  const randomColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
  await window.api.createProject(name.trim(), randomColor)
  state.newProjectName = ''
  state.showProjectInput = false
  await loadProjects()
}

/**
 * Cancel adding a new project.
 */
function cancelAddProject() {
  state.newProjectName = ''
  state.showProjectInput = false
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
  } catch {
    // Project save failed
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

  const currentProjectName = computed(() => {
    return (currentFilter) => {
      if (typeof currentFilter !== 'number') return ''
      const project = state.projects.find((p) => p.id === currentFilter)
      return project ? project.name : ''
    }
  })

  const currentProjectColor = computed(() => {
    return (currentFilter) => {
      if (currentFilter && currentFilter !== 'inbox' && currentFilter !== 'trash') {
        const project = state.projects.find((p) => p.id === currentFilter)
        return project ? project.color : '#333'
      }
      return '#333'
    }
  })

  const isProjectSelected = computed(() => {
    return (currentFilter) => {
      return typeof currentFilter === 'number'
    }
  })

  return {
    // Reactive refs
    ...toRefs(state),

    // Computed properties
    projectCounts,
    currentProjectName,
    currentProjectColor,
    isProjectSelected,

    // Constants
    projectColors: readonly(PROJECT_COLORS),

    // Methods
    loadProjects,
    addProject,
    cancelAddProject,
    editProject,
    cancelEditProject,
    saveProject,
    deleteProjectConfirm,
    onProjectDragEnd,
    addProjectTag,
    removeProjectTag,
    setAllTodos
  }
}

export default useProjects
