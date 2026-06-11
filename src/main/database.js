import BetterSqlite3 from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import log from './logger.js'

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


      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        deadline TEXT,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        importance INTEGER DEFAULT NULL,
        project_id INTEGER,
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

      CREATE TABLE IF NOT EXISTS statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#3498db',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS milestone_todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        milestone_id INTEGER NOT NULL,
        todo_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (milestone_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        UNIQUE(milestone_id, todo_id)
      );

      CREATE TABLE IF NOT EXISTS project_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#666',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, name)
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS todo_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(todo_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS project_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(project_id, tag_id)
      );
    `)

    // Migration: add importance if missing
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN importance INTEGER DEFAULT NULL')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN importance', error: error.message })
      }
    }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN start_date TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN start_date', error: error.message })
      }
    }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN status_id INTEGER')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN status_id', error: error.message })
      }
    }

    // Migration: rename deadline to end_date
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN end_date TEXT')
      // Migrate data from deadline to end_date
      this.db.exec('UPDATE todos SET end_date = deadline WHERE deadline IS NOT NULL AND end_date IS NULL')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN end_date', error: error.message })
      }
    }

    // Migration: add deleted_at for soft delete (trashbin)
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN deleted_at TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN deleted_at to todos', error: error.message })
      }
    }

    // Migration: add deleted_at for projects soft delete
    try {
      this.db.exec('ALTER TABLE projects ADD COLUMN deleted_at TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN deleted_at to projects', error: error.message })
      }
    }

    // Migration: drop categories table
    try {
      this.db.exec('DROP TABLE IF EXISTS categories')
    } catch (error) {
      log.warn('Migration warning', { migration: 'DROP TABLE categories', error: error.message })
    }

    // Migration: add recurrence fields to todos
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN recurrence_type TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN recurrence_type', error: error.message })
      }
    }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN recurrence_interval INTEGER DEFAULT 1')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN recurrence_interval', error: error.message })
      }
    }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN recurrence_end_date TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN recurrence_end_date', error: error.message })
      }
    }

    // Migration: fix importance default - update any default 3 values to NULL
    try {
      this.db.exec('UPDATE todos SET importance = NULL WHERE importance = 3 AND title NOT LIKE \'%importance%\'')
    } catch (error) {
      log.warn('Migration warning', { migration: 'UPDATE importance defaults', error: error.message })
    }


    // Migration: add notes_sensitive flag for todos
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN notes_sensitive INTEGER DEFAULT 0')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN notes_sensitive', error: error.message })
      }
    }

    // Migration: add type column to todos (for todo vs note distinction)
    try {
      this.db.exec("ALTER TABLE todos ADD COLUMN type TEXT DEFAULT 'todo'")
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN type', error: error.message })
      }
    }

    // Migration: add parent_id for milestone hierarchy
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN parent_id INTEGER REFERENCES todos(id) ON DELETE SET NULL')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN parent_id', error: error.message })
      }
    }

    // Migration: add milestone_date for milestone markers
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN milestone_date TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN milestone_date', error: error.message })
      }
    }

    // Migration: add topic_id for project-specific topic buckets
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN topic_id INTEGER REFERENCES project_topics(id) ON DELETE SET NULL')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN topic_id', error: error.message })
      }
    }

    // Migration: add due_date column to todos
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN due_date TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN due_date to todos', error: error.message })
      }
    }

    // Migration: add completed_at column to todos
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN completed_at TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN completed_at', error: error.message })
      }
    }

    // Migration: add archived_at column to todos
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN archived_at TEXT')
    } catch (error) {
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        log.warn('Migration warning', { migration: 'ADD COLUMN archived_at', error: error.message })
      }
    }

    // Seed default statuses if none exist
    const statusCount = this.db.prepare('SELECT COUNT(*) as count FROM statuses').get().count
    if (statusCount === 0) {
      const defaultStatuses = [
        { name: 'Todo', color: '#d93025', sort_order: 0 },
        { name: 'In Progress', color: '#ef6c00', sort_order: 1 },
        { name: 'Done', color: '#0f9d58', sort_order: 2 },
        { name: 'Backlog', color: '#1a73e8', sort_order: 3 }
      ]
      const stmt = this.db.prepare('INSERT INTO statuses (name, color, sort_order) VALUES (?, ?, ?)')
      defaultStatuses.forEach(s => stmt.run(s.name, s.color, s.sort_order))
    }
  }

  // Project operations
  getAllProjects() {
    return this.db.prepare('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY sort_order ASC').all()
  }

  getDeletedProjects() {
    return this.db.prepare('SELECT * FROM projects WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all()
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
    // Move all todos in this project to inbox (no project)
    this.db.prepare('UPDATE todos SET project_id = NULL WHERE project_id = ?').run(id)

    // Soft delete: set deleted_at timestamp
    this.db.prepare('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    return true
  }

  restoreProject(id) {
    this.db.prepare('UPDATE projects SET deleted_at = NULL WHERE id = ?').run(id)
    return this.getProject(id)
  }

  permanentlyDeleteProject(id) {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    return true
  }

  // Project Topic operations (project-specific buckets)
  getProjectTopics(projectId) {
    return this.db.prepare('SELECT * FROM project_topics WHERE project_id = ? ORDER BY sort_order ASC').all(projectId)
  }

  getProjectTopic(id) {
    return this.db.prepare('SELECT * FROM project_topics WHERE id = ?').get(id)
  }

  createProjectTopic(projectId, name, color = '#666') {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM project_topics WHERE project_id = ?').get(projectId)
    const sortOrder = (maxOrder?.max || 0) + 1

    const result = this.db.prepare(
      'INSERT INTO project_topics (project_id, name, color, sort_order) VALUES (?, ?, ?, ?)'
    ).run(projectId, name, color, sortOrder)

    return this.getProjectTopic(result.lastInsertRowid)
  }

  updateProjectTopic(topic) {
    this.db.prepare(
      'UPDATE project_topics SET name = ?, color = ? WHERE id = ?'
    ).run(topic.name, topic.color, topic.id)

    return this.getProjectTopic(topic.id)
  }

  deleteProjectTopic(id) {
    // Clear topic_id from any todos using this topic
    this.db.prepare('UPDATE todos SET topic_id = NULL WHERE topic_id = ?').run(id)
    this.db.prepare('DELETE FROM project_topics WHERE id = ?').run(id)
    return true
  }

  reorderProjectTopics(ids) {
    const stmt = this.db.prepare('UPDATE project_topics SET sort_order = ? WHERE id = ?')
    ids.forEach((id, index) => stmt.run(index, id))
    return true
  }

  // Status operations
  getAllStatuses() {
    return this.db.prepare('SELECT * FROM statuses ORDER BY sort_order ASC').all()
  }

  getStatus(id) {
    return this.db.prepare('SELECT * FROM statuses WHERE id = ?').get(id)
  }

  createStatus(name, color = '#3498db') {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM statuses').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(
      'INSERT INTO statuses (name, color, sort_order) VALUES (?, ?, ?)'
    ).run(name, color, sortOrder)

    return this.getStatus(result.lastInsertRowid)
  }

  updateStatus(status) {
    this.db.prepare(
      'UPDATE statuses SET name = ?, color = ? WHERE id = ?'
    ).run(status.name, status.color, status.id)

    return this.getStatus(status.id)
  }

  deleteStatus(id) {
    this.db.prepare('DELETE FROM statuses WHERE id = ?').run(id)
    return true
  }

  // Todo operations
  getAllTodos(projectId = null) {
    if (projectId === null) {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               s.name as status_name, s.color as status_color,
               (SELECT json_group_array(json_object('id', tg.id, 'name', tg.name)) FROM todo_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.todo_id = t.id) as tags_json
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.deleted_at IS NULL AND t.archived_at IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all()
    } else if (projectId === 'inbox') {
      return this.db.prepare(`
        SELECT t.*, NULL as project_name, NULL as project_color,
               s.name as status_name, s.color as status_color,
               (SELECT json_group_array(json_object('id', tg.id, 'name', tg.name)) FROM todo_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.todo_id = t.id) as tags_json
        FROM todos t
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.project_id IS NULL AND t.deleted_at IS NULL AND t.archived_at IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all()
    } else if (projectId === 'archive') {
      return this.getArchivedTodos()
    } else if (projectId === 'trash') {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               s.name as status_name, s.color as status_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.deleted_at IS NOT NULL
        ORDER BY t.deleted_at DESC
      `).all()
    } else {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               s.name as status_name, s.color as status_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.project_id = ? AND t.deleted_at IS NULL AND t.archived_at IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all(projectId)
    }
  }

  getTodo(id) {
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE t.id = ?
    `).get(id)
  }

  createTodo(title, projectId = null, type = 'todo') {
    // Insert at top (lowest sort_order)
    const minOrder = this.db.prepare('SELECT MIN(sort_order) as min FROM todos').get()
    const sortOrder = (minOrder.min || 0) - 1

    const result = this.db.prepare(`
      INSERT INTO todos (title, sort_order, project_id, importance, type) VALUES (?, ?, ?, NULL, ?)
    `).run(title, sortOrder, projectId, type)

    return this.getTodo(result.lastInsertRowid)
  }

  updateTodo(todo) {
    // Convert empty strings to null for dates
    const endDate = todo.end_date && todo.end_date.trim() !== '' ? todo.end_date : null
    const startDate = todo.start_date && todo.start_date.trim() !== '' ? todo.start_date : null
    const importance = todo.importance != null ? todo.importance : null
    const recurrenceType = todo.recurrence_type && todo.recurrence_type.trim() !== '' ? todo.recurrence_type : null
    const recurrenceInterval = todo.recurrence_interval || 1
    const recurrenceEndDate = todo.recurrence_end_date && todo.recurrence_end_date.trim() !== '' ? todo.recurrence_end_date : null
    const notesSensitive = todo.notes_sensitive ? 1 : 0
    const type = todo.type || 'todo'
    const topicId = todo.topic_id !== undefined ? todo.topic_id : null

    // Set completed_at when completing, clear when uncompleting
    const existingTodo = this.getTodo(todo.id)
    let completedAt = existingTodo?.completed_at || null
    if (todo.completed && !existingTodo?.completed) {
      completedAt = new Date().toISOString()
    } else if (!todo.completed) {
      completedAt = null
    }

    this.db.prepare(`
      UPDATE todos
      SET title = ?, notes = ?, end_date = ?, start_date = ?, completed = ?, completed_at = ?, project_id = ?, status_id = ?, importance = ?, recurrence_type = ?, recurrence_interval = ?, recurrence_end_date = ?, notes_sensitive = ?, type = ?, topic_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(todo.title, todo.notes || '', endDate, startDate, todo.completed ? 1 : 0, completedAt, todo.project_id || null, todo.status_id || null, importance, recurrenceType, recurrenceInterval, recurrenceEndDate, notesSensitive, type, topicId, todo.id)

    return this.getTodo(todo.id)
  }

  // Create next recurring todo instance when completing a recurring task
  createNextRecurrence(todoId) {
    const todo = this.getTodo(todoId)
    if (!todo || !todo.recurrence_type) return null

    // Calculate next due date
    const baseDate = todo.end_date ? new Date(todo.end_date) : new Date()
    const interval = todo.recurrence_interval || 1

    let nextDate = new Date(baseDate)
    switch (todo.recurrence_type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (interval * 7))
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval)
        break
      default:
        return null
    }

    // Check if recurrence end date has passed
    if (todo.recurrence_end_date) {
      const endDate = new Date(todo.recurrence_end_date)
      if (nextDate > endDate) return null
    }

    const nextDateStr = nextDate.toISOString().split('T')[0]

    // Calculate next start date if original had one
    let nextStartDate = null
    if (todo.start_date && todo.end_date) {
      const startDate = new Date(todo.start_date)
      const endDateObj = new Date(todo.end_date)
      const duration = endDateObj - startDate
      const newStartDate = new Date(nextDate - duration)
      nextStartDate = newStartDate.toISOString().split('T')[0]
    }

    // Create new todo with same properties but new dates
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM todos').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(`
      INSERT INTO todos (title, notes, end_date, start_date, completed, sort_order, importance, project_id, status_id, recurrence_type, recurrence_interval, recurrence_end_date)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      todo.title,
      todo.notes || '',
      nextDateStr,
      nextStartDate,
      sortOrder,
      todo.importance,
      todo.project_id,
      todo.status_id,
      todo.recurrence_type,
      todo.recurrence_interval,
      todo.recurrence_end_date
    )

    return this.getTodo(result.lastInsertRowid)
  }

  deleteTodo(id) {
    // Soft delete: set deleted_at timestamp
    this.db.prepare('UPDATE todos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    return true
  }

  restoreTodo(id) {
    this.db.prepare('UPDATE todos SET deleted_at = NULL WHERE id = ?').run(id)
    return this.getTodo(id)
  }

  archiveTodo(id) {
    this.db.prepare('UPDATE todos SET archived_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    return true
  }

  getCompletedTodoIds(projectId = null) {
    let sql = 'SELECT id FROM todos WHERE completed = 1 AND archived_at IS NULL AND deleted_at IS NULL'
    const params = []
    if (projectId === 'inbox') {
      sql += ' AND project_id IS NULL'
    } else if (projectId !== null && typeof projectId === 'number') {
      sql += ' AND project_id = ?'
      params.push(projectId)
    }
    return this.db.prepare(sql).all(...params).map(r => r.id)
  }

  archiveCompletedTodos(projectId = null) {
    let sql = 'UPDATE todos SET archived_at = CURRENT_TIMESTAMP WHERE completed = 1 AND archived_at IS NULL AND deleted_at IS NULL'
    const params = []
    if (projectId === 'inbox') {
      sql += ' AND project_id IS NULL'
    } else if (projectId !== null && typeof projectId === 'number') {
      sql += ' AND project_id = ?'
      params.push(projectId)
    }
    const result = this.db.prepare(sql).run(...params)
    return result.changes
  }

  unarchiveTodo(id) {
    this.db.prepare('UPDATE todos SET archived_at = NULL WHERE id = ?').run(id)
    return this.getTodo(id)
  }

  getArchivedTodos() {
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE t.archived_at IS NOT NULL AND t.deleted_at IS NULL
      ORDER BY t.archived_at DESC
    `).all()
  }

  getArchiveCount() {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM todos WHERE archived_at IS NOT NULL AND deleted_at IS NULL').get()
    return result.count
  }

  permanentlyDeleteTodo(id) {
    this.db.prepare('DELETE FROM todos WHERE id = ?').run(id)
    return true
  }

  emptyTrash() {
    this.db.prepare('DELETE FROM todos WHERE deleted_at IS NOT NULL').run()
    return true
  }

  getTrashCount() {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM todos WHERE deleted_at IS NOT NULL').get()
    return result.count
  }

  // Milestone operations
  getChildTodos(parentId) {
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE t.parent_id = ? AND t.deleted_at IS NULL
      ORDER BY t.sort_order ASC
    `).all(parentId)
  }

  getAllMilestones(projectId = null) {
    if (projectId) {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.type = 'milestone' AND t.project_id = ? AND t.deleted_at IS NULL
        ORDER BY t.milestone_date ASC, t.created_at ASC
      `).all(projectId)
    }
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.type = 'milestone' AND t.deleted_at IS NULL
      ORDER BY t.milestone_date ASC, t.created_at ASC
    `).all()
  }

  assignToMilestone(todoId, milestoneId) {
    this.db.prepare('UPDATE todos SET parent_id = ? WHERE id = ?').run(milestoneId, todoId)
    return this.getTodo(todoId)
  }

  unassignFromMilestone(todoId) {
    this.db.prepare('UPDATE todos SET parent_id = NULL WHERE id = ?').run(todoId)
    return this.getTodo(todoId)
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

  reorderProjects(ids) {
    const stmt = this.db.prepare('UPDATE projects SET sort_order = ? WHERE id = ?')
    const transaction = this.db.transaction((ids) => {
      ids.forEach((id, index) => {
        stmt.run(index, id)
      })
    })
    transaction(ids)
    return true
  }

  reorderStatuses(ids) {
    const stmt = this.db.prepare('UPDATE statuses SET sort_order = ? WHERE id = ?')
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
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN statuses s ON t.status_id = s.id
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
    } catch (error) {
      log.warn('Failed to link todos', { sourceId, targetId, error: error.message })
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
               s.name as status_name, s.color as status_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.title LIKE ? AND t.id != ? AND t.deleted_at IS NULL
        LIMIT 10
      `).all(`%${query}%`, excludeId)
    }
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE t.title LIKE ? AND t.deleted_at IS NULL
      LIMIT 10
    `).all(`%${query}%`)
  }

  // Global search across todos, projects, and tags
  globalSearch(query, limit = 20) {
    const searchTerm = `%${query}%`

    // Search todos (title + notes + tags)
    const todos = this.db.prepare(`
      SELECT DISTINCT t.*, p.name as project_name, p.color as project_color,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN statuses s ON t.status_id = s.id
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE (t.title LIKE ? OR t.notes LIKE ? OR tg.name LIKE ?) AND t.deleted_at IS NULL
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limit)

    // Search projects (name + tags)
    const projects = this.db.prepare(`
      SELECT DISTINCT pr.*
      FROM projects pr
      LEFT JOIN project_tags prt ON pr.id = prt.project_id
      LEFT JOIN tags tg ON prt.tag_id = tg.id
      WHERE (pr.name LIKE ? OR tg.name LIKE ?) AND pr.deleted_at IS NULL
      LIMIT ?
    `).all(searchTerm, searchTerm, limit)

    // Search tags directly
    const tags = this.db.prepare(`
      SELECT * FROM tags WHERE name LIKE ? LIMIT ?
    `).all(searchTerm, limit)

    return { todos, projects, tags }
  }

  // Settings operations
  getSetting(key) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    if (!row) return null
    try {
      return JSON.parse(row.value)
    } catch (error) {
      log.warn('Failed to parse setting value as JSON, returning raw string', { key, error: error.message })
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
      } catch (error) {
        log.warn('Failed to parse setting value as JSON, using raw string', { key: row.key, error: error.message })
        settings[row.key] = row.value
      }
    }
    return settings
  }

  // Milestone operations
  getMilestoneTodos(milestoneId) {
    return this.db.prepare(`
      SELECT t.*,
             p.name as project_name,
             p.color as project_color,
             s.name as status_name,
             s.color as status_color
      FROM todos t
      INNER JOIN milestone_todos mt ON t.id = mt.todo_id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE mt.milestone_id = ? AND t.deleted_at IS NULL
      ORDER BY t.sort_order ASC
    `).all(milestoneId)
  }

  linkMilestoneTodo(milestoneId, todoId) {
    this.db.prepare(`
      INSERT OR IGNORE INTO milestone_todos (milestone_id, todo_id)
      VALUES (?, ?)
    `).run(milestoneId, todoId)
    return true
  }

  unlinkMilestoneTodo(milestoneId, todoId) {
    this.db.prepare(`
      DELETE FROM milestone_todos
      WHERE milestone_id = ? AND todo_id = ?
    `).run(milestoneId, todoId)
    return true
  }

  // Tag operations
  getAllTags() {
    return this.db.prepare('SELECT * FROM tags ORDER BY name ASC').all()
  }

  getTag(id) {
    return this.db.prepare('SELECT * FROM tags WHERE id = ?').get(id)
  }

  getTagByName(name) {
    return this.db.prepare('SELECT * FROM tags WHERE name = ?').get(name)
  }

  createTag(name) {
    const existing = this.getTagByName(name)
    if (existing) return existing

    const result = this.db.prepare('INSERT INTO tags (name) VALUES (?)').run(name)
    return this.getTag(result.lastInsertRowid)
  }

  deleteTag(id) {
    this.db.prepare('DELETE FROM tags WHERE id = ?').run(id)
    return true
  }

  // Todo-Tag operations
  getTodoTags(todoId) {
    return this.db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN todo_tags tt ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
      ORDER BY t.name ASC
    `).all(todoId)
  }

  addTodoTag(todoId, tagName) {
    const tag = this.createTag(tagName)
    try {
      this.db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(todoId, tag.id)
    } catch (error) {
      log.warn('Failed to add tag to todo', { todoId, tagName, error: error.message })
    }
    return tag
  }

  removeTodoTag(todoId, tagId) {
    this.db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId)
    this.cleanupOrphanedTag(tagId)
    return true
  }

  // Delete tag if it has no associations
  cleanupOrphanedTag(tagId) {
    const count = this.db.prepare(`
      SELECT (SELECT COUNT(*) FROM todo_tags WHERE tag_id = ?) +
             (SELECT COUNT(*) FROM project_tags WHERE tag_id = ?) as total
    `).get(tagId, tagId)
    if (count.total === 0) {
      this.db.prepare('DELETE FROM tags WHERE id = ?').run(tagId)
    }
  }

  // Project-Tag operations
  getProjectTags(projectId) {
    return this.db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN project_tags pt ON t.id = pt.tag_id
      WHERE pt.project_id = ?
      ORDER BY t.name ASC
    `).all(projectId)
  }

  addProjectTag(projectId, tagName) {
    const tag = this.createTag(tagName)
    try {
      this.db.prepare('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)').run(projectId, tag.id)
    } catch (error) {
      log.warn('Failed to add tag to project', { projectId, tagName, error: error.message })
    }
    return tag
  }

  removeProjectTag(projectId, tagId) {
    this.db.prepare('DELETE FROM project_tags WHERE project_id = ? AND tag_id = ?').run(projectId, tagId)
    this.cleanupOrphanedTag(tagId)
    return true
  }

  // Search by tag
  searchByTag(tagName) {
    const tag = this.getTagByName(tagName)
    if (!tag) return { todos: [], projects: [] }

    const todos = this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             s.name as status_name, s.color as status_color
      FROM todos t
      INNER JOIN todo_tags tt ON t.id = tt.todo_id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE tt.tag_id = ? AND t.deleted_at IS NULL
    `).all(tag.id)

    const projects = this.db.prepare(`
      SELECT p.* FROM projects p
      INNER JOIN project_tags pt ON p.id = pt.project_id
      WHERE pt.tag_id = ? AND p.deleted_at IS NULL
    `).all(tag.id)

    return { todos, projects }
  }

  // Export/Import operations
  exportData() {
    const projects = this.db.prepare('SELECT * FROM projects').all()
    const statuses = this.db.prepare('SELECT * FROM statuses').all()
    const todos = this.db.prepare('SELECT * FROM todos').all()
    const todoLinks = this.db.prepare('SELECT * FROM todo_links').all()

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        projects,
        statuses,
        todos,
        todoLinks
      }
    }
  }

  importData(importData, mode = 'merge') {
    if (!importData || !importData.data) {
      throw new Error('Invalid import data format')
    }

    const { projects, statuses, todos, todoLinks } = importData.data

    // Create a transaction for atomic import
    const transaction = this.db.transaction(() => {
      // If replace mode, clear existing data
      if (mode === 'replace') {
        this.db.prepare('DELETE FROM todo_links').run()
        this.db.prepare('DELETE FROM todos').run()
        this.db.prepare('DELETE FROM statuses').run()
        this.db.prepare('DELETE FROM projects').run()
      }

      // Maps to track old ID to new ID mappings
      const projectIdMap = new Map()
      const statusIdMap = new Map()
      const todoIdMap = new Map()

      // Import projects
      if (projects && projects.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO projects (name, color, sort_order, created_at, deleted_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        projects.forEach(p => {
          const result = stmt.run(p.name, p.color, p.sort_order, p.created_at, p.deleted_at || null)
          projectIdMap.set(p.id, result.lastInsertRowid)
        })
      }

      // Import statuses
      if (statuses && statuses.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO statuses (name, color, sort_order, created_at)
          VALUES (?, ?, ?, ?)
        `)
        statuses.forEach(s => {
          const result = stmt.run(s.name, s.color, s.sort_order, s.created_at)
          statusIdMap.set(s.id, result.lastInsertRowid)
        })
      }

      // Import todos
      if (todos && todos.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO todos (title, notes, end_date, start_date, completed, sort_order, importance, project_id, status_id, created_at, updated_at, deleted_at, recurrence_type, recurrence_interval, recurrence_end_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        todos.forEach(t => {
          const newProjectId = t.project_id ? projectIdMap.get(t.project_id) : null
          const newStatusId = t.status_id ? statusIdMap.get(t.status_id) : null

          const result = stmt.run(
            t.title,
            t.notes,
            t.end_date,
            t.start_date,
            t.completed,
            t.sort_order,
            t.importance,
            newProjectId,
            newStatusId,
            t.created_at,
            t.updated_at,
            t.deleted_at || null,
            t.recurrence_type,
            t.recurrence_interval,
            t.recurrence_end_date
          )
          todoIdMap.set(t.id, result.lastInsertRowid)
        })
      }

      // Import todo links
      if (todoLinks && todoLinks.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO todo_links (source_id, target_id, created_at)
          VALUES (?, ?, ?)
        `)
        todoLinks.forEach(l => {
          const newSourceId = todoIdMap.get(l.source_id)
          const newTargetId = todoIdMap.get(l.target_id)
          if (newSourceId && newTargetId) {
            stmt.run(newSourceId, newTargetId, l.created_at)
          }
        })
      }
    })

    transaction()
    return true
  }

  close() {
    this.db.close()
  }
}
