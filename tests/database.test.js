import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import BetterSqlite3 from 'better-sqlite3'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'

// Test-only database class (mirrors src/main/database.js without electron dependency)
class TestDatabase {
  constructor(dbPath) {
    this.db = new BetterSqlite3(dbPath)
    this.init()
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#0f4c75',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        deadline TEXT,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        project_id INTEGER,
        type TEXT DEFAULT 'todo',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS todo_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        target_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES todos(id) ON DELETE CASCADE,
        UNIQUE(source_id, target_id)
      );

      CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        company TEXT DEFAULT '',
        role TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        color TEXT DEFAULT '#0f4c75',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  // Project operations
  getAllProjects() {
    return this.db.prepare('SELECT * FROM projects ORDER BY sort_order ASC').all()
  }

  getProject(id) {
    return this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  }

  createProject(name, color = '#0f4c75') {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM projects').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(
      'INSERT INTO projects (name, color, sort_order) VALUES (?, ?, ?)'
    ).run(name, color, sortOrder)

    return this.getProject(result.lastInsertRowid)
  }

  updateProject(project) {
    this.db.prepare(
      'UPDATE projects SET name = ?, color = ? WHERE id = ?'
    ).run(project.name, project.color, project.id)

    return this.getProject(project.id)
  }

  deleteProject(id) {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    return true
  }

  // Todo operations
  getAllTodos(projectId = null) {
    if (projectId === null) {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all()
    } else if (projectId === 'inbox') {
      return this.db.prepare(`
        SELECT t.*, NULL as project_name, NULL as project_color
        FROM todos t
        WHERE t.project_id IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all()
    } else {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.project_id = ?
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all(projectId)
    }
  }

  getTodo(id) {
    return this.db.prepare(`
      SELECT t.id, t.title, t.notes, t.deadline, t.completed, t.sort_order, t.project_id, t.type, t.created_at, t.updated_at,
             p.name as project_name, p.color as project_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(id)
  }

  createTodo(title, projectId = null, type = 'todo') {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM todos').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(`
      INSERT INTO todos (title, sort_order, project_id, type) VALUES (?, ?, ?, ?)
    `).run(title, sortOrder, projectId, type)

    return this.getTodo(result.lastInsertRowid)
  }

  updateTodo(todo) {
    this.db.prepare(`
      UPDATE todos
      SET title = ?, notes = ?, deadline = ?, completed = ?, project_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(todo.title, todo.notes, todo.deadline, todo.completed ? 1 : 0, todo.project_id, todo.id)

    return this.getTodo(todo.id)
  }

  deleteTodo(id) {
    this.db.prepare('DELETE FROM todos WHERE id = ?').run(id)
    return true
  }

  reorderTodos(ids) {
    const stmt = this.db.prepare('UPDATE todos SET sort_order = ? WHERE id = ?')
    const transaction = this.db.transaction((ids) => {
      ids.forEach((id, index) => {
        stmt.run(index, id)
      })
    })
    transaction(ids)
    return true
  }

  // Link operations
  getLinkedTodos(todoId) {
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id IN (
        SELECT target_id FROM todo_links WHERE source_id = ?
        UNION
        SELECT source_id FROM todo_links WHERE target_id = ?
      )
    `).all(todoId, todoId)
  }

  linkTodos(sourceId, targetId) {
    if (sourceId === targetId) return false

    const [first, second] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId]

    try {
      this.db.prepare(
        'INSERT OR IGNORE INTO todo_links (source_id, target_id) VALUES (?, ?)'
      ).run(first, second)
      return true
    } catch {
      return false
    }
  }

  unlinkTodos(sourceId, targetId) {
    const [first, second] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId]
    this.db.prepare(
      'DELETE FROM todo_links WHERE source_id = ? AND target_id = ?'
    ).run(first, second)
    return true
  }

  searchTodos(query, excludeId = null) {
    if (excludeId) {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.title LIKE ? AND t.id != ?
        LIMIT 10
      `).all(`%${query}%`, excludeId)
    }
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.title LIKE ?
      LIMIT 10
    `).all(`%${query}%`)
  }

  // Settings operations
  getSetting(key) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    if (!row) return null
    try {
      return JSON.parse(row.value)
    } catch {
      return row.value
    }
  }

  setSetting(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, stringValue, stringValue)
    return this.getSetting(key)
  }

  getAllSettings() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value)
      } catch {
        settings[row.key] = row.value
      }
    }
    return settings
  }

  // Person operations
  createPerson(person) {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM persons').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(`
      INSERT INTO persons (name, email, phone, company, role, notes, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      person.name,
      person.email || '',
      person.phone || '',
      person.company || '',
      person.role || '',
      person.notes || '',
      person.color || '#0f4c75',
      sortOrder
    )

    return this.db.prepare('SELECT * FROM persons WHERE id = ?').get(result.lastInsertRowid)
  }

  // Global search across todos, persons, and projects
  globalSearch(query, limit = 20) {
    const searchTerm = `%${query}%`

    // Search todos (title + notes)
    const todos = this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color, 'todo' as result_type
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE (t.title LIKE ? OR t.notes LIKE ?)
      LIMIT ?
    `).all(searchTerm, searchTerm, limit)

    // Search persons (name + email + company)
    const persons = this.db.prepare(`
      SELECT *, 'person' as result_type
      FROM persons
      WHERE name LIKE ? OR email LIKE ? OR company LIKE ?
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limit)

    // Search projects
    const projects = this.db.prepare(`
      SELECT *, 'project' as result_type
      FROM projects
      WHERE name LIKE ?
      LIMIT ?
    `).all(searchTerm, limit)

    return { todos, persons, projects }
  }

  // Get todos by type
  getTodosByType(type) {
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.type = ?
      ORDER BY t.sort_order ASC
    `).all(type)
  }

  close() {
    this.db.close()
  }
}

describe('Database', () => {
  let db
  const testDbPath = join(tmpdir(), `test-todos-${Date.now()}.db`)

  beforeEach(() => {
    db = new TestDatabase(testDbPath)
  })

  afterEach(() => {
    db.close()
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath)
    }
  })

  describe('Projects', () => {
    it('should create a project', () => {
      const project = db.createProject('Work', '#e74c3c')

      expect(project.id).toBeDefined()
      expect(project.name).toBe('Work')
      expect(project.color).toBe('#e74c3c')
    })

    it('should list all projects', () => {
      db.createProject('Work')
      db.createProject('Personal')

      const projects = db.getAllProjects()

      expect(projects).toHaveLength(2)
    })

    it('should update a project', () => {
      const project = db.createProject('Work')
      const updated = db.updateProject({ ...project, name: 'Office', color: '#2ecc71' })

      expect(updated.name).toBe('Office')
      expect(updated.color).toBe('#2ecc71')
    })

    it('should delete a project', () => {
      const project = db.createProject('Work')
      db.deleteProject(project.id)

      expect(db.getProject(project.id)).toBeUndefined()
    })
  })

  describe('Todos with Projects', () => {
    it('should create a todo with project', () => {
      const project = db.createProject('Work')
      const todo = db.createTodo('Task 1', project.id)

      expect(todo.project_id).toBe(project.id)
      expect(todo.project_name).toBe('Work')
    })

    it('should create a todo without project (inbox)', () => {
      const todo = db.createTodo('Inbox task')

      expect(todo.project_id).toBeNull()
      expect(todo.project_name).toBeNull()
    })

    it('should filter todos by project', () => {
      const project = db.createProject('Work')
      db.createTodo('Work task', project.id)
      db.createTodo('Inbox task')

      const workTodos = db.getAllTodos(project.id)
      const inboxTodos = db.getAllTodos('inbox')
      const allTodos = db.getAllTodos(null)

      expect(workTodos).toHaveLength(1)
      expect(inboxTodos).toHaveLength(1)
      expect(allTodos).toHaveLength(2)
    })

    it('should move todo to different project', () => {
      const project1 = db.createProject('Work')
      const project2 = db.createProject('Personal')
      const todo = db.createTodo('Task', project1.id)

      const updated = db.updateTodo({ ...todo, project_id: project2.id })

      expect(updated.project_id).toBe(project2.id)
      expect(updated.project_name).toBe('Personal')
    })
  })

  describe('Todo Links', () => {
    it('should link two todos', () => {
      const todo1 = db.createTodo('Task 1')
      const todo2 = db.createTodo('Task 2')

      db.linkTodos(todo1.id, todo2.id)

      const linked = db.getLinkedTodos(todo1.id)
      expect(linked).toHaveLength(1)
      expect(linked[0].id).toBe(todo2.id)
    })

    it('should get linked todos from either direction', () => {
      const todo1 = db.createTodo('Task 1')
      const todo2 = db.createTodo('Task 2')

      db.linkTodos(todo1.id, todo2.id)

      const linkedFrom1 = db.getLinkedTodos(todo1.id)
      const linkedFrom2 = db.getLinkedTodos(todo2.id)

      expect(linkedFrom1).toHaveLength(1)
      expect(linkedFrom2).toHaveLength(1)
    })

    it('should not create duplicate links', () => {
      const todo1 = db.createTodo('Task 1')
      const todo2 = db.createTodo('Task 2')

      db.linkTodos(todo1.id, todo2.id)
      db.linkTodos(todo2.id, todo1.id)

      const linked = db.getLinkedTodos(todo1.id)
      expect(linked).toHaveLength(1)
    })

    it('should not link a todo to itself', () => {
      const todo = db.createTodo('Task')

      const result = db.linkTodos(todo.id, todo.id)

      expect(result).toBe(false)
      expect(db.getLinkedTodos(todo.id)).toHaveLength(0)
    })

    it('should unlink todos', () => {
      const todo1 = db.createTodo('Task 1')
      const todo2 = db.createTodo('Task 2')

      db.linkTodos(todo1.id, todo2.id)
      db.unlinkTodos(todo1.id, todo2.id)

      expect(db.getLinkedTodos(todo1.id)).toHaveLength(0)
    })
  })

  describe('Search', () => {
    it('should search todos by title', () => {
      db.createTodo('Buy groceries')
      db.createTodo('Buy presents')
      db.createTodo('Clean house')

      const results = db.searchTodos('Buy')

      expect(results).toHaveLength(2)
    })

    it('should exclude specified todo from search', () => {
      const todo1 = db.createTodo('Buy groceries')
      db.createTodo('Buy presents')

      const results = db.searchTodos('Buy', todo1.id)

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Buy presents')
    })
  })

  describe('Basic Todo Operations', () => {
    it('should create a todo', () => {
      const todo = db.createTodo('Test todo')

      expect(todo.id).toBeDefined()
      expect(todo.title).toBe('Test todo')
      expect(todo.completed).toBe(0)
    })

    it('should update todo notes', () => {
      const todo = db.createTodo('Test')
      const updated = db.updateTodo({ ...todo, notes: '# Notes\nSome content' })

      expect(updated.notes).toBe('# Notes\nSome content')
    })

    it('should update todo deadline', () => {
      const todo = db.createTodo('Test')
      const updated = db.updateTodo({ ...todo, deadline: '2024-12-31' })

      expect(updated.deadline).toBe('2024-12-31')
    })

    it('should delete a todo', () => {
      const todo = db.createTodo('Test')
      db.deleteTodo(todo.id)

      expect(db.getTodo(todo.id)).toBeUndefined()
    })

    it('should reorder todos', () => {
      const todo1 = db.createTodo('First')
      const todo2 = db.createTodo('Second')
      const todo3 = db.createTodo('Third')

      db.reorderTodos([todo3.id, todo1.id, todo2.id])

      const todos = db.getAllTodos()
      expect(todos[0].id).toBe(todo3.id)
      expect(todos[1].id).toBe(todo1.id)
      expect(todos[2].id).toBe(todo2.id)
    })
  })

  describe('Settings', () => {
    it('should return null for non-existent setting', () => {
      const value = db.getSetting('non_existent_key')
      expect(value).toBeNull()
    })

    it('should set and retrieve a string setting', () => {
      db.setSetting('theme', 'dark')
      const value = db.getSetting('theme')
      expect(value).toBe('dark')
    })

    it('should set and retrieve a boolean setting', () => {
      db.setSetting('hide_completed', true)
      const value = db.getSetting('hide_completed')
      expect(value).toBe(true)
    })

    it('should set and retrieve a number setting', () => {
      db.setSetting('card_size', 280)
      const value = db.getSetting('card_size')
      expect(value).toBe(280)
    })

    it('should update existing setting', () => {
      db.setSetting('theme', 'light')
      db.setSetting('theme', 'dark')
      const value = db.getSetting('theme')
      expect(value).toBe('dark')
    })

    it('should get all settings as object', () => {
      db.setSetting('theme', 'dark')
      db.setSetting('card_size', 300)
      db.setSetting('hide_completed', false)

      const settings = db.getAllSettings()

      expect(settings.theme).toBe('dark')
      expect(settings.card_size).toBe(300)
      expect(settings.hide_completed).toBe(false)
    })
  })

  describe('Todo Types', () => {
    it('should create todo with default type', () => {
      const todo = db.createTodo('Task')
      expect(todo.type).toBe('todo')
    })

    it('should create todo with explicit todo type', () => {
      const todo = db.createTodo('Task', null, 'todo')
      expect(todo.type).toBe('todo')
    })

    it('should create note type', () => {
      const note = db.createTodo('Note title', null, 'note')
      expect(note.type).toBe('note')
    })

    it('should filter by type', () => {
      db.createTodo('Task 1', null, 'todo')
      db.createTodo('Task 2', null, 'todo')
      db.createTodo('Note 1', null, 'note')

      const todos = db.getTodosByType('todo')
      const notes = db.getTodosByType('note')

      expect(todos).toHaveLength(2)
      expect(notes).toHaveLength(1)
      expect(todos[0].type).toBe('todo')
      expect(notes[0].type).toBe('note')
    })
  })

  describe('Global Search', () => {
    beforeEach(() => {
      // Set up test data
      db.createProject('Work Project', '#e74c3c')
      db.createProject('Personal Project', '#3498db')
      db.createTodo('Buy groceries')
      db.createTodo('Review code changes')
      const todoWithNotes = db.createTodo('Meeting prep')
      db.updateTodo({ ...todoWithNotes, notes: 'Discuss quarterly review' })
      db.createPerson({ name: 'John Doe', email: 'john@example.com', company: 'Acme Corp' })
      db.createPerson({ name: 'Jane Smith', email: 'jane@work.com', company: 'Tech Inc' })
    })

    it('should search across todos by title', () => {
      const results = db.globalSearch('Buy')

      expect(results.todos).toHaveLength(1)
      expect(results.todos[0].title).toBe('Buy groceries')
    })

    it('should search todos by notes content', () => {
      const results = db.globalSearch('quarterly')

      expect(results.todos).toHaveLength(1)
      expect(results.todos[0].title).toBe('Meeting prep')
    })

    it('should search across persons by name', () => {
      const results = db.globalSearch('John')

      expect(results.persons).toHaveLength(1)
      expect(results.persons[0].name).toBe('John Doe')
    })

    it('should search across persons by company', () => {
      const results = db.globalSearch('Acme')

      expect(results.persons).toHaveLength(1)
      expect(results.persons[0].company).toBe('Acme Corp')
    })

    it('should search across projects by name', () => {
      const results = db.globalSearch('Work')

      expect(results.projects).toHaveLength(1)
      expect(results.projects[0].name).toBe('Work Project')
    })

    it('should return grouped results', () => {
      const results = db.globalSearch('code')

      expect(results).toHaveProperty('todos')
      expect(results).toHaveProperty('persons')
      expect(results).toHaveProperty('projects')
      expect(Array.isArray(results.todos)).toBe(true)
      expect(Array.isArray(results.persons)).toBe(true)
      expect(Array.isArray(results.projects)).toBe(true)
    })

    it('should return empty results for no matches', () => {
      const results = db.globalSearch('xyz123nonexistent')

      expect(results.todos).toHaveLength(0)
      expect(results.persons).toHaveLength(0)
      expect(results.projects).toHaveLength(0)
    })

    it('should respect limit parameter', () => {
      // Create more todos
      for (let i = 0; i < 25; i++) {
        db.createTodo(`Test item ${i}`)
      }

      const results = db.globalSearch('Test', 5)

      expect(results.todos.length).toBeLessThanOrEqual(5)
    })
  })
})
