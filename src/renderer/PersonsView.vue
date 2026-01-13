<template>
  <div class="persons-view" :class="{ 'light-theme': theme === 'light' }">
    <div class="persons-header">
      <h2>{{ isProjectMode ? 'Stakeholders' : 'People' }}</h2>
      <button v-if="!isProjectMode" class="add-btn" @click="showAddPerson">+ Add Person</button>
    </div>

    <!-- Cards View -->
    <draggable
      v-if="currentView === 'cards'"
      :model-value="sortedPersons"
      item-key="id"
      class="persons-cards"
      ghost-class="ghost"
      @update:model-value="onReorderPersons"
    >
      <template #item="{ element: person }">
        <div
          class="person-card"
          :style="{ borderLeftColor: person.color }"
          @click="editPerson(person)"
        >
          <button v-if="isProjectMode" class="remove-btn" @click.stop="unassignPerson(person)" title="Remove from project">x</button>
          <div class="card-header">
            <div class="person-avatar" :style="{ background: person.color }">
              {{ getInitials(person.name) }}
            </div>
            <div class="person-info">
              <div class="person-name">{{ person.name }}</div>
              <div v-if="person.role" class="person-role">{{ person.role }}</div>
            </div>
          </div>
          <div v-if="person.company" class="person-company">{{ person.company }}</div>
          <div v-if="person.email" class="person-email">{{ person.email }}</div>
          <div v-if="person.notes" class="person-notes" v-html="renderCardMarkdown(person.notes)"></div>
        </div>
      </template>
    </draggable>
    <div v-if="currentView === 'cards' && sortedPersons.length === 0" class="empty-state">{{ isProjectMode ? 'No stakeholders assigned to this project' : 'No persons added yet' }}</div>

    <!-- Table View -->
    <div v-if="currentView === 'table'" class="table-container">
      <table class="persons-table" :class="{ 'project-mode': isProjectMode }">
        <thead>
          <tr>
            <th class="col-color"></th>
            <th class="col-name sortable" @click="toggleSort('name')">
              Name
              <span v-if="sortBy === 'name'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th class="col-role sortable" @click="toggleSort('role')">
              Role
              <span v-if="sortBy === 'role'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <template v-if="isProjectMode">
              <th class="col-company sortable" @click="toggleSort('company')">
                Company
                <span v-if="sortBy === 'company'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="col-influence">Influence</th>
              <th class="col-interest">Interest</th>
              <th class="col-type">Type</th>
              <th class="col-strategy">Strategy</th>
            </template>
            <template v-else>
              <th class="col-email sortable" @click="toggleSort('email')">
                Email
                <span v-if="sortBy === 'email'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="col-company sortable" @click="toggleSort('company')">
                Company
                <span v-if="sortBy === 'company'" class="sort-icon">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
            </template>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="person in paginatedPersons" :key="person.id" @click="editPerson(person)">
            <td class="col-color">
              <div class="color-dot" :style="{ background: person.color }"></div>
            </td>
            <td class="col-name">{{ person.name }}</td>
            <td class="col-role">{{ person.role || '-' }}</td>
            <template v-if="isProjectMode">
              <td class="col-company">{{ person.company || '-' }}</td>
              <td class="col-influence" @click.stop>
                <select
                  :value="person.influence_level"
                  class="inline-select"
                  @change="updateStakeholderField(person, 'influence_level', +$event.target.value)"
                >
                  <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                </select>
              </td>
              <td class="col-interest" @click.stop>
                <select
                  :value="person.interest_level"
                  class="inline-select"
                  @change="updateStakeholderField(person, 'interest_level', +$event.target.value)"
                >
                  <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                </select>
              </td>
              <td class="col-type" @click.stop>
                <select
                  :value="person.stakeholder_type"
                  class="inline-select"
                  @change="updateStakeholderField(person, 'stakeholder_type', $event.target.value)"
                >
                  <option value="Internal">Internal</option>
                  <option value="External">External</option>
                  <option value="Partner">Partner</option>
                  <option value="Customer">Customer</option>
                  <option value="Vendor">Vendor</option>
                </select>
              </td>
              <td class="col-strategy" @click.stop>
                <select
                  :value="person.engagement_strategy"
                  class="inline-select"
                  @change="updateStakeholderField(person, 'engagement_strategy', $event.target.value)"
                >
                  <option value="Manage Closely">Manage Closely</option>
                  <option value="Keep Satisfied">Keep Satisfied</option>
                  <option value="Keep Informed">Keep Informed</option>
                  <option value="Monitor">Monitor</option>
                </select>
              </td>
            </template>
            <template v-else>
              <td class="col-email">{{ person.email || '-' }}</td>
              <td class="col-company">{{ person.company || '-' }}</td>
            </template>
            <td class="col-actions">
              <button class="edit-btn" @click.stop="editPerson(person)">Edit</button>
            </td>
          </tr>
          <tr v-if="sortedPersons.length === 0">
            <td :colspan="isProjectMode ? 9 : 6" class="empty-row">{{ isProjectMode ? 'No stakeholders assigned' : 'No persons added yet' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1 && currentView === 'table'" class="pagination">
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
      <div v-if="editingPerson" class="person-modal" :class="{ 'light-theme': theme === 'light' }" @keydown.esc="cancelEdit" @keydown.left="navigatePerson(-1)" @keydown.right="navigatePerson(1)" tabindex="-1" ref="personModal">
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

          <div v-if="editingPerson.id" class="tags-section">
            <label>Tags</label>
            <div class="inline-tags">
              <span v-for="tag in personTags" :key="tag.id" class="tag-chip">
                {{ tag.name }}<button class="chip-x" @click.stop="removeTag(tag.id)">x</button>
              </span>
              <input
                v-model="newTagInput"
                type="text"
                class="tag-input"
                placeholder="Add tag..."
                list="person-tag-suggestions"
                @keyup.enter="addTag"
              />
              <datalist id="person-tag-suggestions">
                <option v-for="tag in allTags" :key="tag.id" :value="tag.name" />
              </datalist>
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
import { renderMarkdown, renderCardMarkdown } from './utils/markdown.js'
import { getInitials } from './utils/helpers.js'
import draggable from 'vuedraggable'

export default {
  name: 'PersonsView',
  components: {
    draggable
  },
  props: {
    persons: {
      type: Array,
      default: () => []
    },
    allPersons: {
      type: Array,
      default: () => []
    },
    projectId: {
      type: Number,
      default: null
    },
    theme: {
      type: String,
      default: 'dark'
    },
    pendingEdit: {
      type: Object,
      default: null
    },
    currentView: {
      type: String,
      default: 'cards'
    },
    allTags: {
      type: Array,
      default: () => []
    }
  },
  emits: ['refresh', 'edit-opened', 'assign-person', 'unassign-person', 'update-stakeholder', 'add-tag', 'remove-tag'],
  data() {
    return {
      editingPerson: null,
      personTags: [],
      newTagInput: '',
      notesTab: 'edit',
      backdropMouseDown: false,
      sortBy: 'manual',
      sortDir: 'asc',
      currentPage: 1,
      pageSize: 25,
      showPersonPicker: false,
      personSearchQuery: '',
      pickerStyle: {},
      personColors: [
        // Reds
        '#d93025', '#ea4335', '#ef5350', '#ff5252', '#ff1744',
        // Pinks
        '#c2185b', '#e91e63', '#f06292',
        // Oranges
        '#ef6c00', '#ff7043', '#ff9800', '#ff8f00',
        // Yellows
        '#f9a825', '#ffb300', '#ffc107', '#ffca28',
        // Greens
        '#0f9d58', '#34a853', '#43a047', '#4caf50', '#7cb342', '#81c784',
        // Teals
        '#009688', '#00897b', '#26a69a', '#4db6ac', '#00bfa5', '#1de9b6', '#64ffda',
        // Cyans
        '#00bcd4', '#00acc1',
        // Blues
        '#0288d1', '#039be5', '#03a9f4', '#29b6f6', '#4285f4', '#1a73e8', '#0d47a1',
        // Purples
        '#673ab7', '#5e35b1', '#7b1fa2', '#9c27b0', '#7e57c2', '#ab47bc', '#ba68c8', '#9575cd',
        // Neutrals
        '#263238', '#37474f', '#455a64', '#546e7a', '#607d8b', '#78909c', '#90a4ae', '#b0bec5'
      ]
    }
  },
  computed: {
    isProjectMode() {
      return this.projectId !== null
    },
    availablePersons() {
      if (!this.isProjectMode || !this.allPersons) return []
      const assignedIds = new Set(this.persons.map(p => p.id))
      return this.allPersons.filter(p => !assignedIds.has(p.id))
    },
    filteredAvailablePersons() {
      if (!this.personSearchQuery.trim()) return this.availablePersons
      const query = this.personSearchQuery.toLowerCase()
      return this.availablePersons.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.role && p.role.toLowerCase().includes(query)) ||
        (p.company && p.company.toLowerCase().includes(query)) ||
        (p.email && p.email.toLowerCase().includes(query))
      )
    },
    hasExactMatch() {
      if (!this.personSearchQuery.trim()) return false
      const query = this.personSearchQuery.trim().toLowerCase()
      return this.allPersons.some(p => p.name.toLowerCase() === query)
    },
    sortedPersons() {
      const sorted = [...this.persons]
      if (this.sortBy === 'manual') {
        sorted.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      } else {
        sorted.sort((a, b) => {
          const aVal = (a[this.sortBy] || '').toLowerCase()
          const bVal = (b[this.sortBy] || '').toLowerCase()
          if (aVal < bVal) return this.sortDir === 'asc' ? -1 : 1
          if (aVal > bVal) return this.sortDir === 'asc' ? 1 : -1
          return 0
        })
      }
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
    editingPerson(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.personModal?.focus()
        })
      }
    },
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
    getInitials,
    renderCardMarkdown,
    async onReorderPersons(newOrder) {
      const ids = newOrder.map(p => p.id)
      await window.api.reorderPersons(ids)
      this.$emit('refresh')
    },
    toggleSort(column) {
      if (this.sortBy === column) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortBy = column
        this.sortDir = 'asc'
      }
    },

    togglePersonPicker() {
      this.showPersonPicker = !this.showPersonPicker
      this.personSearchQuery = ''
      if (this.showPersonPicker) {
        this.$nextTick(() => {
          // Calculate position based on button location
          const btn = this.$refs.addStakeholderBtn
          if (btn) {
            const rect = btn.getBoundingClientRect()
            this.pickerStyle = {
              top: `${rect.bottom + 4}px`,
              left: `${Math.max(8, rect.right - 450)}px`
            }
          }
          this.$refs.personSearchInput?.focus()
        })
      }
    },

    getRandomColor() {
      return this.personColors[Math.floor(Math.random() * this.personColors.length)]
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
        color: this.getRandomColor()
      }
    },

    async editPerson(person) {
      this.notesTab = person.notes ? 'preview' : 'edit'
      this.editingPerson = { ...person }
      this.newTagInput = ''
      if (person.id) {
        this.personTags = await window.api.getPersonTags(person.id)
      } else {
        this.personTags = []
      }
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

        console.log('Saving person data:', personData)

        if (this.editingPerson.id) {
          personData.id = this.editingPerson.id
          const result = await window.api.updatePerson(personData)
          console.log('Update result:', result)
        } else {
          const result = await window.api.createPerson(personData)
          console.log('Create result:', result)
        }

        this.$emit('refresh')
        this.editingPerson = null
      } catch (error) {
        console.error('Error saving person:', error)
        alert('Failed to save person: ' + error.message)
      }
    },

    async deletePerson() {
      console.log('deletePerson called', this.editingPerson)
      if (!this.editingPerson?.id) {
        console.error('No editingPerson.id')
        return
      }
      if (!confirm(`Delete ${this.editingPerson.name}? This will remove all assignments to todos and projects.`)) {
        return
      }
      try {
        console.log('Calling window.api.deletePerson with id:', this.editingPerson.id)
        await window.api.deletePerson(this.editingPerson.id)
        console.log('Delete successful')
        this.$emit('refresh')
        this.editingPerson = null
      } catch (error) {
        console.error('Delete failed:', error)
        alert('Failed to delete person: ' + error.message)
      }
    },

    async confirmDeletePerson(person) {
      if (!confirm(`Delete ${person.name}? This will remove all assignments to todos and projects.`)) {
        return
      }
      await window.api.deletePerson(person.id)
      this.$emit('refresh')
    },

    cancelEdit() {
      this.editingPerson = null
    },
    onBackdropMouseDown() {
      this.backdropMouseDown = true
    },
    onBackdropMouseUp() {
      if (this.backdropMouseDown) {
        this.cancelEdit()
      }
      this.backdropMouseDown = false
    },

    // Stakeholder assignment methods
    assignPerson(person) {
      this.$emit('assign-person', person)
      this.showPersonPicker = false
    },
    async quickCreatePerson() {
      if (!this.personSearchQuery.trim() || this.hasExactMatch) return
      try {
        const color = this.personColors[Math.floor(Math.random() * this.personColors.length)]
        const person = await window.api.createPerson({
          name: this.personSearchQuery.trim(),
          color: color
        })
        this.personSearchQuery = ''
        this.$emit('refresh')
        // Also assign to project
        this.$emit('assign-person', person)
        this.showPersonPicker = false
      } catch (error) {
        console.error('Failed to create person:', error)
      }
    },
    handleEnterKey() {
      // If there's exactly one match, assign it
      if (this.filteredAvailablePersons.length === 1) {
        this.assignPerson(this.filteredAvailablePersons[0])
      } else if (this.personSearchQuery.trim() && !this.hasExactMatch) {
        // No exact match, create new
        this.quickCreatePerson()
      }
    },
    closePicker() {
      this.showPersonPicker = false
      this.personSearchQuery = ''
    },
    onInputBlur() {
      // Delay to allow click on dropdown items
      setTimeout(() => {
        this.showPersonPicker = false
      }, 150)
    },
    unassignPerson(person) {
      if (confirm(`Remove ${person.name} from this project?`)) {
        this.$emit('unassign-person', person)
      }
    },
    updateStakeholderField(person, field, value) {
      this.$emit('update-stakeholder', person.id, { [field]: value })
    },
    async addTag() {
      if (!this.newTagInput.trim() || !this.editingPerson?.id) return
      await window.api.addPersonTag(this.editingPerson.id, this.newTagInput.trim())
      this.personTags = await window.api.getPersonTags(this.editingPerson.id)
      this.newTagInput = ''
      this.$emit('refresh')
    },
    async removeTag(tagId) {
      if (!this.editingPerson?.id) return
      await window.api.removePersonTag(this.editingPerson.id, tagId)
      this.personTags = await window.api.getPersonTags(this.editingPerson.id)
      this.$emit('refresh')
    },
    navigatePerson(direction, event) {
      // Don't navigate if focus is in an input field
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (!this.editingPerson || !this.editingPerson.id) return
      const currentIndex = this.sortedPersons.findIndex(p => p.id === this.editingPerson.id)
      if (currentIndex === -1) return
      const newIndex = currentIndex + direction
      if (newIndex >= 0 && newIndex < this.sortedPersons.length) {
        this.editPerson(this.sortedPersons[newIndex])
      }
    }
  }
}
</script>

<style scoped>
.persons-view {
  padding: 16px;
  width: 100%;
}

.persons-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  position: relative;
  z-index: 10;
  padding: 8px 0;
}

.back-btn {
  background: transparent;
  border: 1px solid #444;
  color: #aaa;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.back-btn:hover {
  background: #333;
  color: #fff;
  border-color: #555;
}

.view-switcher {
  display: flex;
  gap: 4px;
  background: #1a1a1a;
  padding: 4px;
  border-radius: 8px;
}

.view-switcher button {
  padding: 6px 12px;
  background: transparent;
  border: none;
  color: #bbb;
  cursor: pointer;
  border-radius: 6px;
  font-size: 12px;
  transition: all 0.15s;
}

.view-switcher button:hover {
  color: #fff;
}

.view-switcher button.active {
  background: #0f4c75;
  color: #fff;
}

/* Stakeholder Actions */
.stakeholder-add-inline {
  position: relative;
  margin-left: auto;
}

.inline-person-input {
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1a1a1a;
  color: #e0e0e0;
  font-size: 13px;
  width: 220px;
}

.inline-person-input:focus {
  outline: none;
  border-color: #0f4c75;
}

.person-picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  min-width: 320px;
  width: max-content;
  max-width: 400px;
}

.picker-create-hint {
  padding: 10px 12px;
  font-size: 12px;
  color: #888;
  border-top: 1px solid #333;
  cursor: pointer;
}

.picker-create-hint:hover {
  background: #2a2a2a;
  color: #2ecc71;
}

.picker-results {
  padding: 8px 0;
}

.picker-more {
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: #666;
  border-top: 1px solid #333;
  margin-top: 4px;
}


.picker-item-role {
  margin-left: auto;
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
}

.picker-empty {
  padding: 12px;
  color: #666;
  text-align: center;
  font-size: 12px;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.picker-item:hover {
  background: #2a2a2a;
}

.picker-item-name {
  flex: 1;
  font-size: 13px;
  color: #f0f0f0;
  min-width: 120px;
}

.picker-item span {
  font-size: 13px;
  color: #f0f0f0;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border: none;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s;
}

.person-card {
  position: relative;
}

.person-card:hover .remove-btn,
.person-card:hover .delete-card-btn {
  opacity: 1;
}

.remove-btn:hover,
.delete-card-btn:hover {
  background: #c0392b;
}

.delete-card-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s;
}

/* Cards View */
.persons-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.person-card {
  position: relative;
  background: #0d0d0d;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 4px solid #0f4c75;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.person-card:hover {
  background: #1a1a1a;
  transform: translateY(-2px);
}

.person-card .card-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.person-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.person-info .person-name {
  font-weight: 600;
  font-size: 16px;
  color: #f0f0f0;
  line-height: 1.4;
}

.person-info .person-role {
  font-size: 13px;
  color: #888;
}

.person-company {
  font-size: 13px;
  color: #aaa;
}

.person-email {
  font-size: 13px;
  color: #888;
}

.person-notes {
  margin-top: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #ccc;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px;
  grid-column: 1 / -1;
}

/* Kanban View */
.persons-kanban {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 16px 0;
  min-height: 400px;
}

.kanban-column {
  flex: 0 0 280px;
  background: #0d0d0d;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}

.column-header {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-title {
  font-weight: 600;
  font-size: 13px;
  color: #f0f0f0;
}

.column-count {
  background: #333;
  color: #aaa;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.column-cards {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  background: #1a1a1a;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid #0f4c75;
  display: flex;
  gap: 10px;
  align-items: center;
}

.kanban-card:hover {
  background: #2a2a2a;
}

.person-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 11px;
  flex-shrink: 0;
}

.kanban-card .person-name {
  font-size: 13px;
  font-weight: 500;
  color: #f0f0f0;
}

.kanban-card .person-role {
  font-size: 11px;
  color: #888;
  align-items: center;
  margin-bottom: 16px;
}

/* Timeline View */
.persons-timeline {
  padding: 16px 0;
}

.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.timeline-group {
  position: relative;
  padding-left: 24px;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.timeline-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: absolute;
  left: 0;
  top: 4px;
}

.timeline-company {
  font-weight: 600;
  font-size: 14px;
  color: #f0f0f0;
}

.timeline-count {
  background: #333;
  color: #aaa;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.timeline-persons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-left: 2px solid #333;
  padding-left: 20px;
  margin-left: 5px;
}

.timeline-person {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: #1a1a1a;
  border-radius: 6px;
  cursor: pointer;
  border-left: 3px solid #0f4c75;
  transition: all 0.15s;
}

.timeline-person:hover {
  background: #2a2a2a;
}

.timeline-person-info {
  flex: 1;
}

.timeline-person-info .person-name {
  font-size: 13px;
  font-weight: 500;
  color: #f0f0f0;
}

.timeline-person-info .person-role {
  font-size: 11px;
  color: #888;
}

.timeline-person-info .person-email {
  font-size: 11px;
  color: #666;
}

/* Graph View */
.persons-graph {
  position: relative;
  width: 100%;
  height: 500px;
  background: #0a0a0a;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 16px;
}

.graph-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.graph-link {
  stroke-width: 2;
  opacity: 0.5;
}

.graph-node {
  position: absolute;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  background: #1a1a1a;
  border-radius: 8px;
  border: 2px solid #333;
  cursor: grab;
  transition: box-shadow 0.15s;
  transform: translate(-50%, -50%);
}

.graph-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 10;
}

.graph-node:active {
  cursor: grabbing;
}

.graph-node .person-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.graph-node .node-info {
  white-space: nowrap;
}

.graph-node .person-name {
  font-size: 12px;
  font-weight: 500;
  color: #f0f0f0;
}

.graph-node .person-company {
  font-size: 10px;
  color: #888;
  margin: 0;
}

.persons-header h2 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #f0f0f0);
}

.add-btn {
  background: #1a1a1a;
  color: #bbb;
  border: 1px solid #444;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.add-btn:hover {
  background: #333;
  color: #fff;
  border-color: #555;
}

.light-theme .add-btn {
  background: #f5f5f5;
  color: #333;
  border-color: #ddd;
}

.light-theme .add-btn:hover {
  background: #e8e8e8;
  border-color: #ccc;
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
  background: #0d0d0d;
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

/* Inline select for stakeholder fields */
.inline-select {
  background: #1a1a1a;
  border: 1px solid #333;
  color: #ccc;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  min-width: 80px;
}

.inline-select:hover {
  border-color: #555;
}

.inline-select:focus {
  outline: none;
  border-color: #3498db;
}

.light-theme .inline-select {
  background: #fff;
  border-color: #ddd;
  color: #333;
}

.light-theme .inline-select:hover {
  border-color: #bbb;
}

.col-influence,
.col-interest {
  width: 80px;
}

.col-type,
.col-strategy {
  width: 120px;
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
  background: #0d0d0d;
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
  background: #0d0d0d;
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
  background: #0d0d0d;
  padding: 24px 32px;
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #333;
}

@media (min-width: 1200px) {
  .person-modal .modal-content {
    max-width: 900px;
  }
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
  gap: 16px;
  margin: 16px 0;
}

@media (min-width: 700px) {
  .person-modal .form-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.person-modal .form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.person-modal .form-field.full-width {
  grid-column: 1 / -1;
}

.person-modal .form-field.full-width textarea {
  min-height: 120px;
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
  background: #000000;
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
  display: block !important;
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

.person-modal .color-picker .color-grid {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
}

.person-modal .color-picker .color-grid .color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  flex-shrink: 0;
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

.person-modal .modal-actions button.primary,
.person-modal.light-theme .modal-actions button.primary {
  background: #2ecc71;
  color: white;
}

.person-modal .modal-actions button.primary:hover,
.person-modal.light-theme .modal-actions button.primary:hover {
  background: #27ae60;
}

.person-modal .modal-actions button.delete-btn,
.person-modal.light-theme .modal-actions button.delete-btn {
  background: #e74c3c;
  margin-right: auto;
  color: white;
}

.person-modal .modal-actions button.delete-btn:hover,
.person-modal.light-theme .modal-actions button.delete-btn:hover {
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
  background: #000000;
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
  background: #000000;
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

/* Tags section */
.person-modal .tags-section {
  margin: 16px 0;
}

.person-modal .tags-section label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #aaa;
}

.person-modal.light-theme .tags-section label {
  color: #666;
}

.person-modal .inline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.person-modal .tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  font-size: 12px;
  color: #e0e0e0;
}

.person-modal.light-theme .tag-chip {
  background: #f0f0f0;
  border-color: #ddd;
  color: #333;
}

.person-modal .chip-x {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0 2px;
  font-size: 11px;
  line-height: 1;
}

.person-modal .chip-x:hover {
  color: #e74c3c;
}

.person-modal .tag-input {
  padding: 4px 8px;
  border: 1px solid #333;
  border-radius: 12px;
  background: #000;
  color: #e0e0e0;
  font-size: 12px;
  width: 100px;
}

.person-modal.light-theme .tag-input {
  background: #fff;
  border-color: #ddd;
  color: #333;
}

.person-modal .tag-input::placeholder {
  color: #666;
}

.person-modal.light-theme .tag-input::placeholder {
  color: #999;
}
</style>
