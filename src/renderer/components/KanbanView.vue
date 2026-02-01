<template>
  <div class="kanban-view-wrapper" @dragover="onDragOver" @dragend="onDragEnd" @dragleave="onDragEnd" @drop="onDragEnd">
    <div class="kanban-group-toggle">
      <button v-if="!isProjectSelected" :class="{ active: kanbanGroupBy === 'project' }" @click="$emit('update:kanban-group-by', 'project')">By Project</button>
      <button :class="{ active: kanbanGroupBy === 'category' }" @click="$emit('update:kanban-group-by', 'category')">By Category</button>
      <button :class="{ active: kanbanGroupBy === 'status' }" @click="$emit('update:kanban-group-by', 'status')">By Status</button>
    </div>

    <!-- Stacked Kanban Boards (when groupByProject is active) -->
    <template v-if="groupByProject && !isProjectSelected">
      <div class="kanban-stacked">
        <div v-for="group in groupedTodos" :key="group.id" class="kanban-project-section">
          <div class="kanban-project-header" :style="{ borderLeftColor: group.color }">
            <span class="project-dot" :style="{ background: group.color }"></span>
            <h3>{{ group.name }}</h3>
            <span class="project-count">{{ group.todos.length }}</span>
          </div>
          <div class="kanban-view">
            <div
              v-for="status in statuses"
              :key="status.id"
              class="kanban-column"
              :style="{ borderTopColor: status.color }"
            >
              <div class="column-header">
                <span class="column-dot" :style="{ background: status.color }"></span>
                <h3>{{ status.name }}</h3>
                <span class="column-count">{{ getProjectStatusTodos(group.id, status.id).length }}</span>
              </div>
              <draggable
                :model-value="getProjectStatusTodos(group.id, status.id)"
                item-key="id"
                class="kanban-cards"
                group="kanban"
                ghost-class="ghost"
                
                @end="onStackedKanbanDrop($event, group.id, status.id)"
              >
                <template #item="{ element }">
                  <KanbanCard
                    :todo="element"
                    :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                    :border-color="group.color"
                    @select="$emit('card-click', $event, element.id)"
                    @toggle-complete="$emit('toggle-complete', element)"
                    @delete="$emit('delete-todo', element.id)"
                  />
                </template>
              </draggable>
            </div>
            <div class="kanban-column" style="border-top-color: #666">
              <div class="column-header">
                <span class="column-dot" style="background: #666"></span>
                <h3>No Status</h3>
                <span class="column-count">{{ getProjectStatusTodos(group.id, null).length }}</span>
              </div>
              <draggable
                :model-value="getProjectStatusTodos(group.id, null)"
                item-key="id"
                class="kanban-cards"
                group="kanban"
                ghost-class="ghost"
                
                @end="onStackedKanbanDrop($event, group.id, null)"
              >
                <template #item="{ element }">
                  <KanbanCard
                    :todo="element"
                    :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                    :border-color="group.color"
                    @select="$emit('card-click', $event, element.id)"
                    @toggle-complete="$emit('toggle-complete', element)"
                    @delete="$emit('delete-todo', element.id)"
                  />
                </template>
              </draggable>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else ref="kanbanView" class="kanban-view">
      <!-- Project-based Kanban -->
      <template v-if="effectiveKanbanGroupBy === 'project'">
        <div class="kanban-column inbox-column" data-project-id="">
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
            :scroll="true"
            :scroll-sensitivity="100"
            :scroll-speed="10"
            @end="onKanbanDropProject"
          >
            <template #item="{ element }">
              <KanbanCard
                :todo="element"
                :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                :border-color="element.category_color || '#666'"
                @select="$emit('card-click', $event, element.id)"
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
          :data-project-id="project.id"
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
            :scroll="true"
            :scroll-sensitivity="100"
            :scroll-speed="10"
            @update:model-value="$emit('update-project-todos', project.id, $event)"
            @end="onKanbanDropProject"
          >
            <template #item="{ element }">
              <KanbanCard
                :todo="element"
                :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                :border-color="project.color"
                @select="$emit('card-click', $event, element.id)"
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
                :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                :border-color="element.project_color || '#333'"
                show-project
                @select="$emit('card-click', $event, element.id)"
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
            <span class="column-symbol">
              <component :is="getIconComponent(category.symbol)" v-if="getIconComponent(category.symbol)" :size="16" />
              <span v-else>{{ category.symbol || '*' }}</span>
            </span>
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
                :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                :border-color="element.project_color || '#666'"
                show-project
                @select="$emit('card-click', $event, element.id)"
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
                :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                :border-color="element.project_color || '#333'"
                show-project
                @select="$emit('card-click', $event, element.id)"
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
                :selected="selectedTodoId === element.id || selectedTodoIds.has(element.id)"
                :border-color="element.project_color || status.color"
                show-project
                @select="$emit('card-click', $event, element.id)"
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
import {
  Folder, Home, Briefcase, ShoppingCart, Heart, BookOpen, Target, Star,
  Calendar, Clock, Tag, Flag, Bookmark, Zap, Coffee, Music, Camera, Film,
  MessageCircle, Mail, Phone, Users, User, Settings, Search, Plus, Check,
  AlertCircle, Info, HelpCircle, Bell, Gift, Award, Trophy, Crown
} from 'lucide-vue-next'

const iconMap = {
  Folder, Home, Briefcase, ShoppingCart, Heart, BookOpen, Target, Star,
  Calendar, Clock, Tag, Flag, Bookmark, Zap, Coffee, Music, Camera, Film,
  MessageCircle, Mail, Phone, Users, User, Settings, Search, Plus, Check,
  AlertCircle, Info, HelpCircle, Bell, Gift, Award, Trophy, Crown
}

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
    groupByProject: {
      type: Boolean,
      default: false
    },
    groupedTodos: {
      type: Array,
      default: () => []
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
    selectedTodoIds: {
      type: Set,
      default: () => new Set()
    },
    allTodos: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    'update:kanban-group-by',
    'select-todo',
    'card-click',
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
    'kanban-drop-status',
    'kanban-project-change',
    'stacked-kanban-drop'
  ],
  data() {
    return {
      scrollDirection: 0,
      scrollAnimationId: null
    }
  },
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
    getIconComponent(name) {
      return iconMap[name] || null
    },
    getProjectTodos(projectId) {
      return this.allTodos.filter(t => t.project_id === projectId && !t.deleted)
    },
    getCategoryTodos(categoryId) {
      return this.allTodos.filter(t => t.category_id === categoryId && !t.deleted)
    },
    getStatusTodos(statusId) {
      return this.allTodos.filter(t => t.status_id === statusId && !t.deleted)
    },
    getProjectStatusTodos(projectId, statusId) {
      return this.allTodos.filter(t => {
        // Handle inbox (no project) - group.id is 'inbox' but todos have project_id: null
        const projectMatch = projectId === 'inbox' ? !t.project_id : t.project_id === projectId
        const statusMatch = statusId === null ? !t.status_id : t.status_id === statusId
        return projectMatch && statusMatch && !t.deleted
      })
    },
    onKanbanDropProject(event) {
      // Find the target project from the column element
      const targetColumn = event.to?.closest('.kanban-column')
      const targetProjectId = targetColumn?.dataset?.projectId
      const parsedProjectId = targetProjectId === '' ? null : (targetProjectId ? parseInt(targetProjectId) : undefined)

      const todoId = event.item?.__draggable_context?.element?.id

      console.log('onKanbanDropProject:', { todoId, targetProjectId, parsedProjectId })

      if (todoId && parsedProjectId !== undefined) {
        this.$emit('kanban-project-change', todoId, parsedProjectId)
      }
    },
    onKanbanDrop(event) {
      this.$emit('kanban-drop', event)
    },
    onKanbanDropCategory(event) {
      this.$emit('kanban-drop-category', event)
    },
    onKanbanDropStatus(event) {
      this.$emit('kanban-drop-status', event)
    },
    onStackedKanbanDrop(event, projectId, statusId) {
      this.$emit('stacked-kanban-drop', event, projectId, statusId)
    },
    onDragOver(event) {
      const kanbanView = this.$refs.kanbanView
      if (!kanbanView) return

      const rect = kanbanView.getBoundingClientRect()
      const x = event.clientX
      const edgeSize = 100

      let newDirection = 0
      if (x < rect.left + edgeSize) {
        newDirection = -1
      } else if (x > rect.right - edgeSize) {
        newDirection = 1
      }

      if (newDirection !== this.scrollDirection) {
        this.scrollDirection = newDirection
        if (newDirection !== 0) {
          this.startAutoScroll()
        } else {
          this.stopAutoScroll()
        }
      }
    },
    startAutoScroll() {
      if (this.scrollAnimationId) return
      const scrollSpeed = 8
      const scroll = () => {
        const kanbanView = this.$refs.kanbanView
        if (kanbanView && this.scrollDirection !== 0) {
          kanbanView.scrollLeft += this.scrollDirection * scrollSpeed
          this.scrollAnimationId = requestAnimationFrame(scroll)
        }
      }
      this.scrollAnimationId = requestAnimationFrame(scroll)
    },
    stopAutoScroll() {
      if (this.scrollAnimationId) {
        cancelAnimationFrame(this.scrollAnimationId)
        this.scrollAnimationId = null
      }
      this.scrollDirection = 0
    },
    onDragEnd() {
      this.stopAutoScroll()
    }
  }
}
</script>
