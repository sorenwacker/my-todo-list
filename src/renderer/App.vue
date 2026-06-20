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
                @drag-end="onDragEnd"
                @update-group-todos="updateGroupTodos"
                @group-drag-end="onGroupDragEnd"
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
  import { renderCardMarkdown, renderInlineMarkdown, marked } from './utils/markdown.js'
  import mermaid from 'mermaid'
  import GlobalSearch from './components/GlobalSearch.vue'
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
      const validSorts = ['manual', 'created', 'alpha']
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
      const jsonSettings = ['card-sizes-v2', 'card-widths']
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

  const mermaidExtension = {
    name: 'mermaid',
    renderer: {
      code(token) {
        if (token.lang === 'mermaid') {
          return `<pre class="mermaid">${token.text}</pre>`
        }
        return `<pre><code class="language-${token.lang || ''}">${token.text}</code></pre>`
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
        // projects, editingProject, editingProjectTags, newProjectName, showProjectInput now from projectsComposable
        // statuses, editingStatus, newStatusName, showStatusInput now from statusesComposable
        currentFilter: null,
        tabViews: JSON.parse(localStorage.getItem('tab-views') || '{}'),
        activeTab: (() => {
          const saved = localStorage.getItem('active-tab')
          if (saved === 'todos' || saved === 'notes' || saved === 'split') return 'items'
          return saved || 'items'
        })(),
        showCompleted: localStorage.getItem('show-completed') === 'true',
        newTodoTitle: '',
        // newProjectName: '', // now in projectsComposable
        // newStatusName: '', // now in statusesComposable
        // showProjectInput: false, // now in projectsComposable
        // showStatusInput: false, // now in statusesComposable
        // editingProject: null, // now in projectsComposable
        // editingProjectTags: [], // now in projectsComposable
        // editingStatus: null, // now in statusesComposable
        // selectedTodoIds: new Set(), // now in todosComposable
        milestoneRelations: {}, // { milestoneId: { todos: [] } }
        allTags: [],
        saveTimeout: null,
        // sortBy and searchQuery are still here because they're used by the component's UI state
        sortBy: localStorage.getItem('sort-by') || 'manual',
        searchQuery: '',
        groupByProject: localStorage.getItem('group-by-project') === 'true',
        cardColumns: parseInt(localStorage.getItem('card-columns')) || 3,
        cardSizes: JSON.parse(localStorage.getItem('card-sizes-v2') || '{}'),
        timezone: localStorage.getItem('timezone') || 'auto',
        gridSize: 100,
        filterProjectId: null,
        importanceFilterOp: 'none',
        importanceFilterValue: 3,
        timelineScale: 100,
        timelineMode: 'gantt',
        calendarDate: new Date(),
        timelineOffset: 0,
        ganttGroupBy: 'project',
        draggingBarId: null,
        draggingBarTodo: null,
        barDragStartX: 0,
        barDragStartY: 0,
        barDragMode: 'move',
        barDragOriginalDates: null,
        lastDeltaDays: 0,
        dropTargetRowId: null,
        dragOverProjectId: null,
        draggingInboxTodo: null,
        altKeyHeld: false,
        // View transition properties
        viewTransitionDirection: 'forward',
        previousViewIndex: 0,
        projectTransitionDirection: 'forward',
        previousProjectFilter: null,
        tabTransitionDirection: 'forward',
        // projectColors now from projectsComposable
        // statusColors now from statusesComposable
        // Theme
        theme: localStorage.getItem('todo-theme') || 'dark',
        // Sidebar visibility
        sidebarVisible: localStorage.getItem('sidebar-visible') !== 'false',
        sidebarPinned: localStorage.getItem('sidebar-pinned') === 'true',
        statusesCollapsed: localStorage.getItem('statuses-collapsed') === 'true',
        settingsCollapsed: localStorage.getItem('settings-collapsed') !== 'false',
        // Trash & Archive
        trashCount: 0,
        archiveCount: 0,
        // Keyboard navigation
        // focusedTodoIndex: -1, // now in todosComposable
        // Global search
        showGlobalSearch: false,
        showProjectsOverview: false,
        recentItems: JSON.parse(localStorage.getItem('recent-items') || '[]'),
        // Type filter
        typeFilter: localStorage.getItem('type-filter') || 'all',
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
      newProjectName: {
        get() {
          return this.projectsComposable.newProjectName.value
        },
        set(val) {
          this.projectsComposable.newProjectName.value = val
        }
      },
      showProjectInput() {
        return this.projectsComposable.showProjectInput.value
      },
      editingStatus() {
        return this.statusesComposable.editingStatus.value
      },
      newStatusName: {
        get() {
          return this.statusesComposable.newStatusName.value
        },
        set(val) {
          this.statusesComposable.newStatusName.value = val
        }
      },
      showStatusInput() {
        return this.statusesComposable.showStatusInput.value
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
      currentTitle() {
        if (this.currentFilter === null) return 'Items'
        if (this.currentFilter === 'inbox') return 'Inbox'
        if (this.currentFilter === 'trash') return 'Trash'
        const project = this.projects.find((p) => p.id === this.currentFilter)
        return project ? project.name : 'Items'
      },
      currentProjectName() {
        if (!this.isProjectSelected) return ''
        const project = this.projects.find((p) => p.id === this.currentFilter)
        return project ? project.name : ''
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
      // Tab-related computed properties
      itemsCount() {
        const todos = this.isProjectSelected
          ? this.allTodos.filter((t) => t.project_id === this.currentFilter)
          : this.allTodos
        return todos.filter((t) => !t.deleted_at).length
      },
      availableViews() {
        return ['cards', 'kanban']
      },
      currentViewIndex() {
        return this.availableViews.indexOf(this.currentView)
      },
      viewTransitionName() {
        return this.viewTransitionDirection === 'forward' ? 'cube' : 'cube-reverse'
      },
      projectTransitionName() {
        return this.projectTransitionDirection === 'forward'
          ? 'project-cube'
          : 'project-cube-reverse'
      },
      projectTransitionKey() {
        // Generate a key that changes when project changes
        return `project-${this.currentFilter}`
      },
      tabTransitionName() {
        return this.tabTransitionDirection === 'forward' ? 'tab-slide' : 'tab-slide-reverse'
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

        let todos = this.todosComposable.filteredTodos.value
        if (this.filterProjectId !== null) {
          todos = todos.filter((t) => t.project_id === this.filterProjectId)
        }
        return todos
      },
      sortedKanbanTodos() {
        // Kanban columns must honour the sort dropdown just like the cards view.
        return this.todosComposable.sortTodos(this.filteredTodos, this.sortBy)
      },
      completedCount() {
        return this.todosComposable.completedCount.value
      },
      timelineTodos() {
        // Only show todos that have at least one date (start_date or end_date)
        return [...this.filteredTodos]
          .filter((t) => t.start_date || t.end_date)
          .sort((a, b) => {
            // Sort by start_date, then end_date, then created_at
            const aDate = a.start_date || a.end_date || a.created_at
            const bDate = b.start_date || b.end_date || b.created_at
            return new Date(aDate) - new Date(bDate)
          })
      },
      timelineRange() {
        const now = new Date()
        if (this.timelineTodos.length === 0) {
          // Show current month + 2 months when no todos with dates
          const end = new Date(now)
          end.setMonth(end.getMonth() + 2)
          const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1
          return { start: now, end, days }
        }
        const allDates = []
        this.timelineTodos.forEach((t) => {
          if (t.start_date) allDates.push(new Date(t.start_date))
          if (t.end_date) allDates.push(new Date(t.end_date))
        })
        allDates.push(now) // Include today
        // Add a date 2 months from now to ensure timeline extends into the future
        const futureDate = new Date(now)
        futureDate.setMonth(futureDate.getMonth() + 2)
        allDates.push(futureDate)
        const start = new Date(Math.min(...allDates))
        const end = new Date(Math.max(...allDates))
        start.setDate(start.getDate() - 1)
        end.setDate(end.getDate() + 1)
        const days = Math.max(14, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)
        return { start, end, days }
      },
      timelineDates() {
        const dates = []
        const start = new Date(this.timelineRange.start)
        for (let i = 0; i < this.timelineRange.days; i++) {
          const d = new Date(start)
          d.setDate(start.getDate() + i)
          dates.push(d)
        }
        return dates
      },
      todayPosition() {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const start = new Date(this.timelineRange.start)
        start.setHours(0, 0, 0, 0)
        const diffDays = (today - start) / (1000 * 60 * 60 * 24)
        if (diffDays < 0 || diffDays > this.timelineRange.days) {
          return -1
        }
        return diffDays * this.timelineScale
      },
      calendarPeriodLabel() {
        const opts = { month: 'long', year: 'numeric' }
        if (this.timelineMode === 'day') {
          return this.calendarDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        } else if (this.timelineMode === 'week') {
          const start = this.getWeekStart(this.calendarDate)
          const end = new Date(start)
          end.setDate(end.getDate() + 6)
          return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        }
        return this.calendarDate.toLocaleDateString('en-US', opts)
      },
      calendarMonthDays() {
        const year = this.calendarDate.getFullYear()
        const month = this.calendarDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startPadding = firstDay.getDay()
        const days = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        for (let i = startPadding - 1; i >= 0; i--) {
          const date = new Date(year, month, -i)
          days.push({
            date: this.formatDateKey(date),
            dayNumber: date.getDate(),
            isCurrentMonth: false,
            isToday: date.getTime() === today.getTime(),
            isWeekend: date.getDay() === 0 || date.getDay() === 6
          })
        }
        for (let d = 1; d <= lastDay.getDate(); d++) {
          const date = new Date(year, month, d)
          days.push({
            date: this.formatDateKey(date),
            dayNumber: d,
            isCurrentMonth: true,
            isToday: date.getTime() === today.getTime(),
            isWeekend: date.getDay() === 0 || date.getDay() === 6
          })
        }
        const remaining = 42 - days.length
        for (let i = 1; i <= remaining; i++) {
          const date = new Date(year, month + 1, i)
          days.push({
            date: this.formatDateKey(date),
            dayNumber: i,
            isCurrentMonth: false,
            isToday: date.getTime() === today.getTime(),
            isWeekend: date.getDay() === 0 || date.getDay() === 6
          })
        }
        return days
      },
      calendarWeekDays() {
        const start = this.getWeekStart(this.calendarDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const days = []
        for (let i = 0; i < 7; i++) {
          const date = new Date(start)
          date.setDate(date.getDate() + i)
          days.push({
            date: this.formatDateKey(date),
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNumber: date.getDate(),
            isToday: date.getTime() === today.getTime(),
            isWeekend: date.getDay() === 0 || date.getDay() === 6
          })
        }
        return days
      },
      calendarDayTodos() {
        return this.getTodosForCalendarDate(this.formatDateKey(this.calendarDate))
      },
      dateLabelInterval() {
        // Determine how many days to skip between labels based on zoom level
        if (this.timelineScale >= 80) return 1 // Show every day
        if (this.timelineScale >= 40) return 2 // Every 2 days
        if (this.timelineScale >= 25) return 7 // Weekly
        return 14 // Every 2 weeks
      },
      ganttRows() {
        const rows = []
        const todos = this.timelineTodos

        // Helper to calculate lanes for todos to avoid overlaps
        const assignLanes = (rowTodos) => {
          const todoLanes = {}
          const lanes = [] // Each lane is an array of { end: endPosition }

          // Sort todos by start date (items without dates are already filtered out)
          const sortedTodos = [...rowTodos].sort((a, b) => {
            const aStart = a.start_date ? new Date(a.start_date) : new Date(a.end_date)
            const bStart = b.start_date ? new Date(b.start_date) : new Date(b.end_date)
            return aStart - bStart
          })

          for (const todo of sortedTodos) {
            const startDate = todo.start_date ? new Date(todo.start_date) : new Date(todo.end_date)
            const endDate = todo.end_date ? new Date(todo.end_date) : startDate
            const startPos = this.getTimelinePosition(startDate)
            const endPos = this.getTimelinePosition(endDate) + 20 // Add minimum width

            // Find the first lane where this todo fits
            let assignedLane = -1
            for (let i = 0; i < lanes.length; i++) {
              if (lanes[i] <= startPos) {
                assignedLane = i
                lanes[i] = endPos
                break
              }
            }

            // If no lane fits, create a new one
            if (assignedLane === -1) {
              assignedLane = lanes.length
              lanes.push(endPos)
            }

            todoLanes[todo.id] = assignedLane
          }

          return { todoLanes, laneCount: Math.max(1, lanes.length) }
        }

        if (this.ganttGroupBy === 'project') {
          // Inbox row
          const inboxTodos = todos.filter((t) => !t.project_id)
          if (inboxTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(inboxTodos)
            rows.push({
              id: 'inbox',
              name: 'Inbox',
              color: '#666',
              todos: inboxTodos,
              todoLanes,
              laneCount
            })
          }
          // Project rows
          for (const project of this.projects) {
            const projectTodos = todos.filter((t) => t.project_id === project.id)
            if (projectTodos.length > 0) {
              const { todoLanes, laneCount } = assignLanes(projectTodos)
              rows.push({
                id: project.id,
                name: project.name,
                color: project.color,
                todos: projectTodos,
                todoLanes,
                laneCount
              })
            }
          }
        } else if (this.ganttGroupBy === 'importance') {
          // Group by importance (5 to 1)
          for (let i = 5; i >= 1; i--) {
            const impTodos = todos.filter((t) => (t.importance || 0) === i)
            if (impTodos.length > 0) {
              const { todoLanes, laneCount } = assignLanes(impTodos)
              rows.push({
                id: `imp-${i}`,
                name: `Importance ${i}`,
                color: this.getImportanceColor(i),
                todos: impTodos,
                todoLanes,
                laneCount
              })
            }
          }
        } else if (this.ganttGroupBy === 'milestone') {
          // Milestones are todos with type='milestone'
          const milestones = todos.filter((t) => t.type === 'milestone')

          // Collect all todo IDs that are assigned to any milestone
          const assignedTodoIds = new Set()
          for (const milestone of milestones) {
            const rel = this.milestoneRelations[milestone.id]
            if (rel?.todos) {
              rel.todos.forEach((t) => assignedTodoIds.add(t.id))
            }
          }

          // Unassigned todos (not milestones themselves, not linked to any milestone)
          const unassignedTodos = todos.filter(
            (t) => t.type !== 'milestone' && !assignedTodoIds.has(t.id)
          )

          // Unassigned todos row
          if (unassignedTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(unassignedTodos)
            rows.push({
              id: 'unassigned',
              name: 'Unassigned',
              color: '#666',
              todos: unassignedTodos,
              todoLanes,
              laneCount
            })
          }

          // Milestone rows with their linked todos
          for (const milestone of milestones) {
            const rel = this.milestoneRelations[milestone.id] || { todos: [] }
            const linkedTodos = rel.todos || []
            const milestoneTodos = [milestone, ...linkedTodos]
            if (milestoneTodos.length > 0) {
              const { todoLanes, laneCount } = assignLanes(milestoneTodos)
              rows.push({
                id: `milestone-${milestone.id}`,
                name: milestone.title,
                color: milestone.project_color || '#ffc107',
                todos: milestoneTodos,
                todoLanes,
                laneCount,
                isMilestone: true,
                milestone: milestone
              })
            }
          }
        }

        return rows
      }
    },
    watch: {
      currentView(val, oldVal) {
        // Determine transition direction based on view order
        const views = this.availableViews
        const oldIndex = views.indexOf(oldVal)
        const newIndex = views.indexOf(val)
        this.viewTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'
        this.previousViewIndex = oldIndex

        // Handle entering new view
        if (val === 'cards') {
          this.$nextTick(() => {
            this.applyMasonryLayout()
          })
        } else if (val === 'timeline' && this.ganttGroupBy === 'milestone') {
          this.loadMilestoneRelations()
        }
      },
      activeTab(val, oldVal) {
        // Determine tab transition direction
        const tabOrder = ['items']
        const oldIndex = tabOrder.indexOf(oldVal)
        const newIndex = tabOrder.indexOf(val)
        this.tabTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'
      },
      currentFilter(val, oldVal) {
        // Determine project transition direction
        const getFilterIndex = (filter) => {
          if (filter === null) return 0
          if (filter === 'inbox') return 1
          if (filter === 'trash') return 2
          // For project IDs, find index in projects array
          const idx = this.projects.findIndex((p) => p.id === filter)
          return idx >= 0 ? idx + 3 : 999
        }
        const oldIndex = getFilterIndex(oldVal)
        const newIndex = getFilterIndex(val)
        this.projectTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'
        this.previousProjectFilter = oldVal
      },
      ganttGroupBy(val) {
        // Load milestone relations when grouping by milestone
        if (val === 'milestone' && this.currentView === 'timeline') {
          this.loadMilestoneRelations()
        }
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
      await this.loadProjects()
      await this.loadStatuses()
      await this.loadAllTags()
      await this.loadAllTodos()

      // Restore last used filter from localStorage
      const savedFilter = localStorage.getItem('current-filter')
      if (savedFilter) {
        try {
          const filter = JSON.parse(savedFilter)
          // Verify the filter is valid (project still exists if it's a number)
          if (filter === 'inbox' || filter === 'trash') {
            this.currentFilter = filter
          } else if (typeof filter === 'number') {
            const projectExists = this.projects.some((p) => p.id === filter)
            if (projectExists) {
              this.currentFilter = filter
            }
          }
        } catch {
          // Failed to restore filter, will use default
        }
      }

      await this.loadTodos()
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
      window.addEventListener('keyup', this.handleKeyUp)

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
      window.removeEventListener('keyup', this.handleKeyUp)
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
      renderCardMarkdown(text) {
        return renderCardMarkdown(text)
      },
      renderInlineMarkdown(text) {
        return renderInlineMarkdown(text)
      },
      onGroupByProjectChange() {
        if (this.currentView === 'cards') {
          this.$nextTick(() => {
            this.applyMasonryLayout()
          })
        }
      },
      getInitials(name) {
        if (!name) return ''
        const parts = name.trim().split(' ')
        if (parts.length === 1) {
          return parts[0].substring(0, 2)
        }
        return parts[0][0] + parts[parts.length - 1][0]
      },
      toggleShowCompleted() {
        localStorage.setItem('show-completed', this.showCompleted.toString())
      },
      onTimezoneChange(value) {
        this.timezone = value
        localStorage.setItem('timezone', value)
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
      async loadMilestoneRelations() {
        // Load todos and persons for all milestones
        const milestones = this.allTodos.filter((t) => t.type === 'milestone')
        const relations = {}
        for (const milestone of milestones) {
          const todos = await window.api.getMilestoneTodos(milestone.id)
          relations[milestone.id] = { todos }
        }
        this.milestoneRelations = relations
      },
      renderCardNotes(notes) {
        if (!notes) return ''
        // Strip mermaid code blocks and replace with placeholder (for performance)
        const processed = notes.replace(/```mermaid[\s\S]*?```/g, '[diagram]')
        // Render full notes - CSS handles overflow with scrolling for resizable cards
        return renderCardMarkdown(processed)
      },
      getStatusCount(statusId) {
        return this.allTodos.filter((t) => t.status_id === statusId).length
      },
      getStatusTodos(statusId) {
        return this.filteredTodos.filter((t) => t.status_id === statusId)
      },
      getProjectCount(projectId) {
        return this.allTodos.filter((t) => t.project_id === projectId).length
      },
      updateStatusTodos(_statusId, _todos) {
        // Used by draggable for reactive updates
      },
      updateSortedTodos(todos) {
        // Update the internal todos array for drag-and-drop
        this.todos = todos
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
      async addMilestone() {
        const projectId =
          this.currentFilter !== null && this.currentFilter !== 'inbox' ? this.currentFilter : null
        try {
          const milestone = await window.api.createTodo('New Milestone', projectId, 'milestone')
          await this.loadAllTodos()
          await this.loadTodos()
          if (milestone && milestone.id) this.selectTodo(milestone.id)
        } catch {
          // Milestone creation failed
        }
      },
      async createTodoOnDate(dateKey) {
        const projectId =
          this.currentFilter !== null && this.currentFilter !== 'inbox' ? this.currentFilter : null
        try {
          const type = 'todo'
          const todo = await window.api.createTodo('New Task', projectId, type)
          if (todo && todo.id) {
            await window.api.updateTodo({ id: todo.id, start_date: dateKey, end_date: dateKey })
            await this.loadAllTodos()
            await this.loadTodos()
            this.selectTodo(todo.id)
          }
        } catch {
          // Todo creation failed
        }
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
      onInboxDragEnd() {
        this.draggingInboxTodo = null
        this.dragOverProjectId = null
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
      onTimelineChartDblClick(event) {
        // Only handle if clicked on empty area (not on a bar or row)
        if (event.target.closest('.gantt-bar') || event.target.closest('.gantt-row-bg')) {
          return // Let the row handler handle it
        }
        this.createTodoFromTimeline(event, null)
      },
      async createTodoFromTimeline(event, _row) {
        // Calculate date from click position
        const chartArea = this.$refs.ganttChartArea
        const rect = chartArea.getBoundingClientRect()
        const clickX = event.clientX - rect.left + this.timelineOffset
        const dayIndex = Math.floor(clickX / this.timelineScale)
        const startDate = new Date(this.timelineRange.start)
        startDate.setDate(startDate.getDate() + dayIndex)
        const dateStr = startDate.toISOString().split('T')[0]

        // Determine project ID - use current filter if it's a project
        const projectId =
          this.currentFilter !== null &&
          this.currentFilter !== 'inbox' &&
          this.currentFilter !== 'trash'
            ? this.currentFilter
            : null

        // Create todo and update with start date
        const type = 'todo'
        const todo = await window.api.createTodo('New Todo', projectId, type)
        todo.start_date = dateStr
        const todoData = this.toPlainTodo(todo)
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
        this.selectTodo(todo.id)
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
      async onDragEnd() {
        const ids = this.todos.map((t) => t.id)
        await window.api.reorderTodos(ids)
      },
      updateGroupTodos(groupId, todos) {
        // Update todos for a specific group
        const group = this.groupedTodos.find((g) => g.id === groupId)
        if (group) {
          group.todos = todos
        }
      },
      async onGroupDragEnd(groupId, _event) {
        // Get the todos from this specific group and reorder them
        const group = this.groupedTodos.find((g) => g.id === groupId)
        if (group && group.todos) {
          const ids = group.todos.map((t) => t.id)
          await window.api.reorderTodos(ids)
        }
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
      handleRowClick(event, id) {
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
      formatDeadline(deadline) {
        if (!deadline) return ''
        const date = new Date(deadline)
        return date.toISOString().split('T')[0]
      },
      formatShortDate(dateStr) {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toISOString().split('T')[0]
      },
      isOverdue(deadline) {
        if (!deadline) return false
        return new Date(deadline) < new Date()
      },
      showAddProject() {
        this.showProjectInput = true
        this.$nextTick(() => {
          this.$refs.projectInput?.focus()
        })
      },
      async addProject() {
        if (!this.newProjectName.trim()) {
          this.cancelAddProject()
          return
        }
        const randomColor =
          this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
        await window.api.createProject(this.newProjectName.trim(), randomColor)
        this.newProjectName = ''
        this.showProjectInput = false
        await this.loadProjects()
      },
      async addProjectFromSidebar(name) {
        await this.projectsComposable.addProject(name)
        this.projectsComposable.setAllTodos(this.allTodos)
      },
      cancelAddProject() {
        this.projectsComposable.cancelAddProject()
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
      showAddStatus() {
        this.showStatusInput = true
        this.$nextTick(() => {
          this.$refs.statusInput?.focus()
        })
      },
      async addStatus() {
        if (!this.newStatusName.trim()) {
          this.cancelAddStatus()
          return
        }
        const randomColor = this.statusColors[Math.floor(Math.random() * this.statusColors.length)]
        await window.api.createStatus(this.newStatusName.trim(), randomColor)
        this.newStatusName = ''
        this.showStatusInput = false
        await this.loadStatuses()
      },
      async addStatusFromSidebar(name) {
        await this.statusesComposable.addStatus(name)
      },
      cancelAddStatus() {
        this.statusesComposable.cancelAddStatus()
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
      formatCreatedDate(createdAt) {
        if (!createdAt) return ''
        const date = new Date(createdAt)
        return (
          date.toLocaleDateString() +
          ' ' +
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        )
      },
      // Timeline methods
      formatTimelineDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      },
      getWeekdayName(date) {
        return date.toLocaleDateString('en-US', { weekday: 'short' })
      },
      // Calendar methods
      formatDateKey(date) {
        return date.toISOString().split('T')[0]
      },
      getWeekStart(date) {
        const d = new Date(date)
        const day = d.getDay()
        d.setDate(d.getDate() - day)
        d.setHours(0, 0, 0, 0)
        return d
      },
      navigateCalendar(direction) {
        const d = new Date(this.calendarDate)
        if (this.timelineMode === 'month') {
          d.setMonth(d.getMonth() + direction)
        } else if (this.timelineMode === 'week') {
          d.setDate(d.getDate() + direction * 7)
        } else {
          d.setDate(d.getDate() + direction)
        }
        this.calendarDate = d
      },
      goToToday() {
        this.calendarDate = new Date()
      },
      getTodosForCalendarDate(dateKey) {
        return this.sortedTodos.filter((t) => {
          if (!t.start_date && !t.end_date) return false
          const start = t.start_date || t.end_date
          const end = t.end_date || t.start_date
          return dateKey >= start && dateKey <= end
        })
      },
      isToday(date) {
        const today = new Date()
        return (
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
        )
      },
      isWeekend(date) {
        const day = date.getDay()
        return day === 0 || day === 6
      },
      shouldShowDateLabel(index) {
        // Always show first date
        if (index === 0) return true
        // Show based on interval determined by zoom level
        const interval = this.dateLabelInterval
        // For weekly interval, show Mondays
        if (interval === 7) {
          const date = this.timelineDates[index]
          return date.getDay() === 1 // Monday
        }
        // For bi-weekly, show every other Monday
        if (interval === 14) {
          const date = this.timelineDates[index]
          if (date.getDay() !== 1) return false
          // Count Mondays from start
          const mondayCount = this.timelineDates
            .slice(0, index)
            .filter((d) => d.getDay() === 1).length
          return mondayCount % 2 === 0
        }
        return index % interval === 0
      },
      getTimelinePosition(dateStr) {
        const date = new Date(dateStr)
        const start = this.timelineRange.start
        const diffDays = (date - start) / (1000 * 60 * 60 * 24)
        return diffDays * this.timelineScale
      },
      getGanttBarStyle(todo, row) {
        const startDate = todo.start_date ? new Date(todo.start_date) : new Date(todo.end_date)
        const endDate = todo.end_date ? new Date(todo.end_date) : startDate
        const startPos = this.getTimelinePosition(startDate)
        const endPos = this.getTimelinePosition(endDate)
        const width = Math.max(endPos - startPos, 20)
        const lane = row?.todoLanes?.[todo.id] || 0
        const barHeight = 26
        const barGap = 4
        return {
          left: startPos + 'px',
          width: width + 'px',
          background: todo.project_color || '#0f4c75',
          top: 6 + lane * (barHeight + barGap) + 'px',
          height: barHeight + 'px'
        }
      },
      getRowHeight(row) {
        const lanes = row.laneCount || 1
        const barHeight = 26
        const barGap = 4
        return Math.max(50, 12 + lanes * (barHeight + barGap))
      },
      getImportanceColor(level) {
        const colors = { 5: '#e74c3c', 4: '#e67e22', 3: '#f1c40f', 2: '#3498db', 1: '#95a5a6' }
        return colors[level] || '#666'
      },
      // Individual card sizing methods
      getCardStyle(todoId, projectColor) {
        const size = this.cardSizes[todoId]
        const style = { borderTopColor: projectColor || '#0f4c75' }
        if (size && size.height) {
          // Only apply saved height when user has manually resized
          style.height = size.height + 'px'
        }
        // Otherwise let the card size naturally based on content (no min-height)
        return style
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
      saveCardSizes() {
        localStorage.setItem('card-sizes-v2', JSON.stringify(this.cardSizes))
      },
      resetCardSize(todoId, event) {
        event.stopPropagation()
        delete this.cardSizes[todoId]
        this.saveCardSizes()
      },
      // Bar drag methods for timeline
      startBarDrag(e, todo, mode = 'move') {
        // Don't allow dragging milestones to other rows
        if (todo.type === 'milestone') mode = 'move'
        this.draggingBarId = todo.id
        this.draggingBarTodo = todo
        this.barDragStartX = e.clientX
        this.barDragStartY = e.clientY
        this.barDragMode = mode // 'move', 'resize-start', or 'resize-end'
        this.barDragOriginalDates = {
          start_date: todo.start_date,
          end_date: todo.end_date,
          parent_id: todo.parent_id
        }
        this.lastDeltaDays = 0
        this.dropTargetRowId = null
        document.addEventListener('mousemove', this.onBarDrag)
        document.addEventListener('mouseup', this.stopBarDrag)
        e.preventDefault()
      },
      onBarDrag(e) {
        if (!this.draggingBarTodo) return
        const deltaX = e.clientX - this.barDragStartX
        const deltaDays = Math.round(deltaX / this.timelineScale)

        const todo = this.draggingBarTodo
        const mode = this.barDragMode

        // Detect drop target row when grouped by milestone
        if (this.ganttGroupBy === 'milestone' && todo.type !== 'milestone') {
          const ganttRows = this.$refs.ganttChartArea?.querySelectorAll('.gantt-row')
          if (ganttRows) {
            let foundRow = null
            ganttRows.forEach((rowEl, index) => {
              const rect = rowEl.getBoundingClientRect()
              if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const row = this.ganttRows[index]
                if (row && row.isMilestone && row.milestone?.id !== todo.id) {
                  foundRow = row.id
                } else if (row && row.id === 'unassigned') {
                  foundRow = 'unassigned'
                }
              }
            })
            this.dropTargetRowId = foundRow
          }
        }

        // Skip date updates if same as last update
        if (deltaDays === this.lastDeltaDays) return
        this.lastDeltaDays = deltaDays

        if (mode === 'move') {
          // Move both dates together (original behavior)
          if (this.barDragOriginalDates.start_date) {
            const newStart = new Date(this.barDragOriginalDates.start_date)
            newStart.setDate(newStart.getDate() + deltaDays)
            todo.start_date = newStart.toISOString().split('T')[0]
          }
          if (this.barDragOriginalDates.end_date) {
            const newEnd = new Date(this.barDragOriginalDates.end_date)
            newEnd.setDate(newEnd.getDate() + deltaDays)
            todo.end_date = newEnd.toISOString().split('T')[0]
          }
        } else if (mode === 'resize-start') {
          // Change start date
          const origStart =
            this.barDragOriginalDates.start_date || this.barDragOriginalDates.end_date
          if (origStart) {
            const newStart = new Date(origStart)
            newStart.setDate(newStart.getDate() + deltaDays)
            // Ensure start doesn't go past end
            const endDate = this.barDragOriginalDates.end_date
              ? new Date(this.barDragOriginalDates.end_date)
              : null
            if (!endDate || newStart <= endDate) {
              todo.start_date = newStart.toISOString().split('T')[0]
            }
          }
        } else if (mode === 'resize-end') {
          // Change end date
          const origEnd = this.barDragOriginalDates.end_date || this.barDragOriginalDates.start_date
          if (origEnd) {
            const newEnd = new Date(origEnd)
            newEnd.setDate(newEnd.getDate() + deltaDays)
            // Ensure end doesn't go before start
            const startDate = this.barDragOriginalDates.start_date
              ? new Date(this.barDragOriginalDates.start_date)
              : null
            if (!startDate || newEnd >= startDate) {
              todo.end_date = newEnd.toISOString().split('T')[0]
            }
          }
        }
      },
      async stopBarDrag() {
        document.removeEventListener('mousemove', this.onBarDrag)
        document.removeEventListener('mouseup', this.stopBarDrag)

        if (this.draggingBarTodo) {
          const todoData = this.toPlainTodo(this.draggingBarTodo)
          const todoId = this.draggingBarTodo.id

          // Handle milestone assignment when dropping on a milestone row
          if (this.dropTargetRowId && this.ganttGroupBy === 'milestone') {
            // First unlink from all current milestones
            const milestones = this.allTodos.filter((t) => t.type === 'milestone')
            for (const m of milestones) {
              const rel = this.milestoneRelations[m.id]
              if (rel?.todos?.some((t) => t.id === todoId)) {
                await window.api.unlinkMilestoneTodo(m.id, todoId)
              }
            }

            if (this.dropTargetRowId !== 'unassigned') {
              // Extract milestone id from row id (format: 'milestone-{id}')
              const match = this.dropTargetRowId.match(/^milestone-(\d+)$/)
              if (match) {
                const milestoneId = parseInt(match[1], 10)
                await window.api.linkMilestoneTodo(milestoneId, todoId)
              }
            }
          }

          await window.api.updateTodo(todoData)
          await this.loadAllTodos()
          await this.loadTodos()
          if (this.ganttGroupBy === 'milestone') {
            await this.loadMilestoneRelations()
          }
        }

        this.draggingBarId = null
        this.draggingBarTodo = null
        this.barDragMode = 'move'
        this.barDragOriginalDates = null
        this.lastDeltaDays = 0
        this.dropTargetRowId = null
      },
      // Filter methods
      toggleProjectFilter(projectId) {
        if (this.filterProjectId === projectId) {
          this.filterProjectId = null
        } else {
          this.filterProjectId = projectId
        }
      },
      onTimelineWheel(event) {
        if (event.ctrlKey || event.metaKey) {
          // Ctrl/Cmd + scroll = zoom
          const delta = event.deltaY > 0 ? -10 : 10
          this.timelineScale = Math.max(10, Math.min(500, this.timelineScale + delta))
        } else if (event.shiftKey) {
          // Shift + scroll = horizontal scroll
          this.timelineOffset += event.deltaY
        } else {
          // Regular scroll = horizontal scroll
          this.timelineOffset += event.deltaX || event.deltaY
        }
      },
      // Keyboard shortcuts
      handleKeyUp(e) {
        if (e.key === 'Alt') this.altKeyHeld = false
      },
      handleKeyDown(e) {
        if (e.key === 'Alt') this.altKeyHeld = true
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
          // Close inline node editing in graph
          if (this.editingNodeId) {
            this.editingNodeId = null
            this.editingNodeNotes = ''
            this.editingNodeTitle = ''
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
      async navigateToProject(projectId) {
        if (projectId) {
          await this.setFilter(projectId)
        }
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
      toggleStatusesCollapsed() {
        this.statusesCollapsed = !this.statusesCollapsed
        localStorage.setItem('statuses-collapsed', this.statusesCollapsed)
      },
      toggleSettingsCollapsed() {
        this.settingsCollapsed = !this.settingsCollapsed
        localStorage.setItem('settings-collapsed', this.settingsCollapsed)
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
      handleMarkdownClick(event) {
        // Check if clicked element is a link or inside a link
        const link = event.target.tagName === 'A' ? event.target : event.target.closest('a')
        if (link && link.href) {
          event.preventDefault()
          event.stopPropagation()
          window.api.openExternal(link.href)
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
      },
      async renderTooltipMermaid() {
        await this.$nextTick()
        try {
          await mermaid.run({
            querySelector:
              '.graph-tooltip .tooltip-notes pre.mermaid:not([data-processed]), .node-notes pre.mermaid:not([data-processed])'
          })
          document
            .querySelectorAll('.graph-tooltip .tooltip-notes pre.mermaid, .node-notes pre.mermaid')
            .forEach((el) => {
              el.setAttribute('data-processed', 'true')
            })
        } catch {
          // Silently ignore - tooltip may have disappeared
        }
      }
    }
  }
</script>
