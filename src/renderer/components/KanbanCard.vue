<template>
  <div
    class="kanban-card"
    :class="{ completed: todo.completed, selected: selected }"
    :style="{ borderLeftColor: borderColor }"
    :data-todo-id="todo.id"
    @click="handleClick"
    @contextmenu.prevent="showContextMenu($event)"
  >
    <!-- Context Menu (teleported to .app so kanban column scroll/overflow cannot
         clip it while still inheriting the app's theme variables) -->
    <Teleport to=".app">
      <div
        v-if="contextMenuVisible"
        ref="contextMenu"
        class="card-context-menu"
        :style="contextMenuStyle"
        @click.stop
      >
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
      </div>
    </Teleport>
    <div class="card-header">
      <input type="checkbox" :checked="todo.completed" @click.stop="$emit('toggle-complete')" />
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
      <button class="archive-btn" title="Archive" @click.stop="$emit('archive')">
        <Archive :size="14" />
      </button>
      <button class="card-delete-btn" title="Delete" @click.stop="$emit('delete')">
        <Trash2 :size="14" />
      </button>
    </div>
    <div v-if="(showProject && todo.project_name) || todo.end_date" class="card-meta">
      <span
        v-if="showProject && todo.project_name"
        class="card-project"
        :style="{ color: todo.project_color }"
        >{{ todo.project_name }}</span
      >
      <span
        v-if="todo.end_date"
        class="card-deadline"
        :class="{ overdue: isOverdue(todo.end_date) }"
      >
        Due: {{ formatDeadline(todo.end_date) }}
      </span>
    </div>
    <div v-if="todo.subtask_count > 0" class="card-subtasks">
      <div class="subtask-progress">
        <div class="subtask-bar" :style="{ width: subtaskProgress + '%' }"></div>
      </div>
      <span class="subtask-count">{{ todo.subtask_completed }}/{{ todo.subtask_count }}</span>
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
        <div v-html="renderCardNotes(todo.notes)"></div>
      </div>
    </div>
  </div>
</template>

<script>
  import { renderCardMarkdown } from '../utils/markdown.js'
  import { presetDueDate } from '../utils/dueDates.js'
  import NotesEditor from './NotesEditor.vue'
  import { Archive, Trash2 } from 'lucide-vue-next'

  export default {
    name: 'KanbanCard',
    components: {
      NotesEditor,
      Archive,
      Trash2
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
      borderColor: {
        type: String,
        default: '#666'
      },
      showProject: {
        type: Boolean,
        default: false
      }
    },
    emits: [
      'select',
      'toggle-complete',
      'delete',
      'update-title',
      'update-notes',
      'archive',
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
      subtaskProgress() {
        if (!this.todo.subtask_count) return 0
        return Math.round((this.todo.subtask_completed / this.todo.subtask_count) * 100)
      },
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
        const processed = notes.replace(/`{3,}\s*mermaid\b[\s\S]*?`{3,}/gi, '[diagram]')
        return renderCardMarkdown(processed)
      },
      handleClick(event) {
        if (this.isEditingNotes || this.isEditing) {
          return
        }
        this.isCollapsed = !this.isCollapsed
        this.$emit('select', event)
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
