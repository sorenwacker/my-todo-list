<template>
  <aside v-if="todo" ref="detailPanel" class="detail-panel" :style="panelStyle">
    <div
      class="resize-handle"
      :class="{ dragging: isResizing }"
      @mousedown="$emit('resize-start', $event)"
    ></div>
    <div class="detail-panel-header">
      <div class="header-actions">
        <button class="layout-btn" :title="layoutButtonTitle" @click="$emit('toggle-layout')">
          <span v-if="layoutPreference === 'auto'">A</span>
          <span v-else-if="layoutPreference === 'horizontal'">|</span>
          <span v-else>-</span>
        </button>
        <button class="detach-btn" title="Open in new window" @click="$emit('detach')">^</button>
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
          :value="todo.title"
          class="title-input"
          placeholder="Todo title"
          :style="{ borderBottomColor: todo.project_color || '#333' }"
          @input="$emit('update:title', $event.target.value)"
          @change="$emit('save')"
        />
      </div>

      <div class="meta-row project-row">
        <label>Project:</label>
        <select :value="todo.project_id" @change="$emit('project-change', $event.target.value ? parseInt($event.target.value) : null)">
          <option :value="null">Inbox (No Project)</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>

      <div class="notes-section">
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

        <textarea
          v-if="activeTab === 'edit'"
          :value="todo.notes"
          placeholder="Add notes (Markdown supported)..."
          class="notes-editor"
          :style="{ borderColor: todo.project_color || '#333' }"
          @input="$emit('update:notes', $event.target.value)"
        ></textarea>

        <div
          v-else-if="activeTab === 'preview'"
          class="notes-preview markdown-body"
          :style="{ borderColor: todo.project_color || '#333' }"
        >
          <div v-if="todo.notes_sensitive && !notesRevealed" class="sensitive-notes-overlay">
            <div class="sensitive-icon">*</div>
            <p>Sensitive content hidden</p>
            <button class="reveal-btn" @click="$emit('reveal-notes')">Reveal</button>
          </div>
          <div v-else @click="$emit('markdown-click', $event)" v-html="renderedNotes"></div>
        </div>

        <div v-else class="notes-split">
          <textarea
            :value="todo.notes"
            placeholder="Add notes (Markdown supported)..."
            class="notes-editor split-editor"
            :style="{ borderColor: todo.project_color || '#333' }"
            @input="$emit('update:notes', $event.target.value)"
          ></textarea>
          <div
            class="notes-preview markdown-body split-preview"
            :style="{ borderColor: todo.project_color || '#333' }"
          >
            <div v-if="todo.notes_sensitive && !notesRevealed" class="sensitive-notes-overlay">
              <div class="sensitive-icon">*</div>
              <p>Sensitive content hidden</p>
              <button class="reveal-btn" @click="$emit('reveal-notes')">Reveal</button>
            </div>
            <div v-else @click="$emit('markdown-click', $event)" v-html="renderedNotes"></div>
          </div>
        </div>
      </div>

      <div class="sensitive-notes-row" style="text-align: right; padding: 8px 0;">
        <label class="sensitive-checkbox" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #bbb; cursor: pointer;">
          <input :checked="todo.notes_sensitive" type="checkbox" @change="$emit('update:notes-sensitive', $event.target.checked)" />
          <span class="lock-icon">*</span>
          <span>Sensitive Notes</span>
        </label>
      </div>

      <div class="subtasks-section">
        <div class="subtasks-header">
          <label>Subtasks</label>
          <span v-if="subtasks.length" class="subtask-count">{{ completedSubtasksCount }}/{{ subtasks.length }}</span>
        </div>
        <div class="subtasks-list">
          <div v-for="subtask in subtasks" :key="subtask.id" class="subtask-item" :class="{ completed: subtask.completed }">
            <input type="checkbox" :checked="subtask.completed" @change="$emit('toggle-subtask', subtask)" />
            <span class="subtask-title">{{ subtask.title }}</span>
            <button class="subtask-delete" @click="$emit('delete-subtask', subtask.id)">x</button>
          </div>
        </div>
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

      <div class="meta-section compact">
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
          <div class="meta-item links-item">
            <label>Links</label>
            <div class="inline-links">
              <span v-for="linked in linkedTodos" :key="linked.id" class="link-chip" @click="$emit('select-linked', linked.id)">
                {{ linked.title }}<button class="chip-x" @click.stop="$emit('unlink', linked)">x</button>
              </span>
              <button class="add-link-btn" @click="$emit('toggle-link-search')">+</button>
            </div>
          </div>
          <div class="meta-item persons-item">
            <label>Persons</label>
            <div class="inline-persons">
              <span
                v-for="person in assignedPersons"
                :key="person.id"
                class="person-avatar"
                :style="{ background: person.color }"
                :title="person.name"
                @click="$emit('unassign-person', person)"
              >{{ getInitials(person.name) }}</span>
              <button class="add-person-btn" @click="$emit('toggle-person-picker')">+</button>
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
          <div class="person-picker-list">
            <div v-for="person in persons" :key="person.id" class="person-option" :class="{ assigned: assignedPersons.some(p => p.id === person.id) }" @click="$emit('assign-person', person)">
              <span class="person-color-dot" :style="{ background: person.color }"></span>
              <span class="person-name">{{ person.name }}</span>
              <span v-if="person.email" class="person-email">{{ person.email }}</span>
            </div>
            <div v-if="!persons.length" class="person-picker-empty">
              <p>No persons available</p>
              <button @click="$emit('open-settings')">Manage Persons</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
import { renderMarkdown } from '../utils/markdown.js'

export default {
  name: 'DetailPanel',
  props: {
    todo: { type: Object, default: null },
    projects: { type: Array, default: () => [] },
    categories: { type: Array, default: () => [] },
    statuses: { type: Array, default: () => [] },
    persons: { type: Array, default: () => [] },
    subtasks: { type: Array, default: () => [] },
    linkedTodos: { type: Array, default: () => [] },
    assignedPersons: { type: Array, default: () => [] },
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
    detailHeight: { type: Number, default: 50 }
  },
  emits: [
    'close', 'detach', 'toggle-layout', 'resize-start',
    'toggle-complete', 'save',
    'update:title', 'update:notes', 'update:notes-sensitive', 'update:active-tab',
    'project-change', 'category-change', 'status-change',
    'set-importance',
    'update-start-date', 'clear-start-date',
    'update-end-date', 'clear-end-date',
    'update-recurrence-type', 'update-recurrence-interval',
    'update-recurrence-end-date', 'clear-recurrence-end-date',
    'toggle-subtask', 'delete-subtask', 'add-subtask', 'update:new-subtask-title',
    'select-linked', 'unlink', 'toggle-link-search', 'update:link-query', 'link-to',
    'assign-person', 'unassign-person', 'toggle-person-picker', 'open-settings',
    'reveal-notes', 'markdown-click'
  ],
  computed: {
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
    }
  },
  methods: {
    getInitials(name) {
      if (!name) return '?'
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
  }
}
</script>

<style scoped>
.detail-panel {
  width: var(--detail-width, 600px);
  background: var(--bg-secondary, #252a3d);
  border-left: 3px solid #333;
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
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #3a3f4b);
  display: flex;
  justify-content: flex-end;
}

.header-actions {
  display: flex;
  gap: 4px;
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
  padding: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.title-checkbox {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.title-input {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  padding: 8px 0;
  border: none;
  border-bottom: 2px solid #333;
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

.notes-section {
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
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

.notes-editor {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 6px;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

.notes-preview {
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 6px;
  background: var(--bg-primary, #1a1f2e);
  overflow-y: auto;
}

.notes-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.split-editor,
.split-preview {
  min-height: 200px;
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

.subtasks-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-primary, #1a1f2e);
  border-radius: 8px;
}

.subtasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.subtasks-header label {
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
}

.subtask-count {
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
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
  background: var(--bg-secondary, #252a3d);
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
  padding: 12px;
  background: var(--bg-primary, #1a1f2e);
  border-radius: 8px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item label {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
  text-transform: uppercase;
}

.meta-item select,
.meta-item input[type="date"] {
  padding: 4px 6px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: var(--bg-secondary, #252a3d);
  color: var(--text-primary, #e0e0e0);
  font-size: 12px;
}

.importance-picker {
  display: flex;
  gap: 4px;
}

.importance-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: var(--bg-secondary, #252a3d);
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  font-size: 11px;
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
  gap: 6px;
}

.recurrence-interval {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
}

.interval-input {
  width: 50px;
  padding: 2px 4px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: var(--bg-secondary, #252a3d);
  color: var(--text-primary, #e0e0e0);
  font-size: 12px;
}

.links-item,
.persons-item {
  grid-column: span 2;
}

.inline-links,
.inline-persons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.link-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary, #252a3d);
  border-radius: 12px;
  font-size: 12px;
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
  width: 24px;
  height: 24px;
  border: 1px dashed var(--border-color, #3a3f4b);
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.person-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: white;
  cursor: pointer;
}

.link-search-popup,
.person-picker-popup {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary, #252a3d);
  border-radius: 8px;
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
}

.person-option:hover {
  background: var(--bg-hover, #2a2f3d);
}

.person-option.assigned {
  opacity: 0.5;
}

.person-color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}

.person-name {
  flex: 1;
  font-size: 13px;
}

.person-email {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
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
  border-top: 3px solid #333;
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
</style>
