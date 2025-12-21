<template>
  <div
    class="kanban-card"
    :class="{ completed: todo.completed, selected: selected }"
    :style="{ borderLeftColor: borderColor }"
    :data-todo-id="todo.id"
    @click="$emit('select')"
  >
    <div class="card-header">
      <input
        type="checkbox"
        :checked="todo.completed"
        @click.stop="$emit('toggle-complete')"
      />
      <span class="card-title">{{ todo.title }}</span>
      <button class="card-delete-btn" @click.stop="$emit('delete')">x</button>
    </div>
    <div class="card-meta">
      <span v-if="todo.importance && todo.importance > 0" class="card-importance">{{ todo.importance }}</span>
      <span v-if="showProject && todo.project_name" class="card-project" :style="{ color: todo.project_color }">{{ todo.project_name }}</span>
      <span v-else-if="!showProject && todo.category_name" class="card-category" :style="{ color: todo.category_color }">{{ todo.category_name }}</span>
    </div>
    <div v-if="todo.start_date || todo.end_date" class="card-dates">
      <span v-if="todo.start_date" class="card-start">Start: {{ formatDeadline(todo.start_date) }}</span>
      <span v-if="todo.end_date" class="card-deadline" :class="{ overdue: isOverdue(todo.end_date) }">
        Due: {{ formatDeadline(todo.end_date) }}
      </span>
    </div>
    <div v-if="todo.subtask_count > 0" class="card-subtasks">
      <div class="subtask-progress">
        <div class="subtask-bar" :style="{ width: subtaskProgress + '%' }"></div>
      </div>
      <span class="subtask-count">{{ todo.subtask_completed }}/{{ todo.subtask_count }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KanbanCard',
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
  emits: ['select', 'toggle-complete', 'delete'],
  computed: {
    subtaskProgress() {
      if (!this.todo.subtask_count) return 0
      return Math.round((this.todo.subtask_completed / this.todo.subtask_count) * 100)
    }
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
    }
  }
}
</script>
