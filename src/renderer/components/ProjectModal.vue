<template>
  <div v-if="project" class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3>Edit Project</h3>
      <input v-model="localProject.name" placeholder="Project name" />
      <div class="color-picker">
        <div
          v-for="color in colors"
          :key="color"
          class="color-option"
          :class="{ selected: localProject.color === color }"
          :style="{ background: color }"
          @click="localProject.color = color"
        ></div>
      </div>

      <div class="stakeholders-section">
        <div class="section-header">
          <label>Stakeholders</label>
          <button class="picker-toggle-btn" @click.stop="showPersonPicker = !showPersonPicker">
            {{ showPersonPicker ? 'Hide' : '+ Assign' }}
          </button>
        </div>

        <div v-if="showPersonPicker" class="stakeholder-picker">
          <div
            v-for="person in availablePersons"
            :key="person.id"
            class="person-option"
            @click.stop="$emit('assign-person', person)"
          >
            <span class="person-color-dot" :style="{ background: person.color }"></span>
            <span class="person-name">{{ person.name }}</span>
          </div>
        </div>

        <div class="assigned-stakeholders">
          <div
            v-for="person in assignedPersons"
            :key="person.id"
            class="stakeholder-badge"
            :style="{ background: person.color + '33', borderColor: person.color }"
          >
            {{ person.name }}
            <button class="stakeholder-remove" @click.stop="$emit('unassign-person', person)">x</button>
          </div>
          <p v-if="!assignedPersons.length" class="no-stakeholders">No stakeholders assigned</p>
        </div>
      </div>

      <div v-if="project.id" class="stakeholder-register-link">
        <button class="register-btn" @click.stop="$emit('open-register')">
          View Stakeholder Register
        </button>
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
  name: 'ProjectModal',
  props: {
    project: {
      type: Object,
      default: null
    },
    colors: {
      type: Array,
      default: () => [
        '#0f4c75', '#1a73e8', '#4285f4', '#0d47a1', '#039be5',
        '#00acc1', '#00897b', '#43a047', '#7cb342', '#c0ca33',
        '#fdd835', '#ffb300', '#fb8c00', '#f4511e', '#e53935',
        '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5'
      ]
    },
    availablePersons: {
      type: Array,
      default: () => []
    },
    assignedPersons: {
      type: Array,
      default: () => []
    }
  },
  emits: ['save', 'cancel', 'delete', 'assign-person', 'unassign-person', 'open-register'],
  data() {
    return {
      localProject: null,
      showPersonPicker: false
    }
  },
  watch: {
    project: {
      immediate: true,
      handler(val) {
        if (val) {
          this.localProject = { ...val }
        }
      }
    }
  },
  methods: {
    save() {
      this.$emit('save', this.localProject)
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
  min-width: 350px;
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

.stakeholders-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-primary, #1a1f2e);
  border-radius: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header label {
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
}

.picker-toggle-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: var(--accent-color, #0f4c75);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.stakeholder-picker {
  max-height: 150px;
  overflow-y: auto;
  margin-bottom: 8px;
}

.person-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.person-option:hover {
  background: var(--bg-hover, #2a2f3d);
}

.person-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.assigned-stakeholders {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stakeholder-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid;
}

.stakeholder-remove {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0 2px;
  font-size: 14px;
}

.no-stakeholders {
  color: var(--text-secondary, #a0a0a0);
  font-size: 12px;
  margin: 0;
}

.stakeholder-register-link {
  margin-bottom: 16px;
}

.register-btn {
  width: 100%;
  padding: 8px;
  background: var(--bg-primary, #1a1f2e);
  border: 1px solid var(--border-color, #3a3f4b);
  color: var(--text-primary, #e0e0e0);
  border-radius: 6px;
  cursor: pointer;
}

.register-btn:hover {
  background: var(--bg-hover, #2a2f3d);
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
