<template>
  <div
    class="cards-view"
    ref="cardsViewRef"
    @mousedown="onContainerMouseDown"
    @mousemove="onContainerMouseMove"
    @mouseup="onContainerMouseUp"
    @mouseleave="onContainerMouseUp"
  >
    <!-- Selection Box -->
    <div
      v-if="isSelecting"
      class="selection-box"
      :style="selectionBoxStyle"
    ></div>
    <template v-if="groupByProject">
      <div class="cards-groups-container" :style="{ '--card-columns': cardColumns }">
        <div v-for="group in groupedTodos" :key="group.id" class="cards-group">
          <div class="group-header" :style="{ borderLeftColor: group.color || '#666' }">
            <span class="group-dot" :style="{ background: group.color || '#666' }"></span>
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">{{ group.todos.length }}</span>
          </div>
          <button class="add-card-btn" @click="$emit('add-todo-to-project', group.id)">+ Add</button>
          <draggable
            :model-value="group.todos"
            item-key="id"
            class="cards-grid masonry"
            :style="{ '--card-columns': cardColumns }"
            ghost-class="ghost"
            :disabled="sortBy !== 'manual'"
            @update:model-value="$emit('update-group-todos', group.id, $event)"
            @end="$emit('group-drag-end', group.id, $event)"
          >
            <template #item="{ element }">
              <CardItem
                :todo="element"
                :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                :focused="focusedTodoId === element.id"
                :is-trash-view="isTrashView"
                :selected-todo-ids="selectedTodoIds"
                :card-style="getCardStyle(element.id, element.project_color)"
                :current-filter="currentFilter"
                :show-project="false"
                :grid-lock="gridLock"
                @click="$emit('card-click', $event, element.id)"
                @mousedown="$emit('card-mousedown', $event, element.id)"
                @mouseup="$emit('card-resize', $event, element.id)"
                @toggle-complete="$emit('toggle-complete', element)"
                @toggle-subtask="$emit('toggle-subtask', $event)"
                @delete="$emit('delete-todo', element.id)"
                @restore="$emit('restore-todo', element.id)"
                @permanent-delete="$emit('permanent-delete-todo', element.id)"
              />
            </template>
          </draggable>
        </div>
      </div>
    </template>
    <!-- Filtered by Topic (when a topic is selected via double-click) -->
    <template v-else-if="hasTopics && isTopicFiltered">
      <div class="filtered-topic-view">
        <!-- Topic chips for drag-drop targets -->
        <div class="topic-chips-bar">
          <div
            v-for="topic in topics"
            :key="topic.id"
            class="topic-chip"
            :class="{ active: selectedTopicId === topic.id, 'drag-over': dragOverTopicId === topic.id }"
            :style="{ background: selectedTopicId === topic.id ? topic.color : 'var(--bg-tertiary)', color: selectedTopicId === topic.id ? '#fff' : 'var(--text-secondary)', border: dragOverTopicId === topic.id ? '2px solid ' + topic.color : '1px solid transparent' }"
            @click="$emit('select-topic', topic.id)"
            @dragover.prevent
            @dragenter="onTopicDragEnter(topic.id)"
            @dragleave="onTopicDragLeave"
            @drop="onTopicDrop($event, topic.id)"
          >
            <span :style="{ width: '6px', height: '6px', borderRadius: '50%', background: topic.color }"></span>
            {{ topic.name }}
          </div>
          <div
            class="topic-chip"
            :class="{ 'drag-over': dragOverTopicId === null }"
            :style="{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: dragOverTopicId === null ? '2px solid var(--border-color)' : '1px solid transparent' }"
            @dragover.prevent
            @dragenter="onTopicDragEnter(null)"
            @dragleave="onTopicDragLeave"
            @drop="onTopicDrop($event, null)"
          >
            No Topic
          </div>
        </div>
        <draggable
          :model-value="filteredByTopic"
          item-key="id"
          class="cards-grid masonry"
          :style="{ '--card-columns': cardColumns }"
          ghost-class="ghost"
          :disabled="sortBy !== 'manual'"
          @update:model-value="$emit('reorder-todos', $event.map(t => t.id))"
        >
          <template #item="{ element }">
            <CardItem
              :todo="element"
              :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
              :focused="focusedTodoId === element.id"
              :is-trash-view="isTrashView"
                :selected-todo-ids="selectedTodoIds"
              :card-style="getCardStyle(element.id, element.project_color)"
              :current-filter="currentFilter"
              :show-project="false"
              :grid-lock="gridLock"
              @click="$emit('card-click', $event, element.id)"
              @mousedown="$emit('card-mousedown', $event, element.id)"
              @mouseup="$emit('card-resize', $event, element.id)"
              @toggle-complete="$emit('toggle-complete', element)"
              @toggle-subtask="$emit('toggle-subtask', $event)"
              @delete="$emit('delete-todo', element.id)"
              @restore="$emit('restore-todo', element.id)"
              @permanent-delete="$emit('permanent-delete-todo', element.id)"
            />
          </template>
        </draggable>
      </div>
    </template>
    <!-- Topic Groups (when viewing a project with topics) -->
    <template v-else-if="hasTopics">
      <div class="topic-boxes-container" :style="{ gridTemplateColumns: `repeat(${cardColumns}, 1fr)` }">
        <div
          v-for="group in topicGroups"
          :key="group.id ?? 'no-topic'"
          class="topic-box"
          :class="{ 'drag-over': dragOverTopicId === group.id }"
          :style="{ '--topic-color': group.color }"
          @dragover.prevent
          @dragenter="onTopicDragEnter(group.id)"
          @dragleave="onTopicDragLeave"
          @drop.stop="onTopicDrop($event, group.id)"
        >
          <div class="topic-box-header" @dblclick="$emit('select-topic', group.id)" @contextmenu.prevent="showTopicContextMenu($event, group)">
            <span class="topic-dot" :style="{ background: group.color, width: '10px', height: '10px', borderRadius: '50%' }"></span>
            <span class="topic-name">{{ group.name }}</span>
            <span class="topic-count">{{ group.todos.length }}</span>
            <button class="topic-add-btn" @click.stop="$emit('add-todo-to-topic', group.id)">+</button>
          </div>
          <div class="topic-box-cards">
            <CardItem
              v-for="todo in group.todos"
              :key="todo.id"
              :todo="todo"
              :selected="selectedTodoId === todo.id || selectedTodoIds.has(todo.id)"
              :focused="focusedTodoId === todo.id"
              :is-trash-view="isTrashView"
                :selected-todo-ids="selectedTodoIds"
              :card-style="getCardStyle(todo.id, todo.project_color)"
              :current-filter="currentFilter"
              :show-project="false"
              :grid-lock="gridLock"
              :is-draggable="true"
              @click="$emit('card-click', $event, todo.id)"
              @mousedown="$emit('card-mousedown', $event, todo.id)"
              @mouseup="$emit('card-resize', $event, todo.id)"
              @toggle-complete="$emit('toggle-complete', todo)"
              @toggle-subtask="$emit('toggle-subtask', $event)"
              @delete="$emit('delete-todo', todo.id)"
              @restore="$emit('restore-todo', todo.id)"
              @permanent-delete="$emit('permanent-delete-todo', todo.id)"
            />
          </div>
        </div>
        <!-- Add Topic Button -->
        <div class="topic-box add-topic-box" v-if="!showTopicInput" @click="showTopicInput = true">
          <span class="add-topic-label">+ Add Topic</span>
        </div>
        <div class="topic-box add-topic-box" v-else>
          <input
            ref="topicInput"
            v-model="newTopicName"
            class="topic-input"
            class="topic-name-input"
            placeholder="Topic name..."
            @keyup.enter="addTopic"
            @keyup.esc="showTopicInput = false; newTopicName = ''"
            @blur="showTopicInput = false"
          />
        </div>
      </div>
    </template>
    <template v-else>
      <!-- Create Topic button for projects without topics -->
      <div v-if="isProjectView && !showTopicInput" class="create-topic-bar">
        <button
          class="create-topic-btn"
          class="create-topic-btn-inner"
          @click="showTopicInput = true"
        >
          + Create Topic
        </button>
      </div>
      <div v-if="isProjectView && showTopicInput" class="create-topic-bar create-topic-bar-input">
        <input
          ref="topicInput"
          v-model="newTopicName"
          class="create-topic-input"
          placeholder="Topic name..."
          @keyup.enter="addTopic"
          @keyup.esc="showTopicInput = false; newTopicName = ''"
          @blur="showTopicInput = false"
        />
      </div>
      <draggable
        :model-value="sortedTodos"
        item-key="id"
        class="cards-grid masonry"
        :style="{ '--card-columns': cardColumns }"
        ghost-class="ghost"
        :disabled="sortBy !== 'manual'"
        @update:model-value="$emit('update-sorted-todos', $event)"
        @end="$emit('drag-end', $event)"
      >
        <template #item="{ element }">
          <CardItem
            :todo="element"
            :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
            :focused="focusedTodoId === element.id"
            :is-trash-view="isTrashView"
                :selected-todo-ids="selectedTodoIds"
            :card-style="getCardStyle(element.id, element.project_color)"
            :current-filter="currentFilter"
            :show-project="currentFilter === null"
            :grid-lock="gridLock"
            @click="$emit('card-click', $event, element.id)"
            @mousedown="$emit('card-mousedown', $event, element.id)"
            @mouseup="$emit('card-resize', $event, element.id)"
            @toggle-complete="$emit('toggle-complete', element)"
            @toggle-subtask="$emit('toggle-subtask', $event)"
            @delete="$emit('delete-todo', element.id)"
            @restore="$emit('restore-todo', element.id)"
            @permanent-delete="$emit('permanent-delete-todo', element.id)"
          />
        </template>
      </draggable>
    </template>

    <!-- Topic Context Menu -->
    <div
      v-if="topicContextMenu.show"
      class="topic-context-menu"
      :style="{ top: topicContextMenu.y + 'px', left: topicContextMenu.x + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="renameTopic">Rename</div>
      <div class="context-menu-item danger" @click="deleteTopic">Delete</div>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import CardItem from './CardItem.vue'

export default {
  name: 'CardsView',
  components: {
    draggable,
    CardItem
  },
  props: {
    sortedTodos: {
      type: Array,
      default: () => []
    },
    groupedTodos: {
      type: Array,
      default: () => []
    },
    groupByProject: {
      type: Boolean,
      default: false
    },
    topics: {
      type: Array,
      default: () => []
    },
    selectedTopicId: {
      type: Number,
      default: null
    },
    selectedTodoId: {
      type: Number,
      default: null
    },
    selectedTodoIds: {
      type: Set,
      default: () => new Set()
    },
    focusedTodoId: {
      type: Number,
      default: null
    },
    isTrashView: {
      type: Boolean,
      default: false
    },
    cardColumns: {
      type: Number,
      default: 3
    },
    sortBy: {
      type: String,
      default: 'manual'
    },
    currentFilter: {
      default: null
    },
    cardWidths: {
      type: Object,
      default: () => ({})
    },
    gridLock: {
      type: Boolean,
      default: false
    },
    isProjectView: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'card-click',
    'card-mousedown',
    'card-resize',
    'toggle-complete',
    'toggle-subtask',
    'delete-todo',
    'restore-todo',
    'permanent-delete-todo',
    'update-sorted-todos',
    'drag-end',
    'update-group-todos',
    'group-drag-end',
    'add-todo-to-project',
    'drop-on-topic',
    'add-topic',
    'select-topic',
    'edit-topic',
    'delete-topic',
    'reorder-todos',
    'add-todo-to-topic',
    'marquee-select'
  ],
  computed: {
    hasTopics() {
      return this.topics && this.topics.length > 0
    },
    isTopicFiltered() {
      return this.selectedTopicId !== null
    },
    filteredByTopic() {
      if (!this.isTopicFiltered) return this.sortedTodos
      return this.sortedTodos.filter(t => t.topic_id === this.selectedTopicId)
    },
    topicGroups() {
      if (!this.hasTopics) return []
      // "No Topic" group first for unassigned items
      const unassigned = this.sortedTodos.filter(t => !t.topic_id)
      const groups = [{
        id: null,
        name: 'No Topic',
        color: '#666',
        todos: unassigned
      }]
      // Then add topic groups
      this.topics.forEach(topic => {
        groups.push({
          id: topic.id,
          name: topic.name,
          color: topic.color,
          todos: this.sortedTodos.filter(t => t.topic_id === topic.id)
        })
      })
      return groups
    },
    selectionBoxStyle() {
      const left = Math.min(this.selectionStart.x, this.selectionCurrent.x)
      const top = Math.min(this.selectionStart.y, this.selectionCurrent.y)
      const width = Math.abs(this.selectionCurrent.x - this.selectionStart.x)
      const height = Math.abs(this.selectionCurrent.y - this.selectionStart.y)
      return {
        left: left + 'px',
        top: top + 'px',
        width: width + 'px',
        height: height + 'px'
      }
    }
  },
  data() {
    return {
      dragOverTopicId: null,
      showTopicInput: false,
      newTopicName: '',
      topicContextMenu: {
        show: false,
        x: 0,
        y: 0,
        topic: null
      },
      // Marquee selection
      isSelecting: false,
      selectionStart: { x: 0, y: 0 },
      selectionCurrent: { x: 0, y: 0 }
    }
  },
  mounted() {
    document.addEventListener('click', this.hideTopicContextMenu)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.hideTopicContextMenu)
  },
  methods: {
    getCardStyle(todoId, projectColor) {
      const width = this.cardWidths[todoId]
      const style = {}
      if (width && !this.gridLock) {
        style.width = width + 'px'
        style.flex = 'none'
      }
      if (projectColor) {
        style.borderLeftColor = projectColor
      }
      return style
    },
    onTopicDragEnter(topicId) {
      this.dragOverTopicId = topicId
    },
    onTopicDragLeave() {
      this.dragOverTopicId = null
    },
    onTopicDrop(event, topicId) {
      console.log('onTopicDrop called, topicId:', topicId)
      this.dragOverTopicId = null
      const data = event.dataTransfer.getData('text/plain')
      console.log('dataTransfer data:', data)

      // Parse the data - could be JSON array or single ID
      let todoIds = []
      try {
        const parsed = JSON.parse(data)
        todoIds = Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        // Fallback for single ID (old format)
        const todoId = parseInt(data)
        if (todoId) todoIds = [todoId]
      }

      if (todoIds.length > 0) {
        console.log('Emitting drop-on-topic:', todoIds, topicId)
        this.$emit('drop-on-topic', todoIds, topicId)
      }
    },
    addTopic() {
      if (this.newTopicName.trim()) {
        this.$emit('add-topic', this.newTopicName.trim())
        this.newTopicName = ''
        this.showTopicInput = false
      }
    },
    showTopicContextMenu(event, topic) {
      if (!topic.id) return // Don't show for "No Topic" group
      this.topicContextMenu = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        topic
      }
    },
    hideTopicContextMenu() {
      this.topicContextMenu.show = false
    },
    renameTopic() {
      const newName = prompt('Rename topic:', this.topicContextMenu.topic?.name)
      if (newName && newName.trim()) {
        this.$emit('edit-topic', { ...this.topicContextMenu.topic, name: newName.trim() })
      }
      this.hideTopicContextMenu()
    },
    deleteTopic() {
      if (confirm(`Delete topic "${this.topicContextMenu.topic?.name}"? Items will be moved to "No Topic".`)) {
        this.$emit('delete-topic', this.topicContextMenu.topic?.id)
      }
      this.hideTopicContextMenu()
    },
    // Marquee selection methods
    onContainerMouseDown(event) {
      // Only start selection if clicking on empty space (not on a card or interactive element)
      const target = event.target
      const isCard = target.closest('.todo-card, .kanban-card, .topic-box-header, button, input, select, a')
      if (isCard) return

      // Get position relative to container
      const container = this.$refs.cardsViewRef
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left + container.scrollLeft
      const y = event.clientY - rect.top + container.scrollTop

      this.isSelecting = true
      this.selectionStart = { x, y }
      this.selectionCurrent = { x, y }

      // Prevent text selection
      event.preventDefault()
    },
    onContainerMouseMove(event) {
      if (!this.isSelecting) return

      const container = this.$refs.cardsViewRef
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left + container.scrollLeft
      const y = event.clientY - rect.top + container.scrollTop

      this.selectionCurrent = { x, y }

      // Find cards that intersect with selection box
      this.updateSelectionFromBox()
    },
    onContainerMouseUp() {
      if (!this.isSelecting) return

      // Finalize selection
      this.updateSelectionFromBox()
      this.isSelecting = false
    },
    updateSelectionFromBox() {
      const container = this.$refs.cardsViewRef
      if (!container) return

      // Calculate selection box bounds
      const boxLeft = Math.min(this.selectionStart.x, this.selectionCurrent.x)
      const boxTop = Math.min(this.selectionStart.y, this.selectionCurrent.y)
      const boxRight = Math.max(this.selectionStart.x, this.selectionCurrent.x)
      const boxBottom = Math.max(this.selectionStart.y, this.selectionCurrent.y)

      // Skip if selection is too small (likely just a click)
      if (boxRight - boxLeft < 10 && boxBottom - boxTop < 10) return

      // Find all cards in the container
      const cards = container.querySelectorAll('.todo-card')
      const containerRect = container.getBoundingClientRect()
      const selectedIds = []

      cards.forEach(card => {
        const cardRect = card.getBoundingClientRect()
        // Convert card rect to container-relative coordinates
        const cardLeft = cardRect.left - containerRect.left + container.scrollLeft
        const cardTop = cardRect.top - containerRect.top + container.scrollTop
        const cardRight = cardLeft + cardRect.width
        const cardBottom = cardTop + cardRect.height

        // Check intersection
        const intersects = !(cardRight < boxLeft || cardLeft > boxRight || cardBottom < boxTop || cardTop > boxBottom)

        if (intersects) {
          // Get todo ID from data attribute
          const todoId = parseInt(card.dataset.todoId)
          if (todoId) {
            selectedIds.push(todoId)
          }
        }
      })

      if (selectedIds.length > 0) {
        this.$emit('marquee-select', selectedIds)
      }
    }
  }
}
</script>

<style scoped>
.cards-view {
  position: relative;
}

.selection-box {
  position: absolute;
  border: 2px solid rgba(26, 111, 171, 0.8);
  background: rgba(26, 111, 171, 0.15);
  pointer-events: none;
  z-index: 100;
  border-radius: 2px;
}

/* Topic chips bar */
.topic-chips-bar {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
}

.topic-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}

/* Topic boxes container */
.topic-boxes-container {
  display: grid;
  gap: 16px;
  padding: 16px;
  align-items: start;
}

.topic-box {
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  min-height: 150px;
}

.topic-box-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
}

.topic-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
}

.topic-count {
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.topic-add-btn {
  padding: 2px 8px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
}

.topic-add-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.topic-box-cards {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-primary);
  border-radius: 0 0 8px 8px;
}

/* Add topic box */
.add-topic-box {
  min-height: 100px;
  background: transparent;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.add-topic-label {
  color: var(--text-muted);
  font-size: 14px;
}

.topic-name-input {
  width: calc(100% - 32px);
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

/* Create topic bar */
.create-topic-bar {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}

.create-topic-bar-input {
  display: flex;
  gap: 8px;
}

.create-topic-btn-inner {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
}

.create-topic-btn-inner:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.create-topic-input {
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  flex: 1;
  max-width: 200px;
  outline: none;
}

/* Context menu */
.topic-context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  min-width: 120px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 13px;
}

.context-menu-item:hover {
  background: var(--hover-bg);
}

.context-menu-item.danger {
  color: #e74c3c;
}

.context-menu-item.danger:hover {
  background: rgba(231, 76, 60, 0.2);
}
</style>
