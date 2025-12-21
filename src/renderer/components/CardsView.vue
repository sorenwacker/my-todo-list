<template>
  <div class="cards-view">
    <template v-if="groupByProject">
      <div v-for="group in groupedTodos" :key="group.id" class="cards-group">
        <div class="group-header" :style="{ borderLeftColor: group.color || '#666' }">
          <span class="group-dot" :style="{ background: group.color || '#666' }"></span>
          <span class="group-name">{{ group.name }}</span>
          <span class="group-count">{{ group.todos.length }}</span>
        </div>
        <draggable
          :model-value="group.todos"
          item-key="id"
          class="cards-grid masonry"
          :style="{ '--card-width': cardSize + 'px' }"
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
              @click="$emit('card-click', $event, element.id)"
              @mousedown="$emit('card-mousedown', $event, element.id)"
              @mouseup="$emit('card-resize', $event, element.id)"
              @toggle-complete="$emit('toggle-complete', element)"
              @delete="$emit('delete-todo', element.id)"
              @restore="$emit('restore-todo', element.id)"
              @permanent-delete="$emit('permanent-delete-todo', element.id)"
            />
          </template>
        </draggable>
      </div>
    </template>
    <template v-else>
      <draggable
        :model-value="sortedTodos"
        item-key="id"
        class="cards-grid masonry"
        :style="{ '--card-width': cardSize + 'px' }"
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
            @click="$emit('card-click', $event, element.id)"
            @mousedown="$emit('card-mousedown', $event, element.id)"
            @mouseup="$emit('card-resize', $event, element.id)"
            @toggle-complete="$emit('toggle-complete', element)"
            @delete="$emit('delete-todo', element.id)"
            @restore="$emit('restore-todo', element.id)"
            @permanent-delete="$emit('permanent-delete-todo', element.id)"
          />
        </template>
      </draggable>
    </template>
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
    cardSize: {
      type: Number,
      default: 250
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
    }
  },
  emits: [
    'card-click',
    'card-mousedown',
    'card-resize',
    'toggle-complete',
    'delete-todo',
    'restore-todo',
    'permanent-delete-todo',
    'update-sorted-todos',
    'drag-end',
    'update-group-todos',
    'group-drag-end'
  ],
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
    }
  }
}
</script>
