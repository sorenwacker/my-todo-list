<template>
  <div
    class="todo-card"
    :class="{ completed: todo.completed, selected: selected, 'keyboard-focused': focused }"
    :style="cardStyle"
    :data-todo-id="todo.id"
    :draggable="isDraggable ? 'true' : 'false'"
    @click="handleClick($event)"
    @dragstart="onDragStart"
    @contextmenu.prevent="showContextMenu($event)"
  >
    <!-- Context Menu (teleported to .app so list/grid overflow cannot clip it
         while still inheriting the app's theme variables) -->
    <Teleport to=".app">
      <div
        v-if="contextMenuVisible"
        ref="contextMenu"
        class="card-context-menu"
        :style="contextMenuStyle"
        @click.stop
      >
        <div class="context-menu-item" @click="archiveFromMenu">Archive</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-label">Due date:</div>
        <div class="context-menu-item" @click="setDueDateFromMenu(dueDatePreset(0))">Today</div>
        <div class="context-menu-item" @click="setDueDateFromMenu(dueDatePreset(1))">Tomorrow</div>
        <div class="context-menu-item" @click="setDueDateFromMenu(dueDatePreset(7))">Next week</div>
        <div class="context-menu-item context-menu-date" @click.stop="openDatePicker">
          <span>Pick a date…</span>
          <input
            ref="dateInput"
            type="date"
            :value="dueDateValue"
            @click.stop
            @change="setDueDateFromMenu($event.target.value)"
          />
        </div>
        <div v-if="todo.end_date" class="context-menu-item" @click="setDueDateFromMenu(null)">
          Clear due date
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-label">Move to:</div>
        <div
          v-for="project in projects"
          :key="project.id"
          class="context-menu-item"
          :class="{ active: todo.project_id === project.id }"
          @click="moveToProjectFromMenu(project.id)"
        >
          <span class="project-dot" :style="{ background: project.color }"></span>
          {{ project.name }}
        </div>
        <div
          class="context-menu-item"
          :class="{ active: !todo.project_id }"
          @click="moveToProjectFromMenu(null)"
        >
          Inbox
        </div>
      </div>
    </Teleport>
    <div class="card-header">
      <input
        v-if="!isTrashView"
        type="checkbox"
        :checked="todo.completed"
        @click.stop="$emit('toggle-complete')"
      />
      <input
        v-if="isEditing"
        ref="titleInput"
        v-model="editingTitle"
        class="card-title-input"
        @keydown.enter.prevent="saveTitle"
        @keydown.escape.prevent="cancelEdit"
        @blur="saveTitle"
        @click.stop
      />
      <span v-else class="card-title" @dblclick.stop="startEdit">{{ todo.title }}</span>
      <template v-if="isTrashView">
        <button
          class="restore-btn"
          title="Restore from trash (Ctrl+Z to undo)"
          @click.stop="$emit('restore')"
        >
          <RotateCcw :size="14" />
        </button>
        <button
          class="delete-btn permanent"
          title="Delete permanently (cannot be undone)"
          @click.stop="$emit('permanent-delete')"
        >
          <Trash2 :size="14" />
        </button>
      </template>
      <template v-else-if="isArchiveView">
        <button
          class="restore-btn"
          title="Unarchive - move back to active (Ctrl+Z to undo)"
          @click.stop="$emit('unarchive')"
        >
          <RotateCcw :size="14" />
        </button>
        <button
          class="delete-btn"
          title="Move to trash (Ctrl+Z to undo)"
          @click.stop="$emit('delete')"
        >
          <Trash2 :size="14" />
        </button>
      </template>
      <template v-else>
        <button
          class="archive-btn"
          title="Archive - hide from active view (Ctrl+Z to undo)"
          @click.stop="$emit('archive')"
        >
          <Archive :size="14" />
        </button>
        <button
          class="delete-btn"
          title="Move to trash (Ctrl+Z to undo)"
          @click.stop="$emit('delete')"
        >
          <Trash2 :size="14" />
        </button>
      </template>
    </div>
    <div v-if="(todo.project_name && showProject) || todo.end_date" class="card-meta">
      <span
        v-if="todo.project_name && showProject"
        class="card-project"
        :style="{ background: todo.project_color + '33', color: todo.project_color }"
      >
        {{ todo.project_name }}
      </span>
      <span
        v-if="todo.end_date"
        class="card-deadline"
        :class="{ overdue: isOverdue(todo.end_date) }"
      >
        Due: {{ formatDeadline(todo.end_date) }}
      </span>
    </div>
    <div v-if="!isCollapsed" class="card-dates-info">
      <span v-if="todo.created_at">Created: {{ formatCreatedDate(todo.created_at) }}</span>
      <span v-if="todo.completed_at">Done: {{ formatCreatedDate(todo.completed_at) }}</span>
    </div>
    <div
      v-if="!todo.notes && !isEditingNotes && !isCollapsed"
      class="add-notes-link"
      @click.stop="startNotesEdit"
    >
      + Add notes
    </div>
    <div v-if="(todo.notes || isEditingNotes) && !isCollapsed" class="card-notes-preview">
      <div v-if="isEditingNotes" @click.stop @mousedown.stop>
        <NotesEditor
          ref="notesEditor"
          :model-value="editingNotes"
          @update:model-value="editingNotes = $event"
          @blur="saveNotes"
        />
      </div>
      <div v-else class="markdown-body" @click.stop="startNotesEdit">
        <div v-if="todo.notes_sensitive" class="sensitive-notes-card">
          <span class="sensitive-icon-small">L</span>
          <span class="sensitive-text">Sensitive content hidden</span>
        </div>
        <div v-else v-html="renderCardNotes(todo.notes)"></div>
      </div>
    </div>
  </div>
</template>

<script>
  import { renderCardMarkdown } from '../utils/markdown.js'
  import { presetDueDate } from '../utils/dueDates.js'
  import NotesEditor from './NotesEditor.vue'
  import { Archive, Trash2, RotateCcw } from 'lucide-vue-next'

  export default {
    name: 'CardItem',
    components: {
      NotesEditor,
      Archive,
      Trash2,
      RotateCcw
    },
    props: {
      todo: {
        type: Object,
        required: true
      },
      selected: {
        type: Boolean,
        default: false
      },
      focused: {
        type: Boolean,
        default: false
      },
      isTrashView: {
        type: Boolean,
        default: false
      },
      isArchiveView: {
        type: Boolean,
        default: false
      },
      cardStyle: {
        type: Object,
        default: () => ({})
      },
      showProject: {
        type: Boolean,
        default: false
      },
      isDraggable: {
        type: Boolean,
        default: false
      },
      selectedTodoIds: {
        type: Set,
        default: () => new Set()
      },
      projects: {
        type: Array,
        default: () => []
      }
    },
    emits: [
      'click',
      'toggle-complete',
      'delete',
      'restore',
      'permanent-delete',
      'unarchive',
      'dragstart',
      'update-title',
      'update-notes',
      'archive',
      'move-to-project',
      'set-due-date'
    ],
    data() {
      return {
        isEditing: false,
        editingTitle: '',
        isCollapsed: true,
        isEditingNotes: false,
        editingNotes: '',
        contextMenuVisible: false,
        contextMenuStyle: { top: '0px', left: '0px' }
      }
    },
    computed: {
      dueDateValue() {
        return this.todo.end_date ? this.todo.end_date.split('T')[0] : ''
      }
    },
    mounted() {
      // Close this card's menu when any other card opens its own menu.
      document.addEventListener('close-card-menus', this.hideContextMenu)
    },
    beforeUnmount() {
      document.removeEventListener('close-card-menus', this.hideContextMenu)
    },
    methods: {
      onDragStart(event) {
        // If this card is part of multi-selection, drag all selected items
        let idsToTransfer = [this.todo.id]
        if (this.selectedTodoIds.has(this.todo.id) && this.selectedTodoIds.size > 1) {
          idsToTransfer = [...this.selectedTodoIds]
        }
        event.dataTransfer.setData('text/plain', JSON.stringify(idsToTransfer))
        event.dataTransfer.effectAllowed = 'move'
        this.$emit('dragstart', event)
      },
      formatDeadline(dateString) {
        if (!dateString) return ''
        const date = new Date(dateString)
        const now = new Date()
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Tomorrow'
        if (diffDays === -1) return 'Yesterday'
        if (diffDays > 0 && diffDays <= 7) return `${diffDays}d`

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      },
      isOverdue(dateString) {
        if (!dateString) return false
        const date = new Date(dateString)
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        return date < now
      },
      formatCreatedDate(dateString) {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' })
      },
      renderCardNotes(notes) {
        if (!notes) return ''
        // Strip mermaid code blocks for performance
        const processed = notes.replace(/`{3,}\s*mermaid\b[\s\S]*?`{3,}/gi, '[diagram]')
        return renderCardMarkdown(processed)
      },
      startEdit() {
        this.editingTitle = this.todo.title
        this.isEditing = true
        this.$nextTick(() => this.$refs.titleInput?.focus())
      },
      saveTitle() {
        if (this.isEditing) {
          const newTitle = this.editingTitle.trim()
          if (newTitle && newTitle !== this.todo.title) {
            this.$emit('update-title', newTitle)
          }
          this.isEditing = false
        }
      },
      cancelEdit() {
        this.isEditing = false
        this.editingTitle = ''
      },
      startNotesEdit() {
        this.editingNotes = this.todo.notes || ''
        this.isEditingNotes = true
      },
      saveNotes() {
        if (this.isEditingNotes) {
          const newNotes = this.editingNotes
          if (newNotes !== this.todo.notes) {
            this.$emit('update-notes', newNotes)
          }
          this.isEditingNotes = false
        }
      },
      cancelNotesEdit() {
        this.isEditingNotes = false
        this.editingNotes = ''
      },
      handleClick(event) {
        // Don't toggle when editing
        if (this.isEditingNotes || this.isEditing) {
          return
        }
        this.isCollapsed = !this.isCollapsed
        this.$emit('click', event)
      },
      showContextMenu(event) {
        // Close any other open card menu so only one is visible at a time.
        document.dispatchEvent(new CustomEvent('close-card-menus'))
        // Fixed (viewport) coordinates: the menu is teleported to <body>.
        this.contextMenuStyle = {
          position: 'fixed',
          top: event.clientY + 'px',
          left: event.clientX + 'px'
        }
        this.contextMenuVisible = true
        this.$nextTick(() => this.clampContextMenu(event.clientX, event.clientY))
        // Close on click outside or on scroll.
        setTimeout(() => {
          document.addEventListener('click', this.hideContextMenu, { once: true })
          window.addEventListener('scroll', this.hideContextMenu, { once: true, capture: true })
        }, 0)
      },
      clampContextMenu(x, y) {
        const menu = this.$refs.contextMenu
        if (!menu) return
        const rect = menu.getBoundingClientRect()
        const pad = 8
        let left = x
        let top = y
        if (left + rect.width + pad > window.innerWidth) left = window.innerWidth - rect.width - pad
        if (top + rect.height + pad > window.innerHeight)
          top = window.innerHeight - rect.height - pad
        this.contextMenuStyle = {
          position: 'fixed',
          top: Math.max(pad, top) + 'px',
          left: Math.max(pad, left) + 'px'
        }
      },
      hideContextMenu() {
        this.contextMenuVisible = false
      },
      archiveFromMenu() {
        this.$emit('archive')
        this.hideContextMenu()
      },
      moveToProjectFromMenu(projectId) {
        this.$emit('move-to-project', projectId)
        this.hideContextMenu()
      },
      dueDatePreset(offsetDays) {
        return presetDueDate(offsetDays)
      },
      openDatePicker() {
        const input = this.$refs.dateInput
        if (!input) return
        // showPicker() opens the native calendar directly; fall back to focusing.
        if (typeof input.showPicker === 'function') {
          input.showPicker()
        } else {
          input.focus()
        }
      },
      setDueDateFromMenu(date) {
        this.$emit('set-due-date', date || null)
        this.hideContextMenu()
      }
    }
  }
</script>
