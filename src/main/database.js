import BetterSqlite3 from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export class Database {
  constructor(dbPath = null) {
    if (!dbPath) {
      const userDataPath = app.getPath('userData')
      if (!existsSync(userDataPath)) {
        mkdirSync(userDataPath, { recursive: true })
      }
      dbPath = join(userDataPath, 'todos.db')
    }

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

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#9b59b6',
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
        importance INTEGER DEFAULT 3,
        project_id INTEGER,
        category_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
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
    `)

    // Migration: add importance and category_id if missing
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN importance INTEGER DEFAULT 3')
    } catch (e) { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN category_id INTEGER')
    } catch (e) { /* column exists */ }
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

  // Category operations
  getAllCategories() {
    return this.db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all()
  }

  getCategory(id) {
    return this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  }

  createCategory(name, color = '#9b59b6') {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM categories').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(
      'INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)'
    ).run(name, color, sortOrder)

    return this.getCategory(result.lastInsertRowid)
  }

  updateCategory(category) {
    this.db.prepare(
      'UPDATE categories SET name = ?, color = ? WHERE id = ?'
    ).run(category.name, category.color, category.id)

    return this.getCategory(category.id)
  }

  deleteCategory(id) {
    this.db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return true
  }

  // Todo operations
  getAllTodos(projectId = null) {
    if (projectId === null) {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               c.name as category_name, c.color as category_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all()
    } else if (projectId === 'inbox') {
      return this.db.prepare(`
        SELECT t.*, NULL as project_name, NULL as project_color,
               c.name as category_name, c.color as category_color
        FROM todos t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.project_id IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all()
    } else {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               c.name as category_name, c.color as category_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.project_id = ?
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all(projectId)
    }
  }

  getTodo(id) {
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             c.name as category_name, c.color as category_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id)
  }

  createTodo(title, projectId = null) {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM todos').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(`
      INSERT INTO todos (title, sort_order, project_id) VALUES (?, ?, ?)
    `).run(title, sortOrder, projectId)

    return this.getTodo(result.lastInsertRowid)
  }

  updateTodo(todo) {
    // Convert empty strings to null for deadline
    const deadline = todo.deadline && todo.deadline.trim() !== '' ? todo.deadline : null
    const importance = todo.importance != null ? todo.importance : 3

    this.db.prepare(`
      UPDATE todos
      SET title = ?, notes = ?, deadline = ?, completed = ?, project_id = ?, category_id = ?, importance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(todo.title, todo.notes || '', deadline, todo.completed ? 1 : 0, todo.project_id || null, todo.category_id || null, importance, todo.id)

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
      SELECT t.*, p.name as project_name, p.color as project_color,
             c.name as category_name, c.color as category_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id IN (
        SELECT target_id FROM todo_links WHERE source_id = ?
        UNION
        SELECT source_id FROM todo_links WHERE target_id = ?
      )
    `).all(todoId, todoId)
  }

  linkTodos(sourceId, targetId) {
    if (sourceId === targetId) return false

    // Ensure consistent ordering to avoid duplicates
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

  // Search todos for linking
  searchTodos(query, excludeId = null) {
    if (excludeId) {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               c.name as category_name, c.color as category_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.title LIKE ? AND t.id != ?
        LIMIT 10
      `).all(`%${query}%`, excludeId)
    }
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             c.name as category_name, c.color as category_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.title LIKE ?
      LIMIT 10
    `).all(`%${query}%`)
  }

  close() {
    this.db.close()
  }
}
