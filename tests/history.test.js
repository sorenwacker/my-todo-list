import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import BetterSqlite3 from 'better-sqlite3'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'

// ActionHistory class (copied from src/main/history.js without logger dependency)
class ActionHistory {
  constructor(maxSize = 50) {
    this.undoStack = []
    this.redoStack = []
    this.maxSize = maxSize
  }

  push(action) {
    if (!action.undo || !action.redo) {
      return
    }
    this.undoStack.push(action)
    this.redoStack = []
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }
  }

  async undo() {
    if (this.undoStack.length === 0) {
      return null
    }
    const action = this.undoStack.pop()
    try {
      await action.undo()
      this.redoStack.push(action)
      return action
    } catch (error) {
      this.undoStack.push(action)
      throw error
    }
  }

  async redo() {
    if (this.redoStack.length === 0) {
      return null
    }
    const action = this.redoStack.pop()
    try {
      await action.redo()
      this.undoStack.push(action)
      return action
    } catch (error) {
      this.redoStack.push(action)
      throw error
    }
  }

  canUndo() { return this.undoStack.length > 0 }
  canRedo() { return this.redoStack.length > 0 }
  clear() {
    this.undoStack = []
    this.redoStack = []
  }
  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    }
  }
}

// Test database with soft delete support
class TestDatabase {
  constructor(dbPath) {
    this.db = new BetterSqlite3(dbPath)
    this.init()
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        completed INTEGER DEFAULT 0,
        deleted_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  getTodo(id) {
    return this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id)
  }

  getAllTodos() {
    return this.db.prepare('SELECT * FROM todos WHERE deleted_at IS NULL ORDER BY id').all()
  }

  createTodo(title) {
    const result = this.db.prepare('INSERT INTO todos (title) VALUES (?)').run(title)
    return this.getTodo(result.lastInsertRowid)
  }

  updateTodo(todo) {
    this.db.prepare(`
      UPDATE todos SET title = ?, notes = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(todo.title, todo.notes || '', todo.completed ? 1 : 0, todo.id)
    return this.getTodo(todo.id)
  }

  deleteTodo(id) {
    this.db.prepare('UPDATE todos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    return true
  }

  restoreTodo(id) {
    this.db.prepare('UPDATE todos SET deleted_at = NULL WHERE id = ?').run(id)
    return this.getTodo(id)
  }

  close() {
    this.db.close()
  }
}

describe('ActionHistory', () => {
  let history

  beforeEach(() => {
    history = new ActionHistory()
  })

  describe('Basic operations', () => {
    it('should start with empty stacks', () => {
      expect(history.canUndo()).toBe(false)
      expect(history.canRedo()).toBe(false)
    })

    it('should allow undo after pushing an action', async () => {
      let value = 1
      history.push({
        type: 'test',
        undo: () => { value = 0 },
        redo: () => { value = 1 }
      })

      expect(history.canUndo()).toBe(true)
      await history.undo()
      expect(value).toBe(0)
      expect(history.canUndo()).toBe(false)
      expect(history.canRedo()).toBe(true)
    })

    it('should allow redo after undo', async () => {
      let value = 1
      history.push({
        type: 'test',
        undo: () => { value = 0 },
        redo: () => { value = 1 }
      })

      await history.undo()
      expect(value).toBe(0)
      await history.redo()
      expect(value).toBe(1)
    })

    it('should clear redo stack when new action is pushed', async () => {
      let value = 0
      history.push({
        type: 'set-1',
        undo: () => { value = 0 },
        redo: () => { value = 1 }
      })
      value = 1

      await history.undo()
      expect(value).toBe(0)
      expect(history.canRedo()).toBe(true)

      // Push new action - should clear redo stack
      history.push({
        type: 'set-2',
        undo: () => { value = 0 },
        redo: () => { value = 2 }
      })
      value = 2

      expect(history.canRedo()).toBe(false)
    })
  })

  describe('Multiple consecutive operations', () => {
    it('should handle multiple undos in sequence', async () => {
      const values = []

      // Action 1: add 'a'
      history.push({
        type: 'add',
        undo: () => { values.pop() },
        redo: () => { values.push('a') }
      })
      values.push('a')

      // Action 2: add 'b'
      history.push({
        type: 'add',
        undo: () => { values.pop() },
        redo: () => { values.push('b') }
      })
      values.push('b')

      // Action 3: add 'c'
      history.push({
        type: 'add',
        undo: () => { values.pop() },
        redo: () => { values.push('c') }
      })
      values.push('c')

      expect(values).toEqual(['a', 'b', 'c'])
      expect(history.getState().undoCount).toBe(3)

      // Undo 3 times
      await history.undo()
      expect(values).toEqual(['a', 'b'])

      await history.undo()
      expect(values).toEqual(['a'])

      await history.undo()
      expect(values).toEqual([])

      expect(history.canUndo()).toBe(false)
      expect(history.getState().redoCount).toBe(3)
    })

    it('should handle multiple redos in sequence', async () => {
      const values = []

      history.push({ type: 'add', undo: () => { values.pop() }, redo: () => { values.push('a') } })
      values.push('a')
      history.push({ type: 'add', undo: () => { values.pop() }, redo: () => { values.push('b') } })
      values.push('b')
      history.push({ type: 'add', undo: () => { values.pop() }, redo: () => { values.push('c') } })
      values.push('c')

      // Undo all
      await history.undo()
      await history.undo()
      await history.undo()
      expect(values).toEqual([])

      // Redo all
      await history.redo()
      expect(values).toEqual(['a'])

      await history.redo()
      expect(values).toEqual(['a', 'b'])

      await history.redo()
      expect(values).toEqual(['a', 'b', 'c'])

      expect(history.canRedo()).toBe(false)
    })

    it('should handle alternating undo/redo', async () => {
      let value = 0

      history.push({ type: 'set-1', undo: () => { value = 0 }, redo: () => { value = 1 } })
      value = 1
      history.push({ type: 'set-2', undo: () => { value = 1 }, redo: () => { value = 2 } })
      value = 2
      history.push({ type: 'set-3', undo: () => { value = 2 }, redo: () => { value = 3 } })
      value = 3

      // Undo twice
      await history.undo()
      expect(value).toBe(2)
      await history.undo()
      expect(value).toBe(1)

      // Redo once
      await history.redo()
      expect(value).toBe(2)

      // Undo once
      await history.undo()
      expect(value).toBe(1)

      // Redo twice
      await history.redo()
      expect(value).toBe(2)
      await history.redo()
      expect(value).toBe(3)

      expect(history.getState()).toEqual({
        canUndo: true,
        canRedo: false,
        undoCount: 3,
        redoCount: 0
      })
    })
  })

  describe('Max size limit', () => {
    it('should limit undo stack size', () => {
      const smallHistory = new ActionHistory(3)

      for (let i = 0; i < 5; i++) {
        smallHistory.push({
          type: `action-${i}`,
          undo: () => {},
          redo: () => {}
        })
      }

      expect(smallHistory.getState().undoCount).toBe(3)
    })
  })
})

describe('History with Database Integration', () => {
  let db
  let history
  const testDbPath = join(tmpdir(), `test-history-${Date.now()}.db`)

  beforeEach(() => {
    db = new TestDatabase(testDbPath)
    history = new ActionHistory()
  })

  afterEach(() => {
    db.close()
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath)
    }
  })

  describe('Create todo undo/redo', () => {
    it('should undo create by soft-deleting', async () => {
      const todo = db.createTodo('Test todo')
      const todoId = todo.id

      history.push({
        type: 'create-todo',
        undo: () => db.deleteTodo(todoId),
        redo: () => db.restoreTodo(todoId)
      })

      expect(db.getAllTodos()).toHaveLength(1)

      await history.undo()
      expect(db.getAllTodos()).toHaveLength(0)

      // Todo still exists but is soft-deleted
      const deletedTodo = db.getTodo(todoId)
      expect(deletedTodo).toBeDefined()
      expect(deletedTodo.deleted_at).not.toBeNull()
    })

    it('should redo create by restoring', async () => {
      const todo = db.createTodo('Test todo')
      const todoId = todo.id

      history.push({
        type: 'create-todo',
        undo: () => db.deleteTodo(todoId),
        redo: () => db.restoreTodo(todoId)
      })

      await history.undo()
      expect(db.getAllTodos()).toHaveLength(0)

      await history.redo()
      expect(db.getAllTodos()).toHaveLength(1)
      expect(db.getAllTodos()[0].id).toBe(todoId)
    })

    it('should handle multiple create undos without duplicates', async () => {
      // Create 3 todos
      const todo1 = db.createTodo('Todo 1')
      history.push({
        type: 'create-todo',
        undo: () => db.deleteTodo(todo1.id),
        redo: () => db.restoreTodo(todo1.id)
      })

      const todo2 = db.createTodo('Todo 2')
      history.push({
        type: 'create-todo',
        undo: () => db.deleteTodo(todo2.id),
        redo: () => db.restoreTodo(todo2.id)
      })

      const todo3 = db.createTodo('Todo 3')
      history.push({
        type: 'create-todo',
        undo: () => db.deleteTodo(todo3.id),
        redo: () => db.restoreTodo(todo3.id)
      })

      expect(db.getAllTodos()).toHaveLength(3)

      // Undo all 3
      await history.undo()
      await history.undo()
      await history.undo()
      expect(db.getAllTodos()).toHaveLength(0)

      // Redo all 3
      await history.redo()
      await history.redo()
      await history.redo()

      const todos = db.getAllTodos()
      expect(todos).toHaveLength(3)
      expect(todos.map(t => t.id).sort()).toEqual([todo1.id, todo2.id, todo3.id].sort())
    })
  })

  describe('Update todo undo/redo', () => {
    it('should undo title update', async () => {
      const todo = db.createTodo('Original title')
      const oldTodo = { ...todo }

      const updated = db.updateTodo({ ...todo, title: 'New title' })

      history.push({
        type: 'update-todo',
        undo: () => db.updateTodo(oldTodo),
        redo: () => db.updateTodo(updated)
      })

      expect(db.getTodo(todo.id).title).toBe('New title')

      await history.undo()
      expect(db.getTodo(todo.id).title).toBe('Original title')

      await history.redo()
      expect(db.getTodo(todo.id).title).toBe('New title')
    })

    it('should handle multiple consecutive updates', async () => {
      const todo = db.createTodo('V1')

      // Update to V2
      const v1 = { ...db.getTodo(todo.id) }
      db.updateTodo({ ...todo, title: 'V2' })
      history.push({
        type: 'update',
        undo: () => db.updateTodo(v1),
        redo: () => db.updateTodo({ ...v1, title: 'V2' })
      })

      // Update to V3
      const v2 = { ...db.getTodo(todo.id) }
      db.updateTodo({ ...todo, title: 'V3' })
      history.push({
        type: 'update',
        undo: () => db.updateTodo(v2),
        redo: () => db.updateTodo({ ...v2, title: 'V3' })
      })

      // Update to V4
      const v3 = { ...db.getTodo(todo.id) }
      db.updateTodo({ ...todo, title: 'V4' })
      history.push({
        type: 'update',
        undo: () => db.updateTodo(v3),
        redo: () => db.updateTodo({ ...v3, title: 'V4' })
      })

      expect(db.getTodo(todo.id).title).toBe('V4')

      // Undo back to V1
      await history.undo()
      expect(db.getTodo(todo.id).title).toBe('V3')
      await history.undo()
      expect(db.getTodo(todo.id).title).toBe('V2')
      await history.undo()
      expect(db.getTodo(todo.id).title).toBe('V1')

      // Redo to V4
      await history.redo()
      expect(db.getTodo(todo.id).title).toBe('V2')
      await history.redo()
      expect(db.getTodo(todo.id).title).toBe('V3')
      await history.redo()
      expect(db.getTodo(todo.id).title).toBe('V4')
    })
  })

  describe('Delete todo undo/redo', () => {
    it('should undo delete by restoring', async () => {
      const todo = db.createTodo('Test todo')
      const todoId = todo.id

      db.deleteTodo(todoId)
      history.push({
        type: 'delete-todo',
        undo: () => db.restoreTodo(todoId),
        redo: () => db.deleteTodo(todoId)
      })

      expect(db.getAllTodos()).toHaveLength(0)

      await history.undo()
      expect(db.getAllTodos()).toHaveLength(1)
      expect(db.getAllTodos()[0].id).toBe(todoId)
    })

    it('should redo delete', async () => {
      const todo = db.createTodo('Test todo')
      const todoId = todo.id

      db.deleteTodo(todoId)
      history.push({
        type: 'delete-todo',
        undo: () => db.restoreTodo(todoId),
        redo: () => db.deleteTodo(todoId)
      })

      await history.undo()
      expect(db.getAllTodos()).toHaveLength(1)

      await history.redo()
      expect(db.getAllTodos()).toHaveLength(0)
    })
  })

  describe('Mixed operations', () => {
    it('should handle create, update, delete sequence', async () => {
      // Create
      const todo = db.createTodo('Original')
      history.push({
        type: 'create',
        undo: () => db.deleteTodo(todo.id),
        redo: () => db.restoreTodo(todo.id)
      })

      // Update
      const beforeUpdate = { ...db.getTodo(todo.id) }
      db.updateTodo({ ...todo, title: 'Updated' })
      history.push({
        type: 'update',
        undo: () => db.updateTodo(beforeUpdate),
        redo: () => db.updateTodo({ ...beforeUpdate, title: 'Updated' })
      })

      // Delete
      db.deleteTodo(todo.id)
      history.push({
        type: 'delete',
        undo: () => db.restoreTodo(todo.id),
        redo: () => db.deleteTodo(todo.id)
      })

      expect(db.getAllTodos()).toHaveLength(0)

      // Undo delete
      await history.undo()
      expect(db.getAllTodos()).toHaveLength(1)
      expect(db.getTodo(todo.id).title).toBe('Updated')

      // Undo update
      await history.undo()
      expect(db.getTodo(todo.id).title).toBe('Original')

      // Undo create
      await history.undo()
      expect(db.getAllTodos()).toHaveLength(0)

      // Redo all
      await history.redo() // create
      await history.redo() // update
      await history.redo() // delete

      expect(db.getAllTodos()).toHaveLength(0)
      expect(db.getTodo(todo.id).deleted_at).not.toBeNull()
    })

    it('should handle rapid undo/redo button presses', async () => {
      // Simulate creating multiple todos rapidly
      const todos = []
      for (let i = 0; i < 5; i++) {
        const todo = db.createTodo(`Todo ${i}`)
        todos.push(todo)
        history.push({
          type: 'create',
          undo: () => db.deleteTodo(todo.id),
          redo: () => db.restoreTodo(todo.id)
        })
      }

      expect(db.getAllTodos()).toHaveLength(5)

      // Rapid undo presses
      await history.undo()
      await history.undo()
      await history.undo()
      expect(db.getAllTodos()).toHaveLength(2)

      // Rapid redo presses
      await history.redo()
      await history.redo()
      expect(db.getAllTodos()).toHaveLength(4)

      // More undos
      await history.undo()
      await history.undo()
      await history.undo()
      await history.undo()
      expect(db.getAllTodos()).toHaveLength(0)

      // Redo everything
      for (let i = 0; i < 5; i++) {
        await history.redo()
      }
      expect(db.getAllTodos()).toHaveLength(5)

      // Verify no duplicates - all original IDs
      const currentIds = db.getAllTodos().map(t => t.id).sort()
      const originalIds = todos.map(t => t.id).sort()
      expect(currentIds).toEqual(originalIds)
    })
  })
})
