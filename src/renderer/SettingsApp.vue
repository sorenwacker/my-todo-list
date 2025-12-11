<template>
  <div class="settings-app" :class="{ 'light-theme': theme === 'light' }">
    <header class="settings-header">
      <h1>Settings - Persons & Contacts</h1>
    </header>

    <main class="settings-main">
      <div class="persons-section">
        <div class="section-header">
          <h2>Persons</h2>
          <button @click="showAddPerson" class="add-btn">+ Add Person</button>
        </div>

        <div class="persons-list">
          <draggable
            v-model="persons"
            item-key="id"
            @end="onPersonDragEnd"
            ghost-class="ghost"
          >
            <template #item="{ element: person }">
              <div class="person-card" @click="editPerson(person)">
                <div class="person-color" :style="{ background: person.color }"></div>
                <div class="person-info">
                  <div class="person-name">{{ person.name }}</div>
                  <div class="person-meta">
                    <span v-if="person.email">{{ person.email }}</span>
                    <span v-if="person.company">{{ person.company }}</span>
                    <span v-if="person.role">{{ person.role }}</span>
                  </div>
                </div>
                <button class="edit-btn" @click.stop="editPerson(person)">Edit</button>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </main>

    <!-- Edit Person Modal -->
    <div v-if="editingPerson" class="person-modal" @click.self="cancelEdit">
      <div class="modal-content" @click.stop>
        <h3>{{ editingPerson.id ? 'Edit Person' : 'Add Person' }}</h3>

        <div class="form-grid">
          <div class="form-field">
            <label>Name *</label>
            <input v-model="editingPerson.name" placeholder="Full name" />
          </div>

          <div class="form-field">
            <label>Email</label>
            <input v-model="editingPerson.email" type="email" placeholder="email@example.com" />
          </div>

          <div class="form-field">
            <label>Phone</label>
            <input v-model="editingPerson.phone" type="tel" placeholder="+1 234 567 8900" />
          </div>

          <div class="form-field">
            <label>Company</label>
            <input v-model="editingPerson.company" placeholder="Company name" />
          </div>

          <div class="form-field">
            <label>Role/Title</label>
            <input v-model="editingPerson.role" placeholder="Job title" />
          </div>

          <div class="form-field full-width">
            <label>Notes</label>
            <textarea v-model="editingPerson.notes" placeholder="Additional notes..." rows="3"></textarea>
          </div>
        </div>

        <div class="color-picker">
          <label>Color</label>
          <div class="color-grid">
            <div
              v-for="color in personColors"
              :key="color"
              class="color-option"
              :class="{ selected: editingPerson.color === color }"
              :style="{ background: color }"
              @click="editingPerson.color = color"
            ></div>
          </div>
        </div>

        <div class="modal-actions">
          <button v-if="editingPerson.id" class="delete-btn" @click="deletePerson">Delete</button>
          <button @click="cancelEdit">Cancel</button>
          <button class="primary" @click="savePerson" :disabled="!editingPerson.name.trim()">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable'

export default {
  name: 'SettingsApp',
  components: { draggable },
  data() {
    return {
      persons: [],
      editingPerson: null,
      theme: localStorage.getItem('todo-theme') || 'dark',
      personColors: [
        '#0f4c75', '#e74c3c', '#2ecc71', '#f39c12',
        '#9b59b6', '#1abc9c', '#e91e63', '#00bcd4',
        '#34495e', '#16a085', '#d35400', '#8e44ad'
      ]
    }
  },
  async mounted() {
    await this.loadPersons()

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
    async loadPersons() {
      try {
        console.log('Loading persons...')
        this.persons = await window.api.getPersons()
        console.log('Loaded persons:', this.persons)
      } catch (error) {
        console.error('Error loading persons:', error)
      }
    },

    showAddPerson() {
      this.editingPerson = {
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        notes: '',
        color: this.personColors[0]
      }
    },

    editPerson(person) {
      this.editingPerson = { ...person }
    },

    async savePerson() {
      if (!this.editingPerson.name.trim()) return

      try {
        // Create a plain object with only the data we need
        const personData = {
          name: this.editingPerson.name,
          email: this.editingPerson.email || '',
          phone: this.editingPerson.phone || '',
          company: this.editingPerson.company || '',
          role: this.editingPerson.role || '',
          notes: this.editingPerson.notes || '',
          color: this.editingPerson.color || '#0f4c75'
        }

        if (this.editingPerson.id) {
          personData.id = this.editingPerson.id
          const result = await window.api.updatePerson(personData)
          console.log('Update result:', result)
        } else {
          const result = await window.api.createPerson(personData)
          console.log('Create result:', result)
        }

        await this.loadPersons()
        this.editingPerson = null
      } catch (error) {
        console.error('Error saving person:', error)
        alert('Failed to save person: ' + error.message)
      }
    },

    async deletePerson() {
      if (!confirm(`Delete ${this.editingPerson.name}? This will remove all assignments to todos and projects.`)) {
        return
      }

      await window.api.deletePerson(this.editingPerson.id)
      await this.loadPersons()
      this.editingPerson = null
    },

    cancelEdit() {
      this.editingPerson = null
    },

    async onPersonDragEnd() {
      const ids = this.persons.map(p => p.id)
      await window.api.reorderPersons(ids)
    }
  }
}
</script>

<style scoped>
.settings-app {
  min-height: 100vh;
  background: #1a1a1a;
  color: #e0e0e0;
  padding: 20px;
}

.settings-app.light-theme {
  background: #f5f5f5;
  color: #333;
}

.settings-header {
  margin-bottom: 30px;
}

.settings-header h1 {
  font-size: 24px;
  font-weight: 600;
}

.persons-section {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 500;
}

.add-btn {
  background: #2ecc71;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #27ae60;
}

.persons-list {
  display: grid;
  gap: 12px;
}

.person-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #2a2a2a;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.light-theme .person-card {
  background: white;
  border: 1px solid #e0e0e0;
}

.person-card:hover {
  background: #333;
}

.light-theme .person-card:hover {
  background: #f0f0f0;
}

.person-color {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.person-info {
  flex: 1;
}

.person-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.person-meta {
  font-size: 13px;
  color: #888;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.edit-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.edit-btn:hover {
  background: #2980b9;
}

.person-modal {
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
  font-size: 20px;
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

.light-theme .form-field input,
.light-theme .form-field textarea {
  background: #f5f5f5;
  border-color: #ddd;
  color: #333;
}

.form-field input:focus,
.form-field textarea:focus {
  outline: none;
  border-color: #3498db;
}

.color-picker {
  margin: 20px 0;
}

.color-picker label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #aaa;
}

.light-theme .color-picker label {
  color: #666;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 40px);
  gap: 8px;
}

.color-option {
  width: 40px;
  height: 40px;
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
  transform: scale(1.1);
}

.light-theme .color-option.selected {
  border-color: #333;
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
  transition: background 0.2s;
}

.light-theme .modal-actions button {
  background: #e0e0e0;
  color: #333;
}

.modal-actions button:hover {
  background: #555;
}

.light-theme .modal-actions button:hover {
  background: #d0d0d0;
}

.modal-actions button.primary {
  background: #2ecc71;
  color: white;
}

.modal-actions button.primary:hover {
  background: #27ae60;
}

.light-theme .modal-actions button.primary {
  background: #2ecc71;
  color: white;
}

.light-theme .modal-actions button.primary:hover {
  background: #27ae60;
}

.modal-actions button.delete-btn {
  background: #e74c3c;
  margin-right: auto;
  color: white;
}

.modal-actions button.delete-btn:hover {
  background: #c0392b;
}

.light-theme .modal-actions button.delete-btn {
  background: #e74c3c;
  color: white;
}

.light-theme .modal-actions button.delete-btn:hover {
  background: #c0392b;
}

.modal-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-actions button:disabled:hover {
  background: #444;
}

.light-theme .modal-actions button:disabled:hover {
  background: #e0e0e0;
}

.ghost {
  opacity: 0.4;
}
</style>
