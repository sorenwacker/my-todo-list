<template>
  <div class="table-view compact">
    <table>
      <thead>
        <tr>
          <th class="col-check resizable"></th>
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
            <td colspan="11">
              <span class="group-dot" :style="{ background: group.color }"></span>
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{ group.todos.length }}</span>
            </td>
          </tr>
          <TableRow
            v-for="todo in group.todos"
            :key="todo.id"
            :todo="todo"
            :selected="selectedTodoId === todo.id"
            :focused="focusedTodoId === todo.id"
            :is-trash-view="isTrashView"
            @select="$emit('select-todo', todo.id)"
            @toggle-complete="$emit('toggle-complete', todo)"
            @delete="$emit('delete-todo', todo.id)"
            @restore="$emit('restore-todo', todo.id)"
            @permanent-delete="$emit('permanent-delete-todo', todo.id)"
          />
        </tbody>
      </template>
      <tbody v-else>
        <TableRow
          v-for="todo in sortedTodos"
          :key="todo.id"
          :todo="todo"
          :selected="selectedTodoId === todo.id"
          :focused="focusedTodoId === todo.id"
          :is-trash-view="isTrashView"
          @select="$emit('select-todo', todo.id)"
          @toggle-complete="$emit('toggle-complete', todo)"
          @delete="$emit('delete-todo', todo.id)"
          @restore="$emit('restore-todo', todo.id)"
          @permanent-delete="$emit('permanent-delete-todo', todo.id)"
        />
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
    }
  },
  emits: [
    'select-todo',
    'toggle-complete',
    'delete-todo',
    'restore-todo',
    'permanent-delete-todo'
  ]
}
</script>
