<template>
  <header class="main-header">
    <div class="header-title-row">
      <h1 class="header-title">
        <span class="breadcrumb-link breadcrumb-home" title="Home" @click="$emit('go-home')">
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
          v-if="completedCount > 0 && currentFilter !== 'archive' && currentFilter !== 'trash'"
          class="header-btn archive-done-btn"
          :title="`Archive ${completedCount} done item${completedCount > 1 ? 's' : ''} (Ctrl+Z to undo)`"
          @click="$emit('archive-completed')"
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
          @click="$emit('open-search')"
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
          @click="$emit('undo')"
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
          @click="$emit('redo')"
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
          @click="$emit('open-help')"
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
          @click="$emit('toggle-theme')"
        >
          <svg
            v-if="theme === 'dark'"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
          <svg
            v-else
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </button>
      </div>
    </div>
    <div class="header-controls">
      <div class="sort-controls">
        <input
          v-model="searchQueryModel"
          type="text"
          class="search-input"
          placeholder="Filter..."
          @keyup.escape="searchQueryModel = ''"
        />
        <select v-model="sortByModel" class="sort-select">
          <option value="manual">Manual Order</option>
          <option value="created">By Created</option>
          <option value="due">By Due Date</option>
          <option value="alpha">Alphabetical</option>
        </select>
        <label class="show-completed-toggle">
          <input v-model="showCompletedModel" type="checkbox" />
          <span>Show done</span>
        </label>
        <label
          v-if="currentView === 'kanban' && currentFilter === null"
          class="show-completed-toggle"
        >
          <input v-model="groupByProjectModel" type="checkbox" />
          <span>Group by project</span>
        </label>
      </div>
      <div class="view-switcher">
        <button
          v-for="view in availableViews"
          :key="view"
          :class="{ active: currentView === view }"
          :disabled="isTrashView && view === 'kanban'"
          @click="$emit('set-view', view)"
        >
          {{ view.charAt(0).toUpperCase() + view.slice(1) }}
        </button>
      </div>
      <div v-if="currentView === 'cards'" class="view-switcher card-layout-switcher">
        <button
          :class="{ active: cardLayout === 'row' }"
          title="List rows"
          @click="$emit('set-card-layout', 'row')"
        >
          Row
        </button>
        <button
          :class="{ active: cardLayout === 'card' }"
          title="Card grid"
          @click="$emit('set-card-layout', 'card')"
        >
          Card
        </button>
      </div>
      <button
        v-if="isTrashView && trashCount > 0"
        class="empty-trash-btn"
        title="Permanently delete all items in trash (cannot be undone)"
        @click="$emit('empty-trash')"
      >
        Empty Trash
      </button>
    </div>
    <div v-if="!isTrashView" class="add-todo">
      <input
        ref="newTodoInput"
        v-model="newTodoTitleModel"
        placeholder="Add a new item... (press n)"
        type="text"
        @keyup.enter="$emit('add-todo')"
      />
      <button @click="$emit('add-todo')">Add</button>
    </div>
  </header>
</template>

<script>
  export default {
    name: 'AppHeader',
    props: {
      currentFilter: { type: [Number, String], default: null },
      isProjectSelected: { type: Boolean, default: false },
      currentProjectName: { type: String, default: '' },
      showProjectsOverview: { type: Boolean, default: false },
      completedCount: { type: Number, default: 0 },
      showGlobalSearch: { type: Boolean, default: false },
      showHelpModal: { type: Boolean, default: false },
      historyState: {
        type: Object,
        default: () => ({
          canUndo: false,
          canRedo: false,
          undoDescription: null,
          redoDescription: null
        })
      },
      theme: { type: String, default: 'dark' },
      currentView: { type: String, default: 'cards' },
      availableViews: { type: Array, default: () => [] },
      isTrashView: { type: Boolean, default: false },
      trashCount: { type: Number, default: 0 },
      cardLayout: { type: String, default: 'card' },
      searchQuery: { type: String, default: '' },
      sortBy: { type: String, default: 'manual' },
      showCompleted: { type: Boolean, default: false },
      groupByProject: { type: Boolean, default: false },
      newTodoTitle: { type: String, default: '' }
    },
    emits: [
      'go-home',
      'archive-completed',
      'open-search',
      'undo',
      'redo',
      'open-help',
      'toggle-theme',
      'set-view',
      'set-card-layout',
      'empty-trash',
      'add-todo',
      'update:searchQuery',
      'update:sortBy',
      'update:showCompleted',
      'update:groupByProject',
      'update:newTodoTitle'
    ],
    computed: {
      searchQueryModel: {
        get() {
          return this.searchQuery
        },
        set(value) {
          this.$emit('update:searchQuery', value)
        }
      },
      sortByModel: {
        get() {
          return this.sortBy
        },
        set(value) {
          this.$emit('update:sortBy', value)
        }
      },
      showCompletedModel: {
        get() {
          return this.showCompleted
        },
        set(value) {
          this.$emit('update:showCompleted', value)
        }
      },
      groupByProjectModel: {
        get() {
          return this.groupByProject
        },
        set(value) {
          this.$emit('update:groupByProject', value)
        }
      },
      newTodoTitleModel: {
        get() {
          return this.newTodoTitle
        },
        set(value) {
          this.$emit('update:newTodoTitle', value)
        }
      }
    },
    methods: {
      focusNewTodoInput() {
        this.$refs.newTodoInput?.focus()
      }
    }
  }
</script>
