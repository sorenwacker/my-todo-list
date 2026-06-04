<template>
  <div class="app" :class="{ 'light-theme': theme === 'light', 'sidebar-collapsed': !sidebarVisible }" :style="{ borderLeftColor: currentProjectColor }">
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
      :on-mouse-enter="() => sidebarVisible = true"
      @toggle-pin="toggleSidebarPin"
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
      :grid-lock="gridLock"
      :timezone="timezone"
      :database-path="databasePath"
      @set-filter="setFilter"
      @update:projects="projects = $event"
      @projects-reorder="onProjectDragEnd"
      @add-project="addProjectFromSidebar"
      @edit-project="editProject"
      @update:statuses="statuses = $event"
      @statuses-reorder="onStatusDragEnd"
      @add-status="addStatusFromSidebar"
      @edit-status="editStatus"
      @update:grid-lock="onGridLockChange"
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
            <div class="shortcut-item"><kbd>Enter</kbd> / <kbd>e</kbd><span>Open/Edit todo</span></div>
            <div class="shortcut-item"><kbd>Esc</kbd><span>Close detail / Clear selection</span></div>
          </div>
          <div class="shortcut-section">
            <h4>Actions</h4>
            <div class="shortcut-item"><kbd>n</kbd><span>New todo</span></div>
            <div class="shortcut-item"><kbd>x</kbd> / <kbd>Space</kbd><span>Toggle complete</span></div>
            <div class="shortcut-item"><kbd>Delete</kbd><span>Delete todo</span></div>
            <div class="shortcut-item"><kbd>/</kbd><span>Open search</span></div>
          </div>
          <div class="shortcut-section">
            <h4>Global</h4>
            <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>K</kbd><span>Command palette</span></div>
            <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>Z</kbd><span>Undo</span></div>
            <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd><span>Redo</span></div>
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
            <span class="breadcrumb-link breadcrumb-home" @click="setFilter('inbox')" title="Home">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
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
              class="header-btn search-btn"
              title="Search (press /)"
              @click="showGlobalSearch = true"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button
              class="header-btn"
              :class="{ disabled: !historyState.canUndo }"
              :disabled="!historyState.canUndo"
              :title="historyState.undoDescription ? `Undo: ${historyState.undoDescription}` : 'Nothing to undo'"
              @click="undo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 10h10a5 5 0 0 1 5 5v2"/>
                <polyline points="3,10 7,6"/>
                <polyline points="3,10 7,14"/>
              </svg>
            </button>
            <button
              class="header-btn"
              :class="{ disabled: !historyState.canRedo }"
              :disabled="!historyState.canRedo"
              :title="historyState.redoDescription ? `Redo: ${historyState.redoDescription}` : 'Nothing to redo'"
              @click="redo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10H11a5 5 0 0 0-5 5v2"/>
                <polyline points="21,10 17,6"/>
                <polyline points="21,10 17,14"/>
              </svg>
            </button>
            <button class="header-btn" title="Keyboard shortcuts (?)" @click="showHelpModal = true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
            <button class="theme-toggle" :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
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
              <option value="alpha">Alphabetical</option>
            </select>
            <label class="show-completed-toggle">
              <input v-model="showCompleted" type="checkbox" />
              <span>Show done</span>
            </label>
          </div>
          <div class="view-switcher">
            <button
              v-for="view in availableViews"
              :key="view"
              :class="{ active: currentView === view }"
              :disabled="isTrashView && view === 'kanban'"
              @click="setView(view)"
            >{{ view.charAt(0).toUpperCase() + view.slice(1) }}</button>
          </div>
          <button v-if="isTrashView && trashCount > 0" class="empty-trash-btn" @click="emptyTrash">Empty Trash</button>
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
            <span class="project-count">{{ projectCounts[project.id] || 0 }}</span>
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
              @dragstart="onInboxDragStart($event, todo)"
            />
          </div>
          <p v-if="inboxTodos.length === 0" class="empty-inbox">No items in inbox. Add one above or drag items here.</p>
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
            :card-columns="cardColumns"
            :sort-by="sortBy"
            :current-filter="currentFilter"
            :grid-lock="gridLock"
            :projects="projects"
            @card-click="handleCardClick"
            @toggle-complete="toggleComplete"
            @toggle-subtask="toggleSubtask"
            @delete-todo="deleteTodo"
            @restore-todo="restoreTodo"
            @permanent-delete-todo="permanentlyDeleteTodo"
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
          />

          <!-- Kanban View -->
          <KanbanView
            v-else-if="currentView === 'kanban'"
            key="kanban"
            kanban-group-by="status"
            effective-kanban-group-by="status"
            :statuses="statuses"
            :no-status-todos="noStatusTodos"
            :selected-todo-id="null"
            :selected-todo-ids="selectedTodoIds"
            :all-todos="filteredTodos"
            @card-click="handleCardClick"
            @toggle-complete="toggleComplete"
            @delete-todo="deleteTodo"
            @add-todo-to-status="addTodoToStatus"
            @update-status-todos="updateStatusTodos"
            @kanban-drop-status="onKanbanDropStatus"
            @update-title="handleUpdateTitle"
            @update-notes="handleUpdateNotes"
            @archive-todo="archiveTodo"
          />

          <div v-if="filteredTodos.length === 0 && currentView !== 'kanban'" class="empty-state">
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
import { renderMarkdown, renderCardMarkdown, renderInlineMarkdown, marked } from './utils/markdown.js'
import mermaid from 'mermaid'
import draggable from 'vuedraggable'
import GlobalSearch from './components/GlobalSearch.vue'
import { AppSidebar, CardsView, CardItem, KanbanView, StatusModal, ProjectModal } from './components/index.js'
import {
  Folder, Home, Briefcase, ShoppingCart, Heart, BookOpen, Target, Star,
  Calendar, Clock, Tag, Flag, Bookmark, Zap, Coffee, Music, Camera, Film,
  MessageCircle, Mail, Phone, Users, User, Settings, Search, Plus, Check,
  AlertCircle, Info, HelpCircle, Bell, Gift, Award, Trophy, Crown
} from 'lucide-vue-next'

const categoryIcons = {
  Folder, Home, Briefcase, ShoppingCart, Heart, BookOpen, Target, Star,
  Calendar, Clock, Tag, Flag, Bookmark, Zap, Coffee, Music, Camera, Film,
  MessageCircle, Mail, Phone, Users, User, Settings, Search, Plus, Check,
  AlertCircle, Info, HelpCircle, Bell, Gift, Award, Trophy, Crown
}

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
      console.warn('Invalid current-view, resetting to cards')
      localStorage.setItem('current-view', 'cards')
    }

    // Validate sort-by
    const sortBy = localStorage.getItem('sort-by')
    if (sortBy && !validSorts.includes(sortBy)) {
      console.warn('Invalid sort-by, resetting to manual')
      localStorage.setItem('sort-by', 'manual')
    }

    // Validate theme
    const theme = localStorage.getItem('todo-theme')
    if (theme && !validThemes.includes(theme)) {
      console.warn('Invalid theme, resetting to dark')
      localStorage.setItem('todo-theme', 'dark')
    }

    // Validate detail-layout
    const layout = localStorage.getItem('detail-layout')
    if (layout && !validLayouts.includes(layout)) {
      console.warn('Invalid detail-layout, resetting to auto')
      localStorage.setItem('detail-layout', 'auto')
    }

    // Validate JSON settings
    const jsonSettings = ['card-sizes-v2', 'card-widths']
    for (const key of jsonSettings) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          JSON.parse(value)
        } catch {
          console.warn(`Invalid JSON in ${key}, resetting`)
          localStorage.removeItem(key)
        }
      }
    }

    // Validate numeric settings
    const cardColumns = localStorage.getItem('card-columns')
    if (cardColumns && (isNaN(parseInt(cardColumns)) || parseInt(cardColumns) < 1 || parseInt(cardColumns) > 10)) {
      console.warn('Invalid card-columns, resetting')
      localStorage.removeItem('card-columns')
    }

    // Update version
    localStorage.setItem('settings-version', String(SETTINGS_VERSION))
  } catch (e) {
    console.error('Error validating localStorage, clearing all settings:', e)
    // If something goes very wrong, clear problematic keys
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
  securityLevel: 'loose'
})

function reinitializeMermaid(theme) {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'light' ? 'default' : 'dark',
    securityLevel: 'loose',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 15,
      useMaxWidth: true
    },
    themeVariables: theme === 'dark' ? {
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
    } : {}
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
    draggable,
    AppSidebar,
    CardsView,
    CardItem,
    GlobalSearch,
    KanbanView,
    StatusModal,
    ProjectModal,
    ...categoryIcons
  },
  data() {
    return {
      todos: [],
      projects: [],
      categories: [],
      statuses: [],
      allTodos: [],
      currentFilter: null,
      tabViews: JSON.parse(localStorage.getItem('tab-views') || '{}'),
      activeTab: (() => {
        const saved = localStorage.getItem('active-tab')
        if (saved === 'todos' || saved === 'notes' || saved === 'split') return 'items'
        return saved || 'items'
      })(),
      showCompleted: localStorage.getItem('show-completed') === 'true',
      kanbanGroupBy: 'status',
      newTodoTitle: '',
      newPersonName: '',
      newProjectName: '',
      newCategoryName: '',
      newStatusName: '',
      showProjectInput: false,
      showCategoryInput: false,
      showStatusInput: false,
      editingProject: null,
      editingProjectTags: [],
      editingCategory: null,
      editingStatus: null,
      selectedTodoIds: new Set(),
      subtasks: [],
      milestoneRelations: {}, // { milestoneId: { todos: [], persons: [] } }
      allSubtasksMap: {},
      allTags: [],
      showStakeholderPicker: false,
      saveTimeout: null,
      sortBy: localStorage.getItem('sort-by') || 'manual',
      searchQuery: '',
      groupByProject: localStorage.getItem('group-by-project') === 'true',
      cardColumns: parseInt(localStorage.getItem('card-columns')) || 3,
      cardSizes: JSON.parse(localStorage.getItem('card-sizes-v2') || '{}'),
      gridLock: localStorage.getItem('grid-lock') === 'true',
      timezone: localStorage.getItem('timezone') || 'auto',
      gridSize: 100,
      filterProjectId: null,
      filterCategoryId: null,
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
      graphLinkMode: false,
      graphLinkSource: null,
      editingNodeId: null,
      editingNodeNotes: '',
      editingNodeTitle: '',
      graphWidth: 1600,
      graphHeight: 1200,
      nodePositions: {},
      allLinks: [],
      graphZoom: 1,
      graphPan: { x: 0, y: 0 },
      draggingNode: null,
      wasDragging: false,
      creatingNodeFromId: null,
      linkingNodeId: null,
      altClickSourceId: null,
      altKeyHeld: false,
      dragOffset: { x: 0, y: 0 },
      selectedNodeIds: [],
      isPanning: false,
      lastMousePos: { x: 0, y: 0 },
      hoveredNode: null,
      linkContextMenu: null,
      hoveredLink: null,
      selectedLink: null,
      mousePos: { x: 0, y: 0 },
      isSimulating: false,
      // View transition properties
      viewTransitionDirection: 'forward',
      previousViewIndex: 0,
      projectTransitionDirection: 'forward',
      previousProjectFilter: null,
      tabTransitionDirection: 'forward',
      projectColors: [
        // Blues
        '#1a73e8', '#4285f4', '#0d47a1', '#039be5', '#00acc1',
        // Greens
        '#0f9d58', '#34a853', '#00897b', '#43a047', '#7cb342',
        // Reds & Pinks
        '#d93025', '#ea4335', '#c2185b', '#e91e63', '#f06292',
        // Oranges & Yellows
        '#f9a825', '#ff8f00', '#ef6c00', '#ff7043', '#ffb300',
        // Purples
        '#7b1fa2', '#9c27b0', '#673ab7', '#5e35b1', '#7e57c2',
        // Neutrals
        '#455a64', '#607d8b', '#78909c', '#546e7a', '#37474f'
      ],
      categorySymbols: [
        'Folder', 'Home', 'Briefcase', 'ShoppingCart', 'Heart', 'BookOpen', 'Target', 'Star',
        'Calendar', 'Clock', 'Tag', 'Flag', 'Bookmark', 'Zap', 'Coffee', 'Music',
        'Camera', 'Film', 'MessageCircle', 'Mail', 'Phone', 'Users', 'User', 'Settings',
        'Bell', 'Gift', 'Award', 'Trophy', 'Crown', 'AlertCircle', 'Info', 'HelpCircle'
      ],
      statusColors: [
        // Blues
        '#1a73e8', '#4285f4', '#0d47a1', '#039be5', '#00acc1',
        // Greens
        '#0f9d58', '#34a853', '#00897b', '#43a047', '#7cb342',
        // Reds & Pinks
        '#d93025', '#ea4335', '#c2185b', '#e91e63', '#f06292',
        // Oranges & Yellows
        '#f9a825', '#ff8f00', '#ef6c00', '#ff7043', '#ffb300',
        // Purples
        '#7b1fa2', '#9c27b0', '#673ab7', '#5e35b1', '#7e57c2',
        // Neutrals
        '#455a64', '#607d8b', '#78909c', '#546e7a', '#37474f'
      ],
      // Graph layout parameters
      // d3-force parameters
      graphRepulsion: parseInt(localStorage.getItem('graph-repulsion')) || -800,
      graphEdgeLength: parseInt(localStorage.getItem('graph-edge-length')) || 200,
      graphLayoutType: localStorage.getItem('graph-layout-type') || 'force',
      showGraphSettings: false,
      showPersonsInGraph: localStorage.getItem('show-persons-in-graph') === 'true',
      orthogonalEdges: localStorage.getItem('orthogonal-edges') === 'true',
      todoPersons: {},
      d3Simulation: null,
      // Theme
      theme: localStorage.getItem('todo-theme') || 'dark',
      // Sidebar visibility
      sidebarVisible: localStorage.getItem('sidebar-visible') !== 'false',
      sidebarPinned: localStorage.getItem('sidebar-pinned') === 'true',
      categoriesCollapsed: localStorage.getItem('categories-collapsed') === 'true',
      statusesCollapsed: localStorage.getItem('statuses-collapsed') === 'true',
      personsCollapsed: localStorage.getItem('persons-collapsed') !== 'false',
      settingsCollapsed: localStorage.getItem('settings-collapsed') !== 'false',
      // Trash & Archive
      trashCount: 0,
      archiveCount: 0,
      // Keyboard navigation
      focusedTodoIndex: -1,
      // Global search
      showGlobalSearch: false,
      showProjectsOverview: false,
      recentItems: JSON.parse(localStorage.getItem('recent-items') || '[]'),
      // Type filter
      typeFilter: localStorage.getItem('type-filter') || 'all',
      // Export/Import
      showImportDialog: false,
      databasePath: '',
      // Persons/Stakeholders
      persons: [],
      projectPersons: {},
      showProjectPersonPicker: false,
      pendingPersonEdit: null,
      // Project Topics (buckets)
      projectTopics: [],
      selectedTopicId: null,
      showTopicInput: false,
      newTopicName: '',
      editingTopic: null,
      topicsExpanded: true,
      dragOverTopicId: null,
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
    currentProjectColor() {
      if (this.currentFilter && this.currentFilter !== 'inbox' && this.currentFilter !== 'trash') {
        const project = this.projects.find(p => p.id === this.currentFilter)
        return project ? project.color : '#333'
      }
      return '#333'
    },
    isProjectSelected() {
      return typeof this.currentFilter === 'number'
    },
    effectiveKanbanGroupBy() {
      // When project is selected, allow category or status (not project)
      if (this.isProjectSelected && this.kanbanGroupBy === 'project') {
        return 'category'
      }
      return this.kanbanGroupBy
    },
    currentTitle() {
      if (this.currentFilter === null) return 'Items'
      if (this.currentFilter === 'inbox') return 'Inbox'
      if (this.currentFilter === 'trash') return 'Trash'
      if (this.currentFilter === 'persons') return 'Persons'
      const project = this.projects.find(p => p.id === this.currentFilter)
      const projectName = project ? project.name : 'Items'
      // Add topic name to breadcrumb when filtered
      if (this.selectedTopicId !== null) {
        const topic = this.projectTopics.find(t => t.id === this.selectedTopicId)
        if (topic) {
          return `${projectName} / ${topic.name}`
        }
      }
      return projectName
    },
    currentProjectName() {
      if (!this.isProjectSelected) return ''
      const project = this.projects.find(p => p.id === this.currentFilter)
      return project ? project.name : ''
    },
    currentTopicName() {
      if (this.selectedTopicId === null) return ''
      const topic = this.projectTopics.find(t => t.id === this.selectedTopicId)
      return topic ? topic.name : ''
    },
    isTrashView() {
      return this.currentFilter === 'trash'
    },
    currentProjectName() {
      if (!this.isProjectSelected) return ''
      const project = this.projects.find(p => p.id === this.currentFilter)
      return project ? project.name : ''
    },
    currentTopicName() {
      if (this.selectedTopicId === null) return ''
      const topic = this.projectTopics.find(t => t.id === this.selectedTopicId)
      return topic ? topic.name : ''
    },
    currentProjectPersons() {
      if (!this.editingProject || !this.editingProject.id) return []
      return this.projectPersons[this.editingProject.id] || []
    },
    selectedProjectStakeholders() {
      if (!this.isProjectSelected) return []
      return this.projectPersons[this.currentFilter] || []
    },
    availableStakeholders() {
      if (!this.isProjectSelected) return this.persons
      const assigned = this.selectedProjectStakeholders.map(p => p.id)
      return this.persons.filter(p => !assigned.includes(p.id))
    },
    filteredAvailableStakeholders() {
      if (!this.newPersonName.trim()) return this.availableStakeholders
      const query = this.newPersonName.toLowerCase().trim()
      return this.availableStakeholders.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.role && p.role.toLowerCase().includes(query))
      )
    },
    hasExactStakeholderMatch() {
      if (!this.newPersonName.trim()) return false
      const query = this.newPersonName.toLowerCase().trim()
      return this.persons.some(p => p.name.toLowerCase() === query)
    },
    allCount() {
      return this.allTodos.length
    },
    inboxCount() {
      return this.allTodos.filter(t => !t.project_id).length
    },
    projectCounts() {
      const counts = {}
      for (const project of this.projects) {
        counts[project.id] = this.allTodos.filter(t => t.project_id === project.id).length
      }
      return counts
    },
    statusCounts() {
      const counts = {}
      for (const status of this.statuses) {
        counts[status.id] = this.allTodos.filter(t => t.status_id === status.id).length
      }
      return counts
    },
    categoryCounts() {
      const counts = {}
      for (const category of this.categories) {
        counts[category.id] = this.allTodos.filter(t => t.category_id === category.id).length
      }
      return counts
    },
    topicCounts() {
      const counts = {}
      for (const topic of this.projectTopics) {
        counts[topic.id] = this.todos.filter(t => t.topic_id === topic.id).length
      }
      return counts
    },
    // Tab-related computed properties
    itemsCount() {
      const todos = this.isProjectSelected
        ? this.allTodos.filter(t => t.project_id === this.currentFilter)
        : this.allTodos
      return todos.filter(t => !t.deleted_at).length
    },
    stakeholdersCount() {
      if (this.isProjectSelected) {
        return this.selectedProjectStakeholders.length
      }
      return this.persons.length
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
      return this.projectTransitionDirection === 'forward' ? 'project-cube' : 'project-cube-reverse'
    },
    projectTransitionKey() {
      // Generate a key that changes when project changes
      return `project-${this.currentFilter}`
    },
    tabTransitionName() {
      return this.tabTransitionDirection === 'forward' ? 'tab-slide' : 'tab-slide-reverse'
    },
    inboxTodos() {
      return this.filteredTodos.filter(t => !t.project_id)
    },
    uncategorizedTodos() {
      return this.filteredTodos.filter(t => !t.category_id)
    },
    noStatusTodos() {
      return this.filteredTodos.filter(t => !t.status_id)
    },
    focusedTodo() {
      if (this.focusedTodoIndex >= 0 && this.focusedTodoIndex < this.todos.length) {
        return this.todos[this.focusedTodoIndex]
      }
      return null
    },
    sortedTodos() {
      let sorted = [...this.filteredTodos]
      if (this.sortBy === 'created') {
        sorted.sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at)
        })
      } else if (this.sortBy === 'alpha') {
        sorted.sort((a, b) => a.title.localeCompare(b.title))
      }
      return sorted
    },
    groupedTodos() {
      const groups = []
      const sorted = this.sortedTodos

      // Inbox group (todos without project)
      const inboxTodos = sorted.filter(t => !t.project_id)
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
        const projectTodos = sorted.filter(t => t.project_id === project.id)
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
      let todos = this.currentFilter === null ? this.allTodos : this.todos
      if (this.filterProjectId !== null) {
        todos = todos.filter(t => t.project_id === this.filterProjectId)
      }
      // Apply search query filter
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase().trim()
        todos = todos.filter(t =>
          (t.title && t.title.toLowerCase().includes(query)) ||
          (t.notes && t.notes.toLowerCase().includes(query))
        )
      }
      // Hide completed items if not showing them
      if (!this.showCompleted) {
        todos = todos.filter(t => !t.completed)
      }
      return todos
    },
    timelineTodos() {
      // Only show todos that have at least one date (start_date or end_date)
      return [...this.filteredTodos]
        .filter(t => t.start_date || t.end_date)
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
      this.timelineTodos.forEach(t => {
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
        return this.calendarDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
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
        days.push({ date: this.formatDateKey(date), dayNumber: date.getDate(), isCurrentMonth: false, isToday: date.getTime() === today.getTime(), isWeekend: date.getDay() === 0 || date.getDay() === 6 })
      }
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d)
        days.push({ date: this.formatDateKey(date), dayNumber: d, isCurrentMonth: true, isToday: date.getTime() === today.getTime(), isWeekend: date.getDay() === 0 || date.getDay() === 6 })
      }
      const remaining = 42 - days.length
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i)
        days.push({ date: this.formatDateKey(date), dayNumber: i, isCurrentMonth: false, isToday: date.getTime() === today.getTime(), isWeekend: date.getDay() === 0 || date.getDay() === 6 })
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
        days.push({ date: this.formatDateKey(date), dayName: date.toLocaleDateString('en-US', { weekday: 'short' }), dayNumber: date.getDate(), isToday: date.getTime() === today.getTime(), isWeekend: date.getDay() === 0 || date.getDay() === 6 })
      }
      return days
    },
    calendarDayTodos() {
      return this.getTodosForCalendarDate(this.formatDateKey(this.calendarDate))
    },
    dateLabelInterval() {
      // Determine how many days to skip between labels based on zoom level
      if (this.timelineScale >= 80) return 1      // Show every day
      if (this.timelineScale >= 40) return 2      // Every 2 days
      if (this.timelineScale >= 25) return 7      // Weekly
      return 14                                    // Every 2 weeks
    },
    graphNodes() {
      let todos = [...this.allTodos]

      // Apply project filter
      if (this.currentFilter === null || this.currentFilter === 'inbox') {
        todos = todos.filter(t => t.project_id === null)
      } else if (typeof this.currentFilter === 'number') {
        todos = todos.filter(t => t.project_id === this.currentFilter)
      }

      // Apply showCompleted filter
      if (!this.showCompleted) {
        todos = todos.filter(t => !t.completed)
      }

      const nodes = [...todos]

      // Add person nodes if enabled
      if (this.showPersonsInGraph) {
        const personSet = new Set()

        // Collect all unique persons from todos
        Object.values(this.todoPersons).forEach(persons => {
          persons.forEach(person => {
            personSet.add(person.id)
          })
        })

        // Add person nodes
        personSet.forEach(personId => {
          const person = this.persons.find(p => p.id === personId)
          if (person) {
            nodes.push({
              id: `person-${person.id}`,
              personId: person.id,
              type: 'person',
              title: person.name,
              color: person.color,
              person: person
            })
          }
        })
      }

      return nodes
    },
    tooltipStyle() {
      return {
        right: '16px',
        top: '80px',
        left: 'auto'
      }
    },
    graphLinks() {
      // Use graphNodes to get the actual visible todo IDs (respects project filtering)
      const todoIds = new Set(this.graphNodes.filter(n => n.type !== 'person').map(t => t.id))
      // Filter links to only include those where both ends are visible
      const links = this.allLinks.filter(link =>
        todoIds.has(link.source) && todoIds.has(link.target)
      )

      // Add person-todo links if enabled
      if (this.showPersonsInGraph) {
        Object.entries(this.todoPersons).forEach(([todoId, persons]) => {
          const numTodoId = parseInt(todoId)
          if (todoIds.has(numTodoId)) {
            persons.forEach(person => {
              links.push({
                source: `person-${person.id}`,
                target: numTodoId,
                type: 'person-todo'
              })
            })
          }
        })
      }

      return links
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
        const inboxTodos = todos.filter(t => !t.project_id)
        if (inboxTodos.length > 0) {
          const { todoLanes, laneCount } = assignLanes(inboxTodos)
          rows.push({ id: 'inbox', name: 'Inbox', color: '#666', todos: inboxTodos, todoLanes, laneCount })
        }
        // Project rows
        for (const project of this.projects) {
          const projectTodos = todos.filter(t => t.project_id === project.id)
          if (projectTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(projectTodos)
            rows.push({ id: project.id, name: project.name, color: project.color, todos: projectTodos, todoLanes, laneCount })
          }
        }
      } else if (this.ganttGroupBy === 'category') {
        // Uncategorized row
        const uncatTodos = todos.filter(t => !t.category_id)
        if (uncatTodos.length > 0) {
          const { todoLanes, laneCount } = assignLanes(uncatTodos)
          rows.push({ id: 'uncat', name: 'Uncategorized', color: '#666', todos: uncatTodos, todoLanes, laneCount })
        }
        // Category rows
        for (const category of this.categories) {
          const catTodos = todos.filter(t => t.category_id === category.id)
          if (catTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(catTodos)
            rows.push({ id: category.id, name: category.name, color: category.color, todos: catTodos, todoLanes, laneCount })
          }
        }
      } else if (this.ganttGroupBy === 'importance') {
        // Group by importance (5 to 1)
        for (let i = 5; i >= 1; i--) {
          const impTodos = todos.filter(t => (t.importance || 0) === i)
          if (impTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(impTodos)
            rows.push({ id: `imp-${i}`, name: `Importance ${i}`, color: this.getImportanceColor(i), todos: impTodos, todoLanes, laneCount })
          }
        }
      } else if (this.ganttGroupBy === 'milestone') {
        // Milestones are todos with type='milestone'
        const milestones = todos.filter(t => t.type === 'milestone')

        // Collect all todo IDs that are assigned to any milestone
        const assignedTodoIds = new Set()
        for (const milestone of milestones) {
          const rel = this.milestoneRelations[milestone.id]
          if (rel?.todos) {
            rel.todos.forEach(t => assignedTodoIds.add(t.id))
          }
        }

        // Unassigned todos (not milestones themselves, not linked to any milestone)
        const unassignedTodos = todos.filter(t => t.type !== 'milestone' && !assignedTodoIds.has(t.id))

        // Unassigned todos row
        if (unassignedTodos.length > 0) {
          const { todoLanes, laneCount } = assignLanes(unassignedTodos)
          rows.push({ id: 'unassigned', name: 'Unassigned', color: '#666', todos: unassignedTodos, todoLanes, laneCount })
        }

        // Milestone rows with their linked todos and persons
        for (const milestone of milestones) {
          const rel = this.milestoneRelations[milestone.id] || { todos: [], persons: [] }
          const linkedTodos = rel.todos || []
          const linkedPersons = rel.persons || []
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
              milestone: milestone,
              persons: linkedPersons
            })
          }
        }
      }

      return rows
    }
  },
  watch: {
    showLinkSearch(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.linkInput?.focus()
        })
      }
    },
    currentView(val, oldVal) {
      // Determine transition direction based on view order
      const views = this.availableViews
      const oldIndex = views.indexOf(oldVal)
      const newIndex = views.indexOf(val)
      this.viewTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'
      this.previousViewIndex = oldIndex

      // Handle leaving graph view
      if (oldVal === 'graph') {
        this.stopForceLayout()
      }
      // Handle entering new view
      if (val === 'graph') {
        this.$nextTick(() => {
          this.updateGraphSize()
          this.initializeNodePositions()
        })
      } else if (val === 'cards') {
        this.$nextTick(() => {
          this.applyMasonryLayout()
        })
      } else if (val === 'timeline' && this.ganttGroupBy === 'milestone') {
        this.loadMilestoneRelations()
      }
    },
    activeTab(val, oldVal) {
      // Determine tab transition direction
      const tabOrder = ['items', 'stakeholders']
      const oldIndex = tabOrder.indexOf(oldVal)
      const newIndex = tabOrder.indexOf(val)
      this.tabTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'

      // Clear topic filter when switching tabs
      this.selectedTopicId = null
      // Load project stakeholders when switching to stakeholders tab
      if (val === 'stakeholders' && this.isProjectSelected) {
        this.loadProjectPersons(this.currentFilter)
      }
    },
    currentFilter(val, oldVal) {
      // Determine project transition direction
      const getFilterIndex = (filter) => {
        if (filter === null) return 0
        if (filter === 'inbox') return 1
        if (filter === 'trash') return 2
        if (filter === 'persons') return 3
        // For project IDs, find index in projects array
        const idx = this.projects.findIndex(p => p.id === filter)
        return idx >= 0 ? idx + 4 : 999
      }
      const oldIndex = getFilterIndex(oldVal)
      const newIndex = getFilterIndex(val)
      this.projectTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'
      this.previousProjectFilter = oldVal

      // Clear topic selection when project changes
      this.selectedTopicId = null
      // Load project topics when a project is selected
      if (typeof val === 'number') {
        this.loadProjectTopics(val)
      } else {
        this.projectTopics = []
      }
      // Load project stakeholders when project filter changes while in stakeholders tab
      if (this.activeTab === 'stakeholders' && typeof val === 'number') {
        this.loadProjectPersons(val)
      }
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
    },
    hoveredNode(val) {
      if (val && val.notes) {
        this.$nextTick(() => {
          this.renderTooltipMermaid()
        })
      }
    },
    detailTab(val) {
      if (val === 'preview' || val === 'split') {
        this.renderMermaid()
      }
    },
    renderedNotes() {
      if (this.detailTab === 'preview' || this.detailTab === 'split') {
        this.renderMermaid()
      }
    }
  },
  async mounted() {
    await this.loadProjects()
    await this.loadCategories()
    await this.loadStatuses()
    await this.loadPersons()
    await this.loadAllTags()
    await this.loadAllTodos()

    // Restore last used filter from localStorage
    const savedFilter = localStorage.getItem('current-filter')
    if (savedFilter) {
      try {
        const filter = JSON.parse(savedFilter)
        // Verify the filter is valid (project still exists if it's a number)
        if (filter === 'inbox' || filter === 'trash' || filter === 'persons') {
          this.currentFilter = filter
        } else if (typeof filter === 'number') {
          const projectExists = this.projects.some(p => p.id === filter)
          if (projectExists) {
            this.currentFilter = filter
          }
        }
      } catch (e) {
        console.warn('Failed to restore filter:', e)
      }
    }

    await this.loadTodos()
    await this.loadAllLinks()
    this.databasePath = await window.api.getDatabasePath()
    this.loadNodePositions()

    // Load graph person data if enabled
    if (this.showPersonsInGraph) {
      await this.updateGraphData()
    }

    window.api.onRefreshTodos(() => {
      this.loadAllTodos()
      this.loadTodos()
      this.loadAllLinks()
      // Reapply masonry layout when todos are refreshed (e.g., after editing notes)
      if (this.currentView === 'cards') {
        this.applyMasonryLayout()
      }
    })

    window.addEventListener('resize', this.updateGraphSize)

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
      if (link && link.href && (link.closest('.notes-preview') || link.closest('.card-notes-preview'))) {
        console.log('Native click on link:', link.href)
        event.preventDefault()
        event.stopPropagation()
        if (window.api && window.api.openExternal) {
          window.api.openExternal(link.href)
        } else {
          console.error('window.api.openExternal is not available')
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
    window.removeEventListener('resize', this.updateGraphSize)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.stopForceLayout()
    if (this.cardResizeObserver) {
      this.cardResizeObserver.disconnect()
    }
  },
  methods: {
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
    isIconName(symbol) {
      return symbol && this.categorySymbols.includes(symbol)
    },
    getIconComponent(name) {
      return categoryIcons[name] || null
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
    toggleGridLock() {
      localStorage.setItem('grid-lock', this.gridLock.toString())
    },
    onGridLockChange(value) {
      this.gridLock = value
      localStorage.setItem('grid-lock', value.toString())
    },
    onTimezoneChange(value) {
      this.timezone = value
      localStorage.setItem('timezone', value)
    },
    onOpenTodosInWindowChange(value) {
      this.openTodosInWindow = value
      const mode = value ? 'window' : 'sidebar'
      localStorage.setItem('todo-open-mode', mode)
    },
    async loadProjects() {
      this.projects = await window.api.getProjects()
    },
    async loadCategories() {
      this.categories = await window.api.getCategories()
    },
    async loadStatuses() {
      this.statuses = await window.api.getStatuses()
    },
    // Project Topic methods
    async loadProjectTopics(projectId) {
      if (!projectId) {
        this.projectTopics = []
        return
      }
      this.projectTopics = await window.api.getProjectTopics(projectId)
    },
    selectTopic(topicId) {
      this.selectedTopicId = this.selectedTopicId === topicId ? null : topicId
    },
    getTopicCount(topicId) {
      return this.todos.filter(t => t.topic_id === topicId).length
    },
    async addTopic() {
      if (!this.newTopicName.trim() || !this.isProjectSelected) return
      const color = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProjectTopic(this.currentFilter, this.newTopicName.trim(), color)
      await this.loadProjectTopics(this.currentFilter)
      this.newTopicName = ''
      this.showTopicInput = false
    },
    async updateTopic(topic) {
      await window.api.updateProjectTopic(topic)
      await this.loadProjectTopics(this.currentFilter)
      this.editingTopic = null
    },
    async deleteTopic(topicId) {
      if (!confirm('Delete this topic? Items will be unassigned from it.')) return
      await window.api.deleteProjectTopic(topicId)
      if (this.selectedTopicId === topicId) {
        this.selectedTopicId = null
      }
      await this.loadProjectTopics(this.currentFilter)
      await this.loadTodos()
    },
    async addTopicFromSidebar(name) {
      if (!name.trim() || !this.isProjectSelected) return
      const color = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProjectTopic(this.currentFilter, name.trim(), color)
      await this.loadProjectTopics(this.currentFilter)
    },
    editTopic(topic) {
      // Simple rename dialog for now
      const newName = prompt('Rename topic:', topic.name)
      if (newName && newName.trim() !== topic.name) {
        this.updateTopic({ ...topic, name: newName.trim() })
      }
    },
    async dropOnTopic(event, topicId) {
      this.dragOverTopicId = null
      const todoId = parseInt(event.dataTransfer.getData('text/plain'))
      if (!todoId) return
      const todo = this.allTodos.find(t => t.id === todoId)
      if (!todo) return
      // Update the todo's topic_id
      await window.api.updateTodo({ ...todo, topic_id: topicId })
      await this.loadAllTodos()
    },
    async handleDropOnTopic(todoIds, topicId) {
      // Handle both single ID (legacy) and array of IDs
      const ids = Array.isArray(todoIds) ? todoIds : [todoIds]
      console.log('handleDropOnTopic called:', ids, topicId)

      for (const todoId of ids) {
        const todo = this.allTodos.find(t => t.id === todoId)
        if (!todo) {
          console.log('Todo not found:', todoId)
          continue
        }
        console.log('Updating todo:', todo.id, 'from topic', todo.topic_id, 'to', topicId)
        await window.api.updateTodo({ ...todo, topic_id: topicId })

        // Directly update local state for immediate reactivity
        const allTodoIndex = this.allTodos.findIndex(t => t.id === todoId)
        if (allTodoIndex !== -1) {
          this.allTodos[allTodoIndex] = { ...this.allTodos[allTodoIndex], topic_id: topicId }
        }
        const todoIndex = this.todos.findIndex(t => t.id === todoId)
        if (todoIndex !== -1) {
          this.todos[todoIndex] = { ...this.todos[todoIndex], topic_id: topicId }
        }
      }

      // Trigger reactivity by reassigning arrays
      this.allTodos = [...this.allTodos]
      this.todos = [...this.todos]

      // Clear multi-selection after drop
      this.selectedTodoIds.clear()
      this.selectedTodoIds = new Set()

      console.log('handleDropOnTopic completed for', ids.length, 'items')
    },
    async addTopicFromCards(name) {
      if (!name.trim() || !this.isProjectSelected) return
      const color = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProjectTopic(this.currentFilter, name.trim(), color)
      await this.loadProjectTopics(this.currentFilter)
    },
    async addTodoToTopic(topicId) {
      const projectId = this.isProjectSelected ? this.currentFilter : null
      const type = 'todo'
      const todo = await window.api.createTodo('Untitled', projectId, type)
      if (todo && topicId !== null && topicId !== undefined) {
        await window.api.updateTodo({ ...todo, topic_id: topicId })
      }
      await this.loadAllTodos()
      await this.loadTodos()
      this.selectTodo(todo.id)
    },
    async loadAllTodos() {
      this.allTodos = await window.api.getTodos(null)
      // Debug: check if notes_sensitive is being loaded
      const sensitiveTodos = this.allTodos.filter(t => t.notes_sensitive)
      if (sensitiveTodos.length > 0) {
        console.log('Found', sensitiveTodos.length, 'sensitive todos:', sensitiveTodos.map(t => ({ id: t.id, title: t.title, notes_sensitive: t.notes_sensitive })))
      }
      this.trashCount = await window.api.getTrashCount()
      this.archiveCount = await window.api.getArchiveCount()
      await this.loadAllSubtasks()
    },
    async loadAllSubtasks() {
      const subtasks = await window.api.getAllSubtasks()
      console.log('Loaded subtasks:', subtasks.length, subtasks)
      const map = {}
      for (const subtask of subtasks) {
        if (!map[subtask.todo_id]) {
          map[subtask.todo_id] = []
        }
        map[subtask.todo_id].push(subtask)
      }
      console.log('Subtasks map:', map)
      this.allSubtasksMap = map
    },
    async loadTodos() {
      this.todos = await window.api.getTodos(this.currentFilter)
    },
    async loadMilestoneRelations() {
      // Load todos and persons for all milestones
      const milestones = this.allTodos.filter(t => t.type === 'milestone')
      const relations = {}
      for (const milestone of milestones) {
        const [todos, persons] = await Promise.all([
          window.api.getMilestoneTodos(milestone.id),
          window.api.getMilestonePersons(milestone.id)
        ])
        relations[milestone.id] = { todos, persons }
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
    getCategoryCount(categoryId) {
      return this.allTodos.filter(t => t.category_id === categoryId).length
    },
    getCategoryTodos(categoryId) {
      return this.filteredTodos.filter(t => t.category_id === categoryId)
    },
    getStatusCount(statusId) {
      return this.allTodos.filter(t => t.status_id === statusId).length
    },
    getStatusTodos(statusId) {
      return this.filteredTodos.filter(t => t.status_id === statusId)
    },
    getProjectCount(projectId) {
      return this.allTodos.filter(t => t.project_id === projectId).length
    },
    getProjectTodos(projectId) {
      return this.filteredTodos.filter(t => t.project_id === projectId)
    },
    updateProjectTodos(_projectId, _todos) {
      // Used by draggable for reactive updates
    },
    updateCategoryTodos(_categoryId, _todos) {
      // Used by draggable for reactive updates
    },
    updateStatusTodos(_statusId, _todos) {
      // Used by draggable for reactive updates
    },
    updateSortedTodos(todos) {
      // Update the internal todos array for drag-and-drop
      this.todos = todos
    },
    async onKanbanDropCategory(event) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      // Get target category from the drop target element
      const targetCategoryId = event.to?.dataset?.categoryId
      const parsedCategoryId = targetCategoryId === '' ? null : parseInt(targetCategoryId)

      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo && todo.category_id !== parsedCategoryId) {
        const todoData = this.toPlainTodo(todo)
        todoData.category_id = parsedCategoryId
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async onKanbanDropStatus(event) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      // Get target status from the drop target element
      const targetStatusId = event.to?.dataset?.statusId
      const parsedStatusId = targetStatusId === '' ? null : parseInt(targetStatusId)

      const todo = this.allTodos.find(t => t.id === todoId)
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

      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo) {
        const todoData = this.toPlainTodo(todo)
        // Update status based on where it was dropped
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
      // Load project-specific graph settings and positions
      this.loadGraphSettings()
      this.loadNodePositions()
      // Update graph person data when filter changes
      if (this.showPersonsInGraph) {
        await this.updateGraphData()
      }
      // Load stakeholders if in stakeholders view and a project is selected
      if (this.currentView === 'stakeholders' && typeof filter === 'number') {
        await this.loadProjectPersons(filter)
      }
    },
    async addTodo() {
      if (!this.newTodoTitle.trim()) return
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      // Type is determined by the active tab: notes = note, todos = todo
      const type = 'todo'
      const todo = await window.api.createTodo(this.newTodoTitle.trim(), projectId, type)
      // Set default start_date to today and assign topic if selected
      if (todo) {
        const updates = { ...todo, start_date: new Date().toISOString().split('T')[0] }
        if (this.selectedTopicId !== null) {
          updates.topic_id = this.selectedTopicId
        }
        await window.api.updateTodo(updates)
      }
      this.newTodoTitle = ''
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async addMilestone() {
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      try {
        const milestone = await window.api.createTodo('New Milestone', projectId, 'milestone')
        await this.loadAllTodos()
        await this.loadTodos()
        if (milestone && milestone.id) this.selectTodo(milestone.id)
      } catch (e) {
        console.error('Failed to create milestone:', e)
      }
    },
    async createTodoOnDate(dateKey) {
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      try {
        const type = 'todo'
        const todo = await window.api.createTodo('New Task', projectId, type)
        if (todo && todo.id) {
          await window.api.updateTodo({ id: todo.id, start_date: dateKey, end_date: dateKey })
          await this.loadAllTodos()
          await this.loadTodos()
          this.selectTodo(todo.id)
        }
      } catch (e) {
        console.error('Failed to create todo on date:', e)
      }
    },
    async addTodoToProject(projectId) {
      try {
        const type = 'todo'
        const todo = await window.api.createTodo('Untitled', projectId, type)
        await this.loadAllTodos()
        await this.loadTodos()
        if (todo) this.selectTodo(todo)
      } catch (e) {
        console.error('Failed to create todo:', e)
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
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox' && this.currentFilter !== 'trash'
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
    async addTodoToCategory(categoryId) {
      try {
        const projectId = this.isProjectSelected ? this.currentFilter : null
        const type = 'todo'
        const todo = await window.api.createTodo('Untitled', projectId, type)
        if (categoryId !== null) {
          const todoData = this.toPlainTodo(todo)
          todoData.category_id = categoryId
          await window.api.updateTodo(todoData)
        }
        await this.loadAllTodos()
        await this.loadTodos()
        if (todo) this.selectTodo(todo)
      } catch (e) {
        console.error('Failed to create todo:', e)
      }
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
      } catch (e) {
        console.error('Failed to create todo:', e)
      }
    },
    async toggleComplete(todo) {
      const todoData = this.toPlainTodo(todo)
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

      await this.loadAllTodos()
      await this.loadTodos()
    },
    async handleUpdateTitle(todo, newTitle) {
      const todoData = this.toPlainTodo(todo)
      todoData.title = newTitle
      await window.api.updateTodo(todoData)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async handleUpdateNotes(todo, newNotes) {
      const todoData = this.toPlainTodo(todo)
      todoData.notes = newNotes
      await window.api.updateTodo(todoData)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async deleteTodo(id) {
      await window.api.deleteTodo(id)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async archiveTodo(id) {
      await window.api.archiveTodo(id)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async moveToProject(todo, projectId) {
      const todoData = this.toPlainTodo(todo)
      todoData.project_id = projectId
      await window.api.updateTodo(todoData)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async deleteTodoFromGraph(id) {
      const todo = this.graphNodes.find(n => n.id === id)
      const title = todo?.title || 'this item'
      if (confirm(`Delete "${title}"?`)) {
        // Keep node position for undo - only remove on permanent delete
        await this.deleteTodo(id)
      }
    },
    async removePersonFromGraph(personNode) {
      const personId = personNode.personId
      const personName = personNode.title
      // Find all todos this person is connected to
      const connectedTodoIds = this.graphLinks
        .filter(l => l.type === 'person-todo' && l.source === personNode.id)
        .map(l => l.target)

      if (connectedTodoIds.length === 0) {
        // Not connected to anything, just hide by disabling persons in graph
        return
      }

      if (confirm(`Remove ${personName} from ${connectedTodoIds.length} item(s)?`)) {
        for (const todoId of connectedTodoIds) {
          await window.api.unlinkTodoPerson(todoId, personId)
        }
        await this.updateGraphData()
      }
    },
    handleNodeLinkClick(event) {
      // Check if clicked element is a link
      const link = event.target.closest('a')
      if (link && link.href) {
        event.preventDefault()
        event.stopPropagation()
        // Open link in default browser
        window.api.openExternal(link.href)
      }
    },
    handleNodeNotesClick(event, todo) {
      // Check if clicked element is a link
      const link = event.target.closest('a')
      if (link && link.href) {
        event.preventDefault()
        // Open link in default browser
        window.api.openExternal(link.href)
      } else {
        // Not a link - start editing
        this.startEditingNode(null, todo)
      }
    },
    async restoreTodo(id) {
      await window.api.restoreTodo(id)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async permanentlyDeleteTodo(id) {
      await window.api.permanentlyDeleteTodo(id)
      // Remove node position on permanent delete (can't be undone)
      if (this.nodePositions[id]) {
        delete this.nodePositions[id]
        this.saveNodePositions()
      }
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async emptyTrash() {
      if (confirm('Are you sure you want to permanently delete all items in trash?')) {
        // Get trashed items before emptying to clean up positions
        const trashedIds = this.allTodos.filter(t => t.deleted).map(t => t.id)
        await window.api.emptyTrash()
        // Clean up node positions for permanently deleted items
        let positionsChanged = false
        trashedIds.forEach(id => {
          if (this.nodePositions[id]) {
            delete this.nodePositions[id]
            positionsChanged = true
          }
        })
        if (positionsChanged) {
          this.saveNodePositions()
        }
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async onDragEnd() {
      const ids = this.todos.map(t => t.id)
      await window.api.reorderTodos(ids)
    },
    updateGroupTodos(groupId, todos) {
      // Update todos for a specific group
      const group = this.groupedTodos.find(g => g.id === groupId)
      if (group) {
        group.todos = todos
      }
    },
    async onGroupDragEnd(groupId, _event) {
      // Get the todos from this specific group and reorder them
      const group = this.groupedTodos.find(g => g.id === groupId)
      if (group && group.todos) {
        const ids = group.todos.map(t => t.id)
        await window.api.reorderTodos(ids)
      }
    },
    async onProjectDragEnd() {
      const ids = this.projects.map(p => p.id)
      await window.api.reorderProjects(ids)
    },
    async onCategoryDragEnd() {
      const ids = this.categories.map(c => c.id)
      await window.api.reorderCategories(ids)
    },
    async onStatusDragEnd() {
      const ids = this.statuses.map(s => s.id)
      await window.api.reorderStatuses(ids)
    },
    async onKanbanProjectChange(todoId, targetProjectId) {
      console.log('onKanbanProjectChange called:', todoId, targetProjectId)
      if (!todoId) return

      const todo = this.allTodos.find(t => t.id === todoId)
      console.log('Found todo:', todo, 'current project_id:', todo?.project_id)
      if (todo && todo.project_id !== targetProjectId) {
        console.log('Updating project_id from', todo.project_id, 'to', targetProjectId)
        const todoData = this.toPlainTodo(todo)
        todoData.project_id = targetProjectId
        await window.api.updateTodo(todoData)
        console.log('Update complete, reloading...')
        await this.loadAllTodos()
        await this.loadTodos()
        console.log('Reload complete')
      } else {
        console.log('No update needed - same project or todo not found')
      }
    },
    async onKanbanDrop(event) {
      // Legacy handler - kept for compatibility but project moves now use onKanbanProjectChange
      const todoId = event.item?.__draggable_context?.element?.id || parseInt(event.item?.dataset?.todoId)
      if (!todoId) return
    },
    handleCardClick(event, id) {
      // Check if the click was on a link
      const link = event.target.closest('a')
      if (link && link.href) {
        event.preventDefault()
        event.stopPropagation()
        if (window.api && window.api.openExternal) {
          window.api.openExternal(link.href)
        } else {
          console.error('window.api.openExternal is not available')
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
    async selectTodo(id) {
      // TODO: Will be implemented with popover editor
      console.log('selectTodo called with id:', id)
    },
    toPlainTodo(todo) {
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
        milestone_date: todo.milestone_date,
        topic_id: todo.topic_id
      }
    },
    async loadAllTags() {
      this.allTags = await window.api.getAllTags()
    },
    async toggleSubtask(subtask) {
      await window.api.updateSubtask({
        id: subtask.id,
        title: subtask.title,
        completed: !subtask.completed
      })
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async deleteSubtask(id) {
      await window.api.deleteSubtask(id)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async deleteSubtaskFromTable(id) {
      await window.api.deleteSubtask(id)
      await this.loadAllSubtasks()
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async addSubtaskFromTable({ todoId, title }) {
      await window.api.createSubtask(todoId, title)
      await this.loadAllSubtasks()
      await this.loadSubtasks()
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateSubtaskFromTable({ id, title }) {
      await window.api.updateSubtask({ id, title })
      await this.loadAllSubtasks()
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateSubtaskDueDate({ id, due_date }) {
      await window.api.updateSubtask({ id, due_date })
      await this.loadAllSubtasks()
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
      const randomColor = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProject(this.newProjectName.trim(), randomColor)
      this.newProjectName = ''
      this.showProjectInput = false
      await this.loadProjects()
    },
    async addProjectFromSidebar(name) {
      if (!name.trim()) return
      const randomColor = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProject(name.trim(), randomColor)
      await this.loadProjects()
    },
    cancelAddProject() {
      this.newProjectName = ''
      this.showProjectInput = false
    },
    async editProject(project) {
      this.editingProject = { ...project }
      this.showProjectPersonPicker = false
      if (project.id) {
        await this.loadProjectPersons(project.id)
        this.editingProjectTags = await window.api.getProjectTags(project.id)
      } else {
        this.editingProjectTags = []
      }
    },
    cancelEditProject() {
      this.editingProject = null
      this.editingProjectTags = []
      this.showProjectPersonPicker = false
    },
    async addProjectTag(tagName) {
      if (!this.editingProject?.id || !tagName.trim()) return
      await window.api.addProjectTag(this.editingProject.id, tagName.trim())
      this.editingProjectTags = await window.api.getProjectTags(this.editingProject.id)
      await this.loadAllTags()
    },
    async removeProjectTag(tagId) {
      if (!this.editingProject?.id) return
      await window.api.removeProjectTag(this.editingProject.id, tagId)
      this.editingProjectTags = await window.api.getProjectTags(this.editingProject.id)
    },
    async saveProject() {
      try {
        if (!this.editingProject) return
        // Convert reactive proxy to plain object for IPC
        const projectData = {
          id: this.editingProject.id,
          name: this.editingProject.name,
          color: this.editingProject.color
        }
        await window.api.updateProject(projectData)
        await this.loadProjects()
        await this.loadAllTodos()
        await this.loadTodos()
        this.editingProject = null
      } catch (error) {
        console.error('Error saving project:', error)
      }
    },
    async saveProjectFromModal(projectData) {
      this.editingProject = projectData
      await this.saveProject()
    },
    async deleteProjectConfirm() {
      if (confirm(`Delete project "${this.editingProject.name}"? Todos will be moved to Inbox.`)) {
        await window.api.deleteProject(this.editingProject.id)
        if (this.currentFilter === this.editingProject.id) {
          this.currentFilter = null
        }
        this.editingProject = null
        await this.loadProjects()
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    // Category methods
    showAddCategory() {
      this.showCategoryInput = true
      this.$nextTick(() => {
        this.$refs.categoryInput?.focus()
      })
    },
    async addCategory() {
      if (!this.newCategoryName.trim()) {
        this.cancelAddCategory()
        return
      }
      const randomSymbol = this.categorySymbols[Math.floor(Math.random() * this.categorySymbols.length)]
      await window.api.createCategory(this.newCategoryName.trim(), randomSymbol)
      this.newCategoryName = ''
      this.showCategoryInput = false
      await this.loadCategories()
    },
    async addCategoryFromSidebar(name) {
      if (!name.trim()) return
      const randomSymbol = this.categorySymbols[Math.floor(Math.random() * this.categorySymbols.length)]
      await window.api.createCategory(name.trim(), randomSymbol)
      await this.loadCategories()
    },
    cancelAddCategory() {
      this.newCategoryName = ''
      this.showCategoryInput = false
    },
    editCategory(category) {
      this.editingCategory = { ...category }
    },
    cancelEditCategory() {
      this.editingCategory = null
    },
    async saveCategory() {
      try {
        if (!this.editingCategory) return
        // Convert reactive proxy to plain object for IPC
        const categoryData = {
          id: this.editingCategory.id,
          name: this.editingCategory.name,
          symbol: this.editingCategory.symbol
        }
        await window.api.updateCategory(categoryData)
        await this.loadCategories()
        await this.loadAllTodos()
        await this.loadTodos()
        this.editingCategory = null
      } catch (error) {
        console.error('Error saving category:', error)
      }
    },
    async saveCategoryFromModal(categoryData) {
      this.editingCategory = categoryData
      await this.saveCategory()
    },
    async deleteCategoryConfirm() {
      if (confirm(`Delete category "${this.editingCategory.name}"?`)) {
        await window.api.deleteCategory(this.editingCategory.id)
        this.editingCategory = null
        await this.loadCategories()
        await this.loadAllTodos()
        await this.loadTodos()
      }
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
      if (!name.trim()) return
      const randomColor = this.statusColors[Math.floor(Math.random() * this.statusColors.length)]
      await window.api.createStatus(name.trim(), randomColor)
      await this.loadStatuses()
    },
    cancelAddStatus() {
      this.newStatusName = ''
      this.showStatusInput = false
    },
    editStatus(status) {
      this.editingStatus = { ...status }
    },
    cancelEditStatus() {
      this.editingStatus = null
    },
    async saveStatus() {
      try {
        if (!this.editingStatus) return
        const statusData = {
          id: this.editingStatus.id,
          name: this.editingStatus.name,
          color: this.editingStatus.color
        }
        await window.api.updateStatus(statusData)
        await this.loadStatuses()
        await this.loadAllTodos()
        await this.loadTodos()
        this.editingStatus = null
      } catch (error) {
        console.error('Error saving status:', error)
      }
    },
    async saveStatusFromModal(statusData) {
      this.editingStatus = statusData
      await this.saveStatus()
    },
    async deleteStatusConfirm() {
      if (confirm(`Delete status "${this.editingStatus.name}"?`)) {
        await window.api.deleteStatus(this.editingStatus.id)
        this.editingStatus = null
        await this.loadStatuses()
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    formatCreatedDate(createdAt) {
      if (!createdAt) return ''
      const date = new Date(createdAt)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      return this.sortedTodos.filter(t => {
        if (!t.start_date && !t.end_date) return false
        const start = t.start_date || t.end_date
        const end = t.end_date || t.start_date
        return dateKey >= start && dateKey <= end
      })
    },
    isToday(date) {
      const today = new Date()
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear()
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
        const mondayCount = this.timelineDates.slice(0, index).filter(d => d.getDay() === 1).length
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
        top: (6 + lane * (barHeight + barGap)) + 'px',
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
      cards.forEach(card => {
        this.cardResizeObserver.observe(card)
      })
    },
    applyMasonryLayout() {
      // Apply masonry layout to all card grids
      this.$nextTick(() => {
        setTimeout(() => {
          const grids = document.querySelectorAll('.cards-grid')
          grids.forEach(grid => {
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
            grids.forEach(grid => {
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
        const origStart = this.barDragOriginalDates.start_date || this.barDragOriginalDates.end_date
        if (origStart) {
          const newStart = new Date(origStart)
          newStart.setDate(newStart.getDate() + deltaDays)
          // Ensure start doesn't go past end
          const endDate = this.barDragOriginalDates.end_date ? new Date(this.barDragOriginalDates.end_date) : null
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
          const startDate = this.barDragOriginalDates.start_date ? new Date(this.barDragOriginalDates.start_date) : null
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
          const milestones = this.allTodos.filter(t => t.type === 'milestone')
          for (const m of milestones) {
            const rel = this.milestoneRelations[m.id]
            if (rel?.todos?.some(t => t.id === todoId)) {
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
    toggleCategoryFilter(categoryId) {
      if (this.filterCategoryId === categoryId) {
        this.filterCategoryId = null
      } else {
        this.filterCategoryId = categoryId
      }
    },
    // Graph methods
    async loadAllLinks() {
      const links = []
      const seen = new Set()
      for (const todo of this.allTodos) {
        const linked = await window.api.getLinkedTodos(todo.id)
        for (const l of linked) {
          const key = [Math.min(todo.id, l.id), Math.max(todo.id, l.id)].join('-')
          if (!seen.has(key)) {
            seen.add(key)
            links.push({ source: todo.id, target: l.id })
          }
        }
      }
      this.allLinks = links
    },
    getNodeX(todoId) {
      if (this.nodePositions[todoId]) {
        return this.nodePositions[todoId].x
      }
      // Calculate position without modifying state
      return this.calculateNodePosition(todoId).x
    },
    getNodeY(todoId) {
      if (this.nodePositions[todoId]) {
        return this.nodePositions[todoId].y
      }
      // Calculate position without modifying state
      return this.calculateNodePosition(todoId).y
    },
    isPersonLink(link) {
      const sourceNode = this.graphNodes.find(n => n.id === link.source)
      const targetNode = this.graphNodes.find(n => n.id === link.target)
      return sourceNode?.type === 'person' || targetNode?.type === 'person'
    },
    getLinkColor(link) {
      const sourceNode = this.graphNodes.find(n => n.id === link.source)
      const targetNode = this.graphNodes.find(n => n.id === link.target)

      // For person-todo links, use the person's color
      if (sourceNode?.type === 'person' && sourceNode.color) {
        return sourceNode.color
      }
      if (targetNode?.type === 'person' && targetNode.color) {
        return targetNode.color
      }

      // Use the source node's project color for the link
      if (sourceNode?.project_color) {
        return sourceNode.project_color
      }
      // Fallback to target node's color
      if (targetNode?.project_color) {
        return targetNode.project_color
      }
      // Default color
      return '#0f4c75'
    },
    getNodeHalfWidth(nodeId) {
      const node = this.graphNodes.find(n => n.id === nodeId)
      if (node?.type === 'person') return 80
      const el = this.$el?.querySelector(`[data-node-id="${nodeId}"] .node-content-wrapper`)
      if (el) return el.offsetWidth / 2
      return 70
    },
    getEdgePath(link) {
      const cx1 = this.getNodeX(link.source)
      const cy1 = this.getNodeY(link.source)
      const cx2 = this.getNodeX(link.target)
      const cy2 = this.getNodeY(link.target)

      if (!this.orthogonalEdges) {
        return `M ${cx1} ${cy1} L ${cx2} ${cy2}`
      }

      const hw1 = this.getNodeHalfWidth(link.source)
      const hw2 = this.getNodeHalfWidth(link.target)
      const key = `${link.source}-${link.target}`
      const channel = this._edgeChannels?.[key] || { offset: 0, portY1: 0, portY2: 0 }

      if (cx2 > cx1) {
        // Left to right
        const x1 = cx1 + hw1
        const y1 = cy1 + channel.portY1
        const x2 = cx2 - hw2
        const y2 = cy2 + channel.portY2
        const midX = x1 + (x2 - x1) * 0.5 + channel.offset
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
      } else if (cx1 > cx2) {
        // Right to left
        const x1 = cx1 - hw1
        const y1 = cy1 + channel.portY1
        const x2 = cx2 + hw2
        const y2 = cy2 + channel.portY2
        const midX = Math.min(x1, x2) - 20 + channel.offset
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
      } else {
        // Vertically aligned: route around the side
        const side = cy2 > cy1 ? 1 : -1
        const x1 = cx1 + hw1 + channel.offset
        const x2 = cx2 + hw2 + channel.offset
        const midX = Math.max(x1, x2) + 20
        return `M ${cx1 + hw1} ${cy1} L ${midX} ${cy1} L ${midX} ${cy2} L ${cx2 + hw2} ${cy2}`
      }
    },
    saveOrthogonalSetting() {
      localStorage.setItem('orthogonal-edges', this.orthogonalEdges)
    },
    calculateNodePosition(todoId) {
      const nodes = this.graphNodes
      const index = nodes.findIndex(t => t.id === todoId)
      const width = this.graphWidth || 800
      const height = this.graphHeight || 600
      const padding = 100
      const cols = Math.ceil(Math.sqrt(nodes.length * (width / height)))
      const rows = Math.ceil(nodes.length / cols)
      const col = index % cols
      const row = Math.floor(index / cols)
      const cellWidth = (width - padding * 2) / Math.max(cols, 1)
      const cellHeight = (height - padding * 2) / Math.max(rows, 1)
      return {
        x: padding + col * cellWidth + cellWidth / 2,
        y: padding + row * cellHeight + cellHeight / 2
      }
    },
    async onGraphNodeClick(todo) {
      this.selectedLink = null
      if (this.graphLinkMode) {
        if (this.graphLinkSource) {
          if (this.graphLinkSource.id !== todo.id) {
            // Create link between source and target
            await window.api.linkTodos(this.graphLinkSource.id, todo.id)
            await this.loadAllLinks()
          }
          this.graphLinkSource = null
          this.graphLinkMode = false
        } else {
          this.graphLinkSource = todo
        }
      } else {
        this.selectTodo(todo.id)
      }
    },
    toggleGraphLinkMode() {
      this.graphLinkMode = !this.graphLinkMode
      if (!this.graphLinkMode) {
        this.graphLinkSource = null
      }
    },
    updateGraphSize() {
      // Use fixed viewBox dimensions so layout doesn't shift when detail panel opens
      // The SVG will scale to fit the container via CSS
      // Only set initial size if not already set
      if (!this.graphWidth) this.graphWidth = 1600
      if (!this.graphHeight) this.graphHeight = 1200
    },
    screenToSvgCoords(event) {
      const svg = this.$refs.graphSvg
      // Use native SVG coordinate transform (handles preserveAspectRatio correctly)
      const point = svg.createSVGPoint()
      point.x = event.clientX
      point.y = event.clientY
      const viewBoxPoint = point.matrixTransform(svg.getScreenCTM().inverse())
      // Then apply inverse of pan and zoom transforms
      const x = (viewBoxPoint.x - this.graphPan.x) / this.graphZoom
      const y = (viewBoxPoint.y - this.graphPan.y) / this.graphZoom
      return { x, y }
    },
    onNodeContentMouseDown(event, todo) {
      // Handle modifier key actions for foreignObject content
      if (event.altKey) {
        event.preventDefault()
        event.stopPropagation()
        this.linkingNodeId = todo.id
        setTimeout(() => { this.linkingNodeId = null }, 500)
        // Option-click linking: first click sets source, second click creates link
        if (this.altClickSourceId && this.altClickSourceId !== todo.id) {
          window.api.linkTodos(this.altClickSourceId, todo.id)
            .then(() => {
              this.loadAllLinks()
              this.altClickSourceId = null
            })
            .catch(e => console.error('Failed to link:', e))
        } else {
          // Set this node as the source for linking
          this.altClickSourceId = todo.id
        }
        return
      }
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault()
        event.stopPropagation()
        this.creatingNodeFromId = todo.id
        setTimeout(() => { this.creatingNodeFromId = null }, 500)
        this.createConnectedNode(event, todo)
        return
      }
    },
    onNodeMouseDown(event, todo) {
      if (this.graphLinkMode) {
        // In link mode, handle as click
        this.onGraphNodeClick(todo)
        return
      }

      // Cmd/Ctrl+click creates a new connected node
      if (event.metaKey || event.ctrlKey) {
        this.creatingNodeFromId = todo.id
        setTimeout(() => { this.creatingNodeFromId = null }, 500)
        this.createConnectedNode(event, todo)
        return
      }

      // Option/Alt+click to link nodes
      if (event.altKey) {
        event.preventDefault()
        event.stopPropagation()
        // Option-click linking: first click sets source, second click creates link
        if (this.altClickSourceId && this.altClickSourceId !== todo.id) {
          window.api.linkTodos(this.altClickSourceId, todo.id)
            .then(() => {
              this.loadAllLinks()
              this.altClickSourceId = null
            })
            .catch(e => console.error('Failed to link:', e))
        } else {
          // Set this node as the source for linking
          this.altClickSourceId = todo.id
        }
        return
      }

      // Clear multi-select if clicking without modifier
      if (this.selectedNodeIds.length > 0) {
        this.selectedNodeIds = []
      }

      this.draggingNode = todo
      // Initialize position if not set
      if (!this.nodePositions[todo.id]) {
        this.nodePositions[todo.id] = { x: this.getNodeX(todo.id), y: this.getNodeY(todo.id) }
      }
      // Store offset from node center to mouse position for smooth dragging
      const coords = this.screenToSvgCoords(event)
      const nodePos = this.nodePositions[todo.id]
      this.dragOffset = { x: nodePos.x - coords.x, y: nodePos.y - coords.y }
      this.lastMousePos = { x: event.clientX, y: event.clientY }
      // If simulation is running, fix this node's position
      if (this.d3Simulation) {
        const simNode = this.d3Simulation.nodes().find(n => n.id === todo.id)
        if (simNode) {
          simNode.fx = nodePos.x
          simNode.fy = nodePos.y
        }
        this.d3Simulation.alphaTarget(0.3).restart()
      }
    },
    onGraphMouseDown(event) {
      // Close context menu if open
      if (this.linkContextMenu) {
        this.linkContextMenu = null
        return
      }
      if (this.draggingNode) return
      // Start panning
      this.isPanning = true
      this.lastMousePos = { x: event.clientX, y: event.clientY }
    },
    onGraphMouseMove(event) {
      // Update mouse position for tooltip
      this.mousePos = { x: event.clientX, y: event.clientY }

      if (this.draggingNode) {
        const coords = this.screenToSvgCoords(event)
        // Apply stored offset to keep node under cursor
        const x = coords.x + (this.dragOffset?.x || 0)
        const y = coords.y + (this.dragOffset?.y || 0)
        this.nodePositions[this.draggingNode.id] = { x, y }
        // Force reactivity
        this.nodePositions = { ...this.nodePositions }
        // Update simulation node if running
        if (this.d3Simulation) {
          const simNode = this.d3Simulation.nodes().find(n => n.id === this.draggingNode.id)
          if (simNode) {
            simNode.fx = x
            simNode.fy = y
          }
        }
      } else if (this.isPanning) {
        const svg = this.$refs.graphSvg
        const ctm = svg.getScreenCTM()
        // Convert screen pixel deltas to viewBox coordinate deltas
        const dx = (event.clientX - this.lastMousePos.x) / ctm.a
        const dy = (event.clientY - this.lastMousePos.y) / ctm.d
        this.graphPan.x += dx
        this.graphPan.y += dy
        this.lastMousePos = { x: event.clientX, y: event.clientY }
      }
    },
    onGraphMouseUp(event) {
      if (this.draggingNode) {
        // Check if it was just a click (minimal movement)
        const dx = Math.abs(event.clientX - this.lastMousePos.x)
        const dy = Math.abs(event.clientY - this.lastMousePos.y)
        if (dx >= 5 || dy >= 5) {
          // Was actually dragging - set flag to prevent click handler from opening edit
          this.wasDragging = true
          setTimeout(() => { this.wasDragging = false }, 100)
        }
        // Release fixed position in simulation
        if (this.d3Simulation) {
          const simNode = this.d3Simulation.nodes().find(n => n.id === this.draggingNode.id)
          if (simNode) {
            simNode.fx = null
            simNode.fy = null
          }
          this.d3Simulation.alphaTarget(0)
        }
      }
      this.draggingNode = null
      this.isPanning = false
      this.saveNodePositions()
    },
    startEditingNode(event, todo) {
      // Don't open edit if we just finished dragging or if this is the parent node of a new node being created
      if (this.wasDragging) return
      if (this.creatingNodeFromId === todo.id) return
      if (this.linkingNodeId === todo.id) return
      // Don't edit if link mode is active
      if (this.graphLinkMode) return
      // Don't edit if modifier keys are held (used for linking/creating)
      if (event && (event.altKey || event.metaKey || event.ctrlKey)) return
      // Don't edit person nodes
      if (todo.type === 'person') return
      this.editingNodeId = todo.id
      this.editingNodeNotes = todo.notes || ''
      // Don't show 'Untitled' or 'New Node' in the input - show blank instead
      this.editingNodeTitle = (todo.title === 'Untitled' || todo.title === 'New Node') ? '' : (todo.title || '')
      // Focus textarea after DOM update
      this.$nextTick(() => {
        const editor = this.$refs.nodeNotesEditor
        if (editor) {
          // Handle both single element and array (from v-for)
          const el = Array.isArray(editor) ? editor[0] : editor
          if (el && el.focus) {
            el.focus()
            this.autoResizeNodeEditor()
          }
        }
      })
    },
    onNodeTitleClick(event, todo) {
      // If clicking on a link, open in system browser
      if (event.target.tagName === 'A' && event.target.href) {
        event.preventDefault()
        window.api.openExternal(event.target.href)
        return
      }
      // Otherwise start editing
      this.startEditingNode(event, todo)
    },
    onNotesClick(event) {
      // If clicking on a link in notes, open in system browser
      if (event.target.tagName === 'A' && event.target.href) {
        event.preventDefault()
        event.stopPropagation()
        window.api.openExternal(event.target.href)
      }
    },
    autoResizeNodeEditor() {
      const editor = this.$refs.nodeNotesEditor
      if (editor) {
        const el = Array.isArray(editor) ? editor[0] : editor
        if (el && el.style) {
          el.style.height = 'auto'
          el.style.height = Math.min(el.scrollHeight, 300) + 'px'
        }
      }
      // Auto-save with debounce
      this.debouncedSaveNode()
    },
    focusNotesEditor() {
      const editor = this.$refs.nodeNotesEditor
      if (editor) {
        const el = Array.isArray(editor) ? editor[0] : editor
        if (el && el.focus) el.focus()
      }
    },
    debouncedSaveNode() {
      clearTimeout(this.nodeSaveTimeout)
      this.nodeSaveTimeout = setTimeout(() => {
        if (this.editingNodeId) {
          const todo = this.todos.find(t => t.id === this.editingNodeId)
          if (todo) {
            this.saveNodeNotesQuiet(todo)
          }
        }
      }, 500)
    },
    async saveNodeNotesQuiet(todo) {
      // Save without closing edit mode
      const notesChanged = this.editingNodeNotes !== (todo.notes || '')
      const titleChanged = this.editingNodeTitle !== (todo.title || '')
      if (notesChanged || titleChanged) {
        const updatedTodo = {
          ...todo,
          notes: this.editingNodeNotes,
          title: this.editingNodeTitle || 'Untitled'
        }
        await window.api.updateTodo(updatedTodo)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async saveNodeContent(todo) {
      if (this.editingNodeId !== todo.id) return
      // Clear pending debounced save
      clearTimeout(this.nodeSaveTimeout)
      const notesChanged = this.editingNodeNotes !== (todo.notes || '')
      const titleChanged = this.editingNodeTitle !== (todo.title || '')
      // Save if anything changed
      if (notesChanged || titleChanged) {
        const updatedTodo = {
          ...todo,
          notes: this.editingNodeNotes,
          title: this.editingNodeTitle || 'Untitled'
        }
        await window.api.updateTodo(updatedTodo)
        // Update in-place to avoid full reload and graph reset
        const idx = this.allTodos.findIndex(t => t.id === todo.id)
        if (idx !== -1) {
          this.allTodos[idx] = { ...this.allTodos[idx], notes: updatedTodo.notes, title: updatedTodo.title }
        }
        const todosIdx = this.todos.findIndex(t => t.id === todo.id)
        if (todosIdx !== -1) {
          this.todos[todosIdx] = { ...this.todos[todosIdx], notes: updatedTodo.notes, title: updatedTodo.title }
        }
      }
    },
    async saveAndCloseNode(todo) {
      await this.saveNodeContent(todo)
      this.editingNodeId = null
      this.editingNodeNotes = ''
      this.editingNodeTitle = ''
    },
    onNodeBlur(event, todo) {
      // Check if focus is moving to another element within the same node
      const relatedTarget = event.relatedTarget
      const wrapper = event.target.closest('.node-content-wrapper')
      if (wrapper && relatedTarget && wrapper.contains(relatedTarget)) {
        // Focus is staying within the node, just save without closing
        this.saveNodeContent(todo)
        return
      }
      // Focus left the node, save and close
      this.saveAndCloseNode(todo)
    },
    onNodeNotesBlur(event, todo) {
      this.onNodeBlur(event, todo)
    },
    onNodeTitleBlur(event, todo) {
      this.onNodeBlur(event, todo)
    },
    async saveNodeNotes(todo) {
      // Legacy method - now calls saveAndCloseNode
      await this.saveAndCloseNode(todo)
    },
    cancelEditingNode() {
      this.editingNodeId = null
      this.editingNodeNotes = ''
      this.editingNodeTitle = ''
    },
    async closeEverything() {
      // Save any pending edits before closing
      if (this.editingNodeId) {
        clearTimeout(this.nodeSaveTimeout)
        const todo = this.todos.find(t => t.id === this.editingNodeId)
        if (todo) {
          const notesChanged = this.editingNodeNotes !== (todo.notes || '')
          const titleChanged = this.editingNodeTitle !== (todo.title || '') &&
            !(this.editingNodeTitle === '' && (todo.title === 'Untitled' || todo.title === 'New Node'))
          if (notesChanged || titleChanged) {
            const updatedTodo = {
              ...todo,
              notes: this.editingNodeNotes,
              title: this.editingNodeTitle || 'Untitled'
            }
            await window.api.updateTodo(updatedTodo)
            await this.loadAllTodos()
            await this.loadTodos()
          }
        }
      }
      // Close all open views: editing, detail panel, fullscreen, detached windows
      this.editingNodeId = null
      this.editingNodeNotes = ''
      this.editingNodeTitle = ''
      this.focusedTodoIndex = -1
    },
    onGraphCanvasClick(event) {
      // Clear selected link when clicking on canvas
      this.selectedLink = null
      // Close editing if clicking outside nodes (on the canvas background)
      if (event.target.classList.contains('graph-svg') || event.target.tagName === 'svg') {
        if (this.editingNodeId) {
          // Find the todo being edited and save
          const todo = this.todos.find(t => t.id === this.editingNodeId)
          if (todo) {
            this.saveNodeNotes(todo)
          } else {
            this.cancelEditingNode()
          }
        }
      }
    },
    async createConnectedNode(event, parentTodo) {
      // Get position offset from parent node
      const parentPos = this.nodePositions[parentTodo.id] || { x: 400, y: 300 }

      // Use the same project as the parent todo
      const projectId = parentTodo.project_id
      const type = 'todo'

      try {
        const todo = await window.api.createTodo('Untitled', projectId, type)
        await this.loadAllTodos()
        await this.loadTodos()

        if (todo) {
          // Initial position close to parent (will be optimized by layout)
          this.nodePositions[todo.id] = {
            x: parentPos.x + 120,
            y: parentPos.y + 80
          }
          this.nodePositions = { ...this.nodePositions }

          // Link to parent
          await window.api.linkTodos(parentTodo.id, todo.id)
          await this.loadAllLinks()

          // Run quick layout optimization for new node, then start editing
          this.$nextTick(() => {
            this.optimizeNewNodePosition(todo.id)
            this.$nextTick(() => {
              const newTodo = this.todos.find(t => t.id === todo.id)
              if (newTodo) this.startEditingNode(null, newTodo)
            })
          })
        }
      } catch (e) {
        console.error('Failed to create connected node:', e)
      }
    },
    optimizeNewNodePosition(newNodeId) {
      // Run a quick force simulation to find optimal position for new node
      const nodes = this.graphNodes.map(n => {
        const x = this.nodePositions[n.id]?.x ?? this.getNodeX(n.id)
        const y = this.nodePositions[n.id]?.y ?? this.getNodeY(n.id)
        return {
          id: n.id,
          x,
          y,
          // Fix all nodes except the new one
          fx: n.id === newNodeId ? null : x,
          fy: n.id === newNodeId ? null : y
        }
      })

      const links = this.graphLinks.map(l => ({
        source: l.source,
        target: l.target
      }))

      const getNodeRadius = (nodeId) => {
        const todo = this.graphNodes.find(n => n.id === nodeId)
        if (!todo) return 80
        const titleLength = todo.title?.length || 0
        const notesLength = todo.notes?.length || 0
        const estimatedWidth = Math.min(280, 120 + titleLength * 4 + (notesLength > 0 ? 60 : 0))
        const notesLines = notesLength > 0 ? Math.ceil(notesLength / 35) : 0
        const estimatedHeight = 50 + notesLines * 18
        const diagonal = Math.sqrt(estimatedWidth * estimatedWidth + estimatedHeight * estimatedHeight)
        return diagonal / 2 + 20
      }

      const simulation = d3Force.forceSimulation(nodes)
        .force('link', d3Force.forceLink(links)
          .id(d => d.id)
          .distance(this.graphEdgeLength * 2)
          .strength(1))
        .force('charge', d3Force.forceManyBody()
          .strength(this.graphRepulsion))
        .force('collision', d3Force.forceCollide()
          .radius(d => getNodeRadius(d.id))
          .strength(1))
        .alphaDecay(0.1)
        .on('end', () => {
          const newNode = nodes.find(n => n.id === newNodeId)
          if (newNode) {
            // Keep within bounds
            const padding = 150
            const x = Math.max(padding, Math.min(this.graphWidth - padding, newNode.x))
            const y = Math.max(padding, Math.min(this.graphHeight - padding, newNode.y))
            this.nodePositions[newNodeId] = { x, y }
            this.nodePositions = { ...this.nodePositions }
            this.saveNodePositions()
          }
        })

      // Run simulation quickly
      simulation.tick(50)
      simulation.stop()

      const newNode = nodes.find(n => n.id === newNodeId)
      if (newNode) {
        const padding = 150
        const x = Math.max(padding, Math.min(this.graphWidth - padding, newNode.x))
        const y = Math.max(padding, Math.min(this.graphHeight - padding, newNode.y))
        this.nodePositions[newNodeId] = { x, y }
        this.nodePositions = { ...this.nodePositions }
        this.saveNodePositions()
      }
    },
    async onGraphDblClick(event) {
      // Don't create if clicking on a node
      if (event.target.closest('.graph-node')) return

      // Get position in graph coordinates
      const coords = this.screenToSvgCoords(event)

      // Determine project ID - use current filter if it's a project
      const projectId = this.isProjectSelected ? this.currentFilter : null
      const type = 'todo'

      try {
        const todo = await window.api.createTodo('Untitled', projectId, type)
        await this.loadAllTodos()
        await this.loadTodos()

        // Set position for the new node
        if (todo) {
          this.nodePositions[todo.id] = { x: coords.x, y: coords.y }
          this.nodePositions = { ...this.nodePositions }
          this.saveNodePositions()

          // Start editing the new node
          const newTodo = this.todos.find(t => t.id === todo.id)
          if (newTodo) this.startEditingNode(null, newTodo)
        }
      } catch (e) {
        console.error('Failed to create todo:', e)
      }
    },
    onGraphWheel(event) {
      // Smoother zoom using exponential scaling
      const zoomSpeed = 0.002
      const zoomFactor = Math.exp(-event.deltaY * zoomSpeed)
      const newZoom = Math.max(0.2, Math.min(4, this.graphZoom * zoomFactor))

      // Zoom towards mouse position in viewBox coordinates
      const svg = this.$refs.graphSvg
      const point = svg.createSVGPoint()
      point.x = event.clientX
      point.y = event.clientY
      const vbPoint = point.matrixTransform(svg.getScreenCTM().inverse())
      const mouseX = vbPoint.x
      const mouseY = vbPoint.y

      const zoomRatio = newZoom / this.graphZoom
      this.graphPan.x = mouseX - (mouseX - this.graphPan.x) * zoomRatio
      this.graphPan.y = mouseY - (mouseY - this.graphPan.y) * zoomRatio

      this.graphZoom = newZoom
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
    resetGraphView() {
      // Ensure node positions exist for all nodes
      this.graphNodes.forEach(node => {
        if (!this.nodePositions[node.id]) {
          this.nodePositions[node.id] = this.calculateNodePosition(node.id)
        }
      })

      // Only consider positions for nodes currently in the graph
      const nodeIds = new Set(this.graphNodes.map(n => n.id))
      const positions = Object.entries(this.nodePositions)
        .filter(([id]) => nodeIds.has(Number(id)))
        .map(([, pos]) => pos)

      if (positions.length === 0) {
        this.graphZoom = 1
        this.graphPan = { x: 0, y: 0 }
        return
      }

      // Calculate bounding box of all nodes (with padding for node size)
      const nodeWidth = 300
      const nodeHeight = 200
      const padding = 50

      const xs = positions.map(p => p.x)
      const ys = positions.map(p => p.y)
      const minX = Math.min(...xs) - nodeWidth / 2 - padding
      const maxX = Math.max(...xs) + nodeWidth / 2 + padding
      const minY = Math.min(...ys) - nodeHeight / 2 - padding
      const maxY = Math.max(...ys) + nodeHeight / 2 + padding

      const boundingWidth = maxX - minX
      const boundingHeight = maxY - minY
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      // Get SVG container size
      const svg = this.$refs.graphSvg
      if (svg) {
        const rect = svg.getBoundingClientRect()
        // Scale viewBox dimensions to screen
        const scaleX = this.graphWidth / rect.width
        const scaleY = this.graphHeight / rect.height
        const viewWidth = rect.width * scaleX
        const viewHeight = rect.height * scaleY

        // Calculate zoom to fit all nodes
        const zoomX = viewWidth / boundingWidth
        const zoomY = viewHeight / boundingHeight
        const fitZoom = Math.min(zoomX, zoomY, 2) // Cap at 2x zoom
        this.graphZoom = Math.max(0.3, fitZoom * 0.9) // 90% to add margin, min 0.3

        // Center the view
        this.graphPan = {
          x: viewWidth / 2 - centerX * this.graphZoom,
          y: viewHeight / 2 - centerY * this.graphZoom
        }
      }
    },
    onLinkRightClick(event, link) {
      // Show context menu at mouse position
      this.linkContextMenu = {
        x: event.clientX,
        y: event.clientY,
        link: link
      }
    },
    onLinkClick(event, link) {
      event.stopPropagation()
      // Option/Alt-click to remove link directly
      if (event.altKey) {
        event.preventDefault()
        this.removeLink(link)
        return
      }
      // Toggle selection - click to show buttons, click again to hide
      this.selectedLink = (this.selectedLink === link) ? null : link
    },
    removeLink(link) {
      window.api.unlinkTodos(link.source, link.target)
        .then(() => this.loadAllLinks())
        .catch(e => console.error('Failed to unlink:', e))
    },
    async removeLinkFromMenu() {
      if (this.linkContextMenu?.link) {
        const { source, target } = this.linkContextMenu.link
        await window.api.unlinkTodos(source, target)
        await this.loadAllLinks()
      }
      this.linkContextMenu = null
    },
    async insertNodeInLink() {
      if (!this.linkContextMenu?.link) return
      const { source, target } = this.linkContextMenu.link
      const sourceNode = this.graphNodes.find(n => n.id === source)

      // Calculate midpoint position
      const sourcePos = this.nodePositions[source] || { x: 400, y: 300 }
      const targetPos = this.nodePositions[target] || { x: 500, y: 300 }
      const midX = (sourcePos.x + targetPos.x) / 2
      const midY = (sourcePos.y + targetPos.y) / 2

      // Use project from source node
      const projectId = sourceNode?.project_id || null
      const type = 'todo'

      try {
        // Create new node
        const todo = await window.api.createTodo('Untitled', projectId, type)

        // Position at midpoint
        this.nodePositions[todo.id] = { x: midX, y: midY }
        this.saveNodePositions()

        // Remove old link
        await window.api.unlinkTodos(source, target)

        // Create new links: source -> new -> target
        await window.api.linkTodos(source, todo.id)
        await window.api.linkTodos(todo.id, target)

        // Reload data
        await this.loadTodos()
        await this.loadAllLinks()
      } catch (e) {
        console.error('Failed to insert node:', e)
      }

      this.linkContextMenu = null
    },
    async insertNodeInLinkDirect(link) {
      const { source, target } = link
      const sourceNode = this.graphNodes.find(n => n.id === source)

      // Calculate midpoint position
      const sourcePos = this.nodePositions[source] || { x: 400, y: 300 }
      const targetPos = this.nodePositions[target] || { x: 500, y: 300 }
      const midX = (sourcePos.x + targetPos.x) / 2
      const midY = (sourcePos.y + targetPos.y) / 2

      // Use project from source node
      const projectId = sourceNode?.project_id || null
      const type = 'todo'

      try {
        // Create new node
        const todo = await window.api.createTodo('Untitled', projectId, type)

        // Position at midpoint
        this.nodePositions[todo.id] = { x: midX, y: midY }
        this.saveNodePositions()

        // Remove old link
        await window.api.unlinkTodos(source, target)

        // Create new links: source -> new -> target
        await window.api.linkTodos(source, todo.id)
        await window.api.linkTodos(todo.id, target)

        // Reload data
        await this.loadTodos()
        await this.loadAllLinks()

        // Start editing the new node
        const newTodo = this.todos.find(t => t.id === todo.id)
        if (newTodo) this.startEditingNode(null, newTodo)
      } catch (e) {
        console.error('Failed to insert node:', e)
      }
      this.hoveredLink = null
    },
    initializeNodePositions() {
      // Initialize positions for all nodes
      const newPositions = { ...this.nodePositions }
      this.graphNodes.forEach(node => {
        if (!newPositions[node.id]) {
          newPositions[node.id] = this.calculateNodePosition(node.id)
        }
      })
      this.nodePositions = newPositions
    },
    onLayoutTypeChange() {
      localStorage.setItem('graph-layout-type', this.graphLayoutType)
    },
    runLayout() {
      // Stop any running force simulation first
      if (this.d3Simulation) {
        this.stopForceLayout()
      }
      switch (this.graphLayoutType) {
        case 'force':
          this.runForceLayout()
          break
        case 'tree':
          this.runTreeLayout()
          break
        case 'grid':
          this.runGridLayout()
          break
        default:
          this.runForceLayout()
      }
    },
    runGridLayout() {
      const nodes = this.graphNodes
      if (nodes.length === 0) return

      const newPositions = {}

      // Separate person nodes from todo nodes
      const todoNodes = nodes.filter(n => n.type !== 'person')
      const personNodes = nodes.filter(n => n.type === 'person')

      // Grid settings - distance slider controls spacing
      // Base node size + gap based on edge length setting
      const baseWidth = 200
      const baseHeight = 120
      const gap = this.graphEdgeLength
      const cellWidth = baseWidth + gap
      const cellHeight = baseHeight + gap * 0.6
      const startX = 150
      const startY = 100

      // Calculate columns based on number of nodes (aim for roughly square grid)
      const totalTodos = todoNodes.length
      const cols = Math.max(1, Math.ceil(Math.sqrt(totalTodos * 1.2)))

      // Position todo nodes in grid
      todoNodes.forEach((node, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        newPositions[node.id] = {
          x: startX + col * cellWidth,
          y: startY + row * cellHeight
        }
      })

      // Position person nodes in a row below the todo grid
      const todoRows = Math.ceil(totalTodos / cols)
      const personStartY = startY + todoRows * cellHeight + 60
      const personCellWidth = 160 + gap * 0.5

      personNodes.forEach((person, idx) => {
        newPositions[person.id] = {
          x: startX + idx * personCellWidth,
          y: personStartY
        }
      })

      this.nodePositions = newPositions
      this.saveNodePositions()
    },
    runTreeLayout() {
      // Auto-enable orthogonal edges for tree layout
      this.orthogonalEdges = true
      this.saveOrthogonalSetting()

      const nodes = this.graphNodes.filter(n => n.type !== 'person')
      const links = this.graphLinks.filter(l => l.type !== 'person-todo')

      // Build adjacency list
      const children = {}
      const hasParent = new Set()
      links.forEach(link => {
        if (!children[link.source]) children[link.source] = []
        children[link.source].push(link.target)
        hasParent.add(link.target)
      })

      // Find root nodes (nodes with no incoming links)
      const roots = nodes.filter(n => !hasParent.has(n.id))
      if (roots.length === 0 && nodes.length > 0) {
        roots.push(nodes[0])
      }

      const newPositions = {}
      // Spacing based on edge length setting
      const nodeWidth = 160
      const nodeHeight = 60
      const hGap = Math.max(40, this.graphEdgeLength * 0.5)
      const vGap = Math.max(20, this.graphEdgeLength * 0.3)
      const levelSpacing = nodeWidth + hGap
      const nodeSpacing = nodeHeight + vGap

      // Assign levels to all nodes using BFS
      const nodeLevel = {}
      const visited = new Set()

      const assignLevels = (rootId) => {
        const queue = [{ id: rootId, level: 0 }]
        while (queue.length > 0) {
          const { id, level } = queue.shift()
          if (visited.has(id)) continue
          visited.add(id)
          nodeLevel[id] = level
          const nodeChildren = children[id] || []
          nodeChildren.forEach(childId => {
            if (!visited.has(childId)) {
              queue.push({ id: childId, level: level + 1 })
            }
          })
        }
      }

      roots.forEach(root => assignLevels(root.id))
      // Assign disconnected nodes
      nodes.forEach(n => {
        if (!visited.has(n.id)) {
          assignLevels(n.id)
        }
      })

      // Group nodes by level
      const levelNodes = {}
      let maxLevel = 0
      nodes.forEach(n => {
        const level = nodeLevel[n.id] || 0
        if (!levelNodes[level]) levelNodes[level] = []
        levelNodes[level].push(n)
        maxLevel = Math.max(maxLevel, level)
      })

      // Position nodes level by level, left to right
      const startX = 80
      const startY = 50

      for (let level = 0; level <= maxLevel; level++) {
        const nodesAtLevel = levelNodes[level] || []
        nodesAtLevel.forEach((node, idx) => {
          newPositions[node.id] = {
            x: startX + level * levelSpacing,
            y: startY + idx * nodeSpacing
          }
        })
      }

      // Refine: center parents among their children
      for (let level = maxLevel - 1; level >= 0; level--) {
        const nodesAtLevel = levelNodes[level] || []
        nodesAtLevel.forEach(node => {
          const nodeChildren = children[node.id] || []
          if (nodeChildren.length > 0) {
            const childYs = nodeChildren
              .filter(cid => newPositions[cid])
              .map(cid => newPositions[cid].y)
            if (childYs.length > 0) {
              const minY = Math.min(...childYs)
              const maxY = Math.max(...childYs)
              newPositions[node.id].y = (minY + maxY) / 2
            }
          }
        })
      }

      // Resolve overlaps within each level
      for (let level = 0; level <= maxLevel; level++) {
        const nodesAtLevel = levelNodes[level] || []
        // Sort by Y position
        nodesAtLevel.sort((a, b) => (newPositions[a.id]?.y || 0) - (newPositions[b.id]?.y || 0))
        // Ensure minimum spacing
        for (let i = 1; i < nodesAtLevel.length; i++) {
          const prev = newPositions[nodesAtLevel[i - 1].id]
          const curr = newPositions[nodesAtLevel[i].id]
          if (curr && prev && curr.y - prev.y < nodeSpacing) {
            curr.y = prev.y + nodeSpacing
          }
        }
      }

      // Position person nodes in a column on the right
      const personNodes = this.graphNodes.filter(n => n.type === 'person')
      const personLinks = this.graphLinks.filter(l => l.type === 'person-todo')

      // Find the rightmost todo X position
      let maxTodoX = startX
      Object.values(newPositions).forEach(pos => {
        maxTodoX = Math.max(maxTodoX, pos.x)
      })

      // Person column is to the right of all todos
      const personColumnX = maxTodoX + levelSpacing

      // Sort person nodes by average Y of connected todos
      const personAvgY = {}
      personNodes.forEach(person => {
        const connectedTodoIds = personLinks
          .filter(l => l.source === person.id)
          .map(l => l.target)

        if (connectedTodoIds.length > 0) {
          let sumY = 0, count = 0
          connectedTodoIds.forEach(todoId => {
            if (newPositions[todoId]) {
              sumY += newPositions[todoId].y
              count++
            }
          })
          personAvgY[person.id] = count > 0 ? sumY / count : startY
        } else {
          personAvgY[person.id] = startY + Object.keys(personAvgY).length * nodeSpacing
        }
      })

      // Sort persons by their average Y
      personNodes.sort((a, b) => (personAvgY[a.id] || 0) - (personAvgY[b.id] || 0))

      // Position person nodes with minimum spacing
      let lastPersonY = -nodeSpacing
      personNodes.forEach(person => {
        const targetY = personAvgY[person.id] || startY
        const personY = Math.max(targetY, lastPersonY + nodeSpacing)
        newPositions[person.id] = { x: personColumnX, y: personY }
        lastPersonY = personY
      })

      this.nodePositions = newPositions
      this.saveNodePositions()
    },
    runForceLayout() {
      if (this.isSimulating) {
        this.stopForceLayout()
        return
      }

      this.isSimulating = true
      this.initializeNodePositions()

      // Check if all nodes already have positions (re-running on relaxed graph)
      const allNodesPositioned = this.graphNodes.every(n => this.nodePositions[n.id])

      // Create d3-force simulation with improved parameters
      const nodes = this.graphNodes.map(n => ({
        id: n.id,
        x: this.nodePositions[n.id]?.x || this.graphWidth / 2 + (Math.random() - 0.5) * 400,
        y: this.nodePositions[n.id]?.y || this.graphHeight / 2 + (Math.random() - 0.5) * 400
      }))

      const links = this.graphLinks.map(l => ({
        source: l.source,
        target: l.target,
        type: l.type
      }))

      // Calculate collision radius based on actual node size
      const getNodeRadius = (nodeId) => {
        const todo = this.graphNodes.find(n => n.id === nodeId)
        if (!todo) return 80

        // Person nodes are smaller
        if (todo.type === 'person') return 40

        // Estimate node dimensions based on content (matching CSS min/max-width)
        const titleLength = todo.title?.length || 0
        const notesLength = todo.notes?.length || 0

        // Width: min 120px, max 280px based on content
        const baseWidth = 120
        const maxWidth = 280
        const estimatedWidth = Math.min(maxWidth, baseWidth + titleLength * 4 + (notesLength > 0 ? 60 : 0))

        // Height: base ~50px for title, plus ~18px per line of notes
        const baseHeight = 50
        const notesLines = notesLength > 0 ? Math.ceil(notesLength / 35) : 0
        const estimatedHeight = baseHeight + notesLines * 18

        // Return radius as half the diagonal (to encompass rectangular node)
        const diagonal = Math.sqrt(estimatedWidth * estimatedWidth + estimatedHeight * estimatedHeight)
        return diagonal / 2 + 20 // Add padding
      }

      this.d3Simulation = d3Force.forceSimulation(nodes)
        .force('link', d3Force.forceLink(links)
          .id(d => d.id)
          .distance(d => {
            // Shorter distance for person-todo links
            if (d.type === 'person-todo') {
              return this.graphEdgeLength * 0.5
            }
            return this.graphEdgeLength * 2
          })
          .strength(d => {
            // Stronger pull for person links to keep them closer
            if (d.type === 'person-todo') {
              return 0.9
            }
            return 0.5
          }))
        .force('charge', d3Force.forceManyBody()
          .strength(this.graphRepulsion)
          .distanceMin(100)
          .distanceMax(800))
        .force('center', d3Force.forceCenter(this.graphWidth / 2, this.graphHeight / 2))
        .force('collision', d3Force.forceCollide()
          .radius(d => getNodeRadius(d.id))
          .strength(0.8))
        // Keep nodes within bounds
        .force('x', d3Force.forceX(this.graphWidth / 2).strength(0.02))
        .force('y', d3Force.forceY(this.graphHeight / 2).strength(0.02))
        .velocityDecay(0.4)
        .alphaDecay(0.02)
        // Start with low alpha if nodes are already positioned (prevents jumping)
        .alpha(allNodesPositioned ? 0.1 : 1)
        .on('tick', () => {
          const newPositions = {}
          const padding = 150
          nodes.forEach(node => {
            // Keep nodes within bounds
            node.x = Math.max(padding, Math.min(this.graphWidth - padding, node.x))
            node.y = Math.max(padding, Math.min(this.graphHeight - padding, node.y))
            newPositions[node.id] = { x: node.x, y: node.y }
          })
          this.nodePositions = newPositions
        })
        .on('end', () => {
          this.isSimulating = false
          this.saveNodePositions()
        })
    },
    stopForceLayout() {
      this.isSimulating = false
      if (this.d3Simulation) {
        this.d3Simulation.stop()
        this.d3Simulation = null
      }
    },
    getGraphStorageKey() {
      // Use project-specific key, or 'all' for no project filter
      const projectId = this.isProjectSelected ? this.currentFilter : 'all'
      return `graph-${projectId}`
    },
    saveNodePositions() {
      const key = this.getGraphStorageKey()
      localStorage.setItem(`${key}-positions`, JSON.stringify(this.nodePositions))
    },
    loadNodePositions() {
      try {
        const key = this.getGraphStorageKey()
        const saved = localStorage.getItem(`${key}-positions`)
        if (saved) {
          this.nodePositions = JSON.parse(saved)
        } else {
          this.nodePositions = {}
        }
      } catch (e) {
        console.error('Failed to load node positions:', e)
        this.nodePositions = {}
      }
    },
    saveGraphSettings() {
      const key = this.getGraphStorageKey()
      localStorage.setItem(`${key}-settings`, JSON.stringify({
        layoutType: this.graphLayoutType,
        edgeLength: this.graphEdgeLength,
        repulsion: this.graphRepulsion,
        orthogonal: this.orthogonalEdges,
        showPersons: this.showPersonsInGraph
      }))
      // Also save as defaults
      localStorage.setItem('graph-repulsion', this.graphRepulsion)
      localStorage.setItem('graph-edge-length', this.graphEdgeLength)
    },
    loadGraphSettings() {
      try {
        const key = this.getGraphStorageKey()
        const saved = localStorage.getItem(`${key}-settings`)
        if (saved) {
          const settings = JSON.parse(saved)
          this.graphLayoutType = settings.layoutType || 'force'
          this.graphEdgeLength = settings.edgeLength || 100
          this.graphRepulsion = settings.repulsion || -300
          this.orthogonalEdges = settings.orthogonal || false
          this.showPersonsInGraph = settings.showPersons || false
        }
      } catch (e) {
        console.error('Failed to load graph settings:', e)
      }
    },
    onGraphSettingChange() {
      this.saveGraphSettings()
      // For tree/grid layout, re-run layout immediately
      if (this.graphLayoutType === 'tree') {
        this.runTreeLayout()
        return
      }
      if (this.graphLayoutType === 'grid') {
        this.runGridLayout()
        return
      }
      // For force layout, only update if simulation is already running
      if (this.d3Simulation) {
        this.d3Simulation
          .force('charge', d3Force.forceManyBody().strength(this.graphRepulsion))
          .force('link', d3Force.forceLink(this.d3Simulation.force('link').links())
            .id(d => d.id)
            .distance(this.graphEdgeLength))
        this.d3Simulation.alpha(0.3).restart()
      }
      // Don't auto-start simulation - user must click "Auto Layout"
    },
    resetGraphSettings() {
      this.graphRepulsion = -400
      this.graphEdgeLength = 100
      this.onGraphSettingChange()
    },
    // Keyboard shortcuts
    handleKeyUp(e) {
      if (e.key === 'Alt') this.altKeyHeld = false
    },
    handleKeyDown(e) {
      if (e.key === 'Alt') this.altKeyHeld = true
      // Ignore if typing in input/textarea
      const target = e.target
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

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
      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo) {
        // Switch to correct tab based on type
        if (todo.type === 'person') {
          this.setTab('stakeholders')
        } else {
          this.setTab('items')
        }
        // Navigate to correct project
        if (todo.project_id) {
          await this.setFilter(todo.project_id)
        } else {
          await this.setFilter('inbox')
        }
        this.$nextTick(() => {
          const index = this.todos.findIndex(t => t.id === todoId)
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
    async onGlobalSearchSelectPerson(person) {
      // Switch to stakeholders tab
      this.setTab('stakeholders')
      // Select the person in PersonsView
      this.pendingPersonEdit = person
    },
    async onGlobalSearchSelectProject(project) {
      // Switch to items tab and navigate to project
      this.setTab('items')
      await this.setFilter(project.id)
    },
    addToRecentItems(todo) {
      if (!todo) return
      // Remove if already exists
      this.recentItems = this.recentItems.filter(t => t.id !== todo.id)
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
      document.querySelectorAll('.mermaid[data-processed]').forEach(el => {
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
      await this.loadAllLinks()
    },
    async redo() {
      if (!this.historyState.canRedo) return
      await window.api.redo()
      await this.loadTodos()
      await this.loadAllTodos()
      await this.loadAllLinks()
    },
    toggleCategoriesCollapsed() {
      this.categoriesCollapsed = !this.categoriesCollapsed
      localStorage.setItem('categories-collapsed', this.categoriesCollapsed)
    },
    toggleStatusesCollapsed() {
      this.statusesCollapsed = !this.statusesCollapsed
      localStorage.setItem('statuses-collapsed', this.statusesCollapsed)
    },
    togglePersonsCollapsed() {
      this.personsCollapsed = !this.personsCollapsed
      localStorage.setItem('persons-collapsed', this.personsCollapsed)
    },
    toggleSettingsCollapsed() {
      this.settingsCollapsed = !this.settingsCollapsed
      localStorage.setItem('settings-collapsed', this.settingsCollapsed)
    },
    saveOpenModePreference() {
      const mode = this.openTodosInWindow ? 'window' : 'sidebar'
      localStorage.setItem('todo-open-mode', mode)
    },
    openSettings() {
      this.setFilter('persons')
    },
    openPersonDetails(person) {
      this.pendingPersonEdit = person
      this.setFilter('persons')
    },
    async loadPersons() {
      this.persons = await window.api.getPersons()
    },
    async updateGraphData() {
      // Save preference
      localStorage.setItem('show-persons-in-graph', this.showPersonsInGraph)

      // Load person assignments for all todos if enabled
      if (this.showPersonsInGraph) {
        this.todoPersons = {}
        for (const todo of this.filteredTodos) {
          const persons = await window.api.getTodoPersons(todo.id)
          if (persons && persons.length > 0) {
            this.todoPersons[todo.id] = persons
          }
        }
      } else {
        this.todoPersons = {}
      }
    },
    async loadProjectPersons(projectId) {
      const persons = await window.api.getProjectPersons(projectId)
      this.projectPersons[projectId] = persons
    },
    async assignProjectPerson(person) {
      if (!this.editingProject || !this.editingProject.id) return
      // Check if already assigned
      if (this.currentProjectPersons.some(p => p.id === person.id)) return

      await window.api.linkProjectPerson(this.editingProject.id, person.id)
      await this.loadProjectPersons(this.editingProject.id)
      this.showProjectPersonPicker = false
    },
    async unassignProjectPerson(person) {
      if (!this.editingProject || !this.editingProject.id) return

      await window.api.unlinkProjectPerson(this.editingProject.id, person.id)
      await this.loadProjectPersons(this.editingProject.id)
    },
    openStakeholderRegister() {
      if (this.editingProject && this.editingProject.id) {
        window.api.openStakeholderRegister(this.editingProject.id)
      }
    },
    getRandomPersonColor() {
      const colors = [
        '#d93025', '#ea4335', '#ef5350', '#ff5252', '#ff1744',
        '#c2185b', '#e91e63', '#f06292',
        '#ef6c00', '#ff7043', '#ff9800', '#ff8f00',
        '#f9a825', '#ffb300', '#ffc107', '#ffca28',
        '#0f9d58', '#34a853', '#43a047', '#4caf50', '#7cb342', '#81c784',
        '#009688', '#00897b', '#26a69a', '#4db6ac', '#00bfa5', '#1de9b6', '#64ffda',
        '#00bcd4', '#00acc1',
        '#0288d1', '#039be5', '#03a9f4', '#29b6f6', '#4285f4', '#1a73e8', '#0d47a1',
        '#673ab7', '#5e35b1', '#7b1fa2', '#9c27b0', '#7e57c2', '#ab47bc', '#ba68c8', '#9575cd',
        '#263238', '#37474f', '#455a64', '#546e7a', '#607d8b', '#78909c', '#90a4ae', '#b0bec5'
      ]
      return colors[Math.floor(Math.random() * colors.length)]
    },
    async addPersonFromHeader() {
      if (!this.newPersonName.trim()) return
      try {
        const person = await window.api.createPerson({
          name: this.newPersonName.trim(),
          color: this.getRandomPersonColor()
        })
        this.newPersonName = ''
        await this.loadPersons()
        // If in stakeholders view with a project selected, also link the person
        if (this.isProjectSelected) {
          await window.api.linkProjectPerson(this.currentFilter, person.id)
          await this.loadProjectPersons(this.currentFilter)
        }
      } catch (error) {
        console.error('Failed to create person:', error)
      }
    },
    async loadProjectStakeholders() {
      await this.loadPersons()
      if (this.isProjectSelected) {
        await this.loadProjectPersons(this.currentFilter)
      }
    },
    async assignStakeholder(person) {
      if (!this.isProjectSelected) return
      const stakeholders = this.projectPersons[this.currentFilter] || []
      if (stakeholders.some(p => p.id === person.id)) return
      await window.api.linkProjectPerson(this.currentFilter, person.id)
      await this.loadProjectPersons(this.currentFilter)
    },
    onStakeholderInputBlur() {
      setTimeout(() => {
        this.showStakeholderPicker = false
      }, 150)
    },
    async assignStakeholderFromPicker(person) {
      await this.assignStakeholder(person)
      this.newPersonName = ''
      this.showStakeholderPicker = false
    },
    async unassignStakeholder(person) {
      if (!this.isProjectSelected) return
      await window.api.unlinkProjectPerson(this.currentFilter, person.id)
      await this.loadProjectPersons(this.currentFilter)
    },
    async updateStakeholder(personId, data) {
      if (!this.isProjectSelected) return
      await window.api.updateProjectPersonStakeholder(this.currentFilter, personId, data)
      await this.loadProjectPersons(this.currentFilter)
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
      console.log('handleImport called with mode:', mode)
      try {
        this.showImportDialog = false
        console.log('Calling window.api.importData...')
        const result = await window.api.importData(mode)
        console.log('Import result:', result)
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
      console.log('Click event:', event.target)
      // Check if clicked element is a link or inside a link
      const link = event.target.tagName === 'A' ? event.target : event.target.closest('a')
      console.log('Found link:', link)
      if (link && link.href) {
        console.log('Opening link:', link.href)
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
        document.querySelectorAll('.notes-preview pre.mermaid').forEach(el => {
          el.setAttribute('data-processed', 'true')
        })
      } catch (e) {
        console.error('Mermaid render error:', e)
      }
    },
    async renderTooltipMermaid() {
      await this.$nextTick()
      try {
        await mermaid.run({
          querySelector: '.graph-tooltip .tooltip-notes pre.mermaid:not([data-processed]), .node-notes pre.mermaid:not([data-processed])'
        })
        document.querySelectorAll('.graph-tooltip .tooltip-notes pre.mermaid, .node-notes pre.mermaid').forEach(el => {
          el.setAttribute('data-processed', 'true')
        })
      } catch {
        // Silently ignore - tooltip may have disappeared
      }
    }
  }
}
</script>
