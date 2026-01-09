<template>
  <div v-if="todo" class="detail-app" :class="{ 'light-theme': theme === 'light' }" :style="{ borderLeftColor: todo.project_color || '#333' }">
    <div class="detail-header">
      <div class="header-actions">
        <button class="header-btn" title="Open in sidebar" @click="embedTodo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <button class="header-btn close-btn" title="Close" @click="closeWindow">x</button>
      </div>
    </div>
    <div class="title-row">
      <input
        type="checkbox"
        :checked="todo.completed"
        class="title-checkbox"
        @change="toggleComplete"
      />
      <input
        v-model="todo.title"
        class="title-input"
        placeholder="Todo title"
        @input="save"
      />
    </div>

    <div class="notes-section">
      <div class="tabs">
        <button
          :class="{ active: activeTab === 'edit' }"
          @click="activeTab = 'edit'"
        >Edit</button>
        <button
          :class="{ active: activeTab === 'preview' }"
          @click="activeTab = 'preview'"
        >Preview</button>
        <button
          :class="{ active: activeTab === 'split' }"
          @click="activeTab = 'split'"
        >Split</button>
      </div>

      <textarea
        v-if="activeTab === 'edit'"
        v-model="todo.notes"
        placeholder="Add notes (Markdown supported)..."
        class="notes-editor"
        @input="save"
        @keydown="handleNotesKeydown"
      ></textarea>

      <div
        v-else-if="activeTab === 'preview'"
        class="notes-preview markdown-body"
      >
        <div v-if="todo.notes_sensitive && !notesRevealed" class="sensitive-notes-overlay">
          <div class="sensitive-icon">🔒</div>
          <p>Sensitive content hidden</p>
          <button class="reveal-btn" @click="revealNotes">Reveal</button>
        </div>
        <div v-else @click="handleMarkdownClick" v-html="renderedNotes"></div>
      </div>

      <div v-else class="notes-split">
        <textarea
          v-model="todo.notes"
          placeholder="Add notes (Markdown supported)..."
          class="notes-editor split-editor"
          @input="save"
          @keydown="handleNotesKeydown"
        ></textarea>
        <div class="notes-preview markdown-body split-preview">
          <div v-if="todo.notes_sensitive && !notesRevealed" class="sensitive-notes-overlay">
            <div class="sensitive-icon">🔒</div>
            <p>Sensitive content hidden</p>
            <button class="reveal-btn" @click="revealNotes">Reveal</button>
          </div>
          <div v-else @click="handleMarkdownClick" v-html="renderedNotes"></div>
        </div>
      </div>
    </div>

    <div class="sensitive-notes-row" style="text-align: right; padding: 8px 0;">
      <label class="sensitive-checkbox" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #bbb; cursor: pointer;">
        <input
          v-model="todo.notes_sensitive"
          type="checkbox"
          @change="save"
        />
        <span class="lock-icon">🔒</span>
        <span>Sensitive Notes</span>
      </label>
    </div>

    <div class="subtasks-section">
      <div class="subtasks-header">
        <label>Subtasks</label>
        <span v-if="subtasks.length" class="subtask-count">{{ completedSubtasksCount }}/{{ subtasks.length }}</span>
      </div>
      <draggable
        :list="subtasks"
        item-key="id"
        class="subtasks-list"
        handle=".subtask-drag-handle"
        @end="reorderSubtasks"
      >
        <template #item="{ element: subtask }">
          <div class="subtask-item" :class="{ completed: subtask.completed }">
            <span class="subtask-drag-handle">⋮⋮</span>
            <input type="checkbox" :checked="subtask.completed" @change="toggleSubtask(subtask)" />
            <span class="subtask-title">{{ subtask.title }}</span>
            <button class="subtask-delete" @click="deleteSubtask(subtask.id)">x</button>
          </div>
        </template>
      </draggable>
      <div class="subtask-add">
        <input
          v-model="newSubtaskTitle"
          placeholder="Add subtask..."
          class="subtask-input"
          @keyup.enter="addSubtask"
        />
        <button :disabled="!newSubtaskTitle.trim()" class="subtask-add-btn" @click="addSubtask">+</button>
      </div>
    </div>

    <div class="meta-section compact collapsible">
      <div class="section-header clickable" @click="metaExpanded = !metaExpanded">
        <h3>
          <span class="collapse-icon">{{ metaExpanded ? '▼' : '▶' }}</span>
          Metadata
        </h3>
      </div>

      <div v-if="metaExpanded">
        <!-- Properties Grid -->
        <div class="meta-grid">
        <div class="meta-item">
          <label>Project</label>
          <select v-model="todo.project_id" @change="save">
            <option :value="null">Inbox</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </div>
        <div class="meta-item">
          <label>Category</label>
          <select v-model="todo.category_id" @change="save">
            <option :value="null">None</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </div>
        <div class="meta-item">
          <label>Status</label>
          <select v-model="todo.status_id" @change="save">
            <option :value="null">None</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
          </select>
        </div>
        <div class="meta-item">
          <label>Importance</label>
          <div class="importance-picker compact">
            <button v-for="level in 5" :key="level" class="importance-btn" :class="{ active: todo.importance == level && todo.importance > 0 }" @click="setImportance(level)">{{ level }}</button>
          </div>
        </div>
        <div class="meta-item">
          <label>Created</label>
          <span class="created-value">{{ formatCreatedDate(todo.created_at) }}</span>
        </div>
        <div class="meta-item">
          <label>Start</label>
          <div class="date-field">
            <input v-model="startDate" type="date" lang="sv-SE" @change="save" />
            <button v-if="startDate" class="clear-btn" @click="clearStartDate">x</button>
          </div>
        </div>
        <div class="meta-item">
          <label>End</label>
          <div class="date-field">
            <input v-model="endDate" type="date" lang="sv-SE" @change="save" />
            <button v-if="endDate" class="clear-btn" @click="clearEndDate">x</button>
          </div>
        </div>
        <div class="meta-item recurrence-item">
          <label>Repeat</label>
          <div class="recurrence-controls">
            <select v-model="todo.recurrence_type" @change="save">
              <option :value="null">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <div v-if="todo.recurrence_type" class="recurrence-interval">
              <span>every</span>
              <input
                v-model.number="todo.recurrence_interval"
                type="number"
                min="1"
                max="99"
                class="interval-input"
                @change="save"
              />
              <span>{{ recurrenceUnit }}</span>
            </div>
          </div>
        </div>
        <div class="meta-item links-item">
          <label>Links</label>
          <div class="inline-links">
            <span v-for="linked in linkedTodos" :key="linked.id" class="link-chip" @click="openLinked(linked.id)">
              {{ linked.title }}<button class="chip-x" @click.stop="unlinkFrom(linked)">x</button>
            </span>
            <button class="add-link-btn" @click.stop="showLinkSearch = !showLinkSearch">+</button>
          </div>
        </div>
        <div class="meta-item persons-item">
          <label>Persons</label>
          <div class="inline-persons">
            <PersonAvatar
              v-for="person in assignedPersons"
              :key="person.id"
              :person="person"
              @remove="unassignPerson(person)"
            />
            <button class="add-person-btn" @click.stop="showPersonSearch = !showPersonSearch">+</button>
          </div>
        </div>
        </div>
        <div v-if="showLinkSearch" class="link-search-popup">
          <input
            ref="linkInput"
            v-model="linkQuery"
            placeholder="Search todos to link..."
            @input="searchForLinks"
          />
          <div v-if="linkResults.length" class="link-results">
            <div
              v-for="result in linkResults"
              :key="result.id"
              class="link-result"
              @click="linkTo(result)"
            >
              {{ result.title }}
            </div>
          </div>
        </div>
        <div v-if="showPersonSearch" class="person-picker-popup">
          <div class="person-picker-list">
            <div v-for="person in persons" :key="person.id" class="person-option" :class="{ assigned: assignedPersons.some(p => p.id === person.id) }" @click="assignPerson(person)">
              <span class="person-color-dot" :style="{ background: person.color }"></span>
              <span class="person-name">{{ person.name }}</span>
              <span v-if="person.email" class="person-email">{{ person.email }}</span>
            </div>
            <div v-if="!persons.length" class="person-picker-empty">
              <p>No persons available</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <span class="saved-indicator" :class="{ visible: showSaved }">Saved</span>
    </div>
  </div>
</template>

<script>
import { renderMarkdown, marked } from './utils/markdown.js'
import mermaid from 'mermaid'
import PersonAvatar from './components/PersonAvatar.vue'
import draggable from 'vuedraggable'

const savedTheme = localStorage.getItem('todo-theme') || 'dark'
mermaid.initialize({
  startOnLoad: false,
  theme: savedTheme === 'light' ? 'default' : 'dark',
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 15,
    useMaxWidth: true
  },
  themeVariables: savedTheme === 'dark' ? {
    primaryColor: '#0f4c75',
    primaryTextColor: '#e0e0e0',
    primaryBorderColor: '#4fc3f7',
    lineColor: '#4fc3f7',
    secondaryColor: '#0d0d0d',
    tertiaryColor: '#1a1f2e',
    background: '#1a1a1a',
    mainBkg: '#0d0d0d',
    secondBkg: '#1a1f2e',
    mainContrastColor: '#e0e0e0',
    darkMode: true,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px'
  } : {}
})

const mermaidExtension = {
  name: 'mermaid',
  renderer: {
    code(token) {
      if (token.lang === 'mermaid') {
        return `<pre class="mermaid">${token.text}</pre>`
      }
      return `<pre><code class="language-${token.lang || ''}">${token.text}</code></pre>`
    }
  }
}
marked.use(mermaidExtension)

export default {
  name: 'DetailApp',
  components: { PersonAvatar, draggable },
  data() {
    return {
      todo: null,
      projects: [],
      categories: [],
      statuses: [],
      linkedTodos: [],
      subtasks: [],
      newSubtaskTitle: '',
      activeTab: 'edit',
      showSaved: false,
      saveTimeout: null,
      showLinkSearch: false,
      linkQuery: '',
      linkResults: [],
      assignedPersons: [],
      showPersonSearch: false,
      personQuery: '',
      personResults: [],
      persons: [],
      theme: localStorage.getItem('todo-theme') || 'dark',
      metaExpanded: false,
      notesRevealed: false
    }
  },
  computed: {
    startDate: {
      get() {
        if (!this.todo?.start_date) return ''
        return this.todo.start_date.split('T')[0]
      },
      set(value) {
        this.todo.start_date = value || null
      }
    },
    endDate: {
      get() {
        if (!this.todo?.end_date) return ''
        return this.todo.end_date.split('T')[0]
      },
      set(value) {
        this.todo.end_date = value || null
      }
    },
    renderedNotes() {
      if (!this.todo?.notes) return '<p class="placeholder">No notes yet</p>'
      return renderMarkdown(this.todo.notes)
    },
    completedSubtasksCount() {
      return this.subtasks.filter(s => s.completed).length
    },
    recurrenceUnit() {
      if (!this.todo?.recurrence_type) return ''
      const units = {
        daily: 'day(s)',
        weekly: 'week(s)',
        monthly: 'month(s)',
        yearly: 'year(s)'
      }
      return units[this.todo.recurrence_type] || ''
    }
  },
  watch: {
    showLinkSearch(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.linkInput?.focus()
        })
      }
    },
    activeTab(val) {
      if (val === 'preview' || val === 'split') {
        this.renderMermaid()
      }
    },
    renderedNotes() {
      if (this.activeTab === 'preview' || this.activeTab === 'split') {
        this.renderMermaid()
      }
    }
  },
  async mounted() {
    await this.loadProjects()
    await this.loadCategories()
    await this.loadStatuses()
    await this.loadPersons()

    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) {
      await this.loadTodo(parseInt(id))
    }

    window.api.onLoadTodo((id) => {
      this.loadTodo(id)
    })

    // Add native event listener for links in markdown
    document.addEventListener('click', (event) => {
      console.log('Document click detected, target:', event.target.tagName, event.target.className)
      const link = event.target.closest('a')
      console.log('Closest link:', link)
      if (link) {
        console.log('Link href:', link.href)
        console.log('Link in notes-preview?', link.closest('.notes-preview'))
        if (link.href && link.closest('.notes-preview')) {
          console.log('Opening external link:', link.href)
          event.preventDefault()
          event.stopPropagation()
          if (window.api && window.api.openExternal) {
            window.api.openExternal(link.href)
          } else {
            console.error('window.api.openExternal is not available')
          }
        }
      }
    }, true)

    // Save when main process requests it (on window close)
    console.log('Registering save-before-close listener')
    window.api.onSaveBeforeClose(() => {
      console.log('=== SAVE BEFORE CLOSE TRIGGERED ===')
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
        this.saveTimeout = null
      }
      if (this.todo) {
        console.log('Saving todo synchronously:', this.todo.title)
        try {
          window.api.updateTodoSync(this.todo)
          window.api.notifyTodoUpdated()
          console.log('Todo saved successfully')
        } catch (e) {
          console.error('Error saving todo:', e)
        }
      } else {
        console.log('No todo to save')
      }
    })
    console.log('Save-before-close listener registered')

    // Listen for theme changes from main window
    window.addEventListener('storage', (e) => {
      if (e.key === 'todo-theme') {
        this.theme = e.newValue || 'dark'
      }
    })

    // Reload theme when window gets focus (in case it changed in main window)
    window.addEventListener('focus', () => {
      const currentTheme = localStorage.getItem('todo-theme') || 'dark'
      if (this.theme !== currentTheme) {
        this.theme = currentTheme
      }
    })
  },
  beforeUnmount() {
    console.log('beforeUnmount called, saving todo')
    // Flush any pending saves before component is destroyed
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    // Save synchronously - Vue won't wait for async beforeUnmount
    if (this.todo) {
      window.api.updateTodo(this.todo)
      window.api.notifyTodoUpdated()
      console.log('beforeUnmount save triggered')
    }
  },
  methods: {
    embedTodo() {
      // Tell main window to open this todo in embedded view, then close this window
      window.api.embedTodo(this.todo.id)
    },
    closeWindow() {
      window.close()
    },
    async loadProjects() {
      this.projects = await window.api.getProjects()
    },
    async loadCategories() {
      this.categories = await window.api.getCategories()
    },
    async loadStatuses() {
      this.statuses = await window.api.getStatuses()
    },
    getInitials(name) {
      if (!name) return ''
      const parts = name.trim().split(' ')
      if (parts.length === 1) {
        return parts[0].substring(0, 2)
      }
      return parts[0][0] + parts[parts.length - 1][0]
    },
    async loadTodo(id) {
      this.todo = await window.api.getTodo(id)
      // Ensure notes_sensitive is properly initialized as a boolean
      if (this.todo.notes_sensitive === null || this.todo.notes_sensitive === undefined) {
        this.todo.notes_sensitive = false
      } else {
        // Convert to boolean (1 or true -> true, 0 or false -> false)
        this.todo.notes_sensitive = !!this.todo.notes_sensitive
      }
      console.log('Loaded todo:', this.todo.title, 'notes_sensitive:', this.todo.notes_sensitive, typeof this.todo.notes_sensitive)
      this.linkedTodos = await window.api.getLinkedTodos(id)
      this.subtasks = await window.api.getSubtasks(id)
      this.assignedPersons = await window.api.getTodoPersons(id)
      this.showLinkSearch = false
      this.linkQuery = ''
      this.linkResults = []
      this.showPersonSearch = false
      this.personQuery = ''
      this.notesRevealed = false

      // Set active tab based on notes presence
      this.activeTab = this.todo.notes && this.todo.notes.trim() ? 'preview' : 'edit'
      this.personResults = []
    },
    revealNotes() {
      // Show confirmation dialog
      if (confirm('Are you sure you want to reveal the sensitive content?')) {
        this.notesRevealed = true
      }
    },
    toggleComplete() {
      this.todo.completed = !this.todo.completed
      this.save()
    },
    async setImportance(level) {
      if (this.todo.importance == level) {
        this.todo.importance = 0
      } else {
        this.todo.importance = level
      }
      this.save()
    },
    formatCreatedDate(createdAt) {
      if (!createdAt) return ''
      const date = new Date(createdAt)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    },
    async toggleSubtask(subtask) {
      subtask.completed = !subtask.completed
      await window.api.updateSubtask(subtask)
      window.api.notifyTodoUpdated()
    },
    async deleteSubtask(id) {
      await window.api.deleteSubtask(id)
      this.subtasks = this.subtasks.filter(s => s.id !== id)
      window.api.notifyTodoUpdated()
    },
    async addSubtask() {
      if (!this.newSubtaskTitle.trim()) return
      const subtask = await window.api.createSubtask(this.todo.id, this.newSubtaskTitle)
      this.subtasks.push(subtask)
      this.newSubtaskTitle = ''
      window.api.notifyTodoUpdated()
    },
    async reorderSubtasks() {
      const ids = this.subtasks.map(s => s.id)
      await window.api.reorderSubtasks(ids)
      window.api.notifyTodoUpdated()
    },
    async loadLinkedTodos() {
      this.linkedTodos = await window.api.getLinkedTodos(this.todo.id)
    },
    async save() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }

      this.saveTimeout = setTimeout(async () => {
        console.log('Auto-saving todo:', this.todo.title)
        console.log('notes_sensitive before conversion:', this.todo.notes_sensitive, typeof this.todo.notes_sensitive)
        // Create a plain object copy to avoid Vue reactive issues
        const todoData = JSON.parse(JSON.stringify(this.todo))
        // Ensure notes_sensitive is a number (0 or 1) for SQLite
        todoData.notes_sensitive = todoData.notes_sensitive ? 1 : 0
        console.log('notes_sensitive after conversion:', todoData.notes_sensitive)
        await window.api.updateTodo(todoData)
        window.api.notifyTodoUpdated()
        console.log('Auto-save complete')
        this.showSaved = true
        setTimeout(() => {
          this.showSaved = false
        }, 1500)
      }, 100)
    },
    handleNotesKeydown(event) {
      // Handle Tab key for indentation
      if (event.key === 'Tab') {
        event.preventDefault()
        const textarea = event.target
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const indent = '  ' // 2 spaces

        // Insert indent at cursor position
        this.todo.notes = this.todo.notes.substring(0, start) + indent + this.todo.notes.substring(end)

        // Move cursor after the indent
        this.$nextTick(() => {
          textarea.selectionStart = textarea.selectionEnd = start + indent.length
        })

        this.save()
      }
    },
    clearStartDate() {
      this.todo.start_date = null
      this.save()
    },
    clearEndDate() {
      this.todo.end_date = null
      this.save()
    },
    async searchForLinks() {
      if (!this.linkQuery.trim()) {
        this.linkResults = []
        return
      }
      this.linkResults = await window.api.searchTodos(this.linkQuery, this.todo.id)
      // Filter out already linked items
      const linkedIds = this.linkedTodos.map(t => t.id)
      this.linkResults = this.linkResults.filter(r => !linkedIds.includes(r.id))
    },
    async linkTo(target) {
      await window.api.linkTodos(this.todo.id, target.id)
      await this.loadLinkedTodos()
      this.linkQuery = ''
      this.linkResults = []
      this.showLinkSearch = false
    },
    async unlinkFrom(linked) {
      await window.api.unlinkTodos(this.todo.id, linked.id)
      await this.loadLinkedTodos()
    },
    openLinked(id) {
      this.loadTodo(id)
    },
    searchPersons() {
      if (!this.personQuery.trim()) {
        this.personResults = []
        return
      }
      const query = this.personQuery.toLowerCase()
      const assignedIds = this.assignedPersons.map(p => p.id)
      this.personResults = this.persons.filter(p =>
        !assignedIds.includes(p.id) &&
        (p.name.toLowerCase().includes(query) ||
         (p.email && p.email.toLowerCase().includes(query)))
      )
    },
    handleMarkdownClick(event) {
      console.log('Click event:', event.target)
      // Check if clicked element is a link or inside a link
      const link = event.target.tagName === 'A' ? event.target : event.target.closest('a')
      console.log('Found link:', link)
      if (link && link.href) {
        console.log('Opening link:', link.href)
        event.preventDefault()
        event.stopPropagation()
        window.api.openExternal(link.href)
      }
    },
    async renderMermaid() {
      await this.$nextTick()
      try {
        await mermaid.run({
          querySelector: '.notes-preview pre.mermaid:not([data-processed])'
        })
        document.querySelectorAll('.notes-preview pre.mermaid').forEach(el => {
          el.setAttribute('data-processed', 'true')
        })
      } catch (e) {
        console.error('Mermaid render error:', e)
      }
    },
    async loadPersons() {
      this.persons = await window.api.getPersons()
    },
    async loadAssignedPersons() {
      this.assignedPersons = await window.api.getTodoPersons(this.todo.id)
    },
    async assignPerson(person) {
      await window.api.linkTodoPerson(this.todo.id, person.id)
      await this.loadAssignedPersons()
      this.personQuery = ''
      this.personResults = []
      this.showPersonSearch = false
      window.api.notifyTodoUpdated()
    },
    async unassignPerson(person) {
      await window.api.unlinkTodoPerson(this.todo.id, person.id)
      await this.loadAssignedPersons()
      window.api.notifyTodoUpdated()
    }
  }
}
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: flex-end;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-color, #3a3f4b);
  background: var(--bg-secondary, #0d0d0d);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-btn:hover {
  background: var(--bg-hover, #2a2f3d);
  color: var(--text-primary, #e0e0e0);
}

.header-btn.close-btn:hover {
  background: #e74c3c;
  color: white;
}

.subtask-drag-handle {
  cursor: grab;
  color: var(--text-secondary, #a0a0a0);
  font-size: 10px;
  letter-spacing: -2px;
  opacity: 0.5;
  user-select: none;
}

.subtask-drag-handle:hover {
  opacity: 1;
}

.subtask-item:active .subtask-drag-handle {
  cursor: grabbing;
}

/* Compact meta layout matching embedded view */
.meta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.meta-item label {
  font-size: 10px;
  color: var(--text-secondary, #a0a0a0);
  white-space: nowrap;
}

.meta-item select,
.meta-item input[type="date"] {
  padding: 2px 4px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 3px;
  background: var(--bg-secondary, #0d0d0d);
  color: var(--text-primary, #e0e0e0);
  font-size: 11px;
}

.meta-item select:focus,
.meta-item input[type="date"]:focus {
  outline: none;
  border-color: var(--accent-color, #0f4c75);
}

.importance-picker.compact {
  display: flex;
  gap: 2px;
}

.importance-picker.compact .importance-btn {
  width: 18px;
  height: 18px;
  padding: 0;
  font-size: 10px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 3px;
  background: var(--bg-secondary, #0d0d0d);
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
}

.importance-picker.compact .importance-btn.active {
  background: var(--accent-color, #0f4c75);
  color: white;
  border-color: var(--accent-color, #0f4c75);
}

.created-value {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
}

.date-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.date-field .clear-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  padding: 0 4px;
  font-size: 12px;
}

.recurrence-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.recurrence-interval {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
}

.interval-input {
  width: 36px;
  padding: 2px 4px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 3px;
  background: var(--bg-secondary, #0d0d0d);
  color: var(--text-primary, #e0e0e0);
  font-size: 11px;
  text-align: center;
}

.inline-persons {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: center;
}

.add-person-btn {
  width: 18px;
  height: 18px;
  border: 1px dashed var(--border-color, #3a3f4b);
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.add-person-btn:hover {
  border-color: var(--accent-color, #0f4c75);
  color: var(--accent-color, #0f4c75);
}

.person-picker-popup {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary, #0d0d0d);
  border-radius: 8px;
}

.person-picker-list {
  max-height: 200px;
  overflow-y: auto;
}

.person-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
}

.person-option:hover {
  background: var(--bg-hover, #2a2f3d);
}

.person-option.assigned {
  opacity: 0.5;
}

.person-color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}

.person-name {
  flex: 1;
  font-size: 13px;
}

.person-email {
  font-size: 11px;
  color: var(--text-secondary, #a0a0a0);
}

.person-picker-empty {
  text-align: center;
  padding: 16px;
  color: var(--text-secondary, #a0a0a0);
}

/* Inline Links */
.inline-links {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-items: center;
}

.link-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  background: var(--bg-secondary, #0d0d0d);
  border: 1px solid #555;
  border-radius: 10px;
  font-size: 11px;
  color: #4fc3f7;
  cursor: pointer;
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-chip:hover {
  background: var(--bg-hover, #2a2f3d);
}

.chip-x {
  background: none;
  border: none;
  color: #ccc;
  font-size: 10px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.chip-x:hover {
  color: #ff6b6b;
}

.add-link-btn {
  width: 18px;
  height: 18px;
  border: 1px dashed var(--border-color, #3a3f4b);
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.add-link-btn:hover {
  border-color: var(--accent-color, #0f4c75);
  color: var(--accent-color, #0f4c75);
}

.link-search-popup {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary, #0d0d0d);
  border-radius: 8px;
}

.link-search-popup input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color, #3a3f4b);
  border-radius: 4px;
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-primary, #e0e0e0);
  margin-bottom: 8px;
  box-sizing: border-box;
}

.link-results {
  max-height: 150px;
  overflow-y: auto;
}

.link-result {
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
}

.link-result:hover {
  background: var(--bg-hover, #2a2f3d);
}
</style>
