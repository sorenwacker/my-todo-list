<template>
  <div class="table-view compact">
    <table>
      <thead>
        <tr>
          <th class="col-check"></th>
          <th class="col-expand"></th>
          <th class="col-title resizable">Title</th>
          <th class="col-project resizable">Project</th>
          <th class="col-category resizable">Category</th>
          <th class="col-status-col resizable">Status</th>
          <th class="col-importance resizable">Imp</th>
          <th class="col-subtasks resizable">Tasks</th>
          <th class="col-notes resizable">Notes</th>
          <th class="col-start resizable">Start</th>
          <th class="col-end resizable">End</th>
          <th class="col-actions"></th>
        </tr>
      </thead>
      <template v-if="groupByProject">
        <tbody v-for="group in groupedTodos" :key="group.id">
          <tr class="group-row">
            <td colspan="12">
              <span class="group-dot" :style="{ background: group.color }"></span>
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{ group.todos.length }}</span>
            </td>
          </tr>
          <template v-for="todo in group.todos" :key="todo.id">
            <TableRow
              :todo="todo"
              :selected="selectedTodoId === todo.id"
              :focused="focusedTodoId === todo.id"
              :is-trash-view="isTrashView"
              :has-subtasks="todo.subtask_count > 0"
              :is-expanded="isExpanded(todo.id)"
              @select="$emit('select-todo', todo.id)"
              @toggle-complete="$emit('toggle-complete', todo)"
              @toggle-expand="toggleExpand(todo.id)"
              @delete="$emit('delete-todo', todo.id)"
              @restore="$emit('restore-todo', todo.id)"
              @permanent-delete="$emit('permanent-delete-todo', todo.id)"
              @add-to-project="$emit('add-todo-to-project', $event)"
            />
            <tr
              v-for="subtask in (isExpanded(todo.id) ? getSubtasks(todo.id) : [])"
              :key="'subtask-' + subtask.id"
              class="subtask-row"
              :class="{ completed: subtask.completed }"
            >
              <td class="col-check">
                <input
                  type="checkbox"
                  :checked="subtask.completed"
                  @click.stop="$emit('toggle-subtask', subtask)"
                />
              </td>
              <td class="col-title subtask-title">{{ subtask.title }}</td>
              <td colspan="10"></td>
            </tr>
          </template>
        </tbody>
      </template>
      <tbody v-else>
        <template v-for="todo in sortedTodos" :key="todo.id">
          <TableRow
            :todo="todo"
            :selected="selectedTodoId === todo.id"
            :focused="focusedTodoId === todo.id"
            :is-trash-view="isTrashView"
            :has-subtasks="todo.subtask_count > 0"
            :is-expanded="isExpanded(todo.id)"
            @select="$emit('select-todo', todo.id)"
            @toggle-complete="$emit('toggle-complete', todo)"
            @toggle-expand="toggleExpand(todo.id)"
            @delete="$emit('delete-todo', todo.id)"
            @restore="$emit('restore-todo', todo.id)"
            @permanent-delete="$emit('permanent-delete-todo', todo.id)"
            @add-to-project="$emit('add-todo-to-project', $event)"
          />
          <tr
            v-for="subtask in (isExpanded(todo.id) ? getSubtasks(todo.id) : [])"
            :key="'subtask-' + subtask.id"
            class="subtask-row"
            :class="{ completed: subtask.completed }"
          >
            <td class="col-check">
              <input
                type="checkbox"
                :checked="subtask.completed"
                @click.stop="$emit('toggle-subtask', subtask)"
              />
            </td>
            <td class="col-title subtask-title">{{ subtask.title }}</td>
            <td colspan="10"></td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script>
import TableRow from './TableRow.vue'

export default {
  name: 'TableView',
  components: {
    TableRow
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
    subtasksMap: {
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    'select-todo',
    'toggle-complete',
    'toggle-subtask',
    'delete-todo',
    'restore-todo',
    'permanent-delete-todo',
    'add-todo-to-project'
  ],
  data() {
    return {
      expandedRows: new Set()
    }
  },
  methods: {
    toggleExpand(todoId) {
      if (this.expandedRows.has(todoId)) {
        this.expandedRows.delete(todoId)
      } else {
        this.expandedRows.add(todoId)
      }
      // Force reactivity
      this.expandedRows = new Set(this.expandedRows)
    },
    isExpanded(todoId) {
      return this.expandedRows.has(todoId)
    },
    getSubtasks(todoId) {
      console.log('getSubtasks called for todoId:', todoId, 'subtasksMap:', this.subtasksMap, 'result:', this.subtasksMap[todoId])
      return this.subtasksMap[todoId] || []
    }
  }
}
</script>
