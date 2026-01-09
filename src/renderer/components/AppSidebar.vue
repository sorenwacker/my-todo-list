<template>
  <aside class="sidebar" @mouseleave="onMouseLeave && onMouseLeave()" @mouseenter="onMouseEnter && onMouseEnter()">
    <div class="sidebar-header">
      <h2>Todo</h2>
      <button
        class="pin-btn"
        :class="{ pinned: pinned }"
        :title="pinned ? 'Unpin sidebar' : 'Pin sidebar'"
        @click="$emit('toggle-pin')"
      >
        <svg v-if="pinned" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
        </svg>
      </button>
    </div>

    <nav class="project-nav">
      <div
        class="nav-item"
        :class="{ active: currentFilter === null }"
        @click="$emit('set-filter', null)"
      >
        <span class="nav-icon">*</span>
        <span>All Todos</span>
        <span class="count">{{ allCount }}</span>
      </div>

      <div
        class="nav-item"
        :class="{ active: currentFilter === 'inbox' }"
        @click="$emit('set-filter', 'inbox')"
      >
        <span class="nav-icon">&gt;</span>
        <span>Inbox</span>
        <span class="count">{{ inboxCount }}</span>
      </div>

      <div
        class="nav-item trash-nav"
        :class="{ active: currentFilter === 'trash' }"
        @click="$emit('set-filter', 'trash')"
      >
        <span class="nav-icon">x</span>
        <span>Trash</span>
        <span v-if="trashCount > 0" class="count">{{ trashCount }}</span>
      </div>

      <div class="nav-divider"></div>

      <div class="add-project">
        <input
          v-if="showProjectInput"
          ref="projectInput"
          v-model="newProjectName"
          placeholder="Project name..."
          type="text"
          @keyup.enter="addProject"
          @blur="cancelAddProject"
        />
        <button v-else @click="showAddProject">+ Add Project</button>
      </div>

      <draggable
        :model-value="projects"
        item-key="id"
        class="projects-list"
        @update:model-value="$emit('update:projects', $event)"
        @end="$emit('projects-reorder')"
      >
        <template #item="{ element: project }">
          <div
            class="nav-item project-item"
            :class="{ active: currentFilter === project.id }"
            @click="$emit('set-filter', project.id)"
          >
            <span class="project-dot" :style="{ background: project.color }"></span>
            <span class="project-name">{{ project.name }}</span>
            <span class="count">{{ getProjectCount(project.id) }}</span>
            <button class="edit-btn" @click.stop="$emit('edit-project', project)">...</button>
          </div>
        </template>
      </draggable>
    </nav>

    <div class="sidebar-header status-header" @click="statusesCollapsed = !statusesCollapsed">
      <span class="collapse-indicator">{{ statusesCollapsed ? '+' : '-' }}</span>
      <h2>Statuses</h2>
    </div>

    <nav v-show="!statusesCollapsed" class="status-nav">
      <draggable
        :model-value="statuses"
        item-key="id"
        class="statuses-list"
        @update:model-value="$emit('update:statuses', $event)"
        @end="$emit('statuses-reorder')"
      >
        <template #item="{ element: status }">
          <div
            class="nav-item status-item"
            @click="$emit('edit-status', status)"
          >
            <span class="status-dot" :style="{ background: status.color }"></span>
            <span class="status-name">{{ status.name }}</span>
            <span class="count">{{ getStatusCount(status.id) }}</span>
          </div>
        </template>
      </draggable>
    </nav>

    <div v-show="!statusesCollapsed" class="add-status">
      <input
        v-if="showStatusInput"
        ref="statusInput"
        v-model="newStatusName"
        placeholder="Status name..."
        type="text"
        @keyup.enter="addStatus"
        @blur="cancelAddStatus"
      />
      <button v-else @click="showAddStatus">+ Add Status</button>
    </div>

    <div class="sidebar-header category-header" @click="categoriesCollapsed = !categoriesCollapsed">
      <span class="collapse-indicator">{{ categoriesCollapsed ? '+' : '-' }}</span>
      <h2>Categories</h2>
    </div>

    <nav v-show="!categoriesCollapsed" class="category-nav">
      <draggable
        :model-value="categories"
        item-key="id"
        class="categories-list"
        @update:model-value="$emit('update:categories', $event)"
        @end="$emit('categories-reorder')"
      >
        <template #item="{ element: category }">
          <div
            class="nav-item category-item"
            @click="$emit('edit-category', category)"
          >
            <span class="category-symbol-icon">
              <component :is="getIconComponent(category.symbol)" v-if="getIconComponent(category.symbol)" :size="16" />
              <span v-else>{{ category.symbol || '*' }}</span>
            </span>
            <span class="category-name">{{ category.name }}</span>
            <span class="count">{{ getCategoryCount(category.id) }}</span>
          </div>
        </template>
      </draggable>
    </nav>

    <div v-show="!categoriesCollapsed" class="add-category">
      <input
        v-if="showCategoryInput"
        ref="categoryInput"
        v-model="newCategoryName"
        placeholder="Category name..."
        type="text"
        @keyup.enter="addCategory"
        @blur="cancelAddCategory"
      />
      <button v-else @click="showAddCategory">+ Add Category</button>
    </div>

    <div class="settings-section">
      <div class="sidebar-header settings-header" @click="settingsCollapsed = !settingsCollapsed">
        <span class="collapse-indicator">{{ settingsCollapsed ? '+' : '-' }}</span>
        <h2>Settings</h2>
      </div>
      <div v-show="!settingsCollapsed" class="settings-content">
        <div class="preference-item">
          <label class="checkbox-label">
            <input :checked="openTodosInWindow" type="checkbox" @change="$emit('update:open-todos-in-window', $event.target.checked)" />
            <span class="preference-text">Open todos in new window</span>
          </label>
        </div>
        <div class="preference-item">
          <label class="checkbox-label">
            <input :checked="gridLock" type="checkbox" @change="$emit('update:grid-lock', $event.target.checked)" />
            <span class="preference-text">Grid lock (cards view)</span>
          </label>
        </div>
        <button class="settings-btn" @click="$emit('export')">Export</button>
        <button class="settings-btn" @click="$emit('show-import')">Import</button>
        <div class="database-location">
          <small>Database: {{ databasePath }}</small>
        </div>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-header persons-header" @click="personsCollapsed = !personsCollapsed">
        <span class="collapse-indicator">{{ personsCollapsed ? '+' : '-' }}</span>
        <h2>Persons</h2>
      </div>
      <div v-show="!personsCollapsed">
        <button class="manage-persons-btn" @click="$emit('manage-persons')">Manage Persons</button>
      </div>
    </div>
  </aside>
</template>

<script>
import draggable from 'vuedraggable'
import {
  Folder, Home, Briefcase, ShoppingCart, Heart, BookOpen, Target, Star,
  Calendar, Clock, Tag, Flag, Bookmark, Zap, Coffee, Music, Camera, Film,
  MessageCircle, Mail, Phone, Users, User, Settings, Search, Plus, Check,
  AlertCircle, Info, HelpCircle, Bell, Gift, Award, Trophy, Crown
} from 'lucide-vue-next'

const iconMap = {
  Folder, Home, Briefcase, ShoppingCart, Heart, BookOpen, Target, Star,
  Calendar, Clock, Tag, Flag, Bookmark, Zap, Coffee, Music, Camera, Film,
  MessageCircle, Mail, Phone, Users, User, Settings, Search, Plus, Check,
  AlertCircle, Info, HelpCircle, Bell, Gift, Award, Trophy, Crown
}

export default {
  name: 'AppSidebar',
  components: {
    draggable,
    ...iconMap
  },
  props: {
    visible: { type: Boolean, default: true },
    pinned: { type: Boolean, default: true },
    onMouseLeave: { type: Function, default: null },
    onMouseEnter: { type: Function, default: null },
    currentFilter: { type: [Number, String], default: null },
    projects: { type: Array, default: () => [] },
    statuses: { type: Array, default: () => [] },
    categories: { type: Array, default: () => [] },
    allCount: { type: Number, default: 0 },
    inboxCount: { type: Number, default: 0 },
    trashCount: { type: Number, default: 0 },
    projectCounts: { type: Object, default: () => ({}) },
    statusCounts: { type: Object, default: () => ({}) },
    categoryCounts: { type: Object, default: () => ({}) },
    openTodosInWindow: { type: Boolean, default: false },
    gridLock: { type: Boolean, default: false },
    databasePath: { type: String, default: '' }
  },
  emits: [
    'set-filter',
    'update:projects', 'projects-reorder', 'add-project', 'edit-project',
    'update:statuses', 'statuses-reorder', 'add-status', 'edit-status',
    'update:categories', 'categories-reorder', 'add-category', 'edit-category',
    'update:open-todos-in-window', 'update:grid-lock',
    'export', 'show-import', 'manage-persons',
    'toggle-pin', 'mouseleave', 'mouseenter'
  ],
  data() {
    return {
      showProjectInput: false,
      showStatusInput: false,
      showCategoryInput: false,
      newProjectName: '',
      newStatusName: '',
      newCategoryName: '',
      statusesCollapsed: localStorage.getItem('statuses-collapsed') !== 'false',
      categoriesCollapsed: localStorage.getItem('categories-collapsed') !== 'false',
      settingsCollapsed: localStorage.getItem('settings-collapsed') !== 'false',
      personsCollapsed: localStorage.getItem('persons-collapsed') !== 'false'
    }
  },
  watch: {
    statusesCollapsed(val) {
      localStorage.setItem('statuses-collapsed', val)
    },
    categoriesCollapsed(val) {
      localStorage.setItem('categories-collapsed', val)
    },
    settingsCollapsed(val) {
      localStorage.setItem('settings-collapsed', val)
    },
    personsCollapsed(val) {
      localStorage.setItem('persons-collapsed', val)
    }
  },
  methods: {
    getIconComponent(name) {
      return iconMap[name] || null
    },
    getProjectCount(projectId) {
      return this.projectCounts[projectId] || 0
    },
    getStatusCount(statusId) {
      return this.statusCounts[statusId] || 0
    },
    getCategoryCount(categoryId) {
      return this.categoryCounts[categoryId] || 0
    },
    showAddProject() {
      this.showProjectInput = true
      this.$nextTick(() => this.$refs.projectInput?.focus())
    },
    addProject() {
      if (this.newProjectName.trim()) {
        this.$emit('add-project', this.newProjectName.trim())
      }
      this.cancelAddProject()
    },
    cancelAddProject() {
      this.newProjectName = ''
      this.showProjectInput = false
    },
    showAddStatus() {
      this.showStatusInput = true
      this.$nextTick(() => this.$refs.statusInput?.focus())
    },
    addStatus() {
      if (this.newStatusName.trim()) {
        this.$emit('add-status', this.newStatusName.trim())
      }
      this.cancelAddStatus()
    },
    cancelAddStatus() {
      this.newStatusName = ''
      this.showStatusInput = false
    },
    showAddCategory() {
      this.showCategoryInput = true
      this.$nextTick(() => this.$refs.categoryInput?.focus())
    },
    addCategory() {
      if (this.newCategoryName.trim()) {
        this.$emit('add-category', this.newCategoryName.trim())
      }
      this.cancelAddCategory()
    },
    cancelAddCategory() {
      this.newCategoryName = ''
      this.showCategoryInput = false
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 240px;
  background: var(--bg-secondary, #0d0d0d);
  border-right: 1px solid var(--border-color, #3a3f4b);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary, #a0a0a0);
}

.collapse-indicator {
  font-size: 10px;
  color: var(--text-secondary, #a0a0a0);
  width: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  color: var(--text-primary, #e0e0e0);
  transition: background 0.2s;
}

.nav-item:hover {
  background: var(--bg-hover, #2a2f3d);
}

.nav-item.active {
  background: var(--accent-color, #0f4c75);
}

.nav-icon {
  width: 16px;
  text-align: center;
  color: var(--text-secondary, #a0a0a0);
}

.count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
}

.nav-divider {
  height: 1px;
  background: var(--border-color, #3a3f4b);
  margin: 8px 16px;
}

.add-project, .add-status, .add-category {
  padding: 8px 16px;
}

.add-project input, .add-status input, .add-category input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
  font-size: 13px;
  box-sizing: border-box;
}

.add-project button, .add-status button, .add-category button {
  width: 100%;
  padding: 6px 8px;
  background: transparent;
  border: 1px dashed var(--border-color, #3a3f4b);
  border-radius: 4px;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  font-size: 13px;
}

.add-project button:hover, .add-status button:hover, .add-category button:hover {
  border-color: var(--accent-color, #0f4c75);
  color: var(--accent-color, #0f4c75);
}

.project-dot, .status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-name, .status-name, .category-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-symbol-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #a0a0a0);
}

.edit-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 2px 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.nav-item:hover .edit-btn {
  opacity: 1;
}

.settings-section, .sidebar-section {
  border-top: 1px solid var(--border-color, #3a3f4b);
  margin-top: auto;
}

.settings-content {
  padding: 8px 16px;
}

.preference-item {
  margin-bottom: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #e0e0e0);
}

.settings-btn {
  width: 100%;
  padding: 6px 8px;
  margin-bottom: 8px;
  background: var(--bg-primary, #1a1f2e);
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  color: var(--text-primary, #e0e0e0);
  cursor: pointer;
  font-size: 13px;
}

.settings-btn:hover {
  background: var(--bg-hover, #2a2f3d);
}

.database-location {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
  word-break: break-all;
}

.manage-persons-btn {
  width: calc(100% - 32px);
  margin: 8px 16px;
  padding: 6px 8px;
  background: var(--bg-primary, #1a1f2e);
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  color: var(--text-primary, #e0e0e0);
  cursor: pointer;
  font-size: 13px;
}

.manage-persons-btn:hover {
  background: var(--bg-hover, #2a2f3d);
}

.pin-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.pin-btn:hover {
  background: var(--bg-hover, #2a2f3d);
  color: var(--text-primary, #e0e0e0);
}

.pin-btn.pinned {
  color: var(--accent-color, #0f4c75);
}
</style>
