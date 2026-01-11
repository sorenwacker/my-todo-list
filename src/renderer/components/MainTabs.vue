<template>
  <div class="main-tabs" :class="{ 'light-theme': theme === 'light' }">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      :class="{ active: activeTab === tab.id }"
      @click="$emit('change', tab.id)"
    >
      {{ tab.label }}
      <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'MainTabs',
  props: {
    activeTab: {
      type: String,
      required: true
    },
    notesCount: {
      type: Number,
      default: 0
    },
    todosCount: {
      type: Number,
      default: 0
    },
    milestonesCount: {
      type: Number,
      default: 0
    },
    stakeholdersCount: {
      type: Number,
      default: 0
    },
    theme: {
      type: String,
      default: 'dark'
    },
    isProjectSelected: {
      type: Boolean,
      default: false
    }
  },
  emits: ['change'],
  computed: {
    tabs() {
      return [
        { id: 'todos', label: 'Todos', count: this.todosCount + this.milestonesCount },
        { id: 'notes', label: 'Notes', count: this.notesCount },
        { id: 'stakeholders', label: this.isProjectSelected ? 'Stakeholders' : 'People', count: this.stakeholdersCount }
      ]
    }
  }
}
</script>

<style scoped>
.main-tabs {
  display: flex;
  gap: 4px;
  margin: 0 16px;
}

.main-tabs button {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid transparent;
  color: #888;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.main-tabs button:hover {
  color: #ccc;
  background: rgba(255, 255, 255, 0.05);
}

.main-tabs button.active {
  color: #fff;
  background: rgba(15, 76, 117, 0.2);
  border-color: rgba(15, 76, 117, 0.4);
}

.tab-count {
  margin-left: 6px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 11px;
  color: #aaa;
}

.main-tabs button.active .tab-count {
  background: rgba(15, 76, 117, 0.3);
  color: #6db3f2;
}

/* Light theme */
.main-tabs.light-theme button {
  color: #666;
}

.main-tabs.light-theme button:hover {
  color: #333;
  background: rgba(0, 0, 0, 0.05);
}

.main-tabs.light-theme button.active {
  color: #0f4c75;
  background: rgba(15, 76, 117, 0.1);
  border-color: rgba(15, 76, 117, 0.3);
}

.main-tabs.light-theme .tab-count {
  background: rgba(0, 0, 0, 0.08);
  color: #666;
}

.main-tabs.light-theme button.active .tab-count {
  background: rgba(15, 76, 117, 0.15);
  color: #0f4c75;
}
</style>
