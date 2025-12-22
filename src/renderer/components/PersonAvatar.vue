<template>
  <span ref="avatarRef" class="person-avatar-container">
    <span
      class="person-avatar"
      :style="{ background: person.color }"
      @click="$emit('click', person)"
      @mouseenter="onMouseEnter"
      @mouseleave="showTooltip = false"
    >{{ initials }}</span>
    <button
      v-if="showRemove"
      class="person-remove"
      title="Remove from task"
      @click.stop="$emit('remove', person)"
    >x</button>
  </span>
  <Teleport to="body">
    <div v-if="showTooltip" class="person-tooltip" :style="tooltipStyle">
      <div class="tooltip-name">{{ person.name }}</div>
      <div v-if="person.role" class="tooltip-role">{{ person.role }}</div>
      <div v-if="person.company" class="tooltip-line">{{ person.company }}</div>
      <div v-if="person.email" class="tooltip-line">{{ person.email }}</div>
      <div v-if="person.phone" class="tooltip-line">{{ person.phone }}</div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'PersonAvatar',
  props: {
    person: {
      type: Object,
      required: true
    },
    showRemove: {
      type: Boolean,
      default: true
    }
  },
  emits: ['click', 'remove'],
  data() {
    return {
      showTooltip: false,
      tooltipPos: { x: 0, y: 0 }
    }
  },
  computed: {
    tooltipStyle() {
      return {
        position: 'fixed',
        left: `${this.tooltipPos.x}px`,
        top: `${this.tooltipPos.y}px`
      }
    },
    initials() {
      const name = this.person.name
      if (!name) return '?'
      const parts = name.trim().split(' ')
      if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase()
      }
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    },
    tooltip() {
      const p = this.person
      if (!p) return ''
      const lines = [p.name || '']
      if (p.role) lines.push(p.role)
      if (p.company) lines.push(`Company: ${p.company}`)
      if (p.email) lines.push(`Email: ${p.email}`)
      if (p.phone) lines.push(`Phone: ${p.phone}`)
      if (p.github_name) lines.push(`GitHub: ${p.github_name}`)
      if (p.notes) lines.push(`Notes: ${p.notes.substring(0, 100)}${p.notes.length > 100 ? '...' : ''}`)
      return lines.join('\n')
    }
  },
  methods: {
    onMouseEnter(event) {
      const rect = event.target.getBoundingClientRect()
      // Position to the left of the avatar, centered vertically
      this.tooltipPos = {
        x: rect.left - 170,
        y: rect.top + rect.height / 2 - 30
      }
      // If tooltip would go off left edge, position to the right instead
      if (this.tooltipPos.x < 10) {
        this.tooltipPos.x = rect.right + 10
      }
      this.showTooltip = true
    }
  }
}
</script>

<style scoped>
.person-avatar-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.person-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-secondary, #a0a0a0);
  font-size: 10px;
  cursor: pointer;
  opacity: 0;
  align-items: center;
  justify-content: center;
  line-height: 1;
  display: flex;
  transition: opacity 0.15s;
}

.person-avatar-container:hover .person-remove {
  opacity: 1;
}

.person-remove:hover {
  background: #e74c3c;
  color: white;
}

.person-avatar:hover {
  filter: brightness(1.2);
}

</style>

<style>
.person-tooltip {
  z-index: 9999;
  background: #1a1f2e;
  border: 1px solid #3a3f4b;
  border-radius: 6px;
  padding: 8px 10px;
  min-width: 150px;
  max-width: 250px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  white-space: nowrap;
}

.person-tooltip .tooltip-name {
  font-weight: 600;
  font-size: 13px;
  color: #e0e0e0;
  margin-bottom: 2px;
}

.person-tooltip .tooltip-role {
  font-size: 11px;
  color: #4a9eff;
  margin-bottom: 4px;
}

.person-tooltip .tooltip-line {
  font-size: 11px;
  color: #a0a0a0;
  line-height: 1.4;
}
</style>
