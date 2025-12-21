<template>
  <div
    class="todo-card resizable"
    :class="{ completed: todo.completed, selected: selected, 'keyboard-focused': focused }"
    :style="cardStyle"
    @click="$emit('click', $event)"
    @mousedown="$emit('mousedown', $event)"
    @mouseup="$emit('mouseup', $event)"
  >
    <div class="card-header">
      <input
        v-if="!isTrashView"
        type="checkbox"
        :checked="todo.completed"
        @click.stop="$emit('toggle-complete')"
      />
      <span class="card-title">{{ todo.title }}</span>
      <template v-if="isTrashView">
        <button class="restore-btn" title="Restore" @click.stop="$emit('restore')">R</button>
        <button class="delete-btn permanent" title="Delete permanently" @click.stop="$emit('permanent-delete')">x</button>
      </template>
      <button v-else class="delete-btn" @click.stop="$emit('delete')">x</button>
    </div>
    <div v-if="(todo.project_name && showProject) || todo.category_name" class="card-meta">
      <span
        v-if="todo.project_name && showProject"
        class="card-project"
        :style="{ background: todo.project_color + '33', color: todo.project_color }"
      >
        {{ todo.project_name }}
      </span>
      <span v-if="todo.category_name" class="card-category">
        <span class="category-symbol">
          <component :is="getIconComponent(todo.category_symbol)" v-if="getIconComponent(todo.category_symbol)" :size="12" />
          <span v-else>{{ todo.category_symbol || '*' }}</span>
        </span>
        {{ todo.category_name }}
      </span>
    </div>
    <div v-if="todo.start_date || todo.end_date || todo.importance" class="card-footer">
      <span v-if="todo.start_date" class="card-start">Start: {{ formatDeadline(todo.start_date) }}</span>
      <span v-if="todo.end_date" class="card-deadline" :class="{ overdue: isOverdue(todo.end_date) }">
        Due: {{ formatDeadline(todo.end_date) }}
      </span>
      <span v-if="todo.importance" class="card-importance" :style="{ backgroundColor: getImportanceColor(todo.importance) }">{{ todo.importance }}</span>
    </div>
    <div v-if="todo.notes" :key="'notes-' + todo.id + '-' + (todo.notes?.length || 0)" class="card-notes-preview markdown-body">
      <div v-if="todo.notes_sensitive" class="sensitive-notes-card">
        <span class="sensitive-icon-small">L</span>
        <span class="sensitive-text">Sensitive content hidden</span>
      </div>
      <div v-else v-html="renderCardNotes(todo.notes)"></div>
    </div>
  </div>
</template>

<script>
import { renderCardMarkdown } from '../utils/markdown.js'
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
  name: 'CardItem',
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
    cardStyle: {
      type: Object,
      default: () => ({})
    },
    showProject: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click', 'mousedown', 'mouseup', 'toggle-complete', 'delete', 'restore', 'permanent-delete'],
  methods: {
    getIconComponent(name) {
      return iconMap[name] || null
    },
    getImportanceColor(importance) {
      const colors = ['#666', '#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c']
      return colors[importance] || colors[0]
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
    renderCardNotes(notes) {
      if (!notes) return ''
      return renderCardMarkdown(notes)
    }
  }
}
</script>
