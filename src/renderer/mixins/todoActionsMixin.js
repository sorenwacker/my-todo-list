/**
 * App-level todo actions: creation, completion, editing, archiving, trash,
 * drag-and-drop persistence, and manual ordering.
 *
 * The host component must provide `todosComposable` and `projectsComposable`
 * (from setup), the `loadAllTodos`/`loadTodos` methods, `selectTodo`, and the
 * `currentFilter`, `isProjectSelected`, `allTodos`, `newTodoTitle`, and
 * `trashCount` state.
 */
export default {
  methods: {
    updateStatusTodos(_statusId, _todos) {
      // Used by draggable for reactive updates
    },
    async persistManualOrder(orderedTodos) {
      // vuedraggable delivers the new visual order via update:model-value.
      // Persist it as sort_order, then reload so the derived (computed) lists
      // re-derive in the new order.
      await window.api.reorderTodos(orderedTodos.map((t) => t.id))
      await this.loadAllTodos()
      await this.loadTodos()
    },
    updateSortedTodos(todos) {
      this.persistManualOrder(todos)
    },
    updateGroupTodos(_groupId, todos) {
      this.persistManualOrder(todos)
    },
    async onKanbanDropStatus(event) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      // Get target status from the drop target element
      const targetStatusId = event.to?.dataset?.statusId
      const parsedStatusId = targetStatusId === '' ? null : parseInt(targetStatusId)

      const todo = this.allTodos.find((t) => t.id === todoId)
      if (todo && todo.status_id !== parsedStatusId) {
        const todoData = this.toPlainTodo(todo)
        todoData.status_id = parsedStatusId
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async onStackedKanbanDrop(event, projectId, statusId) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      const todo = this.allTodos.find((t) => t.id === todoId)
      if (todo) {
        const todoData = this.toPlainTodo(todo)
        // Update project and status based on the section/column it was dropped into.
        todoData.project_id = projectId === 'inbox' ? null : projectId
        todoData.status_id = statusId
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async addTodo() {
      if (!this.newTodoTitle.trim()) return
      const projectId =
        this.currentFilter !== null && this.currentFilter !== 'inbox' ? this.currentFilter : null
      const type = 'todo'
      const updates = { start_date: new Date().toISOString().split('T')[0] }
      await this.todosComposable.addTodo(this.newTodoTitle.trim(), projectId, type, updates)
      this.newTodoTitle = ''
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async addTodoToProject(projectId) {
      try {
        const type = 'todo'
        const todo = await window.api.createTodo('Untitled', projectId, type)
        await this.loadAllTodos()
        await this.loadTodos()
        if (todo) this.selectTodo(todo.id)
      } catch (error) {
        console.error('Failed to add todo to project:', error)
      }
    },
    async addTodoToStatus(statusId) {
      try {
        const projectId = this.isProjectSelected ? this.currentFilter : null
        const type = 'todo'
        const todo = await window.api.createTodo('Untitled', projectId, type)
        if (statusId !== null) {
          const todoData = this.toPlainTodo(todo)
          todoData.status_id = statusId
          await window.api.updateTodo(todoData)
        }
        await this.loadAllTodos()
        await this.loadTodos()
        if (todo) this.selectTodo(todo.id)
      } catch (error) {
        console.error('Failed to add todo to status:', error)
      }
    },
    async moveInboxTodoToProject(todo, projectId) {
      todo.project_id = projectId
      const todoData = this.toPlainTodo(todo)
      await window.api.updateTodo(todoData)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async toggleComplete(todo) {
      await this.todosComposable.toggleComplete(todo)
      // Sync to project composable for counts
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async handleUpdateTitle(todo, newTitle) {
      await this.todosComposable.handleUpdateTitle(todo, newTitle)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async handleUpdateNotes(todo, newNotes) {
      await this.todosComposable.handleUpdateNotes(todo, newNotes)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async deleteTodo(id) {
      await this.todosComposable.deleteTodo(id)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async archiveTodo(id) {
      await this.todosComposable.archiveTodo(id)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async archiveCompletedTodos() {
      const projectId = this.isProjectSelected
        ? this.currentFilter
        : this.currentFilter === 'inbox'
          ? 'inbox'
          : null
      const count = await window.api.archiveCompletedTodos(projectId)
      if (count > 0) {
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async unarchiveTodo(id) {
      await this.todosComposable.unarchiveTodo(id)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async moveToProject(todo, projectId) {
      await this.todosComposable.moveToProject(todo, projectId)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async setDueDate(todo, date) {
      await this.todosComposable.setDueDate(todo, date)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async restoreTodo(id) {
      await this.todosComposable.restoreTodo(id)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async permanentlyDeleteTodo(id) {
      await this.todosComposable.permanentlyDeleteTodo(id)
      this.projectsComposable.setAllTodos(this.allTodos)
    },
    async emptyTrash() {
      if (confirm('Are you sure you want to permanently delete all items in trash?')) {
        await window.api.emptyTrash()
        await this.loadAllTodos()
        await this.loadTodos()
        // Force refresh the trash count
        this.trashCount = 0
      }
    },
    toPlainTodo(todo) {
      return this.todosComposable.toPlainTodo(todo)
    }
  }
}
