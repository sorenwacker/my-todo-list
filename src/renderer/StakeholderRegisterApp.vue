<template>
  <div class="stakeholder-register-app" :class="{ 'light-theme': theme === 'light' }">
    <header class="register-header">
      <h1>Stakeholder Register - {{ projectName }}</h1>
      <div class="header-actions">
        <button class="add-stakeholder-btn" @click="showAddStakeholder = !showAddStakeholder">
          + Add Stakeholder
        </button>
        <div class="view-toggle">
          <button :class="{ active: currentView === 'table' }" @click="currentView = 'table'">Table</button>
          <button :class="{ active: currentView === 'matrix' }" @click="currentView = 'matrix'">Matrix</button>
        </div>
      </div>
    </header>

    <!-- Add Stakeholder Picker -->
    <div v-if="showAddStakeholder" class="stakeholder-picker">
      <div class="picker-header">
        <h3>Select Person to Add as Stakeholder</h3>
        <button class="create-person-btn" @click="showCreatePerson = true">+ Create New Person</button>
      </div>
      <div class="person-list">
        <div
v-for="person in availablePersons" :key="person.id"
             class="person-option"
             @click="addStakeholder(person)">
          <span class="color-dot" :style="{ background: person.color }"></span>
          <span class="person-name">{{ person.name }}</span>
          <span class="person-info">{{ person.role || person.company }}</span>
        </div>
        <p v-if="!availablePersons.length" class="no-persons">
          All persons are already stakeholders. Create a new person to add more.
        </p>
      </div>
    </div>

    <main class="register-main">
      <!-- Table View -->
      <div v-if="currentView === 'table'" class="table-view">
        <table class="stakeholder-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Institution/Company</th>
              <th>Type</th>
              <th>Influence</th>
              <th>Interest</th>
              <th>Engagement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
v-for="stakeholder in stakeholders" :key="stakeholder.id"
                class="clickable-row" @click="editStakeholder(stakeholder)">
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
                  <span
v-for="n in 5" :key="n" class="level-dot"
                        :class="{ filled: n <= stakeholder.influence_level }"></span>
                </div>
              </td>
              <td>
                <div class="level-indicator">
                  <span
v-for="n in 5" :key="n" class="level-dot"
                        :class="{ filled: n <= stakeholder.interest_level }"></span>
                </div>
              </td>
              <td>{{ stakeholder.engagement_strategy }}</td>
              <td @click.stop>
                <button class="remove-btn" @click="removeStakeholder(stakeholder)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!stakeholders.length" class="no-stakeholders">No stakeholders assigned to this project</p>
      </div>

      <!-- Matrix View -->
      <div v-if="currentView === 'matrix'" class="matrix-view">
        <div class="matrix-diagram">
          <!-- Y-Axis Label -->
          <div class="axis-title y-axis-title">Interest Level</div>

          <!-- Y-Axis Scale -->
          <div class="y-axis-scale">
            <span>5</span>
            <span>4</span>
            <span>3</span>
            <span>2</span>
            <span>1</span>
          </div>

          <div class="matrix-plot-area">
            <!-- Grid Lines -->
            <svg class="matrix-grid-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <!-- Horizontal grid lines -->
              <line x1="0" y1="20" x2="100" y2="20" class="grid-line" />
              <line x1="0" y1="40" x2="100" y2="40" class="grid-line" />
              <line x1="0" y1="60" x2="100" y2="60" class="grid-line grid-line-major" />
              <line x1="0" y1="80" x2="100" y2="80" class="grid-line" />
              <!-- Vertical grid lines -->
              <line x1="20" y1="0" x2="20" y2="100" class="grid-line" />
              <line x1="40" y1="0" x2="40" y2="100" class="grid-line" />
              <line x1="60" y1="0" x2="60" y2="100" class="grid-line grid-line-major" />
              <line x1="80" y1="0" x2="80" y2="100" class="grid-line" />
              <!-- Axis lines with arrows -->
              <line x1="0" y1="100" x2="100" y2="100" class="axis-line" />
              <line x1="0" y1="0" x2="0" y2="100" class="axis-line" />
              <!-- X-axis arrow -->
              <polygon points="100,100 96,98 96,102" class="axis-arrow" />
              <!-- Y-axis arrow -->
              <polygon points="0,0 -2,4 2,4" class="axis-arrow" />
            </svg>

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
                left: ((stakeholder.influence_level - 0.5) / 5 * 100) + '%',
                bottom: ((stakeholder.interest_level - 0.5) / 5 * 100) + '%',
                background: stakeholder.color
              }"
              :title="`${stakeholder.name}\nInfluence: ${stakeholder.influence_level}/5\nInterest: ${stakeholder.interest_level}/5`"
            >
              <span class="stakeholder-initials">{{ getInitials(stakeholder.name) }}</span>
            </div>
          </div>

          <!-- X-Axis Scale -->
          <div class="x-axis-scale">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>

          <!-- X-Axis Label -->
          <div class="axis-title x-axis-title">Influence Level</div>
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

    <!-- Create Person Modal -->
    <div v-if="showCreatePerson" class="stakeholder-modal" @click.self="showCreatePerson = false">
      <div class="modal-content" @click.stop>
        <h3>Create New Person</h3>
        <div class="form-grid">
          <div class="form-field">
            <label>Name *</label>
            <input v-model="newPerson.name" type="text" required placeholder="Enter name" />
          </div>

          <div class="form-field">
            <label>Email</label>
            <input v-model="newPerson.email" type="email" placeholder="email@example.com" />
          </div>

          <div class="form-field">
            <label>Phone</label>
            <input v-model="newPerson.phone" type="tel" placeholder="+1234567890" />
          </div>

          <div class="form-field">
            <label>Institution/Company</label>
            <input v-model="newPerson.company" type="text" placeholder="Institution or company name" />
          </div>

          <div class="form-field full-width">
            <label>Role</label>
            <input v-model="newPerson.role" type="text" placeholder="Job title or role" />
          </div>

          <div class="form-field full-width">
            <label>GitHub Username</label>
            <input v-model="newPerson.github_name" type="text" placeholder="@username" />
          </div>

          <div class="form-field full-width">
            <label>Color</label>
            <div class="color-picker">
              <div
v-for="color in personColors" :key="color"
                   class="color-option"
                   :class="{ selected: newPerson.color === color }"
                   :style="{ background: color }"
                   @click="newPerson.color = color">
              </div>
            </div>
          </div>

          <div class="form-field full-width">
            <label>Notes</label>
            <textarea
v-model="newPerson.notes" rows="3"
                      placeholder="General notes about this person..."></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="cancelCreatePerson">Cancel</button>
          <button class="primary" :disabled="!newPerson.name" @click="createPerson">Create Person</button>
        </div>
      </div>
    </div>

    <!-- Edit Stakeholder Modal -->
    <div v-if="editingStakeholder" class="stakeholder-modal" @click.self="cancelEdit">
      <div class="modal-content large" @click.stop>
        <h3>{{ editingStakeholder.name }}</h3>

        <!-- Person Information Section -->
        <div class="section">
          <h4>Person Information</h4>
          <div class="form-grid">
            <div class="form-field">
              <label>Name *</label>
              <input v-model="editingStakeholder.name" type="text" required />
            </div>

            <div class="form-field">
              <label>Email</label>
              <input v-model="editingStakeholder.email" type="email" />
            </div>

            <div class="form-field">
              <label>Phone</label>
              <input v-model="editingStakeholder.phone" type="tel" />
            </div>

            <div class="form-field">
              <label>Institution/Company</label>
              <input v-model="editingStakeholder.company" type="text" />
            </div>

            <div class="form-field full-width">
              <label>Role</label>
              <input v-model="editingStakeholder.role" type="text" />
            </div>

            <div class="form-field full-width">
              <label>GitHub Username</label>
              <input v-model="editingStakeholder.github_name" type="text" placeholder="@username" />
            </div>

            <div class="form-field full-width">
              <label>Color</label>
              <div class="color-picker">
                <div
v-for="color in personColors" :key="color"
                     class="color-option"
                     :class="{ selected: editingStakeholder.color === color }"
                     :style="{ background: color }"
                     @click="editingStakeholder.color = color">
                </div>
              </div>
            </div>

            <div class="form-field full-width">
              <label>General Notes</label>
              <textarea
v-model="editingStakeholder.notes" rows="3"
                        placeholder="General notes about this person..."></textarea>
            </div>
          </div>
        </div>

        <!-- Stakeholder Analysis Section -->
        <div class="section">
          <h4>Stakeholder Analysis (Project-Specific)</h4>
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
                <input v-model.number="editingStakeholder.influence_level" type="range" min="1" max="5" />
                <span class="level-value">{{ editingStakeholder.influence_level }}</span>
              </div>
            </div>

            <div class="form-field">
              <label>Interest Level (1-5)</label>
              <div class="level-slider">
                <input v-model.number="editingStakeholder.interest_level" type="range" min="1" max="5" />
                <span class="level-value">{{ editingStakeholder.interest_level }}</span>
              </div>
            </div>

            <div class="form-field">
              <label>Engagement Strategy</label>
              <select v-model="editingStakeholder.engagement_strategy">
                <option>Keep Informed</option>
                <option>Monitor</option>
                <option>Keep Satisfied</option>
                <option>Manage Closely</option>
              </select>
            </div>

            <div class="form-field full-width">
              <label>Project-Specific Notes</label>
              <textarea
v-model="editingStakeholder.stakeholder_notes" rows="3"
                        placeholder="Notes specific to this person's involvement in this project..."></textarea>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="cancelEdit">Cancel</button>
          <button class="primary" @click="saveStakeholder">Save All Changes</button>
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
      allPersons: [],
      currentView: 'table',
      editingStakeholder: null,
      showAddStakeholder: false,
      showCreatePerson: false,
      newPerson: {
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        github_name: '',
        color: '#3498db',
        notes: ''
      },
      theme: localStorage.getItem('todo-theme') || 'dark',
      personColors: [
        // Blues
        '#1a73e8', '#4285f4', '#0d47a1', '#039be5', '#00acc1', '#0288d1', '#03a9f4', '#29b6f6',
        // Greens
        '#0f9d58', '#34a853', '#00897b', '#43a047', '#7cb342', '#4caf50', '#81c784', '#00bcd4',
        // Reds & Pinks
        '#d93025', '#ea4335', '#c2185b', '#e91e63', '#f06292', '#ef5350', '#ff5252', '#ff1744',
        // Oranges & Yellows
        '#f9a825', '#ff8f00', '#ef6c00', '#ff7043', '#ffb300', '#ffc107', '#ffca28', '#ff9800',
        // Purples
        '#7b1fa2', '#9c27b0', '#673ab7', '#5e35b1', '#7e57c2', '#ab47bc', '#ba68c8', '#9575cd',
        // Teals & Cyans
        '#009688', '#26a69a', '#4db6ac', '#00bfa5', '#1de9b6', '#64ffda',
        // Neutrals
        '#455a64', '#607d8b', '#78909c', '#546e7a', '#37474f', '#263238', '#90a4ae', '#b0bec5'
      ]
    }
  },
  computed: {
    availablePersons() {
      // Filter out persons who are already stakeholders
      return this.allPersons.filter(person =>
        !this.stakeholders.some(s => s.id === person.id)
      )
    }
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search)
    this.projectId = parseInt(params.get('projectId'))

    if (this.projectId) {
      await this.loadProject()
      await this.loadStakeholders()
      await this.loadAllPersons()
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
      console.log('Loaded stakeholders:', this.stakeholders)
    },
    async loadAllPersons() {
      this.allPersons = await window.api.getPersons()
    },
    async addStakeholder(person) {
      await window.api.linkProjectPerson(this.projectId, person.id)
      await this.loadStakeholders()
      this.showAddStakeholder = false
    },
    editStakeholder(stakeholder) {
      console.log('Editing stakeholder:', stakeholder)
      this.editingStakeholder = { ...stakeholder }
      console.log('editingStakeholder set to:', this.editingStakeholder)
    },
    async saveStakeholder() {
      try {
        // Save person information
        const personData = {
          id: this.editingStakeholder.id,
          name: this.editingStakeholder.name,
          email: this.editingStakeholder.email || '',
          phone: this.editingStakeholder.phone || '',
          company: this.editingStakeholder.company || '',
          role: this.editingStakeholder.role || '',
          github_name: this.editingStakeholder.github_name || '',
          notes: this.editingStakeholder.notes || '',
          color: this.editingStakeholder.color
        }

        await window.api.updatePerson(personData)

        // Save stakeholder analysis data
        const stakeholderData = {
          influence_level: this.editingStakeholder.influence_level,
          interest_level: this.editingStakeholder.interest_level,
          stakeholder_type: this.editingStakeholder.stakeholder_type,
          engagement_strategy: this.editingStakeholder.engagement_strategy,
          notes: this.editingStakeholder.stakeholder_notes || ''
        }

        console.log('Saving stakeholder:', this.projectId, this.editingStakeholder.id, stakeholderData)

        await window.api.updateProjectPersonStakeholder(
          this.projectId,
          this.editingStakeholder.id,
          stakeholderData
        )

        await this.loadStakeholders()
        await this.loadAllPersons()
        this.editingStakeholder = null
        console.log('Stakeholder saved successfully')
      } catch (error) {
        console.error('Error saving stakeholder:', error)
        alert('Failed to save stakeholder: ' + error.message)
      }
    },
    async removeStakeholder(stakeholder) {
      if (confirm(`Remove ${stakeholder.name} from stakeholders?`)) {
        await window.api.unlinkProjectPerson(this.projectId, stakeholder.id)
        await this.loadStakeholders()
      }
    },
    async createPerson() {
      if (!this.newPerson.name) {
        alert('Please enter a name')
        return
      }

      try {
        // Create plain object to avoid cloning issues
        const personData = {
          name: this.newPerson.name,
          email: this.newPerson.email || '',
          phone: this.newPerson.phone || '',
          company: this.newPerson.company || '',
          role: this.newPerson.role || '',
          github_name: this.newPerson.github_name || '',
          notes: this.newPerson.notes || '',
          color: this.newPerson.color || '#3498db'
        }
        const person = await window.api.createPerson(personData)
        await this.loadAllPersons()

        // Add the newly created person as a stakeholder
        await this.addStakeholder(person)

        // Reset form
        this.newPerson = {
          name: '',
          email: '',
          phone: '',
          company: '',
          role: '',
          github_name: '',
          color: '#3498db',
          notes: ''
        }
        this.showCreatePerson = false
      } catch (error) {
        console.error('Error creating person:', error)
        alert('Failed to create person: ' + error.message)
      }
    },
    cancelCreatePerson() {
      this.newPerson = {
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        github_name: '',
        color: '#3498db',
        notes: ''
      }
      this.showCreatePerson = false
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

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.add-stakeholder-btn {
  background: #2ecc71;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.add-stakeholder-btn:hover {
  background: #27ae60;
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

/* Stakeholder Picker */
.stakeholder-picker {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.light-theme .stakeholder-picker {
  background: white;
  border: 1px solid #e0e0e0;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.picker-header h3 {
  margin: 0;
}

.create-person-btn {
  padding: 8px 16px;
  background: #8e44ad;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.create-person-btn:hover {
  background: #9b59b6;
}

.stakeholder-picker h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
}

.person-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.person-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #1a1a1a;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.light-theme .person-option {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
}

.person-option:hover {
  background: #333;
}

.light-theme .person-option:hover {
  background: #f0f0f0;
}

.person-name {
  font-weight: 500;
  flex: 1;
}

.person-info {
  color: #888;
  font-size: 13px;
}

.no-persons {
  text-align: center;
  color: #888;
  padding: 20px;
  font-style: italic;
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

.clickable-row {
  cursor: pointer;
  transition: background 0.2s;
}

.clickable-row:hover {
  background: #333;
}

.light-theme .clickable-row:hover {
  background: #f9f9f9;
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

.remove-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.remove-btn:hover {
  background: #c0392b;
}

.no-stakeholders {
  text-align: center;
  padding: 40px;
  color: #888;
}

/* Matrix View */
.matrix-view {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 30px;
}

.matrix-diagram {
  display: grid;
  grid-template-columns: 20px 30px 1fr;
  grid-template-rows: 1fr 30px 20px;
  gap: 5px;
  background: #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  min-height: 500px;
}

.light-theme .matrix-diagram {
  background: #fafafa;
  border: 1px solid #e0e0e0;
}

.axis-title {
  font-weight: 600;
  font-size: 13px;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
}

.y-axis-title {
  grid-column: 1;
  grid-row: 1;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.x-axis-title {
  grid-column: 3;
  grid-row: 3;
}

.y-axis-scale {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  font-size: 12px;
  color: #666;
}

.x-axis-scale {
  grid-column: 3;
  grid-row: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
  color: #666;
}

.matrix-plot-area {
  grid-column: 3;
  grid-row: 1;
  position: relative;
  background: #252538;
  border-radius: 4px;
  overflow: hidden;
}

.light-theme .matrix-plot-area {
  background: #fff;
  border: 1px solid #ddd;
}

.matrix-grid-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.grid-line {
  stroke: #333;
  stroke-width: 0.5;
  stroke-dasharray: 4 4;
}

.grid-line-major {
  stroke: #444;
  stroke-width: 1;
  stroke-dasharray: none;
}

.light-theme .grid-line {
  stroke: #ddd;
}

.light-theme .grid-line-major {
  stroke: #bbb;
}

.axis-line {
  stroke: #666;
  stroke-width: 1.5;
}

.axis-arrow {
  fill: #666;
}

.light-theme .axis-line {
  stroke: #333;
}

.light-theme .axis-arrow {
  fill: #333;
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

.modal-content.large {
  max-width: 800px;
}

.light-theme .modal-content {
  background: white;
  border: 1px solid #e0e0e0;
}

.section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #444;
}

.light-theme .section {
  border-bottom-color: #e0e0e0;
}

.section:last-of-type {
  border-bottom: none;
}

.section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #3498db;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s, border-color 0.15s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: white;
  transform: scale(1.15);
}

.light-theme .color-option.selected {
  border-color: #333;
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

/* Light theme button styles */
.light-theme .add-stakeholder-btn {
  background: #27ae60;
}

.light-theme .add-stakeholder-btn:hover {
  background: #2ecc71;
}

.light-theme .create-person-btn {
  background: #8e44ad;
}

.light-theme .create-person-btn:hover {
  background: #9b59b6;
}

.light-theme .modal-actions button {
  background: #e0e0e0;
  color: #333;
}

.light-theme .modal-actions button:hover {
  background: #d0d0d0;
}

.light-theme .modal-actions button.primary {
  background: #27ae60;
  color: white;
}

.light-theme .modal-actions button.primary:hover {
  background: #2ecc71;
}

.light-theme .remove-btn {
  background: #e74c3c;
  color: white;
}

.light-theme .remove-btn:hover {
  background: #c0392b;
}
</style>
