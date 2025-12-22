<template>
  <div class="persons-view" :class="{ 'light-theme': theme === 'light' }">
    <div class="persons-header">
      <h2>Manage Persons</h2>
      <button class="add-btn" @click="showAddPerson">+ Add Person</button>
    </div>

    <div class="table-container">
      <table class="persons-table">
        <thead>
          <tr>
            <th class="col-color"></th>
            <th class="col-name sortable" @click="toggleSort('name')">
              Name
              <span v-if="sortBy === 'name'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="col-email sortable" @click="toggleSort('email')">
              Email
              <span v-if="sortBy === 'email'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="col-company sortable" @click="toggleSort('company')">
              Company
              <span v-if="sortBy === 'company'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="col-role sortable" @click="toggleSort('role')">
              Role
              <span v-if="sortBy === 'role'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="person in paginatedPersons" :key="person.id" @click="editPerson(person)">
            <td class="col-color">
              <div class="color-dot" :style="{ background: person.color }"></div>
            </td>
            <td class="col-name">{{ person.name }}</td>
            <td class="col-email">{{ person.email || '-' }}</td>
            <td class="col-company">{{ person.company || '-' }}</td>
            <td class="col-role">{{ person.role || '-' }}</td>
            <td class="col-actions">
              <button class="edit-btn" @click.stop="editPerson(person)">Edit</button>
            </td>
          </tr>
          <tr v-if="sortedPersons.length === 0">
            <td colspan="6" class="empty-row">No persons added yet</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="currentPage === 1" @click="currentPage = 1">First</button>
      <button :disabled="currentPage === 1" @click="currentPage--">Prev</button>
      <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
      <button :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
      <button :disabled="currentPage === totalPages" @click="currentPage = totalPages">Last</button>
      <select v-model.number="pageSize" class="page-size">
        <option :value="10">10</option>
        <option :value="25">25</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </select>
    </div>

    <!-- Edit Person Modal -->
    <Teleport to="body">
      <div v-if="editingPerson" class="person-modal" :class="{ 'light-theme': theme === 'light' }" @click.self="cancelEdit">
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
              <label>Institution/Company</label>
              <input v-model="editingPerson.company" placeholder="Institution or company name" />
            </div>

            <div class="form-field">
              <label>Role/Title</label>
              <input v-model="editingPerson.role" placeholder="Job title" />
            </div>

            <div class="form-field">
              <label>GitHub Username</label>
              <input v-model="editingPerson.github_name" placeholder="@username" />
            </div>

            <div class="form-field full-width notes-field">
              <div class="notes-header">
                <label>Notes</label>
                <div class="notes-tabs">
                  <button
                    :class="{ active: notesTab === 'edit' }"
                    type="button"
                    @click="notesTab = 'edit'"
                  >Edit</button>
                  <button
                    :class="{ active: notesTab === 'preview' }"
                    type="button"
                    @click="notesTab = 'preview'"
                  >Preview</button>
                </div>
              </div>
              <textarea
                v-if="notesTab === 'edit'"
                v-model="editingPerson.notes"
                placeholder="Add notes (Markdown supported)..."
                rows="6"
              ></textarea>
              <div
                v-else
                class="notes-preview markdown-body"
              >
                <div v-if="!editingPerson.notes" class="placeholder">No notes yet...</div>
                <div v-else @click="handleMarkdownClick" v-html="renderedNotes"></div>
              </div>
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
            <button class="primary" :disabled="!editingPerson.name.trim()" @click="savePerson">Save</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { renderMarkdown } from './utils/markdown.js'

export default {
  name: 'PersonsView',
  props: {
    persons: {
      type: Array,
      default: () => []
    },
    theme: {
      type: String,
      default: 'dark'
    },
    pendingEdit: {
      type: Object,
      default: null
    }
  },
  emits: ['refresh', 'edit-opened'],
  data() {
    return {
      editingPerson: null,
      notesTab: 'edit',
      sortBy: 'name',
      sortDir: 'asc',
      currentPage: 1,
      pageSize: 25,
      personColors: [
        // Blues
        '#1a73e8', '#4285f4', '#0d47a1', '#039be5', '#00acc1',
        // Greens
        '#0f9d58', '#34a853', '#00897b', '#43a047', '#7cb342',
        // Reds & Pinks
        '#d93025', '#ea4335', '#c2185b', '#e91e63', '#f06292',
        // Oranges & Yellows
        '#f9a825', '#ff8f00', '#ef6c00', '#ff7043', '#ffb300',
        // Purples
        '#7b1fa2', '#9c27b0', '#673ab7', '#5e35b1', '#7e57c2',
        // Neutrals
        '#455a64', '#607d8b', '#78909c', '#546e7a', '#37474f'
      ]
    }
  },
  computed: {
    sortedPersons() {
      const sorted = [...this.persons]
      sorted.sort((a, b) => {
        const aVal = (a[this.sortBy] || '').toLowerCase()
        const bVal = (b[this.sortBy] || '').toLowerCase()
        if (aVal < bVal) return this.sortDir === 'asc' ? -1 : 1
        if (aVal > bVal) return this.sortDir === 'asc' ? 1 : -1
        return 0
      })
      return sorted
    },
    totalPages() {
      return Math.ceil(this.sortedPersons.length / this.pageSize) || 1
    },
    paginatedPersons() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.sortedPersons.slice(start, start + this.pageSize)
    },
    renderedNotes() {
      if (!this.editingPerson?.notes) return ''
      return renderMarkdown(this.editingPerson.notes)
    }
  },
  watch: {
    pendingEdit: {
      immediate: true,
      handler(person) {
        if (person) {
          this.editPerson(person)
          this.$emit('edit-opened')
        }
      }
    },
    pageSize() {
      this.currentPage = 1
    },
    persons() {
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages
      }
    }
  },
  methods: {
    toggleSort(column) {
      if (this.sortBy === column) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortBy = column
        this.sortDir = 'asc'
      }
    },

    showAddPerson() {
      this.notesTab = 'edit'
      this.editingPerson = {
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        github_name: '',
        notes: '',
        color: this.personColors[0]
      }
    },

    editPerson(person) {
      this.notesTab = person.notes ? 'preview' : 'edit'
      this.editingPerson = { ...person }
    },

    handleMarkdownClick(event) {
      if (event.target.tagName === 'A') {
        event.preventDefault()
        const href = event.target.getAttribute('href')
        if (href && window.api) {
          window.api.openExternal(href)
        }
      }
    },

    async savePerson() {
      if (!this.editingPerson.name.trim()) return

      try {
        const personData = {
          name: this.editingPerson.name,
          email: this.editingPerson.email || '',
          phone: this.editingPerson.phone || '',
          company: this.editingPerson.company || '',
          role: this.editingPerson.role || '',
          github_name: this.editingPerson.github_name || '',
          notes: this.editingPerson.notes || '',
          color: this.editingPerson.color || '#0f4c75'
        }

        if (this.editingPerson.id) {
          personData.id = this.editingPerson.id
          await window.api.updatePerson(personData)
        } else {
          await window.api.createPerson(personData)
        }

        this.$emit('refresh')
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
      this.$emit('refresh')
      this.editingPerson = null
    },

    cancelEdit() {
      this.editingPerson = null
    }
  }
}
</script>

<style scoped>
.persons-view {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.persons-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.persons-header h2 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #f0f0f0);
}

.add-btn {
  background: #2ecc71;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #27ae60;
}

.table-container {
  overflow-x: auto;
}

.persons-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.persons-table th,
.persons-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #333;
}

.persons-table th {
  background: #1a1f2e;
  color: #aaa;
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
}

.persons-table th.sortable {
  cursor: pointer;
}

.persons-table th.sortable:hover {
  color: #fff;
}

.sort-icon {
  margin-left: 4px;
  font-size: 10px;
}

.persons-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

.persons-table tbody tr:hover {
  background: #252a3d;
}

.persons-table td {
  color: #ccc;
}

.col-color {
  width: 30px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.col-name {
  font-weight: 500;
  color: #f0f0f0 !important;
}

.col-actions {
  width: 60px;
  text-align: right;
}

.edit-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.2s;
}

.edit-btn:hover {
  background: #2980b9;
}

.empty-row {
  text-align: center;
  color: #666;
  padding: 24px !important;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 12px;
}

.pagination button {
  background: #252a3d;
  color: #ccc;
  border: 1px solid #333;
  padding: 4px 10px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}

.pagination button:hover:not(:disabled) {
  background: #2d3348;
  color: #fff;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  color: #888;
  margin: 0 8px;
}

.page-size {
  background: #252a3d;
  color: #ccc;
  border: 1px solid #333;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 11px;
  margin-left: 8px;
}

/* Light theme styles */
.light-theme .persons-header h2 {
  color: #333;
}

.light-theme .persons-table th,
.light-theme .persons-table td {
  border-bottom: 1px solid #e0e0e0;
}

.light-theme .persons-table th {
  background: #f5f5f5;
  color: #666;
}

.light-theme .persons-table th.sortable:hover {
  color: #333;
}

.light-theme .persons-table tbody tr:hover {
  background: #f0f0f0;
}

.light-theme .persons-table td {
  color: #555;
}

.light-theme .col-name {
  color: #333 !important;
}

.light-theme .empty-row {
  color: #999;
}

.light-theme .pagination button {
  background: #f5f5f5;
  color: #555;
  border: 1px solid #ddd;
}

.light-theme .pagination button:hover:not(:disabled) {
  background: #e8e8e8;
  color: #333;
}

.light-theme .page-info {
  color: #666;
}

.light-theme .page-size {
  background: #fff;
  color: #555;
  border: 1px solid #ddd;
}
</style>

<style>
/* Modal styles - non-scoped for Teleport */
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

.person-modal.light-theme {
  background: rgba(0, 0, 0, 0.4);
}

.person-modal .modal-content {
  background: #252a3d;
  padding: 24px;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #333;
}

.person-modal.light-theme .modal-content {
  background: white;
  border: 1px solid #e0e0e0;
}

.person-modal .modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
  color: #f0f0f0;
}

.person-modal.light-theme .modal-content h3 {
  color: #333;
}

.person-modal .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 16px 0;
}

.person-modal .form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.person-modal .form-field.full-width {
  grid-column: 1 / -1;
}

.person-modal .form-field label {
  font-size: 12px;
  font-weight: 500;
  color: #aaa;
}

.person-modal.light-theme .form-field label {
  color: #666;
}

.person-modal .form-field input,
.person-modal .form-field textarea {
  background: #1a1a2e;
  border: 1px solid #555;
  color: #f0f0f0;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
}

.person-modal.light-theme .form-field input,
.person-modal.light-theme .form-field textarea {
  background: #fff;
  border-color: #ddd;
  color: #333;
}

.person-modal .form-field input:focus,
.person-modal .form-field textarea:focus {
  outline: none;
  border-color: #3498db;
}

.person-modal .color-picker {
  margin: 16px 0;
}

.person-modal .color-picker label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #aaa;
}

.person-modal.light-theme .color-picker label {
  color: #666;
}

.person-modal .color-grid {
  display: grid;
  grid-template-columns: repeat(10, 28px);
  gap: 5px;
}

.person-modal .color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}

.person-modal .color-option:hover {
  transform: scale(1.1);
}

.person-modal .color-option.selected {
  border-color: white;
  transform: scale(1.1);
}

.person-modal.light-theme .color-option.selected {
  border-color: #333;
}

.person-modal .modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.person-modal .modal-actions button {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #3a4055;
  color: white;
  font-size: 13px;
  transition: background 0.2s;
}

.person-modal.light-theme .modal-actions button {
  background: #e0e0e0;
  color: #333;
}

.person-modal .modal-actions button:hover {
  background: #4a5065;
}

.person-modal.light-theme .modal-actions button:hover {
  background: #d0d0d0;
}

.person-modal .modal-actions button.primary {
  background: #2ecc71;
  color: white;
}

.person-modal .modal-actions button.primary:hover {
  background: #27ae60;
}

.person-modal .modal-actions button.delete-btn {
  background: #e74c3c;
  margin-right: auto;
  color: white;
}

.person-modal .modal-actions button.delete-btn:hover {
  background: #c0392b;
}

.person-modal .modal-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Notes field with markdown */
.person-modal .notes-field .notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.person-modal .notes-field .notes-header label {
  margin-bottom: 0;
}

.person-modal .notes-tabs {
  display: flex;
  gap: 4px;
}

.person-modal .notes-tabs button {
  background: #1a1a2e;
  border: 1px solid #555;
  color: #aaa;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s;
}

.person-modal .notes-tabs button:hover {
  color: #fff;
  border-color: #777;
}

.person-modal .notes-tabs button.active {
  background: #3498db;
  border-color: #3498db;
  color: white;
}

.person-modal.light-theme .notes-tabs button {
  background: #f5f5f5;
  border-color: #ddd;
  color: #666;
}

.person-modal.light-theme .notes-tabs button:hover {
  color: #333;
  border-color: #bbb;
}

.person-modal.light-theme .notes-tabs button.active {
  background: #3498db;
  border-color: #3498db;
  color: white;
}

.person-modal .notes-preview {
  background: #1a1a2e;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 10px 12px;
  min-height: 140px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 13px;
}

.person-modal.light-theme .notes-preview {
  background: #fff;
  border-color: #ddd;
}

.person-modal .notes-preview .placeholder {
  color: #666;
  font-style: italic;
}

.person-modal.light-theme .notes-preview .placeholder {
  color: #999;
}
</style>
