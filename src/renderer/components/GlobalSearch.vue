<template>
  <div v-if="visible">
    <!-- Preview outside overlay so it appears in main window -->
    <ItemPreview v-if="hoveredItem" :item="hoveredItem.item" class="search-preview" />

    <div class="search-overlay" @click.self="close">
    <div class="search-modal" @click.stop>
      <div class="search-input-wrapper">
        <Search class="search-icon" :size="20" />
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          placeholder="Search todos, notes, projects..."
          @input="debouncedSearch"
          @keydown="handleKeydown"
        />
        <kbd class="shortcut-hint">ESC</kbd>
      </div>

      <div v-if="isSearching" class="search-loading">
        Searching...
      </div>

      <div v-else-if="hasResults" class="search-results">
        <!-- Todos -->
        <div v-if="todoResults.length" class="result-group">
          <div class="group-header">
            <CheckSquare :size="16" />
            <span>Todos</span>
            <span class="count">{{ todoResults.length }}</span>
          </div>
          <div
            v-for="item in todoResults"
            :key="'todo-' + item.id"
            class="result-item"
            :class="{ selected: isSelected('todos', item.id) }"
            @click="selectResult('todo', item)"
            @mouseenter="hoverIndex = getGlobalIndex('todos', item.id)"
          >
            <span class="result-title">{{ item.title }}</span>
            <span v-if="item.project_name" class="result-meta">{{ item.project_name }}</span>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="noteResults.length" class="result-group">
          <div class="group-header">
            <FileText :size="16" />
            <span>Notes</span>
            <span class="count">{{ noteResults.length }}</span>
          </div>
          <div
            v-for="item in noteResults"
            :key="'note-' + item.id"
            class="result-item"
            :class="{ selected: isSelected('notes', item.id) }"
            @click="selectResult('note', item)"
            @mouseenter="hoverIndex = getGlobalIndex('notes', item.id)"
          >
            <span class="result-title">{{ item.title }}</span>
            <span v-if="item.project_name" class="result-meta">{{ item.project_name }}</span>
          </div>
        </div>

        <!-- Projects -->
        <div v-if="results.projects.length" class="result-group">
          <div class="group-header">
            <Folder :size="16" />
            <span>Projects</span>
            <span class="count">{{ results.projects.length }}</span>
          </div>
          <div
            v-for="item in results.projects"
            :key="'project-' + item.id"
            class="result-item"
            :class="{ selected: isSelected('projects', item.id) }"
            @click="selectResult('project', item)"
            @mouseenter="hoverIndex = getGlobalIndex('projects', item.id)"
          >
            <span class="project-dot" :style="{ background: item.color }"></span>
            <span class="result-title">{{ item.name }}</span>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="results.tags.length" class="result-group">
          <div class="group-header">
            <Tag :size="16" />
            <span>Tags</span>
            <span class="count">{{ results.tags.length }}</span>
          </div>
          <div
            v-for="item in results.tags"
            :key="'tag-' + item.id"
            class="result-item tag-item"
            :class="{ selected: isSelected('tags', item.id) }"
            @click="selectResult('tag', item)"
            @mouseenter="hoverIndex = getGlobalIndex('tags', item.id)"
          >
            <span class="tag-icon">#</span>
            <span class="result-title">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="query && !isSearching" class="no-results">
        No results found for "{{ query }}"
      </div>

      <div v-else-if="recentItems.length" class="search-results">
        <div class="result-group">
          <div class="group-header">
            <Clock :size="16" />
            <span>Recent</span>
          </div>
          <div
            v-for="(item, index) in recentItems"
            :key="'recent-' + item.id"
            class="result-item"
            :class="{ selected: hoverIndex === index }"
            @click="selectResult('todo', item)"
            @mouseenter="hoverIndex = index"
          >
            <span class="result-title">{{ item.title }}</span>
            <span v-if="item.project_name" class="result-meta">{{ item.project_name }}</span>
          </div>
        </div>
      </div>

      <div v-else class="search-hint">
        Start typing to search across all items
      </div>
    </div>

    <!-- Preview Panel -->
    <ItemPreview v-if="hoveredItem" :item="hoveredItem.item" class="search-preview" />
    </div>
  </div>
</template>

<script>
import { Search, CheckSquare, FileText, Folder, Tag, Clock } from 'lucide-vue-next'
import { debounce } from '../utils/helpers.js'
import ItemPreview from './ItemPreview.vue'

export default {
  name: 'GlobalSearch',
  components: {
    Search,
    CheckSquare,
    FileText,
    Folder,
    Tag,
    Clock,
    ItemPreview
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    recentItems: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'select-todo', 'select-project', 'select-tag'],
  data() {
    return {
      query: '',
      results: {
        todos: [],
        projects: [],
        tags: []
      },
      isSearching: false,
      hoverIndex: -1
    }
  },
  computed: {
    todoResults() {
      // Todos are items with type 'todo' or null/undefined (legacy items)
      return this.results.todos.filter(t => !t.type || t.type === 'todo')
    },
    noteResults() {
      return this.results.todos.filter(t => t.type === 'note')
    },
    hasResults() {
      return this.results.todos.length > 0 ||
             this.results.projects.length > 0 ||
             this.results.tags.length > 0
    },
    flatResults() {
      const flat = []
      // Todos
      this.todoResults.forEach(item => {
        flat.push({ type: 'todos', item })
      })
      // Notes
      this.noteResults.forEach(item => {
        flat.push({ type: 'notes', item })
      })
      // Projects
      this.results.projects.forEach(item => {
        flat.push({ type: 'projects', item })
      })
      // Tags
      this.results.tags.forEach(item => {
        flat.push({ type: 'tags', item })
      })
      return flat
    },
    hoveredItem() {
      // When showing recent items (no query)
      if (!this.query && this.recentItems.length > 0) {
        if (this.hoverIndex < 0 || this.hoverIndex >= this.recentItems.length) return null
        return { type: 'todos', item: this.recentItems[this.hoverIndex] }
      }
      // When showing search results
      if (this.hoverIndex < 0 || this.hoverIndex >= this.flatResults.length) return null
      return this.flatResults[this.hoverIndex]
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.searchInput?.focus()
        })
        this.query = ''
        this.results = { todos: [], projects: [], tags: [] }
        this.hoverIndex = -1
      }
    }
  },
  created() {
    this.debouncedSearch = debounce(this.performSearch, 200)
  },
  methods: {
    async performSearch() {
      if (!this.query.trim()) {
        this.results = { todos: [], projects: [], tags: [] }
        return
      }

      this.isSearching = true
      try {
        this.results = await window.api.globalSearch(this.query.trim())
        this.hoverIndex = this.flatResults.length > 0 ? 0 : -1
      } catch (error) {
        console.error('Search failed:', error)
        this.results = { todos: [], projects: [], tags: [] }
      } finally {
        this.isSearching = false
      }
    },
    handleKeydown(event) {
      switch (event.key) {
        case 'Escape':
          this.close()
          break
        case 'ArrowDown':
          event.preventDefault()
          this.moveSelection(1)
          break
        case 'ArrowUp':
          event.preventDefault()
          this.moveSelection(-1)
          break
        case 'Enter':
          event.preventDefault()
          this.selectCurrentItem()
          break
      }
    },
    moveSelection(delta) {
      if (this.flatResults.length === 0) return
      const newIndex = this.hoverIndex + delta
      if (newIndex >= 0 && newIndex < this.flatResults.length) {
        this.hoverIndex = newIndex
      }
    },
    selectCurrentItem() {
      if (this.hoverIndex >= 0 && this.hoverIndex < this.flatResults.length) {
        const { type, item } = this.flatResults[this.hoverIndex]
        if (type === 'todos' || type === 'notes') {
          this.selectResult('todo', item)
        } else if (type === 'projects') {
          this.selectResult('project', item)
        } else if (type === 'tags') {
          this.selectResult('tag', item)
        }
      }
    },
    isSelected(type, id) {
      if (this.hoverIndex < 0 || this.hoverIndex >= this.flatResults.length) return false
      const { type: flatType, item } = this.flatResults[this.hoverIndex]
      return flatType === type && item.id === id
    },
    getGlobalIndex(type, id) {
      return this.flatResults.findIndex(f => f.type === type && f.item.id === id)
    },
    selectResult(type, item) {
      this.close()
      if (type === 'todo' || type === 'note') {
        this.$emit('select-todo', item.id)
      } else if (type === 'project') {
        this.$emit('select-project', item)
      } else if (type === 'tag') {
        this.$emit('select-tag', item)
      }
    },
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 1100;
}

.search-modal {
  background: var(--bg-secondary, #0d0d0d);
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 70vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #3a3f4b);
}

.search-icon {
  color: var(--text-secondary, #a0a0a0);
  flex-shrink: 0;
}

.search-input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary, #e0e0e0);
  font-size: 16px;
  outline: none;
}

.search-input-wrapper input::placeholder {
  color: var(--text-secondary, #a0a0a0);
}

.shortcut-hint {
  background: var(--bg-primary, #1a1f2e);
  color: var(--text-secondary, #a0a0a0);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
}

.search-results {
  overflow-y: auto;
  padding: 8px 0;
}

.result-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: var(--text-secondary, #a0a0a0);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-header .count {
  margin-left: auto;
  background: var(--bg-primary, #1a1f2e);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.result-item:hover,
.result-item.selected {
  background: var(--bg-hover, #2a2f3d);
}

.result-item.selected {
  background: var(--accent-color, #0f4c75);
}

.result-title {
  flex: 1;
  color: var(--text-primary, #e0e0e0);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  color: var(--text-secondary, #a0a0a0);
  font-size: 12px;
}

.project-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-icon {
  color: var(--text-secondary, #a0a0a0);
  font-weight: 600;
  flex-shrink: 0;
}

.search-loading,
.no-results,
.search-hint {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary, #a0a0a0);
}

.search-loading {
  font-style: italic;
}

.search-container {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  max-width: 600px;
  width: 100%;
}

.search-preview {
  position: fixed;
  right: 16px;
  top: 80px;
}
</style>
