<template>
  <div class="detail-app" :class="{ 'light-theme': theme === 'light' }" v-if="todo">
    <div class="title-row">
      <input
        type="checkbox"
        :checked="todo.completed"
        @change="toggleComplete"
        class="title-checkbox"
      />
      <input
        v-model="todo.title"
        class="title-input"
        @change="save"
        placeholder="Todo title"
      />
    </div>

    <div class="meta-row project-row">
      <label>Project:</label>
      <select v-model="todo.project_id" @change="save">
        <option :value="null">Inbox (No Project)</option>
        <option v-for="project in projects" :key="project.id" :value="project.id">
          {{ project.name }}
        </option>
      </select>
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
        @input="save"
        placeholder="Add notes (Markdown supported)..."
        class="notes-editor"
      ></textarea>

      <div
        v-else-if="activeTab === 'preview'"
        class="notes-preview markdown-body"
        v-html="renderedNotes"
        @click="handleMarkdownClick"
      ></div>

      <div v-else class="notes-split">
        <textarea
          v-model="todo.notes"
          @input="save"
          placeholder="Add notes (Markdown supported)..."
          class="notes-editor split-editor"
        ></textarea>
        <div
          class="notes-preview markdown-body split-preview"
          v-html="renderedNotes"
          @click="handleMarkdownClick"
        ></div>
      </div>
    </div>

    <div class="subtasks-section">
      <div class="subtasks-header">
        <label>Subtasks</label>
        <span v-if="subtasks.length" class="subtask-count">{{ completedSubtasksCount }}/{{ subtasks.length }}</span>
      </div>
      <div class="subtasks-list">
        <div v-for="subtask in subtasks" :key="subtask.id" class="subtask-item" :class="{ completed: subtask.completed }">
          <input type="checkbox" :checked="subtask.completed" @change="toggleSubtask(subtask)" />
          <span class="subtask-title">{{ subtask.title }}</span>
          <button @click="deleteSubtask(subtask.id)" class="subtask-delete">x</button>
        </div>
      </div>
      <div class="subtask-add">
        <input
          v-model="newSubtaskTitle"
          @keyup.enter="addSubtask"
          placeholder="Add subtask..."
          class="subtask-input"
        />
        <button @click="addSubtask" :disabled="!newSubtaskTitle.trim()" class="subtask-add-btn">+</button>
      </div>
    </div>

    <div class="links-section">
      <div class="section-header">
        <h3>Linked Items</h3>
        <button @click="showLinkSearch = !showLinkSearch" class="link-btn">+ Link</button>
      </div>

      <div v-if="showLinkSearch" class="link-search">
        <input
          v-model="linkQuery"
          @input="searchForLinks"
          placeholder="Search todos to link..."
          ref="linkInput"
        />
        <div v-if="linkResults.length" class="link-results">
          <div
            v-for="result in linkResults"
            :key="result.id"
            class="link-result"
            @click="linkTo(result)"
          >
            <span>{{ result.title }}</span>
            <span v-if="result.project_name" class="result-project">{{ result.project_name }}</span>
          </div>
        </div>
      </div>

      <div class="linked-items">
        <div
          v-for="linked in linkedTodos"
          :key="linked.id"
          class="linked-item"
        >
          <span class="linked-title" @click="openLinked(linked.id)">{{ linked.title }}</span>
          <span v-if="linked.project_name" class="linked-project">
            {{ linked.project_name }}
          </span>
          <button @click="unlinkFrom(linked)" class="unlink-btn">x</button>
        </div>
        <p v-if="!linkedTodos.length" class="no-links">No linked items</p>
      </div>
    </div>

    <div class="meta-section compact">
      <div class="meta-grid">
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
            <input type="date" v-model="startDate" @change="save" lang="sv-SE" />
            <button v-if="startDate" @click="clearStartDate" class="clear-btn">x</button>
          </div>
        </div>
        <div class="meta-item">
          <label>End</label>
          <div class="date-field">
            <input type="date" v-model="endDate" @change="save" lang="sv-SE" />
            <button v-if="endDate" @click="clearEndDate" class="clear-btn">x</button>
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
                type="number"
                v-model.number="todo.recurrence_interval"
                @change="save"
                min="1"
                max="99"
                class="interval-input"
              />
              <span>{{ recurrenceUnit }}</span>
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
import { marked } from 'marked'
import mermaid from 'mermaid'

const savedTheme = localStorage.getItem('todo-theme') || 'dark'
mermaid.initialize({
  startOnLoad: false,
  theme: savedTheme === 'light' ? 'default' : 'dark',
  securityLevel: 'loose'
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
      theme: localStorage.getItem('todo-theme') || 'dark'
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
      return marked(this.todo.notes)
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
  async mounted() {
    await this.loadProjects()
    await this.loadCategories()
    await this.loadStatuses()

    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) {
      await this.loadTodo(parseInt(id))
    }

    window.api.onLoadTodo((id) => {
      this.loadTodo(id)
    })

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
  methods: {
    async loadProjects() {
      this.projects = await window.api.getProjects()
    },
    async loadCategories() {
      this.categories = await window.api.getCategories()
    },
    async loadStatuses() {
      this.statuses = await window.api.getStatuses()
    },
    async loadTodo(id) {
      this.todo = await window.api.getTodo(id)
      this.linkedTodos = await window.api.getLinkedTodos(id)
      this.subtasks = await window.api.getSubtasks(id)
      this.showLinkSearch = false
      this.linkQuery = ''
      this.linkResults = []
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
    async loadLinkedTodos() {
      this.linkedTodos = await window.api.getLinkedTodos(this.todo.id)
    },
    async save() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }

      this.saveTimeout = setTimeout(async () => {
        await window.api.updateTodo(this.todo)
        window.api.notifyTodoUpdated()
        this.showSaved = true
        setTimeout(() => {
          this.showSaved = false
        }, 1500)
      }, 300)
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
    handleMarkdownClick(event) {
      const link = event.target.closest('a')
      if (link && link.href) {
        event.preventDefault()
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
  }
}
</script>
