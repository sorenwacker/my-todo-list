<template>
  <div class="stakeholder-register-app" :class="{ 'light-theme': theme === 'light' }">
    <header class="register-header">
      <h1>Stakeholder Register - {{ projectName }}</h1>
      <div class="view-toggle">
        <button @click="currentView = 'table'" :class="{ active: currentView === 'table' }">Table</button>
        <button @click="currentView = 'matrix'" :class="{ active: currentView === 'matrix' }">Matrix</button>
      </div>
    </header>

    <main class="register-main">
      <!-- Table View -->
      <div v-if="currentView === 'table'" class="table-view">
        <table class="stakeholder-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Company</th>
              <th>Type</th>
              <th>Influence</th>
              <th>Interest</th>
              <th>Engagement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stakeholder in stakeholders" :key="stakeholder.id">
              <td>
                <div class="name-cell">
                  <span class="color-dot" :style="{ background: stakeholder.color }"></span>
                  {{ stakeholder.name }}
                </div>
              </td>
              <td>{{ stakeholder.role || '-' }}</td>
              <td>{{ stakeholder.company || '-' }}</td>
              <td>{{ stakeholder.stakeholder_type }}</td>
              <td>
                <div class="level-indicator">
                  <span v-for="n in 5" :key="n" class="level-dot"
                        :class="{ filled: n <= stakeholder.influence_level }"></span>
                </div>
              </td>
              <td>
                <div class="level-indicator">
                  <span v-for="n in 5" :key="n" class="level-dot"
                        :class="{ filled: n <= stakeholder.interest_level }"></span>
                </div>
              </td>
              <td>{{ stakeholder.engagement_strategy }}</td>
              <td>
                <button @click="editStakeholder(stakeholder)" class="edit-btn">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!stakeholders.length" class="no-stakeholders">No stakeholders assigned to this project</p>
      </div>

      <!-- Matrix View -->
      <div v-if="currentView === 'matrix'" class="matrix-view">
        <div class="matrix-container">
          <div class="matrix-axis-label matrix-axis-top">High Interest</div>
          <div class="matrix-axis-label matrix-axis-right">High Influence</div>
          <div class="matrix-axis-label matrix-axis-bottom">Low Interest</div>
          <div class="matrix-axis-label matrix-axis-left">Low Influence</div>

          <div class="matrix-grid">
            <!-- Quadrant Labels -->
            <div class="quadrant-label q-monitor">Monitor</div>
            <div class="quadrant-label q-manage">Manage Closely</div>
            <div class="quadrant-label q-inform">Keep Informed</div>
            <div class="quadrant-label q-satisfy">Keep Satisfied</div>

            <!-- Stakeholder Dots -->
            <div
              v-for="stakeholder in stakeholders"
              :key="stakeholder.id"
              class="stakeholder-dot"
              :style="{
                left: (stakeholder.influence_level / 5 * 100) + '%',
                bottom: (stakeholder.interest_level / 5 * 100) + '%',
                background: stakeholder.color
              }"
              :title="`${stakeholder.name}\nInfluence: ${stakeholder.influence_level}/5\nInterest: ${stakeholder.interest_level}/5`"
            >
              <span class="stakeholder-initials">{{ getInitials(stakeholder.name) }}</span>
            </div>
          </div>
        </div>

        <div class="matrix-legend">
          <h3>Stakeholders</h3>
          <div v-for="stakeholder in stakeholders" :key="stakeholder.id" class="legend-item">
            <span class="color-dot" :style="{ background: stakeholder.color }"></span>
            <span>{{ stakeholder.name }}</span>
            <span class="legend-type">({{ stakeholder.stakeholder_type }})</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Stakeholder Modal -->
    <div v-if="editingStakeholder" class="stakeholder-modal" @click.self="cancelEdit">
      <div class="modal-content" @click.stop>
        <h3>Edit Stakeholder Analysis - {{ editingStakeholder.name }}</h3>

        <div class="form-grid">
          <div class="form-field">
            <label>Stakeholder Type</label>
            <select v-model="editingStakeholder.stakeholder_type">
              <option>Internal</option>
              <option>External</option>
              <option>Partner</option>
              <option>Customer</option>
              <option>Supplier</option>
              <option>Regulator</option>
            </select>
          </div>

          <div class="form-field">
            <label>Influence Level (1-5)</label>
            <div class="level-slider">
              <input type="range" v-model.number="editingStakeholder.influence_level" min="1" max="5" />
              <span class="level-value">{{ editingStakeholder.influence_level }}</span>
            </div>
          </div>

          <div class="form-field">
            <label>Interest Level (1-5)</label>
            <div class="level-slider">
              <input type="range" v-model.number="editingStakeholder.interest_level" min="1" max="5" />
              <span class="level-value">{{ editingStakeholder.interest_level }}</span>
            </div>
          </div>

          <div class="form-field full-width">
            <label>Engagement Strategy</label>
            <select v-model="editingStakeholder.engagement_strategy">
              <option>Keep Informed</option>
              <option>Monitor</option>
              <option>Keep Satisfied</option>
              <option>Manage Closely</option>
            </select>
          </div>

          <div class="form-field full-width">
            <label>Notes (Project-Specific)</label>
            <textarea v-model="editingStakeholder.stakeholder_notes" rows="4"
                      placeholder="Stakeholder-specific notes for this project..."></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="cancelEdit">Cancel</button>
          <button class="primary" @click="saveStakeholder">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StakeholderRegisterApp',
  data() {
    return {
      projectId: null,
      projectName: '',
      stakeholders: [],
      currentView: 'table',
      editingStakeholder: null,
      theme: localStorage.getItem('todo-theme') || 'dark'
    }
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search)
    this.projectId = parseInt(params.get('projectId'))

    if (this.projectId) {
      await this.loadProject()
      await this.loadStakeholders()
    }

    // Listen for theme changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'todo-theme') {
        this.theme = e.newValue || 'dark'
      }
    })

    window.addEventListener('focus', () => {
      const currentTheme = localStorage.getItem('todo-theme') || 'dark'
      if (this.theme !== currentTheme) {
        this.theme = currentTheme
      }
    })
  },
  methods: {
    async loadProject() {
      const project = await window.api.getProject(this.projectId)
      this.projectName = project ? project.name : 'Unknown Project'
    },
    async loadStakeholders() {
      this.stakeholders = await window.api.getProjectPersons(this.projectId)
    },
    editStakeholder(stakeholder) {
      this.editingStakeholder = { ...stakeholder }
    },
    async saveStakeholder() {
      const stakeholderData = {
        influence_level: this.editingStakeholder.influence_level,
        interest_level: this.editingStakeholder.interest_level,
        stakeholder_type: this.editingStakeholder.stakeholder_type,
        engagement_strategy: this.editingStakeholder.engagement_strategy,
        notes: this.editingStakeholder.stakeholder_notes || ''
      }

      await window.api.updateProjectPersonStakeholder(
        this.projectId,
        this.editingStakeholder.id,
        stakeholderData
      )

      await this.loadStakeholders()
      this.editingStakeholder = null
    },
    cancelEdit() {
      this.editingStakeholder = null
    },
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }
  }
}
</script>

<style scoped>
.stakeholder-register-app {
  min-height: 100vh;
  background: #1a1a1a;
  color: #e0e0e0;
  padding: 20px;
}

.stakeholder-register-app.light-theme {
  background: #f5f5f5;
  color: #333;
}

.register-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.register-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.view-toggle button {
  padding: 8px 16px;
  background: #2a2a2a;
  color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.light-theme .view-toggle button {
  background: white;
  color: #333;
  border: 1px solid #ddd;
}

.view-toggle button.active {
  background: #3498db;
  color: white;
}

.register-main {
  max-width: 1400px;
  margin: 0 auto;
}

/* Table View */
.stakeholder-table {
  width: 100%;
  border-collapse: collapse;
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.light-theme .stakeholder-table {
  background: white;
  border: 1px solid #e0e0e0;
}

.stakeholder-table th {
  background: #333;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.light-theme .stakeholder-table th {
  background: #f0f0f0;
  color: #333;
}

.stakeholder-table td {
  padding: 12px;
  border-top: 1px solid #333;
}

.light-theme .stakeholder-table td {
  border-top-color: #e0e0e0;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
}

.level-indicator {
  display: flex;
  gap: 4px;
}

.level-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #444;
  border: 1px solid #666;
}

.light-theme .level-dot {
  background: #ddd;
  border-color: #ccc;
}

.level-dot.filled {
  background: #3498db;
  border-color: #3498db;
}

.edit-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.edit-btn:hover {
  background: #2980b9;
}

.no-stakeholders {
  text-align: center;
  padding: 40px;
  color: #888;
}

/* Matrix View */
.matrix-view {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 30px;
}

.matrix-container {
  position: relative;
  background: #2a2a2a;
  border-radius: 8px;
  padding: 40px;
  min-height: 600px;
}

.light-theme .matrix-container {
  background: white;
  border: 1px solid #e0e0e0;
}

.matrix-axis-label {
  position: absolute;
  font-weight: 600;
  font-size: 14px;
  color: #888;
}

.matrix-axis-top { top: 10px; left: 50%; transform: translateX(-50%); }
.matrix-axis-bottom { bottom: 10px; left: 50%; transform: translateX(-50%); }
.matrix-axis-left { left: 10px; top: 50%; transform: translateY(-50%) rotate(-90deg); }
.matrix-axis-right { right: 10px; top: 50%; transform: translateY(-50%) rotate(90deg); }

.matrix-grid {
  position: relative;
  width: 100%;
  height: 520px;
  border: 2px solid #444;
  background: linear-gradient(to right, #1a1a1a 50%, #222 50%),
              linear-gradient(to bottom, #222 50%, #1a1a1a 50%);
}

.light-theme .matrix-grid {
  border-color: #ccc;
  background: linear-gradient(to right, #f9f9f9 50%, #f0f0f0 50%),
              linear-gradient(to bottom, #f0f0f0 50%, #f9f9f9 50%);
}

.quadrant-label {
  position: absolute;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.q-inform { top: 10px; left: 10px; }
.q-monitor { top: 10px; right: 10px; }
.q-satisfy { bottom: 10px; left: 10px; }
.q-manage { bottom: 10px; right: 10px; }

.stakeholder-dot {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid white;
  transition: transform 0.2s;
}

.stakeholder-dot:hover {
  transform: translate(-50%, 50%) scale(1.2);
  z-index: 10;
}

.stakeholder-initials {
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
}

.matrix-legend {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
}

.light-theme .matrix-legend {
  background: white;
  border: 1px solid #e0e0e0;
}

.matrix-legend h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
}

.legend-type {
  color: #888;
  font-size: 12px;
}

/* Modal */
.stakeholder-modal {
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
  background: #2a2a2a;
  padding: 24px;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.light-theme .modal-content {
  background: white;
  border: 1px solid #e0e0e0;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 20px 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.form-field label {
  font-size: 13px;
  font-weight: 500;
  color: #aaa;
}

.light-theme .form-field label {
  color: #666;
}

.form-field select,
.form-field input,
.form-field textarea {
  background: #1a1a1a;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.light-theme .form-field select,
.light-theme .form-field input,
.light-theme .form-field textarea {
  background: #f5f5f5;
  border-color: #ddd;
  color: #333;
}

.level-slider {
  display: flex;
  align-items: center;
  gap: 10px;
}

.level-slider input[type="range"] {
  flex: 1;
}

.level-value {
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #444;
  color: white;
  font-size: 14px;
}

.modal-actions button.primary {
  background: #2ecc71;
}

.modal-actions button.primary:hover {
  background: #27ae60;
}
</style>
