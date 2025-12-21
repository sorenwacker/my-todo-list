<template>
  <div v-if="category" class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3>Edit Category</h3>
      <input v-model="localCategory.name" placeholder="Category name" />
      <div class="symbol-picker">
        <div
          v-for="symbol in symbols"
          :key="symbol"
          class="symbol-option"
          :class="{ selected: localCategory.symbol === symbol }"
          @click="localCategory.symbol = symbol"
        >
          <component :is="getIconComponent(symbol)" :size="20" />
        </div>
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
  name: 'CategoryModal',
  components: iconMap,
  props: {
    category: {
      type: Object,
      default: null
    }
  },
  emits: ['save', 'cancel', 'delete'],
  data() {
    return {
      localCategory: null,
      symbols: Object.keys(iconMap)
    }
  },
  watch: {
    category: {
      immediate: true,
      handler(val) {
        if (val) {
          this.localCategory = { ...val }
        }
      }
    }
  },
  methods: {
    getIconComponent(name) {
      return iconMap[name] || null
    },
    save() {
      this.$emit('save', this.localCategory)
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
