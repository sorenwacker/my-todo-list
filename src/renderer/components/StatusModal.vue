<template>
  <div v-if="status" class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3>Edit Status</h3>
      <input v-model="localStatus.name" placeholder="Status name" />
      <div class="color-picker">
        <div
          v-for="color in colors"
          :key="color"
          class="color-option"
          :class="{ selected: localStatus.color === color }"
          :style="{ background: color }"
          @click="localStatus.color = color"
        ></div>
      </div>
      <div class="modal-actions">
        <button class="delete-btn" @click.stop="$emit('delete')">Delete</button>
        <button @click.stop="$emit('cancel')">Cancel</button>
        <button class="primary" @click.stop="save">Save</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatusModal',
  props: {
    status: {
      type: Object,
      default: null
    },
    colors: {
      type: Array,
      default: () => [
        '#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
      ]
    }
  },
  emits: ['save', 'cancel', 'delete'],
  data() {
    return {
      localStatus: null
    }
  },
  watch: {
    status: {
      immediate: true,
      handler(val) {
        if (val) {
          this.localStatus = { ...val }
        }
      }
    }
  },
  methods: {
    save() {
      this.$emit('save', this.localStatus)
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-secondary, #252a3d);
  padding: 24px;
  border-radius: 12px;
  min-width: 300px;
  max-width: 400px;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: var(--text-primary, #e0e0e0);
}

.modal-content input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 6px;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
  font-size: 14px;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: white;
  box-shadow: 0 0 0 2px var(--accent-color, #0f4c75);
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.modal-actions button.primary {
  background: var(--accent-color, #0f4c75);
  color: white;
}

.modal-actions button.delete-btn {
  background: #dc3545;
  color: white;
  margin-right: auto;
}

.modal-actions button:not(.primary):not(.delete-btn) {
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
}
</style>
