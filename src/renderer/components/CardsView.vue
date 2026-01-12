<template>
  <div class="cards-view">
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
                :selected="selectedTodoId === element.id"
                :focused="focusedTodoId === element.id"
                :is-trash-view="isTrashView"
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
        <div class="topic-chips-bar" style="display: flex; gap: 8px; padding: 8px 16px; background: #1a1a1a; border-bottom: 1px solid #333; flex-wrap: wrap;">
          <div
            v-for="topic in topics"
            :key="topic.id"
            class="topic-chip"
            :class="{ active: selectedTopicId === topic.id, 'drag-over': dragOverTopicId === topic.id }"
            :style="{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: selectedTopicId === topic.id ? topic.color : '#2a2a2a', borderRadius: '12px', fontSize: '12px', color: selectedTopicId === topic.id ? '#fff' : '#ccc', cursor: 'pointer', border: dragOverTopicId === topic.id ? '2px solid ' + topic.color : '1px solid transparent' }"
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
            :style="{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#2a2a2a', borderRadius: '12px', fontSize: '12px', color: '#888', cursor: 'pointer', border: dragOverTopicId === null ? '2px solid #666' : '1px solid transparent' }"
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
              :selected="selectedTodoId === element.id"
              :focused="focusedTodoId === element.id"
              :is-trash-view="isTrashView"
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
      <div class="topic-boxes-container" :style="{ display: 'grid', gridTemplateColumns: `repeat(${cardColumns}, 1fr)`, gap: '16px', padding: '16px', alignItems: 'start' }">
        <div
          v-for="group in topicGroups"
          :key="group.id ?? 'no-topic'"
          class="topic-box"
          :class="{ 'drag-over': dragOverTopicId === group.id }"
          :style="{ '--topic-color': group.color, background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', display: 'flex', flexDirection: 'column', minHeight: '150px' }"
          @dragover.prevent
          @dragenter="onTopicDragEnter(group.id)"
          @dragleave="onTopicDragLeave"
          @drop.stop="onTopicDrop($event, group.id)"
        >
          <div class="topic-box-header" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #222; border-radius: 8px 8px 0 0; border-bottom: 1px solid #333; cursor: pointer;" @dblclick="$emit('select-topic', group.id)" @contextmenu.prevent="showTopicContextMenu($event, group)">
            <span class="topic-dot" :style="{ background: group.color, width: '10px', height: '10px', borderRadius: '50%' }"></span>
            <span class="topic-name" style="flex: 1; font-weight: 500; color: #eee;">{{ group.name }}</span>
            <span class="topic-count" style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px; font-size: 12px; color: #888;">{{ group.todos.length }}</span>
          </div>
          <div
            class="topic-box-cards"
            style="flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #000; border-radius: 0 0 8px 8px;"
          >
            <button class="add-card-btn" @click="$emit('add-todo-to-topic', group.id)">+ Add</button>
            <CardItem
              v-for="todo in group.todos"
              :key="todo.id"
              :todo="todo"
              :selected="selectedTodoId === todo.id"
              :focused="focusedTodoId === todo.id"
              :is-trash-view="isTrashView"
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
        <div class="topic-box add-topic-box" style="min-height: 100px; background: transparent; border: 2px dashed #444; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer;" v-if="!showTopicInput" @click="showTopicInput = true">
          <span class="add-topic-label" style="color: #666; font-size: 14px;">+ Add Topic</span>
        </div>
        <div class="topic-box add-topic-box" style="min-height: 100px; background: transparent; border: 2px dashed #444; border-radius: 8px; display: flex; justify-content: center; align-items: center;" v-else>
          <input
            ref="topicInput"
            v-model="newTopicName"
            class="topic-input"
            style="width: calc(100% - 32px); padding: 10px 14px; background: #2a2a2a; border: 1px solid #555; border-radius: 6px; font-size: 14px; color: #fff; outline: none;"
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
      <div v-if="isProjectView && !showTopicInput" class="create-topic-bar" style="padding: 12px 16px; border-bottom: 1px solid #333;">
        <button
          class="create-topic-btn"
          style="padding: 6px 12px; background: #2a2a2a; border: 1px dashed #555; border-radius: 6px; color: #888; cursor: pointer; font-size: 13px;"
          @click="showTopicInput = true"
        >
          + Create Topic
        </button>
      </div>
      <div v-if="isProjectView && showTopicInput" class="create-topic-bar" style="padding: 12px 16px; border-bottom: 1px solid #333; display: flex; gap: 8px;">
        <input
          ref="topicInput"
          v-model="newTopicName"
          style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #555; border-radius: 6px; color: #fff; font-size: 13px; flex: 1; max-width: 200px;"
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
            :selected="selectedTodoId === element.id"
            :focused="focusedTodoId === element.id"
            :is-trash-view="isTrashView"
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
    'add-todo-to-topic'
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
      }
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
      const todoId = parseInt(data)
      if (todoId) {
        console.log('Emitting drop-on-topic:', todoId, topicId)
        this.$emit('drop-on-topic', todoId, topicId)
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
    }
  }
}
</script>

<style scoped>
.topic-context-menu {
  position: fixed;
  z-index: 1000;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  min-width: 120px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  color: #e0e0e0;
  font-size: 13px;
}

.context-menu-item:hover {
  background: #3a3a3a;
}

.context-menu-item.danger {
  color: #e74c3c;
}

.context-menu-item.danger:hover {
  background: rgba(231, 76, 60, 0.2);
}
</style>
