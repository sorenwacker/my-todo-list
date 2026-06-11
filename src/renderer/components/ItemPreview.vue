<template>
  <div v-if="item" class="graph-tooltip" :style="positionStyle">
    <div class="tooltip-title">{{ item.title || item.name }}</div>
    <div v-if="item.project_name" class="tooltip-project">{{ item.project_name }}</div>
    <div v-if="item.company" class="tooltip-meta">{{ item.company }}</div>
    <div v-if="item.role" class="tooltip-meta">{{ item.role }}</div>
    <div v-if="item.end_date" class="tooltip-deadline">Due: {{ formatDate(item.end_date) }}</div>
    <div v-if="item.notes && !item.notes_sensitive" class="tooltip-notes markdown-body" v-html="renderNotes(item.notes)"></div>
    <div v-else-if="item.notes_sensitive" class="tooltip-notes sensitive">Sensitive content hidden</div>
    <div v-if="item.description" class="tooltip-notes">{{ item.description }}</div>
  </div>
</template>

<script>
import { renderCardMarkdown } from '../utils/markdown.js'

export default {
  name: 'ItemPreview',
  props: {
    item: {
      type: Object,
      default: null
    },
    position: {
      type: Object,
      default: null
    }
  },
  computed: {
    positionStyle() {
      if (!this.position) return {}
      return {
        left: this.position.x + 'px',
        top: this.position.y + 'px'
      }
    }
  },
  methods: {
    renderNotes(notes) {
      if (!notes) return ''
      const processed = notes.replace(/`{3,}\s*mermaid\b[\s\S]*?`{3,}/gi, '[diagram]')
      return renderCardMarkdown(processed)
    },
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Tomorrow'
      if (diffDays === -1) return 'Yesterday'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }
}
</script>

<style scoped>
.tooltip-meta {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 2px;
}

.tooltip-notes.sensitive {
  color: #888;
  font-style: italic;
}
</style>
