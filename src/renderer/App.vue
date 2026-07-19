<template>
  <div
    class="app"
    :class="{ 'light-theme': theme === 'light', 'sidebar-collapsed': !sidebarVisible }"
    :style="{ borderLeftColor: currentProjectColor }"
  >
    <div
      v-if="!sidebarVisible"
      class="sidebar-hover-trigger"
      @mouseenter="sidebarVisible = true"
    ></div>
    <AppSidebar
      :visible="sidebarVisible"
      :pinned="sidebarPinned"
      :theme="theme"
      :on-mouse-leave="onSidebarMouseLeave"
      :on-mouse-enter="() => (sidebarVisible = true)"
      :current-filter="currentFilter"
      :projects="projects"
      :statuses="statuses"
      :all-count="allCount"
      :inbox-count="inboxCount"
      :trash-count="trashCount"
      :archive-count="archiveCount"
      :project-counts="projectCounts"
      :status-counts="statusCounts"
      :is-project-selected="isProjectSelected"
      :timezone="timezone"
      :database-path="databasePath"
      :app-version="appVersion"
      @toggle-pin="toggleSidebarPin"
      @set-filter="setFilter"
      @update:projects="projects = $event"
      @projects-reorder="onProjectDragEnd"
      @add-project="addProjectFromSidebar"
      @edit-project="editProject"
      @update:statuses="statuses = $event"
      @statuses-reorder="onStatusDragEnd"
      @add-status="addStatusFromSidebar"
      @edit-status="editStatus"
      @update:timezone="onTimezoneChange"
      @export="handleExport"
      @show-import="showImportDialog = true"
    />

    <!-- Import Dialog -->
    <div v-if="showImportDialog" class="project-modal" @click.self="showImportDialog = false">
      <div class="modal-content" @click.stop>
        <h3>Import Backup</h3>
        <p>Choose how to import the backup:</p>
        <div class="modal-actions">
          <button class="primary" @click.stop="handleImport('merge')">Merge with Existing</button>
          <button class="delete-btn" @click.stop="handleImport('replace')">Replace All Data</button>
          <button @click.stop="showImportDialog = false">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Help Modal -->
    <div v-if="showHelpModal" class="project-modal" @click.self="showHelpModal = false">
      <div class="modal-content help-modal" @click.stop>
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcuts-grid">
          <div class="shortcut-section">
            <h4>Navigation</h4>
            <div class="shortcut-item"><kbd>j</kbd> / <kbd>↓</kbd><span>Move down</span></div>
            <div class="shortcut-item"><kbd>k</kbd> / <kbd>↑</kbd><span>Move up</span></div>
            <div class="shortcut-item">
              <kbd>Enter</kbd> / <kbd>e</kbd><span>Open/Edit todo</span>
            </div>
            <div class="shortcut-item">
              <kbd>Esc</kbd><span>Close detail / Clear selection</span>
            </div>
          </div>
          <div class="shortcut-section">
            <h4>Actions</h4>
            <div class="shortcut-item"><kbd>n</kbd><span>New todo</span></div>
            <div class="shortcut-item">
              <kbd>x</kbd> / <kbd>Space</kbd><span>Toggle complete</span>
            </div>
            <div class="shortcut-item"><kbd>Delete</kbd><span>Delete todo</span></div>
            <div class="shortcut-item"><kbd>/</kbd><span>Open search</span></div>
          </div>
          <div class="shortcut-section">
            <h4>Global</h4>
            <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>K</kbd><span>Command palette</span></div>
            <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>Z</kbd><span>Undo</span></div>
            <div class="shortcut-item">
              <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd><span>Redo</span>
            </div>
            <div class="shortcut-item"><kbd>?</kbd><span>Show this help</span></div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="primary" @click="showHelpModal = false">Close</button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <StatusModal
      :status="editingStatus"
      :colors="statusColors"
      @save="saveStatusFromModal"
      @cancel="cancelEditStatus"
      @delete="deleteStatusConfirm"
    />

    <ProjectModal
      :project="editingProject"
      :colors="projectColors"
      :project-tags="editingProjectTags"
      :all-tags="allTags"
      @save="saveProjectFromModal"
      @cancel="cancelEditProject"
      @delete="deleteProjectConfirm"
      @add-tag="addProjectTag"
      @remove-tag="removeProjectTag"
    />

    <div class="main-wrapper">
      <main class="main-content">
        <header class="main-header">
          <div class="header-title-row">
            <h1 class="header-title">
              <span
                class="breadcrumb-link breadcrumb-home"
                title="Home"
                @click="setFilter('inbox')"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <template v-if="isProjectSelected">
                <span class="breadcrumb-sep"> / </span>
                <span>{{ currentProjectName }}</span>
              </template>
              <template v-else-if="currentFilter === 'inbox'">
                <span class="breadcrumb-sep"> / </span>
                <span>Inbox</span>
              </template>
              <template v-else-if="currentFilter === 'archive'">
                <span class="breadcrumb-sep"> / </span>
                <span>Archive</span>
              </template>
              <template v-else-if="currentFilter === 'trash'">
                <span class="breadcrumb-sep"> / </span>
                <span>Trash</span>
              </template>
              <template v-else-if="currentFilter === null && !showProjectsOverview">
                <span class="breadcrumb-sep"> / </span>
                <span>All</span>
              </template>
            </h1>
            <div class="header-actions">
              <button
                v-if="
                  completedCount > 0 && currentFilter !== 'archive' && currentFilter !== 'trash'
                "
                class="header-btn archive-done-btn"
                :title="`Archive ${completedCount} done item${completedCount > 1 ? 's' : ''} (Ctrl+Z to undo)`"
                @click="archiveCompletedTodos"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  style="margin-left: -2px"
                >
                  <path d="M21 8v13H3V8" />
                  <path d="M1 3h22v5H1z" />
                  <path d="M10 12h4" />
                </svg>
              </button>
              <button
                class="header-btn search-btn"
                :title="showGlobalSearch ? '' : 'Search (press /)'"
                @click="showGlobalSearch = true"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
              <button
                class="header-btn"
                :class="{ disabled: !historyState.canUndo }"
                :disabled="!historyState.canUndo"
                :title="
                  historyState.undoDescription
                    ? `Undo: ${historyState.undoDescription}`
                    : 'Nothing to undo'
                "
                @click="undo"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 10h10a5 5 0 0 1 5 5v2" />
                  <polyline points="3,10 7,6" />
                  <polyline points="3,10 7,14" />
                </svg>
              </button>
              <button
                class="header-btn"
                :class="{ disabled: !historyState.canRedo }"
                :disabled="!historyState.canRedo"
                :title="
                  historyState.redoDescription
                    ? `Redo: ${historyState.redoDescription}`
                    : 'Nothing to redo'
                "
                @click="redo"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 10H11a5 5 0 0 0-5 5v2" />
                  <polyline points="21,10 17,6" />
                  <polyline points="21,10 17,14" />
                </svg>
              </button>
              <button
                class="header-btn"
                :title="showHelpModal ? '' : 'Keyboard shortcuts (?)'"
                @click="showHelpModal = true"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
              <button
                class="theme-toggle"
                :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                @click="toggleTheme"
              >
                <span v-if="theme === 'dark'">☀️</span>
                <span v-else>🌙</span>
              </button>
            </div>
          </div>
          <div class="header-controls">
            <div class="sort-controls">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="Filter..."
                @keyup.escape="searchQuery = ''"
              />
              <select v-model="sortBy" class="sort-select">
                <option value="manual">Manual Order</option>
                <option value="created">By Created</option>
                <option value="due">By Due Date</option>
                <option value="alpha">Alphabetical</option>
              </select>
              <label class="show-completed-toggle">
                <input v-model="showCompleted" type="checkbox" />
                <span>Show done</span>
              </label>
              <label
                v-if="currentView === 'kanban' && currentFilter === null"
                class="show-completed-toggle"
              >
                <input v-model="groupByProject" type="checkbox" />
                <span>Group by project</span>
              </label>
            </div>
            <div class="view-switcher">
              <button
                v-for="view in availableViews"
                :key="view"
                :class="{ active: currentView === view }"
                :disabled="isTrashView && view === 'kanban'"
                @click="setView(view)"
              >
                {{ view.charAt(0).toUpperCase() + view.slice(1) }}
              </button>
            </div>
            <button
              v-if="isProjectSelected"
              class="notes-toggle-btn"
              :class="{ active: showProjectNotes }"
              title="Toggle project notes"
              @click="toggleProjectNotes"
            >
              Notes
            </button>
            <button
              v-if="isTrashView && trashCount > 0"
              class="empty-trash-btn"
              title="Permanently delete all items in trash (cannot be undone)"
              @click="emptyTrash"
            >
              Empty Trash
            </button>
          </div>
          <div v-if="!isTrashView" class="add-todo">
            <input
              ref="newTodoInput"
              v-model="newTodoTitle"
              placeholder="Add a new item... (press n)"
              type="text"
              @keyup.enter="addTodo"
            />
            <button @click="addTodo">Add</button>
          </div>
        </header>

        <!-- Home Landing Page / Inbox View -->
        <div v-if="showProjectsOverview || currentFilter === 'inbox'" class="home-landing">
          <!-- Project Drop Targets -->
          <div class="project-drop-targets">
            <div
              v-for="project in projects"
              :key="project.id"
              class="project-drop-target"
              :class="{ 'drag-over': dragOverProjectId === project.id }"
              :style="{ borderColor: project.color, '--project-color': project.color }"
              @click="selectProjectFromOverview(project.id)"
              @dragover.prevent="dragOverProjectId = project.id"
              @dragleave="dragOverProjectId = null"
              @drop.prevent="dropOnProject($event, project.id)"
            >
              <span class="project-name">{{ project.name }}</span>
              <span class="project-count">{{ formatProgress(projectCounts[project.id]) }}</span>
            </div>
          </div>

          <!-- Inbox Items (draggable) -->
          <div class="inbox-landing">
            <h2 v-if="inboxTodos.length > 0">Inbox</h2>
            <div class="inbox-items cards-grid">
              <CardItem
                v-for="todo in inboxTodos"
                :key="todo.id"
                :todo="todo"
                :is-draggable="true"
                :projects="projects"
                :show-project="false"
                @toggle-complete="toggleComplete(todo)"
                @delete="deleteTodo(todo.id)"
                @update-title="handleUpdateTitle(todo, $event)"
                @update-notes="handleUpdateNotes(todo, $event)"
                @archive="archiveTodo(todo.id)"
                @move-to-project="moveToProject(todo, $event)"
                @set-due-date="setDueDate(todo, $event)"
                @dragstart="onInboxDragStart($event, todo)"
              />
            </div>
            <p v-if="inboxTodos.length === 0" class="empty-inbox">
              No items in inbox. Add one above or drag items here.
            </p>
          </div>
        </div>

        <!-- Project fade transition -->
        <Transition v-else-if="currentFilter !== 'inbox'" name="fade" mode="out-in">
          <div :key="currentFilter" class="project-content">
            <!-- Project Notes -->
            <div v-if="isProjectSelected && showProjectNotes" class="project-notes-pane">
              <div class="project-notes-header">
                <span class="project-notes-title">Project Notes</span>
                <button class="project-notes-close" title="Close notes" @click="toggleProjectNotes">
                  ×
                </button>
              </div>
              <div class="project-notes-body">
                <NotesEditor
                  :model-value="projectNotesDraft"
                  @update:model-value="onProjectNotesInput"
                  @blur="flushProjectNotes"
                />
              </div>
            </div>
            <!-- Views Container -->
            <div class="views-container">
              <!-- Cards View -->
              <CardsView
                v-if="currentView === 'cards'"
                :theme="theme"
                :sorted-todos="sortedTodos"
                :grouped-todos="groupedTodos"
                :group-by-project="groupByProject"
                :is-project-view="isProjectSelected"
                :selected-todo-id="null"
                :selected-todo-ids="selectedTodoIds"
                :focused-todo-id="focusedTodo?.id"
                :is-trash-view="isTrashView"
                :is-archive-view="isArchiveView"
                :card-columns="cardColumns"
                :sort-by="sortBy"
                :current-filter="currentFilter"
                :projects="projects"
                @card-click="handleCardClick"
                @toggle-complete="toggleComplete"
                @delete-todo="deleteTodo"
                @restore-todo="restoreTodo"
                @permanent-delete-todo="permanentlyDeleteTodo"
                @unarchive-todo="unarchiveTodo"
                @update-sorted-todos="updateSortedTodos"
                @update-group-todos="updateGroupTodos"
                @add-todo-to-project="addTodoToProject"
                @marquee-select="handleMarqueeSelect"
                @update-title="handleUpdateTitle"
                @update-notes="handleUpdateNotes"
                @archive-todo="archiveTodo"
                @move-to-project="moveToProject"
                @set-due-date="setDueDate"
              />

              <!-- Kanban View -->
              <KanbanView
                v-else-if="currentView === 'kanban'"
                key="kanban"
                :group-by-project="groupByProject && currentFilter === null"
                :is-project-selected="isProjectSelected"
                :grouped-todos="groupedTodos"
                :statuses="statuses"
                :no-status-todos="noStatusTodos"
                :selected-todo-id="null"
                :selected-todo-ids="selectedTodoIds"
                :all-todos="sortedKanbanTodos"
                @card-click="handleCardClick"
                @toggle-complete="toggleComplete"
                @delete-todo="deleteTodo"
                @add-todo-to-status="addTodoToStatus"
                @update-status-todos="updateStatusTodos"
                @kanban-drop-status="onKanbanDropStatus"
                @stacked-kanban-drop="onStackedKanbanDrop"
                @update-title="handleUpdateTitle"
                @update-notes="handleUpdateNotes"
                @archive-todo="archiveTodo"
                @set-due-date="setDueDate"
              />

              <div
                v-if="filteredTodos.length === 0 && currentView !== 'kanban'"
                class="empty-state"
              >
                <p>No items yet. Add one above.</p>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Bottom Bar with Card Size Slider - outside transition -->
        <div v-if="currentView === 'cards'" class="bottom-bar">
          <div class="card-size-control">
            <label class="card-size-label">
              <span>Columns: {{ cardColumns }}</span>
              <input
                v-model.number="cardColumns"
                type="range"
                min="1"
                max="10"
                step="1"
                class="card-size-slider"
              />
            </label>
          </div>
        </div>
      </main>
    </div>

    <!-- Global Search -->
    <GlobalSearch
      :visible="showGlobalSearch"
      :recent-items="recentItems"
      @close="showGlobalSearch = false"
      @select-todo="onGlobalSearchSelectTodo"
      @select-project="onGlobalSearchSelectProject"
    />
  </div>
</template>

<script>
  import { marked } from './utils/markdown.js'
  import mermaid from 'mermaid'
  import GlobalSearch from './components/GlobalSearch.vue'
  import NotesEditor from './components/NotesEditor.vue'
  import {
    AppSidebar,
    CardsView,
    CardItem,
    KanbanView,
    StatusModal,
    ProjectModal
  } from './components/index.js'

  import { useTodos } from './composables/useTodos.js'
  import { useProjects } from './composables/useProjects.js'
  import { useStatuses } from './composables/useStatuses.js'

  // Validate and repair localStorage on startup
  const SETTINGS_VERSION = 1
  function validateLocalStorage() {
    try {
      const _storedVersion = parseInt(localStorage.getItem('settings-version') || '0')

      // Define valid values for enum-like settings
      const validViews = ['cards', 'kanban', 'calendar']
      // Keep in sync with the sort modes supported by sortTodos in useTodos.js
      const validSorts = ['manual', 'created', 'alpha', 'due']
      const validThemes = ['dark', 'light']

      // Validate current-view
      const currentView = localStorage.getItem('current-view')
      if (currentView && !validViews.includes(currentView)) {
        localStorage.setItem('current-view', 'cards')
      }

      // Validate sort-by
      const sortBy = localStorage.getItem('sort-by')
      if (sortBy && !validSorts.includes(sortBy)) {
        localStorage.setItem('sort-by', 'manual')
      }

      // Validate theme
      const theme = localStorage.getItem('todo-theme')
      if (theme && !validThemes.includes(theme)) {
        localStorage.setItem('todo-theme', 'dark')
      }

      // Validate JSON settings
      const jsonSettings = ['card-widths']
      for (const key of jsonSettings) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            JSON.parse(value)
          } catch {
            localStorage.removeItem(key)
          }
        }
      }

      // Validate numeric settings
      const cardColumns = localStorage.getItem('card-columns')
      if (
        cardColumns &&
        (isNaN(parseInt(cardColumns)) || parseInt(cardColumns) < 1 || parseInt(cardColumns) > 10)
      ) {
        localStorage.removeItem('card-columns')
      }

      // Update version
      localStorage.setItem('settings-version', String(SETTINGS_VERSION))
    } catch {
      // If validation fails, clear problematic keys
      const keysToPreserve = [] // Could preserve some keys if needed
      const allKeys = Object.keys(localStorage)
      for (const key of allKeys) {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key)
        }
      }
    }
  }

  // Run validation before anything else
  validateLocalStorage()

  const savedTheme = localStorage.getItem('todo-theme') || 'dark'
  mermaid.initialize({
    startOnLoad: false,
    theme: savedTheme === 'light' ? 'default' : 'dark',
    securityLevel: 'strict'
  })

  function reinitializeMermaid(theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'light' ? 'default' : 'dark',
      securityLevel: 'strict',
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 50,
        rankSpacing: 50,
        padding: 15,
        useMaxWidth: true
      },
      themeVariables:
        theme === 'dark'
          ? {
              primaryColor: '#0f4c75',
              primaryTextColor: '#e0e0e0',
              primaryBorderColor: '#4fc3f7',
              lineColor: '#4fc3f7',
              secondaryColor: '#0d0d0d',
              tertiaryColor: '#1a1f2e',
              background: '#1a1a1a',
              mainBkg: '#0d0d0d',
              secondBkg: '#1a1f2e',
              mainContrastColor: '#e0e0e0',
              darkMode: true,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '14px'
            }
          : {}
    })
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const mermaidExtension = {
    name: 'mermaid',
    renderer: {
      code(token) {
        // Mermaid decodes HTML entities before parsing, so escaping is safe here too
        if (token.lang === 'mermaid') {
          return `<pre class="mermaid">${escapeHtml(token.text)}</pre>`
        }
        return `<pre><code class="language-${escapeHtml(token.lang || '')}">${escapeHtml(token.text)}</code></pre>`
      }
    }
  }
  marked.use(mermaidExtension)

  export default {
    name: 'App',
    components: {
      AppSidebar,
      CardsView,
      CardItem,
      GlobalSearch,
      KanbanView,
      NotesEditor,
      StatusModal,
      ProjectModal
    },
    setup() {
      const todosComposable = useTodos()
      const projectsComposable = useProjects()
      const statusesComposable = useStatuses()

      return {
        todosComposable,
        projectsComposable,
        statusesComposable
      }
    },
    data() {
      return {
        // todos, allTodos, selectedTodoIds, focusedTodoIndex now from todosComposable
        // projects, editingProject, editingProjectTags now from projectsComposable
        // statuses, editingStatus now from statusesComposable
        currentFilter: null,
        tabViews: JSON.parse(localStorage.getItem('tab-views') || '{}'),
        activeTab: (() => {
          const saved = localStorage.getItem('active-tab')
          if (saved === 'todos' || saved === 'notes' || saved === 'split') return 'items'
          return saved || 'items'
        })(),
        showCompleted: localStorage.getItem('show-completed') === 'true',
        newTodoTitle: '',
        // editingProject: null, // now in projectsComposable
        // editingProjectTags: [], // now in projectsComposable
        // editingStatus: null, // now in statusesComposable
        // selectedTodoIds: new Set(), // now in todosComposable
        allTags: [],
        // sortBy and searchQuery are still here because they're used by the component's UI state
        sortBy: localStorage.getItem('sort-by') || 'manual',
        searchQuery: '',
        groupByProject: localStorage.getItem('group-by-project') === 'true',
        showProjectNotes: localStorage.getItem('show-project-notes') === 'true',
        projectNotesDraft: '',
        projectNotesDraftId: null,
        projectNotesSaveTimer: null,
        cardColumns: parseInt(localStorage.getItem('card-columns')) || 3,
        timezone: localStorage.getItem('timezone') || 'auto',
        dragOverProjectId: null,
        draggingInboxTodo: null,
        // projectColors now from projectsComposable
        // statusColors now from statusesComposable
        // Theme
        theme: localStorage.getItem('todo-theme') || 'dark',
        // Sidebar visibility
        sidebarVisible: localStorage.getItem('sidebar-visible') !== 'false',
        sidebarPinned: localStorage.getItem('sidebar-pinned') === 'true',
        // Trash & Archive
        trashCount: 0,
        archiveCount: 0,
        // Keyboard navigation
        // focusedTodoIndex: -1, // now in todosComposable
        // Global search
        showGlobalSearch: false,
        showProjectsOverview: false,
        recentItems: JSON.parse(localStorage.getItem('recent-items') || '[]'),
        // Export/Import
        showImportDialog: false,
        databasePath: '',
        appVersion: '',
        // History state
        historyState: {
          canUndo: false,
          canRedo: false,
          undoDescription: null,
          redoDescription: null
        },
        // Help modal
        showHelpModal: false,
        // ResizeObserver
        cardResizeObserver: null,
        resizeObserverTimeout: null
      }
    },
    computed: {
      currentView: {
        get() {
          const view = this.tabViews[this.activeTab]
          if (view && this.availableViews.includes(view)) {
            return view
          }
          return this.availableViews[0] || 'cards'
        },
        set(val) {
          this.tabViews[this.activeTab] = val
          localStorage.setItem('tab-views', JSON.stringify(this.tabViews))
        }
      },
      // Delegate to composables
      projects() {
        return this.projectsComposable.projects.value
      },
      todos() {
        return this.todosComposable.todos.value
      },
      allTodos() {
        return this.todosComposable.allTodos.value
      },
      statuses() {
        return this.statusesComposable.statuses.value
      },
      selectedTodoIds() {
        return this.todosComposable.selectedTodoIds.value
      },
      focusedTodoIndex() {
        return this.todosComposable.focusedTodoIndex.value
      },
      editingProject() {
        return this.projectsComposable.editingProject.value
      },
      editingProjectTags() {
        return this.projectsComposable.editingProjectTags.value
      },
      editingStatus() {
        return this.statusesComposable.editingStatus.value
      },
      projectColors() {
        return this.projectsComposable.projectColors
      },
      statusColors() {
        return this.statusesComposable.statusColors
      },
      currentProjectColor() {
        if (
          this.currentFilter &&
          this.currentFilter !== 'inbox' &&
          this.currentFilter !== 'trash'
        ) {
          const project = this.projects.find((p) => p.id === this.currentFilter)
          return project ? project.color : '#333'
        }
        return '#333'
      },
      isProjectSelected() {
        return typeof this.currentFilter === 'number'
      },
      currentProjectName() {
        if (!this.isProjectSelected) return ''
        const project = this.projects.find((p) => p.id === this.currentFilter)
        return project ? project.name : ''
      },
      selectedProject() {
        if (!this.isProjectSelected) return null
        return this.projects.find((p) => p.id === this.currentFilter) || null
      },
      isTrashView() {
        return this.currentFilter === 'trash'
      },
      isArchiveView() {
        return this.currentFilter === 'archive'
      },
      allCount() {
        const total = this.allTodos.length
        const done = this.allTodos.filter((t) => t.completed).length
        return { done, total }
      },
      inboxCount() {
        const inbox = this.allTodos.filter((t) => !t.project_id)
        const total = inbox.length
        const done = inbox.filter((t) => t.completed).length
        return { done, total }
      },
      projectCounts() {
        return this.projectsComposable.projectCounts.value
      },
      statusCounts() {
        return this.statusesComposable.getStatusCounts(this.allTodos)
      },
      availableViews() {
        return ['cards', 'kanban']
      },
      inboxTodos() {
        return this.filteredTodos.filter((t) => !t.project_id)
      },
      noStatusTodos() {
        return this.filteredTodos.filter((t) => !t.status_id)
      },
      focusedTodo() {
        if (this.focusedTodoIndex >= 0 && this.focusedTodoIndex < this.todos.length) {
          return this.todos[this.focusedTodoIndex]
        }
        return null
      },
      sortedTodos() {
        this.todosComposable.setSortBy(this.sortBy)
        // The composable's sortedTodos uses filteredTodos as base, which we've already set up above
        return this.todosComposable.sortedTodos.value
      },
      groupedTodos() {
        const groups = []
        const sorted = this.sortedTodos

        // Inbox group (todos without project)
        const inboxTodos = sorted.filter((t) => !t.project_id)
        if (inboxTodos.length > 0) {
          groups.push({
            id: 'inbox',
            name: 'Inbox',
            color: '#666',
            todos: inboxTodos
          })
        }

        // Project groups
        for (const project of this.projects) {
          const projectTodos = sorted.filter((t) => t.project_id === project.id)
          if (projectTodos.length > 0) {
            groups.push({
              id: project.id,
              name: project.name,
              color: project.color,
              todos: projectTodos
            })
          }
        }

        return groups
      },
      filteredTodos() {
        // Set filter state in composable for its internal computed properties
        this.todosComposable.setCurrentFilter(this.currentFilter)
        this.todosComposable.setSearchQuery(this.searchQuery)
        this.todosComposable.setShowCompleted(this.showCompleted)

        return this.todosComposable.filteredTodos.value
      },
      sortedKanbanTodos() {
        // Kanban columns must honour the sort dropdown just like the cards view.
        return this.todosComposable.sortTodos(this.filteredTodos, this.sortBy)
      },
      completedCount() {
        return this.todosComposable.completedCount.value
      }
    },
    watch: {
      currentView(val) {
        // Handle entering new view
        if (val === 'cards') {
          this.$nextTick(() => {
            this.applyMasonryLayout()
          })
        }
      },
      currentFilter() {
        // Flush any pending notes save for the project we are leaving, then load
        // the newly selected project's notes into the editor draft.
        this.flushProjectNotes()
        this.loadProjectNotesDraft()
      },
      showProjectNotes(val) {
        localStorage.setItem('show-project-notes', val)
      },
      sortedTodos() {
        if (this.currentView === 'cards') {
          this.applyMasonryLayout()
        }
      },
      groupedTodos() {
        if (this.currentView === 'cards') {
          this.applyMasonryLayout()
        }
      },
      sidebarVisible(val) {
        localStorage.setItem('sidebar-visible', val)
      },
      cardColumns(val) {
        localStorage.setItem('card-columns', val)
      },
      isProjectSelected(val) {
        if (val && this.groupByProject) {
          this.groupByProject = false
        }
      },
      groupByProject(val) {
        localStorage.setItem('group-by-project', val)
      },
      sortBy(val) {
        localStorage.setItem('sort-by', val)
      }
    },
    async mounted() {
      await this.loadData()

      // Restore last used filter from localStorage
      const savedFilter = localStorage.getItem('current-filter')
      if (savedFilter) {
        try {
          const filter = JSON.parse(savedFilter)
          // Verify the filter is valid (project still exists if it's a number)
          let restored = null
          if (filter === 'inbox' || filter === 'trash') {
            restored = filter
          } else if (typeof filter === 'number' && this.projects.some((p) => p.id === filter)) {
            restored = filter
          }
          if (restored !== null && restored !== this.currentFilter) {
            this.currentFilter = restored
            await this.loadTodos()
          }
        } catch {
          // Failed to restore filter, will use default
        }
      }
      this.databasePath = await window.api.getDatabasePath()
      this.appVersion = await window.api.getAppVersion()

      window.api.onRefreshTodos(() => {
        this.loadAllTodos()
        this.loadTodos()
        // Reapply masonry layout when todos are refreshed (e.g., after editing notes)
        if (this.currentView === 'cards') {
          this.applyMasonryLayout()
        }
      })

      // Keyboard shortcuts
      window.addEventListener('keydown', this.handleKeyDown)

      // Listen for history state changes (undo/redo)
      this.historyState = await window.api.getHistoryState()
      window.api.onHistoryChanged((state) => {
        this.historyState = state
      })

      // Add native event listener for links in markdown
      document.addEventListener('click', (event) => {
        const link = event.target.closest('a')
        if (
          link &&
          link.href &&
          (link.closest('.notes-preview') || link.closest('.card-notes-preview'))
        ) {
          event.preventDefault()
          event.stopPropagation()
          if (window.api && window.api.openExternal) {
            window.api.openExternal(link.href)
          }
        }
      })

      // Set up ResizeObserver to watch for card size changes
      this.cardResizeObserver = new ResizeObserver((_entries) => {
        // Debounce the layout update
        if (this.resizeObserverTimeout) {
          clearTimeout(this.resizeObserverTimeout)
        }
        this.resizeObserverTimeout = setTimeout(() => {
          if (this.currentView === 'cards') {
            this.applyMasonryLayout()
          }
        }, 100)
      })

      // Start observing cards after initial render
      this.$nextTick(() => {
        this.observeCards()
      })
    },
    beforeUnmount() {
      window.removeEventListener('keydown', this.handleKeyDown)
      if (this.cardResizeObserver) {
        this.cardResizeObserver.disconnect()
      }
    },
    methods: {
      formatProgress(count) {
        if (!count || typeof count !== 'object') return count || 0
        if (count.total === 0) return ''
        if (count.done === 0) return count.total
        return `${count.done}/${count.total}`
      },
      toggleShowCompleted() {
        localStorage.setItem('show-completed', this.showCompleted.toString())
      },
      onTimezoneChange(value) {
        this.timezone = value
        localStorage.setItem('timezone', value)
      },
      // Full reload of everything the UI shows; used on startup and after imports
      async loadData() {
        await this.loadProjects()
        await this.loadStatuses()
        await this.loadAllTags()
        await this.loadAllTodos()
        await this.loadTodos()
      },
      async loadProjects() {
        await this.projectsComposable.loadProjects()
        // Sync allTodos to projects composable for projectCounts
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async loadStatuses() {
        await this.statusesComposable.loadStatuses()
      },
      async loadAllTodos() {
        await this.todosComposable.loadAllTodos()
        // Always show global counts since archive/trash views show all items
        this.trashCount = await window.api.getTrashCount()
        this.archiveCount = await window.api.getArchiveCount()
        // Sync allTodos to projects composable for projectCounts
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async loadTodos() {
        await this.todosComposable.loadTodos(this.currentFilter)
      },
      updateStatusTodos(_statusId, _todos) {
        // Used by draggable for reactive updates
      },
      async persistManualOrder(orderedTodos) {
        // vuedraggable delivers the new visual order via update:model-value.
        // Persist it as sort_order, then reload so the derived (computed) lists
        // re-derive in the new order.
        await window.api.reorderTodos(orderedTodos.map((t) => t.id))
        await this.loadAllTodos()
        await this.loadTodos()
      },
      updateSortedTodos(todos) {
        this.persistManualOrder(todos)
      },
      loadProjectNotesDraft() {
        this.projectNotesDraft = this.selectedProject ? this.selectedProject.notes || '' : ''
        this.projectNotesDraftId = this.isProjectSelected ? this.currentFilter : null
      },
      toggleProjectNotes() {
        if (this.showProjectNotes) {
          // Closing: persist any pending edit before the editor unmounts.
          this.flushProjectNotes()
        }
        this.showProjectNotes = !this.showProjectNotes
        if (this.showProjectNotes) {
          this.loadProjectNotesDraft()
        }
      },
      onProjectNotesInput(value) {
        // Debounce persistence so we are not writing on every keystroke.
        this.projectNotesDraft = value
        if (this.projectNotesSaveTimer) clearTimeout(this.projectNotesSaveTimer)
        this.projectNotesSaveTimer = setTimeout(() => this.saveProjectNotes(), 500)
      },
      async saveProjectNotes() {
        if (this.projectNotesSaveTimer) {
          clearTimeout(this.projectNotesSaveTimer)
          this.projectNotesSaveTimer = null
        }
        // Save against the project the draft belongs to, not the current filter,
        // so a project switch mid-edit cannot write the draft to the wrong project.
        if (this.projectNotesDraftId === null) return
        await this.projectsComposable.updateProjectNotes(
          this.projectNotesDraftId,
          this.projectNotesDraft
        )
      },
      flushProjectNotes() {
        // Persist immediately without waiting for the debounce (e.g. on blur or
        // when switching away from the project).
        if (this.projectNotesSaveTimer) {
          this.saveProjectNotes()
        }
      },
      async onKanbanDropStatus(event) {
        const todoId = event.item?.__draggable_context?.element?.id
        if (!todoId) return

        // Get target status from the drop target element
        const targetStatusId = event.to?.dataset?.statusId
        const parsedStatusId = targetStatusId === '' ? null : parseInt(targetStatusId)

        const todo = this.allTodos.find((t) => t.id === todoId)
        if (todo && todo.status_id !== parsedStatusId) {
          const todoData = this.toPlainTodo(todo)
          todoData.status_id = parsedStatusId
          await window.api.updateTodo(todoData)
          await this.loadAllTodos()
          await this.loadTodos()
        }
      },
      async onStackedKanbanDrop(event, projectId, statusId) {
        const todoId = event.item?.__draggable_context?.element?.id
        if (!todoId) return

        const todo = this.allTodos.find((t) => t.id === todoId)
        if (todo) {
          const todoData = this.toPlainTodo(todo)
          // Update project and status based on the section/column it was dropped into.
          todoData.project_id = projectId === 'inbox' ? null : projectId
          todoData.status_id = statusId
          await window.api.updateTodo(todoData)
          await this.loadAllTodos()
          await this.loadTodos()
        }
      },
      async setFilter(filter) {
        this.currentFilter = filter
        this.showProjectsOverview = false
        // Save current filter to localStorage
        if (filter === null) {
          localStorage.removeItem('current-filter')
        } else {
          localStorage.setItem('current-filter', JSON.stringify(filter))
        }
        await this.loadTodos()
        // Refresh archive/trash counts (always global)
        this.trashCount = await window.api.getTrashCount()
        this.archiveCount = await window.api.getArchiveCount()
      },
      async addTodo() {
        if (!this.newTodoTitle.trim()) return
        const projectId =
          this.currentFilter !== null && this.currentFilter !== 'inbox' ? this.currentFilter : null
        const type = 'todo'
        const updates = { start_date: new Date().toISOString().split('T')[0] }
        await this.todosComposable.addTodo(this.newTodoTitle.trim(), projectId, type, updates)
        this.newTodoTitle = ''
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async addTodoToProject(projectId) {
        try {
          const type = 'todo'
          const todo = await window.api.createTodo('Untitled', projectId, type)
          await this.loadAllTodos()
          await this.loadTodos()
          if (todo) this.selectTodo(todo)
        } catch {
          // Todo creation failed
        }
      },
      onInboxDragStart(event, todo) {
        this.draggingInboxTodo = todo
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', todo.id)
      },
      async dropOnProject(event, projectId) {
        this.dragOverProjectId = null
        if (!this.draggingInboxTodo) return

        const todo = this.draggingInboxTodo
        todo.project_id = projectId
        const todoData = this.toPlainTodo(todo)
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
        this.draggingInboxTodo = null
      },
      async addTodoToStatus(statusId) {
        try {
          const projectId = this.isProjectSelected ? this.currentFilter : null
          const type = 'todo'
          const todo = await window.api.createTodo('Untitled', projectId, type)
          if (statusId !== null) {
            const todoData = this.toPlainTodo(todo)
            todoData.status_id = statusId
            await window.api.updateTodo(todoData)
          }
          await this.loadAllTodos()
          await this.loadTodos()
          if (todo) this.selectTodo(todo)
        } catch {
          // Todo creation failed
        }
      },
      async toggleComplete(todo) {
        await this.todosComposable.toggleComplete(todo)
        // Sync to project composable for counts
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async handleUpdateTitle(todo, newTitle) {
        await this.todosComposable.handleUpdateTitle(todo, newTitle)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async handleUpdateNotes(todo, newNotes) {
        await this.todosComposable.handleUpdateNotes(todo, newNotes)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async deleteTodo(id) {
        await this.todosComposable.deleteTodo(id)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async archiveTodo(id) {
        await this.todosComposable.archiveTodo(id)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async archiveCompletedTodos() {
        const projectId = this.isProjectSelected
          ? this.currentFilter
          : this.currentFilter === 'inbox'
            ? 'inbox'
            : null
        const count = await window.api.archiveCompletedTodos(projectId)
        if (count > 0) {
          await this.loadAllTodos()
          await this.loadTodos()
        }
      },
      async unarchiveTodo(id) {
        await this.todosComposable.unarchiveTodo(id)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async moveToProject(todo, projectId) {
        await this.todosComposable.moveToProject(todo, projectId)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async setDueDate(todo, date) {
        await this.todosComposable.setDueDate(todo, date)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async restoreTodo(id) {
        await this.todosComposable.restoreTodo(id)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async permanentlyDeleteTodo(id) {
        await this.todosComposable.permanentlyDeleteTodo(id)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async emptyTrash() {
        if (confirm('Are you sure you want to permanently delete all items in trash?')) {
          await window.api.emptyTrash()
          await this.loadAllTodos()
          await this.loadTodos()
          // Force refresh the trash count
          this.trashCount = 0
        }
      },
      updateGroupTodos(_groupId, todos) {
        this.persistManualOrder(todos)
      },
      async onProjectDragEnd() {
        await this.projectsComposable.onProjectDragEnd()
      },
      async onStatusDragEnd() {
        await this.statusesComposable.onStatusDragEnd()
      },
      handleCardClick(event, id) {
        // Check if the click was on a link
        const link = event.target.closest('a')
        if (link && link.href) {
          event.preventDefault()
          event.stopPropagation()
          if (window.api && window.api.openExternal) {
            window.api.openExternal(link.href)
          }
          return
        }

        // Multi-select with Ctrl/Cmd+click
        if (event.ctrlKey || event.metaKey) {
          if (this.selectedTodoIds.has(id)) {
            this.selectedTodoIds.delete(id)
          } else {
            this.selectedTodoIds.add(id)
          }
          // Trigger reactivity
          this.selectedTodoIds = new Set(this.selectedTodoIds)
          return
        }

        // Normal click - clear multi-select and select single
        this.selectedTodoIds.clear()
        this.selectedTodoIds = new Set()
        this.selectTodo(id)
      },
      handleMarqueeSelect(ids) {
        // Set the selected IDs from marquee selection
        this.selectedTodoIds = new Set(ids)
      },
      async selectTodo(_id) {
        // TODO: Will be implemented with popover editor
      },
      toPlainTodo(todo) {
        return this.todosComposable.toPlainTodo(todo)
      },
      async loadAllTags() {
        this.allTags = await window.api.getAllTags()
      },
      async addProjectFromSidebar(name) {
        await this.projectsComposable.addProject(name)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      async editProject(project) {
        await this.projectsComposable.editProject(project)
      },
      cancelEditProject() {
        this.projectsComposable.cancelEditProject()
      },
      async addProjectTag(tagName) {
        await this.projectsComposable.addProjectTag(tagName, this.loadAllTags.bind(this))
      },
      async removeProjectTag(tagId) {
        await this.projectsComposable.removeProjectTag(tagId)
      },
      async saveProject() {
        await this.projectsComposable.saveProject(
          this.loadAllTodos.bind(this),
          this.loadTodos.bind(this)
        )
      },
      async saveProjectFromModal(projectData) {
        this.projectsComposable.editingProject.value = projectData
        await this.saveProject()
      },
      async deleteProjectConfirm() {
        await this.projectsComposable.deleteProjectConfirm(
          this.currentFilter,
          (filter) => {
            this.currentFilter = filter
          },
          this.loadAllTodos.bind(this),
          this.loadTodos.bind(this)
        )
      },
      // Status methods
      async addStatusFromSidebar(name) {
        await this.statusesComposable.addStatus(name)
      },
      editStatus(status) {
        this.statusesComposable.editStatus(status)
      },
      cancelEditStatus() {
        this.statusesComposable.cancelEditStatus()
      },
      async saveStatus() {
        await this.statusesComposable.saveStatus(async () => {
          await this.loadAllTodos()
          await this.loadTodos()
        })
      },
      async saveStatusFromModal(statusData) {
        this.statusesComposable.editingStatus.value = statusData
        await this.saveStatus()
      },
      async deleteStatusConfirm() {
        await this.statusesComposable.deleteStatusConfirm(async () => {
          await this.loadAllTodos()
          await this.loadTodos()
        })
      },
      observeCards() {
        if (!this.cardResizeObserver) return
        // Disconnect existing observations
        this.cardResizeObserver.disconnect()
        // Observe all cards
        const cards = document.querySelectorAll('.todo-card')
        cards.forEach((card) => {
          this.cardResizeObserver.observe(card)
        })
      },
      applyMasonryLayout() {
        // Apply masonry layout to all card grids
        this.$nextTick(() => {
          setTimeout(() => {
            const grids = document.querySelectorAll('.cards-grid')
            grids.forEach((grid) => {
              const cards = grid.querySelectorAll('.todo-card')

              cards.forEach((card) => {
                const height = card.getBoundingClientRect().height
                const rowSpan = Math.ceil(height / 17) + 1
                card.style.gridRowEnd = `span ${rowSpan}`
              })
            })

            // Apply again after a short delay to catch any late-rendering content
            setTimeout(() => {
              const grids = document.querySelectorAll('.cards-grid')
              grids.forEach((grid) => {
                const cards = grid.querySelectorAll('.todo-card')

                cards.forEach((card) => {
                  const height = card.getBoundingClientRect().height
                  const rowSpan = Math.ceil(height / 17) + 1
                  card.style.gridRowEnd = `span ${rowSpan}`
                })
              })
              // Re-observe cards in case new ones were added
              this.observeCards()
            }, 200)
          }, 150)
        })
      },
      // Keyboard shortcuts
      handleKeyDown(e) {
        // Ignore if typing in input/textarea
        const target = e.target
        const isInputField =
          target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

        // Global Search: Cmd/Ctrl + K
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault()
          this.showGlobalSearch = true
          return
        }

        // Undo/Redo: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z.
        // Skip when typing in a field so native text undo still works.
        if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !isInputField) {
          e.preventDefault()
          if (e.shiftKey) {
            this.redo()
          } else {
            this.undo()
          }
          return
        }

        // Cmd+Arrow navigation
        if (e.metaKey || e.ctrlKey) {
          if (e.key === 'ArrowUp') {
            // Previous item in list
            e.preventDefault()
            const todoCount = this.todos.length
            if (todoCount > 0 && this.focusedTodoIndex > 0) {
              this.focusedTodoIndex--
              this.selectTodo(this.todos[this.focusedTodoIndex].id)
            }
            return
          }
          if (e.key === 'ArrowDown') {
            // Next item in list
            e.preventDefault()
            const todoCount = this.todos.length
            if (todoCount > 0 && this.focusedTodoIndex < todoCount - 1) {
              this.focusedTodoIndex++
              this.selectTodo(this.todos[this.focusedTodoIndex].id)
            }
            return
          }
        }

        // Escape closes everything: search, inline editing, fullscreen, detail panel, detached windows
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()

          if (this.showGlobalSearch) {
            this.showGlobalSearch = false
            return
          }
          this.focusedTodoIndex = -1
          return
        }

        // If global search is open, let it handle its own navigation
        if (this.showGlobalSearch) {
          return
        }

        // Don't process navigation shortcuts when in input field
        if (isInputField) return

        // Global shortcuts that work in any view
        switch (e.key) {
          case 'n': // New todo
            e.preventDefault()
            this.$refs.newTodoInput?.focus()
            return
          case '/': // Open search
            e.preventDefault()
            this.showGlobalSearch = true
            return
          case '?': // Show help
            e.preventDefault()
            this.showHelpModal = true
            return
        }

        // Navigation shortcuts only work in list/table/cards view with todos
        const todoCount = this.todos.length
        if (todoCount === 0) return

        switch (e.key) {
          case 'j': // Move down
          case 'ArrowDown':
            e.preventDefault()
            this.focusedTodoIndex = Math.min(this.focusedTodoIndex + 1, todoCount - 1)
            if (this.focusedTodoIndex >= 0 && this.todos[this.focusedTodoIndex]) {
              this.selectTodo(this.todos[this.focusedTodoIndex].id)
            }
            break
          case 'k': // Move up
          case 'ArrowUp':
            e.preventDefault()
            if (this.focusedTodoIndex < 0) this.focusedTodoIndex = 0
            else this.focusedTodoIndex = Math.max(this.focusedTodoIndex - 1, 0)
            if (this.todos[this.focusedTodoIndex]) {
              this.selectTodo(this.todos[this.focusedTodoIndex].id)
            }
            break
          case 'x': // Toggle complete
          case ' ': // Space also toggles
            e.preventDefault()
            if (this.focusedTodoIndex >= 0 && this.todos[this.focusedTodoIndex]) {
              this.toggleComplete(this.todos[this.focusedTodoIndex])
            }
            break
          case 'e': // Edit (open detail)
          case 'Enter':
            e.preventDefault()
            if (this.focusedTodoIndex >= 0 && this.todos[this.focusedTodoIndex]) {
              this.selectTodo(this.todos[this.focusedTodoIndex].id)
            }
            break
          case 'Delete':
            e.preventDefault()
            if (this.focusedTodoIndex >= 0 && this.todos[this.focusedTodoIndex]) {
              this.deleteTodo(this.todos[this.focusedTodoIndex].id)
              // Adjust focus after deletion
              if (this.focusedTodoIndex >= this.todos.length) {
                this.focusedTodoIndex = this.todos.length - 1
              }
            }
            break
        }
      },
      setTab(tab) {
        this.activeTab = tab
        localStorage.setItem('active-tab', tab)
        // currentView computed property will automatically get the saved view for this tab
      },
      setView(view) {
        this.currentView = view
        // Saved automatically by the computed setter
      },
      async onGlobalSearchSelectTodo(todoId) {
        // Find the todo to get its project and type
        const todo = this.allTodos.find((t) => t.id === todoId)
        if (todo) {
          // Switch to items tab
          this.setTab('items')
          // Navigate to correct project
          if (todo.project_id) {
            await this.setFilter(todo.project_id)
          } else {
            await this.setFilter('inbox')
          }
          this.$nextTick(() => {
            const index = this.todos.findIndex((t) => t.id === todoId)
            if (index >= 0) {
              this.focusedTodoIndex = index
            }
            this.selectTodo(todoId)
          })
        } else {
          // Fallback: just try to select the todo
          this.selectTodo(todoId)
        }
      },
      async onGlobalSearchSelectProject(project) {
        // Switch to items tab and navigate to project
        this.setTab('items')
        await this.setFilter(project.id)
      },
      addToRecentItems(todo) {
        if (!todo) return
        // Remove if already exists
        this.recentItems = this.recentItems.filter((t) => t.id !== todo.id)
        // Add to front
        this.recentItems.unshift({
          id: todo.id,
          title: todo.title,
          project_name: todo.project_name,
          project_id: todo.project_id,
          type: todo.type
        })
        // Keep only last 10
        this.recentItems = this.recentItems.slice(0, 10)
        // Persist
        localStorage.setItem('recent-items', JSON.stringify(this.recentItems))
      },
      async selectProjectFromOverview(projectId) {
        this.showProjectsOverview = false
        if (projectId === 'inbox') {
          await this.setFilter('inbox')
        } else {
          await this.setFilter(projectId)
        }
      },
      toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark'
        localStorage.setItem('todo-theme', this.theme)
        reinitializeMermaid(this.theme)
        // Clear processed mermaid diagrams to force re-render
        document.querySelectorAll('.mermaid[data-processed]').forEach((el) => {
          el.removeAttribute('data-processed')
        })
        this.renderMermaid()
      },
      toggleSidebarPin() {
        this.sidebarPinned = !this.sidebarPinned
        localStorage.setItem('sidebar-pinned', this.sidebarPinned)
        if (this.sidebarPinned) {
          this.sidebarVisible = true
        }
      },
      onSidebarMouseLeave() {
        if (!this.sidebarPinned) {
          this.sidebarVisible = false
        }
      },
      async undo() {
        if (!this.historyState.canUndo) return
        await window.api.undo()
        await this.loadTodos()
        await this.loadAllTodos()
      },
      async redo() {
        if (!this.historyState.canRedo) return
        await window.api.redo()
        await this.loadTodos()
        await this.loadAllTodos()
      },
      async handleExport() {
        try {
          const result = await window.api.exportData()
          if (result.success) {
            alert('Backup exported successfully!')
          }
        } catch (error) {
          alert('Failed to export backup: ' + error.message)
        }
      },
      async handleImport(mode) {
        try {
          this.showImportDialog = false
          const result = await window.api.importData(mode)
          if (result.success) {
            alert('Backup imported successfully! Reloading data...')
            await this.loadData()
          } else if (result.error) {
            alert('Failed to import backup: ' + result.error)
          }
        } catch (error) {
          alert('Failed to import backup: ' + error.message)
        }
      },
      async renderMermaid() {
        await this.$nextTick()
        try {
          await mermaid.run({
            querySelector: '.notes-preview pre.mermaid:not([data-processed])'
          })
          document.querySelectorAll('.notes-preview pre.mermaid').forEach((el) => {
            el.setAttribute('data-processed', 'true')
          })
        } catch {
          // Mermaid render failed
        }
      }
    }
  }
</script>
