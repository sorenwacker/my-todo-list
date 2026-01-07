<template>
  <div
    class="todo-card"
    :class="{
      completed: todo.completed,
      selected: isSelected,
      resizable: resizable
    }"
    :style="cardStyle"
    :data-todo-id="todo.id"
    @click="$emit('select', todo)"
    @mousedown="onMouseDown"
  >
    <div class="card-header">
      <input
        type="checkbox"
        :checked="todo.completed"
        @click.stop
        @change="$emit('toggle-complete', todo)"
      />
      <span class="todo-title">{{ todo.title }}</span>
      <div class="card-actions">
        <button
          v-if="todo.notes_sensitive"
          class="sensitive-indicator"
          title="Contains sensitive content"
          @click.stop
        >*</button>
        <button
          class="expand-btn"
          title="Open in new window"
          @click.stop="$emit('open-window', todo)"
        >^</button>
        <button
          class="delete-btn"
          title="Delete"
          @click.stop="$emit('delete', todo)"
        >x</button>
      </div>
    </div>

    <div v-if="todo.notes" class="card-notes">
      <div v-if="todo.notes_sensitive" class="sensitive-blur">
        <span class="sensitive-text">Sensitive content hidden</span>
      </div>
      <div v-else class="notes-preview" v-html="renderedNotes"></div>
    </div>

    <div class="card-meta">
      <span v-if="todo.importance" class="importance" :class="'importance-' + todo.importance">
        {{ todo.importance }}
      </span>
      <span v-if="todo.end_date" class="deadline" :class="{ overdue: isOverdue }">
        {{ formatDate(todo.end_date) }}
      </span>
      <span v-if="todo.category_name" class="category-badge">
        {{ todo.category_name }}
      </span>
      <span v-if="todo.status_name" class="status-badge" :style="{ background: todo.status_color }">
        {{ todo.status_name }}
      </span>
    </div>

    <div v-if="showProjectBadge && todo.project_name" class="project-badge" :style="{ background: todo.project_color }">
      {{ todo.project_name }}
    </div>

    <div v-if="todo.subtask_count > 0" class="subtask-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span class="progress-text">{{ todo.subtask_completed }}/{{ todo.subtask_count }}</span>
    </div>

    <div v-if="resizable" class="resize-handle" @mousedown.stop="onResizeStart"></div>
  </div>
</template>

<script>
import { renderCardMarkdown } from '../utils/markdown.js'

export default {
  name: 'TodoCard',
  props: {
    todo: {
      type: Object,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    showProjectBadge: {
      type: Boolean,
      default: false
    },
    resizable: {
      type: Boolean,
      default: false
    },
    customHeight: {
      type: Number,
      default: null
    },
    projectColor: {
      type: String,
      default: null
    }
  },
  emits: ['select', 'toggle-complete', 'delete', 'open-window', 'resize', 'resize-end', 'mousedown'],
  computed: {
    cardStyle() {
      const style = {}
      if (this.projectColor) {
        style.borderLeftColor = this.projectColor
      }
      if (this.customHeight) {
        style.height = `${this.customHeight}px`
      }
      return style
    },
    renderedNotes() {
      if (!this.todo.notes) return ''
      // Strip mermaid code blocks for performance (handles various formatting)
      // Match code blocks that start with ```mermaid (with optional whitespace/newlines)
      const processed = this.todo.notes
        .replace(/`{3,}\s*mermaid\b[\s\S]*?`{3,}/gi, '[diagram]')
      return renderCardMarkdown(processed)
    },
    isOverdue() {
      if (!this.todo.end_date || this.todo.completed) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const deadline = new Date(this.todo.end_date)
      return deadline < today
    },
    progressPercent() {
      if (!this.todo.subtask_count || this.todo.subtask_count === 0) return 0
      return Math.round((this.todo.subtask_completed / this.todo.subtask_count) * 100)
    }
  },
  methods: {
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    },
    onMouseDown(event) {
      this.$emit('mousedown', event, this.todo.id)
    },
    onResizeStart(event) {
      this.$emit('resize', event, this.todo.id)
    }
  }
}
</script>

<style scoped>
.todo-card {
  background: var(--bg-secondary, #252a3d);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  position: relative;
}

.todo-card:hover {
  background: var(--bg-hover, #2a2f3d);
}

.todo-card.selected {
  border-left-color: var(--accent-color, #0f4c75);
  background: var(--bg-hover, #2a2f3d);
}

.todo-card.completed {
  opacity: 0.6;
}

.todo-card.completed .todo-title {
  text-decoration: line-through;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.card-header input[type="checkbox"] {
  margin-top: 2px;
  flex-shrink: 0;
}

.todo-title {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
  word-break: break-word;
}

.card-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-card:hover .card-actions {
  opacity: 1;
}

.card-actions button {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
}

.card-actions button:hover {
  background: var(--bg-primary, #1a1f2e);
}

.card-actions .delete-btn:hover {
  color: #dc3545;
}

.sensitive-indicator {
  color: #f59e0b !important;
}

.card-notes {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary, #a0a0a0);
  max-height: 100px;
  overflow: hidden;
}

.notes-preview {
  line-height: 1.4;
}

.notes-preview :deep(p) {
  margin: 0 0 4px 0;
}

.notes-preview :deep(ul),
.notes-preview :deep(ol) {
  margin: 0;
  padding-left: 16px;
}

.sensitive-blur {
  filter: blur(4px);
  user-select: none;
}

.sensitive-text {
  font-style: italic;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.importance {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-primary, #1a1f2e);
}

.importance-5 { color: #dc3545; }
.importance-4 { color: #f59e0b; }
.importance-3 { color: #3b82f6; }
.importance-2 { color: #10b981; }
.importance-1 { color: #6b7280; }

.deadline {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
}

.deadline.overdue {
  color: #dc3545;
  font-weight: 500;
}

.category-badge,
.status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-primary, #1a1f2e);
}

.status-badge {
  color: white;
}

.project-badge {
  margin-top: 8px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  display: inline-block;
}

.resizable {
  resize: vertical;
  overflow: hidden;
  min-height: 80px;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
}

.subtask-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--bg-primary, #1a1f2e);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #10b981;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
  white-space: nowrap;
}
</style>
