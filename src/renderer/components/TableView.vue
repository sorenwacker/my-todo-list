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
              :selected="selectedTodoId === todo.id || selectedTodoIds.has(todo.id)"
              :focused="focusedTodoId === todo.id"
              :is-trash-view="isTrashView"
              :has-subtasks="todo.subtask_count > 0"
              :is-expanded="isExpanded(todo.id)"
              @select="$emit('row-click', $event, todo.id)"
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
              <td class="col-check"></td>
              <td class="col-expand">
                <input
                  type="checkbox"
                  :checked="subtask.completed"
                  @click.stop="$emit('toggle-subtask', subtask)"
                />
              </td>
              <td class="subtask-title" colspan="7" @dblclick="startEditSubtask(subtask)">
                <template v-if="editingSubtaskId === subtask.id">
                  <input
                    v-model="editingSubtaskTitle"
                    class="subtask-inline-input"
                    @blur="saveSubtaskEdit(subtask)"
                    @keydown.enter="saveSubtaskEdit(subtask)"
                    @keydown.escape="cancelSubtaskEdit"
                    ref="subtaskInput"
                  />
                </template>
                <template v-else>{{ subtask.title }}</template>
              </td>
              <td class="col-start"></td>
              <td class="col-end subtask-due">
                <input
                  type="date"
                  class="subtask-due-input"
                  :value="subtask.due_date || ''"
                  lang="sv-SE"
                  @change="$emit('update-subtask-due-date', { id: subtask.id, due_date: $event.target.value || null })"
                  @click.stop
                />
              </td>
              <td class="col-actions">
                <button class="subtask-delete-btn" @click.stop="$emit('delete-subtask', subtask.id)" title="Delete">×</button>
              </td>
            </tr>
            <!-- Add subtask row -->
            <tr v-if="isExpanded(todo.id)" class="add-subtask-row">
              <td class="col-check"></td>
              <td class="col-expand"></td>
              <td colspan="10" class="add-subtask-cell">
                <template v-if="addingSubtaskForTodo === todo.id">
                  <input
                    v-model="newSubtaskTitle"
                    class="subtask-inline-input"
                    placeholder="New task..."
                    @blur="saveNewSubtask(todo.id)"
                    @keydown.enter="saveNewSubtask(todo.id)"
                    @keydown.escape="cancelAddSubtask"
                    ref="newSubtaskInput"
                  />
                </template>
                <button v-else class="add-subtask-btn" @click="startAddSubtask(todo.id)">+ Add task</button>
              </td>
            </tr>
          </template>
        </tbody>
      </template>
      <tbody v-else>
        <template v-for="todo in sortedTodos" :key="todo.id">
          <TableRow
            :todo="todo"
            :selected="selectedTodoId === todo.id || selectedTodoIds.has(todo.id)"
            :focused="focusedTodoId === todo.id"
            :is-trash-view="isTrashView"
            :has-subtasks="todo.subtask_count > 0"
            :is-expanded="isExpanded(todo.id)"
            @select="$emit('row-click', $event, todo.id)"
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
            <td class="col-check"></td>
            <td class="col-expand">
              <input
                type="checkbox"
                :checked="subtask.completed"
                @click.stop="$emit('toggle-subtask', subtask)"
              />
            </td>
            <td class="subtask-title" colspan="7" @dblclick="startEditSubtask(subtask)">
              <template v-if="editingSubtaskId === subtask.id">
                <input
                  v-model="editingSubtaskTitle"
                  class="subtask-inline-input"
                  @blur="saveSubtaskEdit(subtask)"
                  @keydown.enter="saveSubtaskEdit(subtask)"
                  @keydown.escape="cancelSubtaskEdit"
                  ref="subtaskInput"
                />
              </template>
              <template v-else>{{ subtask.title }}</template>
            </td>
            <td class="col-start"></td>
            <td class="col-end subtask-due">
              <input
                type="date"
                class="subtask-due-input"
                :value="subtask.due_date || ''"
                lang="sv-SE"
                @change="$emit('update-subtask-due-date', { id: subtask.id, due_date: $event.target.value || null })"
                @click.stop
              />
            </td>
            <td class="col-actions">
              <button class="subtask-delete-btn" @click.stop="$emit('delete-subtask', subtask.id)" title="Delete">×</button>
            </td>
          </tr>
          <!-- Add subtask row -->
          <tr v-if="isExpanded(todo.id)" class="add-subtask-row">
            <td class="col-check"></td>
            <td class="col-expand"></td>
            <td colspan="10" class="add-subtask-cell">
              <template v-if="addingSubtaskForTodo === todo.id">
                <input
                  v-model="newSubtaskTitle"
                  class="subtask-inline-input"
                  placeholder="New task..."
                  @blur="saveNewSubtask(todo.id)"
                  @keydown.enter="saveNewSubtask(todo.id)"
                  @keydown.escape="cancelAddSubtask"
                  ref="newSubtaskInput"
                />
              </template>
              <button v-else class="add-subtask-btn" @click="startAddSubtask(todo.id)">+ Add task</button>
            </td>
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
    selectedTodoIds: {
      type: Set,
      default: () => new Set()
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
    'row-click',
    'toggle-complete',
    'toggle-subtask',
    'delete-todo',
    'delete-subtask',
    'restore-todo',
    'permanent-delete-todo',
    'add-todo-to-project',
    'add-subtask',
    'update-subtask',
    'update-subtask-due-date'
  ],
  data() {
    return {
      expandedRows: new Set(),
      editingSubtaskId: null,
      editingSubtaskTitle: '',
      addingSubtaskForTodo: null,
      newSubtaskTitle: ''
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
      return this.subtasksMap[todoId] || []
    },
    startEditSubtask(subtask) {
      this.editingSubtaskId = subtask.id
      this.editingSubtaskTitle = subtask.title
      this.$nextTick(() => {
        const input = this.$refs.subtaskInput
        if (input) {
          const el = Array.isArray(input) ? input[0] : input
          el?.focus()
          el?.select()
        }
      })
    },
    saveSubtaskEdit(subtask) {
      if (this.editingSubtaskTitle.trim() && this.editingSubtaskTitle !== subtask.title) {
        this.$emit('update-subtask', { id: subtask.id, title: this.editingSubtaskTitle.trim() })
      }
      this.cancelSubtaskEdit()
    },
    cancelSubtaskEdit() {
      this.editingSubtaskId = null
      this.editingSubtaskTitle = ''
    },
    startAddSubtask(todoId) {
      this.addingSubtaskForTodo = todoId
      this.newSubtaskTitle = ''
      this.$nextTick(() => {
        const input = this.$refs.newSubtaskInput
        if (input) {
          const el = Array.isArray(input) ? input[0] : input
          el?.focus()
        }
      })
    },
    saveNewSubtask(todoId) {
      if (this.newSubtaskTitle.trim()) {
        this.$emit('add-subtask', { todoId, title: this.newSubtaskTitle.trim() })
      }
      this.cancelAddSubtask()
    },
    cancelAddSubtask() {
      this.addingSubtaskForTodo = null
      this.newSubtaskTitle = ''
    }
  }
}
</script>
