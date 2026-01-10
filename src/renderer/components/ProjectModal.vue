<template>
  <EntityModal
    :entity="project"
    entity-type="project"
    title="Edit Project"
    :show-color-picker="true"
    :colors="colors"
    @save="$emit('save', $event)"
    @cancel="$emit('cancel')"
    @delete="$emit('delete')"
  >
    <template #extra-content>
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

      <div v-if="project && project.id" class="stakeholder-register-link">
        <button class="register-btn" @click.stop="$emit('open-register')">
          View Stakeholder Register
        </button>
      </div>
    </template>
  </EntityModal>
</template>

<script>
import EntityModal from './EntityModal.vue'
import { projectColors } from '../utils/helpers.js'

export default {
  name: 'ProjectModal',
  components: {
    EntityModal
  },
  props: {
    project: {
      type: Object,
      default: null
    },
    colors: {
      type: Array,
      default: () => projectColors
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
      showPersonPicker: false
    }
  }
}
</script>

<style scoped>
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
</style>
