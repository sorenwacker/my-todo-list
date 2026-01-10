<template>
  <div v-if="entity" class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3>{{ title }}</h3>

      <input
        ref="nameInput"
        v-model="localEntity.name"
        :placeholder="namePlaceholder"
        @keyup.enter="save"
      />

      <!-- Color picker section -->
      <div v-if="showColorPicker" class="color-picker">
        <div
          v-for="color in colors"
          :key="color"
          class="color-option"
          :class="{ selected: localEntity.color === color }"
          :style="{ background: color }"
          @click="localEntity.color = color"
        ></div>
      </div>

      <!-- Symbol picker section -->
      <div v-if="showSymbolPicker" class="symbol-picker">
        <div
          v-for="symbol in symbols"
          :key="symbol"
          class="symbol-option"
          :class="{ selected: localEntity.symbol === symbol }"
          @click="localEntity.symbol = symbol"
        >
          <component :is="getIconComponent(symbol)" :size="20" />
        </div>
      </div>

      <!-- Slot for additional content (e.g., stakeholders in ProjectModal) -->
      <slot name="extra-content" :entity="localEntity"></slot>

      <div class="modal-actions">
        <button v-if="showDelete" class="delete-btn" @click.stop="$emit('delete')">Delete</button>
        <button @click.stop="$emit('cancel')">Cancel</button>
        <button class="primary" @click.stop="save">Save</button>
      </div>
    </div>
  </div>
</template>

<script>
import { iconMap, getIconComponent, availableIcons, projectColors, statusColors } from '../utils/helpers.js'

export default {
  name: 'EntityModal',
  props: {
    entity: {
      type: Object,
      default: null
    },
    entityType: {
      type: String,
      required: true,
      validator: (val) => ['project', 'status', 'category', 'person'].includes(val)
    },
    title: {
      type: String,
      default: ''
    },
    showColorPicker: {
      type: Boolean,
      default: false
    },
    showSymbolPicker: {
      type: Boolean,
      default: false
    },
    showDelete: {
      type: Boolean,
      default: true
    },
    colors: {
      type: Array,
      default: () => projectColors
    },
    symbols: {
      type: Array,
      default: () => availableIcons
    }
  },
  emits: ['save', 'cancel', 'delete'],
  data() {
    return {
      localEntity: null
    }
  },
  computed: {
    namePlaceholder() {
      const placeholders = {
        project: 'Project name',
        status: 'Status name',
        category: 'Category name',
        person: 'Person name'
      }
      return placeholders[this.entityType] || 'Name'
    }
  },
  watch: {
    entity: {
      immediate: true,
      handler(val) {
        if (val) {
          this.localEntity = { ...val }
        }
      }
    }
  },
  mounted() {
    // Focus the name input when modal opens
    this.$nextTick(() => {
      if (this.$refs.nameInput) {
        this.$refs.nameInput.focus()
      }
    })
  },
  methods: {
    getIconComponent(name) {
      return getIconComponent(name)
    },
    save() {
      if (!this.localEntity.name || !this.localEntity.name.trim()) {
        return
      }
      this.$emit('save', this.localEntity)
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
  background: var(--bg-secondary, #0d0d0d);
  padding: 24px;
  border-radius: 12px;
  min-width: 300px;
  max-width: 450px;
  max-height: 80vh;
  overflow-y: auto;
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

.modal-content input:focus {
  outline: none;
  border-color: var(--accent-color, #0f4c75);
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.color-option {
  width: 28px;
  height: 28px;
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

.symbol-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.symbol-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-secondary, #a0a0a0);
  transition: all 0.2s;
}

.symbol-option:hover {
  background: var(--bg-hover, #2a2f3d);
}

.symbol-option.selected {
  background: var(--accent-color, #0f4c75);
  color: white;
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

.modal-actions button.primary:hover {
  opacity: 0.9;
}

.modal-actions button.delete-btn {
  background: #dc3545;
  color: white;
  margin-right: auto;
}

.modal-actions button.delete-btn:hover {
  background: #c82333;
}

.modal-actions button:not(.primary):not(.delete-btn) {
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
}

.modal-actions button:not(.primary):not(.delete-btn):hover {
  background: var(--bg-hover, #2a2f3d);
}
</style>
