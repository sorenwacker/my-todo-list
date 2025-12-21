<template>
  <tr
    :class="{ completed: todo.completed, selected: selected, 'keyboard-focused': focused }"
    @click="$emit('select')"
  >
    <td class="col-check">
      <input
        v-if="!isTrashView"
        type="checkbox"
        :checked="todo.completed"
        @click.stop="$emit('toggle-complete')"
      />
    </td>
    <td class="col-title">{{ todo.title }}</td>
    <td class="col-project">
      <span v-if="todo.project_name" class="project-badge" :style="{ background: todo.project_color }">
        {{ todo.project_name }}
      </span>
      <span v-else class="inbox-badge">-</span>
    </td>
    <td class="col-category">
      <span v-if="todo.category_name" class="category-badge">
        <span class="category-symbol">
          <component :is="getIconComponent(todo.category_symbol)" v-if="getIconComponent(todo.category_symbol)" :size="12" />
          <span v-else>{{ todo.category_symbol || '*' }}</span>
        </span>
        {{ todo.category_name }}
      </span>
      <span v-else>-</span>
    </td>
    <td class="col-status-col">
      <span v-if="todo.status_name" class="status-badge" :style="{ background: todo.status_color }">
        {{ todo.status_name }}
      </span>
      <span v-else>-</span>
    </td>
    <td class="col-importance">
      <span v-if="todo.importance" class="importance-badge" :style="{ color: getImportanceColor(todo.importance) }">
        {{ todo.importance }}
      </span>
      <span v-else>-</span>
    </td>
    <td class="col-subtasks">
      <span v-if="todo.subtask_count > 0">{{ todo.subtask_completed }}/{{ todo.subtask_count }}</span>
      <span v-else>-</span>
    </td>
    <td class="col-notes">
      <span v-if="todo.notes" class="notes-indicator">Y</span>
      <span v-else>-</span>
    </td>
    <td class="col-start">{{ todo.start_date ? formatShortDate(todo.start_date) : '-' }}</td>
    <td class="col-end" :class="{ overdue: isOverdue(todo.end_date) }">
      {{ todo.end_date ? formatShortDate(todo.end_date) : '-' }}
    </td>
    <td class="col-actions">
      <template v-if="isTrashView">
        <button class="restore-btn" title="Restore" @click.stop="$emit('restore')">R</button>
        <button class="permanent-delete-btn" title="Delete permanently" @click.stop="$emit('permanent-delete')">x</button>
      </template>
      <button v-else @click.stop="$emit('delete')">x</button>
    </td>
  </tr>
</template>

<script>
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
  name: 'TableRow',
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
    }
  },
  emits: ['select', 'toggle-complete', 'delete', 'restore', 'permanent-delete'],
  methods: {
    getIconComponent(name) {
      return iconMap[name] || null
    },
    getImportanceColor(importance) {
      const colors = ['#666', '#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c']
      return colors[importance] || colors[0]
    },
    formatShortDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
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
