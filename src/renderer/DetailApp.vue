<template>
  <div class="detail-app" v-if="todo">
    <header>
      <input
        v-model="todo.title"
        class="title-input"
        @change="save"
        placeholder="Todo title"
      />
    </header>

    <div class="meta-section">
      <div class="meta-row">
        <label>Project:</label>
        <select v-model="todo.project_id" @change="save">
          <option :value="null">Inbox (No Project)</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>

      <div class="meta-row">
        <label>Deadline:</label>
        <input
          type="date"
          v-model="deadlineDate"
          @change="save"
        />
        <button v-if="deadlineDate" @click="clearDeadline" class="clear-btn">Clear</button>
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
          <span v-if="linked.project_name" class="linked-project" :style="{ color: linked.project_color }">
            {{ linked.project_name }}
          </span>
          <button @click="unlinkFrom(linked)" class="unlink-btn">x</button>
        </div>
        <p v-if="!linkedTodos.length" class="no-links">No linked items</p>
      </div>
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
      </div>

      <textarea
        v-if="activeTab === 'edit'"
        v-model="todo.notes"
        @input="save"
        placeholder="Add notes (Markdown supported)..."
        class="notes-editor"
      ></textarea>

      <div
        v-else
        class="notes-preview markdown-body"
        v-html="renderedNotes"
      ></div>
    </div>

    <div class="status-bar">
      <span class="saved-indicator" :class="{ visible: showSaved }">Saved</span>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'

export default {
  name: 'DetailApp',
  data() {
    return {
      todo: null,
      projects: [],
      linkedTodos: [],
      activeTab: 'edit',
      showSaved: false,
      saveTimeout: null,
      showLinkSearch: false,
      linkQuery: '',
      linkResults: []
    }
  },
  computed: {
    deadlineDate: {
      get() {
        if (!this.todo?.deadline) return ''
        return this.todo.deadline.split('T')[0]
      },
      set(value) {
        this.todo.deadline = value || null
      }
    },
    renderedNotes() {
      if (!this.todo?.notes) return '<p class="placeholder">No notes yet</p>'
      return marked(this.todo.notes)
    }
  },
  async mounted() {
    await this.loadProjects()

    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) {
      await this.loadTodo(parseInt(id))
    }

    window.api.onLoadTodo((id) => {
      this.loadTodo(id)
    })
  },
  methods: {
    async loadProjects() {
      this.projects = await window.api.getProjects()
    },
    async loadTodo(id) {
      this.todo = await window.api.getTodo(id)
      this.linkedTodos = await window.api.getLinkedTodos(id)
      this.showLinkSearch = false
      this.linkQuery = ''
      this.linkResults = []
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
    clearDeadline() {
      this.todo.deadline = null
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
    }
  },
  watch: {
    showLinkSearch(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.linkInput?.focus()
        })
      }
    }
  }
}
</script>
