<template>
  <aside v-if="todo" ref="detailPanel" class="detail-panel" :class="{ 'fullscreen': fullscreen, 'vertical-mode': isVerticalLayout }" :style="panelStyle">
    <div
      v-if="!fullscreen"
      class="resize-handle"
      :class="{ dragging: isResizing }"
      @mousedown="$emit('resize-start', $event)"
    ></div>
    <div class="detail-panel-header">
      <div class="breadcrumb" v-if="todo.project_name">
        <span class="breadcrumb-item clickable" @click.stop="$emit('navigate-project', todo.project_id)">{{ todo.project_name }}</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item current">{{ todo.title || 'Untitled' }}</span>
      </div>
      <div class="header-actions">
        <button class="fullscreen-btn" :title="fullscreen ? 'Exit fullscreen' : 'Fullscreen'" @click="$emit('toggle-fullscreen')">
          <svg v-if="!fullscreen" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7"/>
          </svg>
        </button>
        <button v-if="!fullscreen" class="layout-btn" :title="layoutButtonTitle" @click="$emit('toggle-layout')">
          <span v-if="layoutPreference === 'auto'">A</span>
          <span v-else-if="layoutPreference === 'horizontal'">|</span>
          <span v-else>-</span>
        </button>
        <button v-if="!fullscreen" class="detach-btn" title="Open in new window" @click="$emit('detach')">^</button>
        <button class="close-btn" @click="$emit('close')">x</button>
      </div>
    </div>

    <div class="detail-panel-content">
      <div class="title-row">
        <input
          type="checkbox"
          :checked="todo.completed"
          class="title-checkbox"
          @change="$emit('toggle-complete')"
        />
        <input
          :value="displayTitle"
          class="title-input"
          placeholder="Title"
          :style="{ borderBottomColor: todo.project_color || '#333' }"
          @input="$emit('update:title', $event.target.value)"
          @change="$emit('save')"
          @keydown.escape="$emit('close')"
        />
      </div>

      <div v-if="todo.type === 'milestone'" class="milestone-section">
        <div class="meta-row milestone-date-row">
          <label>Milestone Date:</label>
          <div class="date-field">
            <input type="date" :value="milestoneDate" lang="sv-SE" @change="$emit('update-milestone-date', $event.target.value)" />
            <button v-if="todo.milestone_date" class="clear-btn" @click="$emit('clear-milestone-date')">x</button>
          </div>
        </div>
        <div v-if="childTodos.length" class="child-todos-section">
          <label>Assigned Todos ({{ childTodos.length }})</label>
          <div class="child-todos-list">
            <div
              v-for="child in childTodos"
              :key="child.id"
              class="child-todo-item"
              :class="{ completed: child.completed }"
              @click="$emit('select-child', child.id)"
            >
              <input type="checkbox" :checked="child.completed" @click.stop />
              <span class="child-title">{{ child.title }}</span>
            </div>
          </div>
        </div>
        <div v-else class="child-todos-empty">
          <p>No todos assigned to this milestone</p>
          <small>Drag todos to this milestone in Timeline view to assign them</small>
        </div>
      </div>

      <div class="collapsible-sections" :class="{ 'all-collapsed': bothCollapsed }" :style="collapsibleStyle">
      <div class="notes-section" :style="notesStyle">
        <div class="tabs-row">
          <div class="tabs">
            <button
              :class="{ active: activeTab === 'edit' }"
              @click="$emit('update:active-tab', 'edit')"
            >Edit</button>
            <button
              :class="{ active: activeTab === 'preview' }"
              @click="$emit('update:active-tab', 'preview')"
            >Preview</button>
            <button
              :class="{ active: activeTab === 'split' }"
              @click="$emit('update:active-tab', 'split')"
            >Split</button>
          </div>
          <label class="sensitive-checkbox">
            <input :checked="todo.notes_sensitive" type="checkbox" @change="$emit('update:notes-sensitive', $event.target.checked)" />
            <span class="lock-icon">🔒</span>
          </label>
        </div>

        <NotesEditor
          v-if="activeTab === 'edit'"
          :model-value="todo.notes"
          class="notes-editor"
          @update:model-value="$emit('update:notes', $event)"
          @escape="$emit('close')"
        />

        <div
          v-else-if="activeTab === 'preview'"
          class="notes-preview markdown-body"
          :style="{ borderColor: todo.project_color || '#333' }"
        >
          <div v-if="todo.notes_sensitive && !notesRevealed" class="sensitive-notes-overlay">
            <div class="sensitive-icon">🔒</div>
            <p>Sensitive content hidden</p>
            <button class="reveal-btn" @click="$emit('reveal-notes')">Reveal</button>
          </div>
          <div v-else @click="$emit('markdown-click', $event)" v-html="renderedNotes"></div>
        </div>

        <div v-else class="notes-split">
          <NotesEditor
            ref="splitEditor"
            :model-value="todo.notes"
            class="notes-editor split-editor"
            @update:model-value="$emit('update:notes', $event)"
            @escape="$emit('close')"
          />
          <div
            ref="splitPreview"
            class="notes-preview markdown-body split-preview"
            @scroll="syncScroll('preview')"
          >
            <div v-if="todo.notes_sensitive && !notesRevealed" class="sensitive-notes-overlay">
              <div class="sensitive-icon">🔒</div>
              <p>Sensitive content hidden</p>
              <button class="reveal-btn" @click="$emit('reveal-notes')">Reveal</button>
            </div>
            <div v-else @click="$emit('markdown-click', $event)" v-html="renderedNotes"></div>
          </div>
        </div>
      </div>

      <div v-if="bothCollapsed" class="collapsed-bar" :style="collapsedBarStyle">
        <span class="collapsed-chip" @click="tasksCollapsed = false">
          Tasks
          <span v-if="subtasks.length" class="chip-count">{{ completedSubtasksCount }}/{{ subtasks.length }}</span>
        </span>
        <span class="collapsed-chip" @click="metadataCollapsed = false">Metadata</span>
      </div>
      <div v-else class="bottom-sections" :class="{ 'metadata-expanded': !metadataCollapsed }" :style="bottomSectionsStyle">
        <div class="subtasks-section" :class="{ collapsed: tasksCollapsed }">
          <div class="section-header" @click="tasksCollapsed = !tasksCollapsed">
            <span class="section-title">Tasks</span>
            <span v-if="subtasks.length" class="section-count">{{ completedSubtasksCount }}/{{ subtasks.length }}</span>
          </div>
          <div v-show="!tasksCollapsed" class="section-content">
          <draggable
            :list="localSubtasks"
            item-key="id"
            class="subtasks-list"
            handle=".subtask-drag-handle"
            @end="onSubtaskReorder"
          >
            <template #item="{ element: subtask }">
              <div class="subtask-item" :class="{ completed: subtask.completed }">
                <span class="subtask-drag-handle">⋮⋮</span>
                <input type="checkbox" :checked="subtask.completed" @change="$emit('toggle-subtask', subtask)" />
                <span class="subtask-title">{{ subtask.title }}</span>
                <input
                  type="date"
                  class="subtask-due-date"
                  :value="subtask.due_date || ''"
                  lang="sv-SE"
                  @change="$emit('update-subtask-due-date', { id: subtask.id, due_date: $event.target.value || null })"
                />
                <button class="subtask-delete" @click="$emit('delete-subtask', subtask.id)">x</button>
              </div>
            </template>
          </draggable>
          <div class="subtask-add">
            <input
              :value="newSubtaskTitle"
              placeholder="Add subtask..."
              class="subtask-input"
              @input="$emit('update:new-subtask-title', $event.target.value)"
              @keyup.enter="$emit('add-subtask')"
            />
            <button :disabled="!newSubtaskTitle.trim()" class="subtask-add-btn" @click="$emit('add-subtask')">+</button>
          </div>
          </div>
        </div>

        <div class="meta-section compact" :class="{ collapsed: metadataCollapsed }">
          <div class="section-header" @click="metadataCollapsed = !metadataCollapsed">
            <span class="section-title">Metadata</span>
          </div>
        <div v-show="!metadataCollapsed" class="section-content">
        <div class="meta-grid">
          <div class="meta-item">
            <label>Category</label>
            <select :value="todo.category_id" @change="$emit('category-change', $event.target.value ? parseInt($event.target.value) : null)">
              <option :value="null">None</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
            </select>
          </div>
          <div class="meta-item">
            <label>Status</label>
            <select :value="todo.status_id" @change="$emit('status-change', $event.target.value ? parseInt($event.target.value) : null)">
              <option :value="null">None</option>
              <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
            </select>
          </div>
          <div v-if="todo.project_id && topics.length > 0" class="meta-item">
            <label>Topic</label>
            <select :value="todo.topic_id" @change="$emit('topic-change', $event.target.value ? parseInt($event.target.value) : null)">
              <option :value="null">None</option>
              <option v-for="topic in topics" :key="topic.id" :value="topic.id">{{ topic.name }}</option>
            </select>
          </div>
          <div class="meta-item">
            <label>Importance</label>
            <div class="importance-picker compact">
              <button v-for="level in 5" :key="level" class="importance-btn" :class="{ active: todo.importance == level && todo.importance > 0 }" @click="$emit('set-importance', level)">{{ level }}</button>
            </div>
          </div>
          <div class="meta-item">
            <label>Created</label>
            <span class="created-value">{{ formattedCreatedDate }}</span>
          </div>
          <div class="meta-item">
            <label>Start</label>
            <div class="date-field">
              <input type="date" :value="startDate" lang="sv-SE" @change="$emit('update-start-date', $event.target.value)" />
              <button v-if="todo.start_date" class="clear-btn" @click="$emit('clear-start-date')">x</button>
            </div>
          </div>
          <div class="meta-item">
            <label>End</label>
            <div class="date-field">
              <input type="date" :value="endDate" lang="sv-SE" @change="$emit('update-end-date', $event.target.value)" />
              <button v-if="todo.end_date" class="clear-btn" @click="$emit('clear-end-date')">x</button>
            </div>
          </div>
          <div class="meta-item">
            <label>Due</label>
            <div class="date-field">
              <input type="date" :value="dueDate" lang="sv-SE" @change="$emit('update-due-date', $event.target.value)" />
              <button v-if="todo.due_date" class="clear-btn" @click="$emit('clear-due-date')">x</button>
            </div>
          </div>
          <div class="meta-item recurrence-item">
            <label>Repeat</label>
            <div class="recurrence-controls">
              <select :value="todo.recurrence_type" @change="$emit('update-recurrence-type', $event.target.value || null)">
                <option :value="null">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <div v-if="todo.recurrence_type" class="recurrence-interval">
                <span>every</span>
                <input
                  :value="todo.recurrence_interval"
                  type="number"
                  min="1"
                  max="99"
                  class="interval-input"
                  @change="$emit('update-recurrence-interval', parseInt($event.target.value))"
                />
                <span>{{ recurrenceUnit }}</span>
              </div>
            </div>
          </div>
          <div v-if="todo.recurrence_type" class="meta-item">
            <label>Until</label>
            <div class="date-field">
              <input type="date" :value="todo.recurrence_end_date || ''" lang="sv-SE" @change="$emit('update-recurrence-end-date', $event.target.value)" />
              <button v-if="todo.recurrence_end_date" class="clear-btn" @click="$emit('clear-recurrence-end-date')">x</button>
            </div>
          </div>
          <div class="meta-item persons-item">
            <label>Persons</label>
            <div class="inline-persons">
              <PersonAvatar
                v-for="person in assignedPersons"
                :key="person.id"
                :person="person"
                @click="$emit('open-person', person)"
                @remove="$emit('unassign-person', person)"
              />
              <button class="add-person-btn" @click="$emit('toggle-person-picker')">+</button>
            </div>
          </div>
          <div class="meta-item tags-item">
            <label>Tags</label>
            <div class="inline-tags">
              <span v-for="tag in tags" :key="tag.id" class="tag-chip">
                {{ tag.name }}<button class="chip-x" @click.stop="$emit('remove-tag', tag.id)">x</button>
              </span>
              <input
                v-model="newTagInput"
                type="text"
                class="tag-input"
                placeholder="Add tag..."
                list="tag-suggestions"
                @keyup.enter="addTag"
              />
              <datalist id="tag-suggestions">
                <option v-for="tag in allTags" :key="tag.id" :value="tag.name" />
              </datalist>
            </div>
          </div>
        </div>
        </div>
        <div v-if="showLinkSearch" class="link-search-popup">
          <input ref="linkInput" :value="linkQuery" placeholder="Search todos..." @input="$emit('update:link-query', $event.target.value)" />
          <div v-if="linkResults.length" class="link-results">
            <div v-for="result in linkResults" :key="result.id" class="link-result" @click="$emit('link-to', result)">
              {{ result.title }}
            </div>
          </div>
        </div>
        <div v-if="showPersonPicker" class="person-picker-popup">
          <div class="new-person-row">
            <input
              v-model="newPersonName"
              type="text"
              placeholder="New person name..."
              @keyup.enter="createNewPerson"
            />
            <button :disabled="!newPersonName.trim()" @click="createNewPerson">Add</button>
          </div>
          <div class="person-picker-list">
            <div v-for="person in persons.slice(0, 10)" :key="person.id" class="person-option" :class="{ assigned: assignedPersons.some(p => p.id === person.id) }" @click="$emit('assign-person', person)">
              <span class="person-color-dot" :style="{ background: person.color }"></span>
              <span class="person-name">{{ person.name }}</span>
              <span v-if="person.email" class="person-email">{{ person.email }}</span>
            </div>
            <div v-if="persons.length > 10" class="person-picker-more">
              +{{ persons.length - 10 }} more
            </div>
            <div v-if="!persons.length" class="person-picker-empty">
              <p>No persons yet</p>
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  </aside>
</template>

<script>
import { renderMarkdown } from '../utils/markdown.js'
import PersonAvatar from './PersonAvatar.vue'
import NotesEditor from './NotesEditor.vue'
import draggable from 'vuedraggable'

export default {
  name: 'DetailPanel',
  components: { PersonAvatar, NotesEditor, draggable },
  props: {
    todo: { type: Object, default: null },
    projects: { type: Array, default: () => [] },
    categories: { type: Array, default: () => [] },
    statuses: { type: Array, default: () => [] },
    topics: { type: Array, default: () => [] },
    persons: { type: Array, default: () => [] },
    subtasks: { type: Array, default: () => [] },
    linkedTodos: { type: Array, default: () => [] },
    assignedPersons: { type: Array, default: () => [] },
    tags: { type: Array, default: () => [] },
    allTags: { type: Array, default: () => [] },
    childTodos: { type: Array, default: () => [] },
    activeTab: { type: String, default: 'edit' },
    newSubtaskTitle: { type: String, default: '' },
    linkQuery: { type: String, default: '' },
    linkResults: { type: Array, default: () => [] },
    showLinkSearch: { type: Boolean, default: false },
    showPersonPicker: { type: Boolean, default: false },
    notesRevealed: { type: Boolean, default: false },
    isResizing: { type: Boolean, default: false },
    layoutPreference: { type: String, default: 'auto' },
    isVerticalLayout: { type: Boolean, default: false },
    detailWidth: { type: Number, default: 600 },
    detailHeight: { type: Number, default: 50 },
    fullscreen: { type: Boolean, default: false }
  },
  emits: [
    'close', 'detach', 'toggle-layout', 'resize-start', 'toggle-fullscreen',
    'toggle-complete', 'save',
    'update:title', 'update:notes', 'update:notes-sensitive', 'update:active-tab',
    'project-change', 'category-change', 'status-change', 'topic-change',
    'set-importance',
    'update-start-date', 'clear-start-date',
    'update-end-date', 'clear-end-date',
    'update-due-date', 'clear-due-date',
    'update-recurrence-type', 'update-recurrence-interval',
    'update-recurrence-end-date', 'clear-recurrence-end-date',
    'toggle-subtask', 'delete-subtask', 'add-subtask', 'update:new-subtask-title', 'reorder-subtasks', 'update-subtask-due-date',
    'select-linked', 'unlink', 'toggle-link-search', 'update:link-query', 'link-to',
    'assign-person', 'unassign-person', 'toggle-person-picker', 'open-settings', 'open-person', 'create-person',
    'reveal-notes', 'markdown-click',
    'update-milestone-date', 'clear-milestone-date', 'select-child',
    'add-tag', 'remove-tag', 'navigate-project'
  ],
  computed: {
    displayTitle() {
      const title = this.todo?.title
      if (!title || title === 'Untitled' || title === 'New Node') return ''
      return title
    },
    panelStyle() {
      const style = {
        borderLeftColor: this.todo?.project_color || '#333'
      }
      if (this.isVerticalLayout) {
        style['--detail-height'] = `${this.detailHeight}%`
      } else {
        style['--detail-width'] = `${this.detailWidth}px`
      }
      return style
    },
    layoutButtonTitle() {
      if (this.layoutPreference === 'auto') return 'Layout: Auto (click to change)'
      if (this.layoutPreference === 'horizontal') return 'Layout: Side-by-side (click to change)'
      return 'Layout: Stacked (click to change)'
    },
    completedSubtasksCount() {
      return this.subtasks.filter(s => s.completed).length
    },
    renderedNotes() {
      if (!this.todo?.notes) return '<p class="placeholder">No notes yet</p>'
      return renderMarkdown(this.todo.notes)
    },
    startDate() {
      if (!this.todo?.start_date) return ''
      return this.todo.start_date.split('T')[0]
    },
    endDate() {
      if (!this.todo?.end_date) return ''
      return this.todo.end_date.split('T')[0]
    },
    dueDate() {
      if (!this.todo?.due_date) return ''
      return this.todo.due_date.split('T')[0]
    },
    milestoneDate() {
      if (!this.todo?.milestone_date) return ''
      return this.todo.milestone_date.split('T')[0]
    },
    formattedCreatedDate() {
      if (!this.todo?.created_at) return ''
      const d = new Date(this.todo.created_at)
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    },
    recurrenceUnit() {
      if (!this.todo) return ''
      const interval = this.todo.recurrence_interval || 1
      const plural = interval > 1
      switch (this.todo.recurrence_type) {
        case 'daily': return plural ? 'days' : 'day'
        case 'weekly': return plural ? 'weeks' : 'week'
        case 'monthly': return plural ? 'months' : 'month'
        case 'yearly': return plural ? 'years' : 'year'
        default: return ''
      }
    },
    bothCollapsed() {
      return this.tasksCollapsed && this.metadataCollapsed
    },
    collapsibleStyle() {
      if (!this.isVerticalLayout) return {}
      // When metadata is expanded in vertical mode, use 2 rows to give it full width
      if (!this.metadataCollapsed) {
        return {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr auto',
          gap: '8px 12px'
        }
      }
      return {
        display: 'grid',
        gridTemplateColumns: this.bothCollapsed ? '1fr' : '1fr 1fr',
        gridTemplateRows: this.bothCollapsed ? '1fr auto' : '1fr',
        gap: '8px 12px'
      }
    },
    notesStyle() {
      if (!this.isVerticalLayout) return {}
      return { gridColumn: '1', gridRow: '1' }
    },
    collapsedBarStyle() {
      const style = {
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
        alignItems: 'center',
        flex: '0 0 auto'
      }
      if (this.isVerticalLayout) {
        style.gridColumn = '1 / -1'
        style.gridRow = '2'
      }
      return style
    },
    bottomSectionsStyle() {
      if (!this.isVerticalLayout) return {}
      // When metadata is expanded, let children participate in parent grid
      if (!this.metadataCollapsed) {
        return {
          display: 'contents'
        }
      }
      return {
        gridColumn: '2',
        gridRow: '1',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '0',
        overflowY: 'auto'
      }
    }
  },
  data() {
    return {
      localSubtasks: [],
      newPersonName: '',
      newTagInput: '',
      tasksCollapsed: true,
      metadataCollapsed: true,
      isSyncingScroll: false
    }
  },
  watch: {
    subtasks: {
      immediate: true,
      handler(newVal, oldVal) {
        this.localSubtasks = [...newVal]
        // Auto-expand tasks section when subtasks are loaded for the first time
        if (newVal.length > 0 && (!oldVal || oldVal.length === 0)) {
          this.tasksCollapsed = false
        }
      }
    },
    todo: {
      immediate: true,
      handler(newTodo, oldTodo) {
        if (newTodo && (!oldTodo || newTodo.id !== oldTodo.id)) {
          this.metadataCollapsed = true
        }
      }
    }
  },
  methods: {
    onSubtaskReorder() {
      const ids = this.localSubtasks.map(s => s.id)
      this.$emit('reorder-subtasks', ids)
    },
    createNewPerson() {
      if (!this.newPersonName.trim()) return
      this.$emit('create-person', this.newPersonName.trim())
      this.newPersonName = ''
    },
    addTag() {
      if (!this.newTagInput.trim()) return
      this.$emit('add-tag', this.newTagInput.trim())
      this.newTagInput = ''
    },
    syncScroll(source) {
      if (this.isSyncingScroll) return
      this.isSyncingScroll = true

      const editor = this.$refs.splitEditor
      const preview = this.$refs.splitPreview

      if (!editor || !preview) {
        this.isSyncingScroll = false
        return
      }

      if (source === 'editor') {
        const scrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1)
        preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight)
      } else {
        const scrollRatio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1)
        editor.scrollTop = scrollRatio * (editor.scrollHeight - editor.clientHeight)
      }

      requestAnimationFrame(() => {
        this.isSyncingScroll = false
      })
    }
  }
}
</script>

<style scoped>
.detail-panel {
  width: var(--detail-width, 600px);
  background: #000;
  border-left: 3px solid var(--border-color, #3a3f4b);
  display: flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
}

.resize-handle:hover,
.resize-handle.dragging {
  background: var(--accent-color, #0f4c75);
}

.detail-panel-header {
  padding: 4px 8px;
  border-bottom: 1px solid var(--border-color, #3a3f4b);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #888;
  overflow: hidden;
}

.breadcrumb-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breadcrumb-item.clickable {
  cursor: pointer;
  color: #4fc3f7;
}

.breadcrumb-item.clickable:hover {
  text-decoration: underline;
}

.breadcrumb-item.current {
  color: #ccc;
  max-width: 200px;
}

.breadcrumb-separator {
  color: #555;
}

.header-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.header-actions button {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.header-actions button:hover {
  background: var(--bg-hover, #2a2f3d);
  color: var(--text-primary, #e0e0e0);
}

.detail-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 12px 8px 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.title-checkbox {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  border: 2px solid var(--checkbox-border, #555);
  border-radius: 4px;
  background: var(--checkbox-bg, #1a1a1a);
  cursor: pointer;
  position: relative;
  outline: none;
  transition: all 0.15s ease;
}

.title-checkbox:checked {
  background: var(--checkbox-checked-bg, #1a6fab);
  border-color: var(--checkbox-checked-border, #1a6fab);
}

.title-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.title-checkbox:hover {
  border-color: var(--checkbox-hover-border, #888);
}

.title-input {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  padding: 8px 0;
  border: none;
  border-bottom: 2px solid var(--border-color, #3a3f4b);
  background: transparent;
  color: var(--text-primary, #e0e0e0);
  outline: none;
}

.meta-row {
  margin-bottom: 16px;
}

.meta-row label {
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
  margin-right: 8px;
}

.meta-row select {
  padding: 4px 8px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
}

/* Collapsible section headers */
.section-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 0;
  margin-bottom: 4px;
  user-select: none;
}

.section-header:hover {
  color: var(--accent-color, #0f4c75);
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-count {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
  margin-left: auto;
}

.notes-section,
.subtasks-section,
.meta-section {
  transition: margin 0.2s;
}

.subtasks-section.collapsed,
.meta-section.collapsed {
  margin-bottom: 4px;
}

.subtasks-section.collapsed .section-header,
.meta-section.collapsed .section-header {
  margin-bottom: 0;
}

/* Bottom sections container */
.bottom-sections {
  flex-shrink: 0;
  width: 100%;
}

/* Collapsed bar - shown when both tasks and metadata are collapsed */
.collapsed-bar {
  user-select: none;
}

.collapsed-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
}

.collapsed-chip:hover {
  color: var(--accent-color, #0f4c75);
  background: rgba(255, 255, 255, 0.06);
}

.chip-count {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
}

/* All sections collapsed */
.collapsible-sections {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.section-content {
  width: 100%;
  box-sizing: border-box;
}

.notes-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 8px;
  background: #000000;
  border-radius: 6px;
}


.tabs-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tabs-row .sensitive-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
}

.tabs-row .sensitive-checkbox .lock-icon {
  font-size: 14px;
}

.tabs {
  display: flex;
  gap: 4px;
}

.tabs button {
  padding: 6px 12px;
  border: none;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
}

.tabs button.active {
  background: var(--accent-color, #0f4c75);
  color: white;
}

/* Base styles for all editors and previews */
.notes-editor,
.notes-preview {
  width: 100%;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-sizing: border-box;
  overflow-y: auto;
  flex: 1;
  min-height: 80px;
  height: 100%;
}

.notes-editor {
  color: var(--text-primary, #e0e0e0);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
}

.notes-editor:focus {
  outline: none;
}

/* Split view layout */
.notes-split {
  display: flex;
  flex-direction: row;
  gap: 16px;
  flex: 1;
  min-height: 0;
  background: #000000;
  padding: 8px;
  border-radius: 6px;
}

.notes-split .split-editor,
.notes-split .split-preview {
  flex: 1 1 0;
  min-width: 0;
  width: auto;
  height: auto;
  background: #000000;
  padding: 12px;
  border-radius: 4px;
  border: none;
}

.notes-split .split-editor {
  resize: none;
}

.sensitive-notes-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  color: var(--text-secondary, #a0a0a0);
}

.sensitive-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.reveal-btn {
  margin-top: 12px;
  padding: 6px 16px;
  background: var(--accent-color, #0f4c75);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.sensitive-notes-row {
  text-align: right;
  padding: 8px 0;
}

.sensitive-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
}

.subtasks-section {
  margin-bottom: 8px;
  padding: 8px;
  background: var(--bg-primary, #1a1f2e);
  border-radius: 6px;
  flex-shrink: 0;
}

/* subtasks-header replaced by section-header */

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.subtask-drag-handle {
  cursor: grab;
  color: var(--text-secondary, #a0a0a0);
  font-size: 10px;
  letter-spacing: -2px;
  opacity: 0.5;
  user-select: none;
}

.subtask-drag-handle:hover {
  opacity: 1;
}

.subtask-item:active .subtask-drag-handle {
  cursor: grabbing;
}

.subtask-item.completed .subtask-title {
  text-decoration: line-through;
  color: var(--text-secondary, #a0a0a0);
}

.subtask-title {
  flex: 1;
  font-size: 13px;
}

.subtask-delete {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 2px 6px;
  opacity: 0;
}

.subtask-item:hover .subtask-delete {
  opacity: 1;
}

.subtask-add {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.subtask-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: #000;
  color: var(--text-primary, #e0e0e0);
  font-size: 13px;
}

.subtask-add-btn {
  padding: 6px 12px;
  background: var(--accent-color, #0f4c75);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.subtask-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.meta-section {
  padding: 4px 8px;
  background: var(--bg-primary, #1a1f2e);
  border-radius: 6px;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.meta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: center;
  width: 100%;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.meta-item label {
  font-size: 10px;
  color: var(--text-secondary, #a0a0a0);
  white-space: nowrap;
}

.meta-item select,
.meta-item input[type="date"] {
  padding: 2px 4px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 3px;
  background: #000;
  color: var(--text-primary, #e0e0e0);
  font-size: 11px;
}

.importance-picker {
  display: flex;
  gap: 2px;
}

.importance-btn {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 3px;
  background: #000;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  font-size: 10px;
}

.importance-btn.active {
  background: var(--accent-color, #0f4c75);
  color: white;
  border-color: var(--accent-color, #0f4c75);
}

.created-value {
  font-size: 12px;
  color: var(--text-primary, #e0e0e0);
}

.date-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 2px 6px;
  font-size: 12px;
}

.recurrence-controls {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recurrence-interval {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
}

.interval-input {
  width: 50px;
  padding: 2px 4px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: #000;
  color: var(--text-primary, #e0e0e0);
  font-size: 12px;
}

.links-item,
.persons-item {
  /* Let them flow naturally with other items */
}

.inline-links,
.inline-persons {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: center;
}

.link-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: #000;
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
}

.chip-x {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 0 2px;
  font-size: 10px;
}

.add-link-btn,
.add-person-btn {
  width: 18px;
  height: 18px;
  border: 1px dashed var(--border-color, #3a3f4b);
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.link-search-popup {
  margin-top: 12px;
  padding: 12px;
  background: #000;
  border-radius: 8px;
}

.person-picker-popup {
  margin-top: 12px;
  padding: 12px;
  background: #000;
  border-radius: 8px;
  min-width: 320px;
}

.link-search-popup input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
  margin-bottom: 8px;
  box-sizing: border-box;
}

.link-results {
  max-height: 150px;
  overflow-y: auto;
}

.link-result {
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
}

.link-result:hover {
  background: var(--bg-hover, #2a2f3d);
}

.new-person-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #3a3f4b);
}

.new-person-row input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
  font-size: 13px;
}

.new-person-row button {
  padding: 8px 12px;
  background: var(--accent-color, #0f4c75);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.new-person-row button:disabled {
  background: var(--border-color, #3a3f4b);
  cursor: not-allowed;
}

.new-person-row button:not(:disabled):hover {
  background: var(--accent-hover, #1a6faa);
}

.person-picker-list {
  max-height: 200px;
  overflow-y: auto;
}

.person-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;
}

.person-option:hover {
  background: var(--bg-hover, #2a2f3d);
}

.person-option.assigned {
  opacity: 0.5;
}

.person-color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
}

.person-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-email {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.person-picker-more {
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
  border-top: 1px solid var(--border-color, #3a3f4b);
  margin-top: 4px;
}

.person-picker-empty {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary, #a0a0a0);
}

.person-picker-empty button {
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--accent-color, #0f4c75);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Vertical layout */
:global(.vertical-layout) .detail-panel {
  width: 100%;
  height: var(--detail-height, 50%);
  border-left: none;
  border-top: 3px solid var(--border-color, #3a3f4b);
}

:global(.vertical-layout) .resize-handle {
  left: 0;
  right: 0;
  top: 0;
  bottom: auto;
  height: 6px;
  width: 100%;
  cursor: ns-resize;
}

/* Milestone section */
.milestone-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-primary, #1a1f2e);
  border-radius: 8px;
  border-left: 3px solid var(--accent-color, #0f4c75);
}

.milestone-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.milestone-date-row label {
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
}

.child-todos-section label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #a0a0a0);
  margin-bottom: 8px;
}

.child-todos-list {
  max-height: 200px;
  overflow-y: auto;
}

.child-todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.child-todo-item:hover {
  background: var(--bg-hover, #2a2f3d);
}

.child-todo-item.completed .child-title {
  text-decoration: line-through;
  color: var(--text-secondary, #a0a0a0);
}

.child-title {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary, #e0e0e0);
}

.child-todos-empty {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary, #a0a0a0);
}

.child-todos-empty p {
  margin: 0 0 4px 0;
  font-size: 13px;
}

.child-todos-empty small {
  font-size: 11px;
  opacity: 0.7;
}

/* Tags */
.tags-item {
  flex: 1;
  min-width: 100px;
}

.inline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: #000;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 10px;
  font-size: 11px;
  color: var(--text-primary, #e0e0e0);
}

.tag-input {
  padding: 2px 6px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 10px;
  background: #000;
  color: var(--text-primary, #e0e0e0);
  font-size: 11px;
  width: 80px;
}

.tag-input::placeholder {
  color: var(--text-secondary, #a0a0a0);
}

/* Vertical/bottom mode - grid and flex layout handled by inline styles */
.detail-panel.vertical-mode .notes-section {
  min-height: 0;
}

.detail-panel.vertical-mode .subtasks-section {
  min-height: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.detail-panel.vertical-mode .subtasks-section.collapsed {
  flex: 0 0 auto;
}

.detail-panel.vertical-mode .subtasks-section .section-content {
  flex: 1;
  overflow-y: auto;
}

.detail-panel.vertical-mode .meta-section {
  flex-shrink: 0;
}

.detail-panel.vertical-mode .meta-section.collapsed {
  flex: 0 0 auto;
}

/* Vertical mode with expanded metadata - restructure layout */
.detail-panel.vertical-mode .bottom-sections.metadata-expanded .subtasks-section {
  grid-column: 2;
  grid-row: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.detail-panel.vertical-mode .bottom-sections.metadata-expanded .subtasks-section .section-content {
  flex: 1;
  overflow-y: auto;
}

.detail-panel.vertical-mode .bottom-sections.metadata-expanded .meta-section {
  grid-column: 1 / -1;
  grid-row: 2;
}

/* Full width metadata grid in vertical mode when expanded */
.detail-panel.vertical-mode .bottom-sections.metadata-expanded .meta-section .meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px 12px;
  width: 100%;
}

/* Narrower vertical panels fall back to stacked */
@media (max-width: 700px) {
  .detail-panel.vertical-mode .collapsible-sections {
    display: flex;
    flex-direction: column;
  }

  .detail-panel.vertical-mode .bottom-sections {
    display: block;
  }
}
</style>
