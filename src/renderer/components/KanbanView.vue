<template>
  <div class="kanban-view-wrapper">
    <div class="kanban-group-toggle">
      <button v-if="!isProjectSelected" :class="{ active: kanbanGroupBy === 'project' }" @click="$emit('update:kanban-group-by', 'project')">By Project</button>
      <button :class="{ active: kanbanGroupBy === 'category' }" @click="$emit('update:kanban-group-by', 'category')">By Category</button>
      <button :class="{ active: kanbanGroupBy === 'status' }" @click="$emit('update:kanban-group-by', 'status')">By Status</button>
    </div>

    <div class="kanban-view">
      <!-- Project-based Kanban -->
      <template v-if="effectiveKanbanGroupBy === 'project'">
        <div class="kanban-column inbox-column">
          <div class="column-header">
            <span class="column-dot" style="background: #666"></span>
            <h3>Inbox</h3>
            <span class="column-count">{{ inboxTodos.length }}</span>
          </div>
          <draggable
            v-model="localInboxTodos"
            item-key="id"
            class="kanban-cards"
            group="kanban"
            ghost-class="ghost"
            @end="onKanbanDrop($event, null)"
          >
            <template #item="{ element }">
              <KanbanCard
                :todo="element"
                :selected="selectedTodoId === element.id"
                :border-color="element.category_color || '#666'"
                @select="$emit('select-todo', element.id)"
                @toggle-complete="$emit('toggle-complete', element)"
                @delete="$emit('delete-todo', element.id)"
              />
            </template>
          </draggable>
          <button class="kanban-add-btn" @click="$emit('add-todo-to-project', null)">+ Add</button>
        </div>

        <div
          v-for="project in projects"
          :key="project.id"
          class="kanban-column"
          :style="{ borderTopColor: project.color }"
        >
          <div class="column-header">
            <span class="column-dot" :style="{ background: project.color }"></span>
            <h3>{{ project.name }}</h3>
            <span class="column-count">{{ getProjectTodos(project.id).length }}</span>
          </div>
          <draggable
            :model-value="getProjectTodos(project.id)"
            item-key="id"
            class="kanban-cards"
            group="kanban"
            ghost-class="ghost"
            @update:model-value="$emit('update-project-todos', project.id, $event)"
            @end="onKanbanDrop($event, project.id)"
          >
            <template #item="{ element }">
              <KanbanCard
                :todo="element"
                :selected="selectedTodoId === element.id"
                :border-color="project.color"
                @select="$emit('select-todo', element.id)"
                @toggle-complete="$emit('toggle-complete', element)"
                @delete="$emit('delete-todo', element.id)"
              />
            </template>
          </draggable>
          <button class="kanban-add-btn" @click="$emit('add-todo-to-project', project.id)">+ Add</button>
        </div>
      </template>

      <!-- Category-based Kanban -->
      <template v-else-if="effectiveKanbanGroupBy === 'category'">
        <div class="kanban-column uncategorized-column">
          <div class="column-header">
            <span class="column-dot" style="background: #fff; border: 1px solid #ccc"></span>
            <h3>Uncategorized</h3>
            <span class="column-count">{{ uncategorizedTodos.length }}</span>
          </div>
          <draggable
            :model-value="uncategorizedTodos"
            item-key="id"
            class="kanban-cards"
            group="kanban-category"
            ghost-class="ghost"
            data-category-id=""
            @update:model-value="$emit('update-category-todos', null, $event)"
            @end="onKanbanDropCategory"
          >
            <template #item="{ element }">
              <KanbanCard
                :todo="element"
                :selected="selectedTodoId === element.id"
                :border-color="element.project_color || '#333'"
                show-project
                @select="$emit('select-todo', element.id)"
                @toggle-complete="$emit('toggle-complete', element)"
                @delete="$emit('delete-todo', element.id)"
              />
            </template>
          </draggable>
          <button class="kanban-add-btn" @click="$emit('add-todo-to-category', null)">+ Add</button>
        </div>

        <div
          v-for="category in categories"
          :key="category.id"
          class="kanban-column"
        >
          <div class="column-header">
            <span class="column-symbol">{{ category.symbol || '*' }}</span>
            <h3>{{ category.name }}</h3>
            <span class="column-count">{{ getCategoryTodos(category.id).length }}</span>
          </div>
          <draggable
            :model-value="getCategoryTodos(category.id)"
            item-key="id"
            class="kanban-cards"
            group="kanban-category"
            ghost-class="ghost"
            :data-category-id="category.id"
            @update:model-value="$emit('update-category-todos', category.id, $event)"
            @end="onKanbanDropCategory"
          >
            <template #item="{ element }">
              <KanbanCard
                :todo="element"
                :selected="selectedTodoId === element.id"
                :border-color="element.project_color || '#666'"
                show-project
                @select="$emit('select-todo', element.id)"
                @toggle-complete="$emit('toggle-complete', element)"
                @delete="$emit('delete-todo', element.id)"
              />
            </template>
          </draggable>
          <button class="kanban-add-btn" @click="$emit('add-todo-to-category', category.id)">+ Add</button>
        </div>
      </template>

      <!-- Status-based Kanban -->
      <template v-else-if="effectiveKanbanGroupBy === 'status'">
        <div class="kanban-column no-status-column">
          <div class="column-header">
            <span class="column-dot" style="background: #666"></span>
            <h3>No Status</h3>
            <span class="column-count">{{ noStatusTodos.length }}</span>
          </div>
          <draggable
            :model-value="noStatusTodos"
            item-key="id"
            class="kanban-cards"
            group="kanban-status"
            ghost-class="ghost"
            data-status-id=""
            @update:model-value="$emit('update-status-todos', null, $event)"
            @end="onKanbanDropStatus"
          >
            <template #item="{ element }">
              <KanbanCard
                :todo="element"
                :selected="selectedTodoId === element.id"
                :border-color="element.project_color || '#333'"
                show-project
                @select="$emit('select-todo', element.id)"
                @toggle-complete="$emit('toggle-complete', element)"
                @delete="$emit('delete-todo', element.id)"
              />
            </template>
          </draggable>
          <button class="kanban-add-btn" @click="$emit('add-todo-to-status', null)">+ Add</button>
        </div>

        <div
          v-for="status in statuses"
          :key="status.id"
          class="kanban-column"
          :style="{ borderTopColor: status.color }"
        >
          <div class="column-header">
            <span class="column-dot" :style="{ background: status.color }"></span>
            <h3>{{ status.name }}</h3>
            <span class="column-count">{{ getStatusTodos(status.id).length }}</span>
          </div>
          <draggable
            :model-value="getStatusTodos(status.id)"
            item-key="id"
            class="kanban-cards"
            group="kanban-status"
            ghost-class="ghost"
            :data-status-id="status.id"
            @update:model-value="$emit('update-status-todos', status.id, $event)"
            @end="onKanbanDropStatus"
          >
            <template #item="{ element }">
              <KanbanCard
                :todo="element"
                :selected="selectedTodoId === element.id"
                :border-color="element.project_color || status.color"
                show-project
                @select="$emit('select-todo', element.id)"
                @toggle-complete="$emit('toggle-complete', element)"
                @delete="$emit('delete-todo', element.id)"
              />
            </template>
          </draggable>
          <button class="kanban-add-btn" @click="$emit('add-todo-to-status', status.id)">+ Add</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import KanbanCard from './KanbanCard.vue'

export default {
  name: 'KanbanView',
  components: {
    draggable,
    KanbanCard
  },
  props: {
    kanbanGroupBy: {
      type: String,
      required: true
    },
    effectiveKanbanGroupBy: {
      type: String,
      required: true
    },
    isProjectSelected: {
      type: Boolean,
      default: false
    },
    projects: {
      type: Array,
      default: () => []
    },
    categories: {
      type: Array,
      default: () => []
    },
    statuses: {
      type: Array,
      default: () => []
    },
    inboxTodos: {
      type: Array,
      default: () => []
    },
    uncategorizedTodos: {
      type: Array,
      default: () => []
    },
    noStatusTodos: {
      type: Array,
      default: () => []
    },
    selectedTodoId: {
      type: Number,
      default: null
    },
    allTodos: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    'update:kanban-group-by',
    'select-todo',
    'toggle-complete',
    'delete-todo',
    'add-todo-to-project',
    'add-todo-to-category',
    'add-todo-to-status',
    'update-project-todos',
    'update-category-todos',
    'update-status-todos',
    'kanban-drop',
    'kanban-drop-category',
    'kanban-drop-status'
  ],
  computed: {
    localInboxTodos: {
      get() {
        return this.inboxTodos
      },
      set(value) {
        this.$emit('update-inbox-todos', value)
      }
    }
  },
  methods: {
    getProjectTodos(projectId) {
      return this.allTodos.filter(t => t.project_id === projectId && !t.deleted)
    },
    getCategoryTodos(categoryId) {
      return this.allTodos.filter(t => t.category_id === categoryId && !t.deleted)
    },
    getStatusTodos(statusId) {
      return this.allTodos.filter(t => t.status_id === statusId && !t.deleted)
    },
    onKanbanDrop(event, projectId) {
      this.$emit('kanban-drop', event, projectId)
    },
    onKanbanDropCategory(event) {
      this.$emit('kanban-drop-category', event)
    },
    onKanbanDropStatus(event) {
      this.$emit('kanban-drop-status', event)
    }
  }
}
</script>
