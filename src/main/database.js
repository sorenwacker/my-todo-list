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
        symbol TEXT DEFAULT '*',
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

      CREATE TABLE IF NOT EXISTS statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#3498db',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        company TEXT DEFAULT '',
        role TEXT DEFAULT '',
        github_name TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        color TEXT DEFAULT '#0f4c75',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS todo_persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo_id INTEGER NOT NULL,
        person_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
        UNIQUE(todo_id, person_id)
      );

      CREATE TABLE IF NOT EXISTS project_persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        person_id INTEGER NOT NULL,
        influence_level INTEGER DEFAULT 3,
        interest_level INTEGER DEFAULT 3,
        stakeholder_type TEXT DEFAULT 'Internal',
        engagement_strategy TEXT DEFAULT 'Keep Informed',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
        UNIQUE(project_id, person_id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Migration: add importance and category_id if missing
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN importance INTEGER DEFAULT NULL')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN category_id INTEGER')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN start_date TEXT')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE persons ADD COLUMN github_name TEXT DEFAULT \'\'')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN status_id INTEGER')
    } catch { /* column exists */ }

    // Migration: rename deadline to end_date
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN end_date TEXT')
      // Migrate data from deadline to end_date
      this.db.exec('UPDATE todos SET end_date = deadline WHERE deadline IS NOT NULL AND end_date IS NULL')
    } catch { /* column exists */ }

    // Migration: add deleted_at for soft delete (trashbin)
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN deleted_at TEXT')
    } catch { /* column exists */ }

    // Migration: add deleted_at for projects soft delete
    try {
      this.db.exec('ALTER TABLE projects ADD COLUMN deleted_at TEXT')
    } catch { /* column exists */ }

    // Migration: add symbol column to categories (replacing color)
    try {
      this.db.exec('ALTER TABLE categories ADD COLUMN symbol TEXT DEFAULT \'*\'')
    } catch { /* column exists */ }

    // Migration: add recurrence fields to todos
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN recurrence_type TEXT')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN recurrence_interval INTEGER DEFAULT 1')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN recurrence_end_date TEXT')
    } catch { /* column exists */ }

    // Migration: fix importance default - update any default 3 values to NULL
    try {
      this.db.exec('UPDATE todos SET importance = NULL WHERE importance = 3 AND title NOT LIKE \'%importance%\'')
    } catch { /* ignore errors */ }

    // Migration: add stakeholder analysis fields to project_persons
    try {
      this.db.exec('ALTER TABLE project_persons ADD COLUMN influence_level INTEGER DEFAULT 3')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE project_persons ADD COLUMN interest_level INTEGER DEFAULT 3')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE project_persons ADD COLUMN stakeholder_type TEXT DEFAULT \'Internal\'')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE project_persons ADD COLUMN engagement_strategy TEXT DEFAULT \'Keep Informed\'')
    } catch { /* column exists */ }
    try {
      this.db.exec('ALTER TABLE project_persons ADD COLUMN notes TEXT DEFAULT \'\'')
    } catch { /* column exists */ }

    // Migration: add notes_sensitive flag for todos
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN notes_sensitive INTEGER DEFAULT 0')
    } catch { /* column exists */ }

    // Migration: add type column to todos (for todo vs note distinction)
    try {
      this.db.exec("ALTER TABLE todos ADD COLUMN type TEXT DEFAULT 'todo'")
    } catch { /* column exists */ }

    // Migration: add parent_id for milestone hierarchy
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN parent_id INTEGER REFERENCES todos(id) ON DELETE SET NULL')
    } catch { /* column exists */ }

    // Migration: add milestone_date for milestone markers
    try {
      this.db.exec('ALTER TABLE todos ADD COLUMN milestone_date TEXT')
    } catch { /* column exists */ }

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

  // Category operations
  getAllCategories() {
    return this.db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all()
  }

  getCategory(id) {
    return this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  }

  createCategory(name, symbol = '*') {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM categories').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(
      'INSERT INTO categories (name, symbol, sort_order) VALUES (?, ?, ?)'
    ).run(name, symbol, sortOrder)

    return this.getCategory(result.lastInsertRowid)
  }

  updateCategory(category) {
    this.db.prepare(
      'UPDATE categories SET name = ?, symbol = ? WHERE id = ?'
    ).run(category.name, category.symbol, category.id)

    return this.getCategory(category.id)
  }

  deleteCategory(id) {
    this.db.prepare('DELETE FROM categories WHERE id = ?').run(id)
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

  // Person operations
  getAllPersons() {
    return this.db.prepare('SELECT * FROM persons ORDER BY sort_order ASC').all()
  }

  getPerson(id) {
    return this.db.prepare('SELECT * FROM persons WHERE id = ?').get(id)
  }

  createPerson(person) {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM persons').get()
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(`
      INSERT INTO persons (name, email, phone, company, role, github_name, notes, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      person.name,
      person.email || '',
      person.phone || '',
      person.company || '',
      person.role || '',
      person.github_name || '',
      person.notes || '',
      person.color || '#0f4c75',
      sortOrder
    )

    return this.getPerson(result.lastInsertRowid)
  }

  updatePerson(person) {
    this.db.prepare(`
      UPDATE persons
      SET name = ?, email = ?, phone = ?, company = ?, role = ?, github_name = ?, notes = ?, color = ?
      WHERE id = ?
    `).run(
      person.name,
      person.email || '',
      person.phone || '',
      person.company || '',
      person.role || '',
      person.github_name || '',
      person.notes || '',
      person.color,
      person.id
    )

    return this.getPerson(person.id)
  }

  deletePerson(id) {
    this.db.prepare('DELETE FROM persons WHERE id = ?').run(id)
    return true
  }

  reorderPersons(ids) {
    const stmt = this.db.prepare('UPDATE persons SET sort_order = ? WHERE id = ?')
    const transaction = this.db.transaction((ids) => {
      ids.forEach((id, index) => {
        stmt.run(index, id)
      })
    })
    transaction(ids)
    return true
  }

  // Todo operations
  getAllTodos(projectId = null) {
    if (projectId === null) {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               c.name as category_name, c.symbol as category_symbol,
               s.name as status_name, s.color as status_color,
               (SELECT COUNT(*) FROM subtasks WHERE todo_id = t.id) as subtask_count,
               (SELECT COUNT(*) FROM subtasks WHERE todo_id = t.id AND completed = 1) as subtask_completed,
               (SELECT json_group_array(json_object('id', id, 'title', title, 'completed', completed)) FROM subtasks WHERE todo_id = t.id ORDER BY sort_order) as subtasks_json
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.deleted_at IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all()
    } else if (projectId === 'inbox') {
      return this.db.prepare(`
        SELECT t.*, NULL as project_name, NULL as project_color,
               c.name as category_name, c.symbol as category_symbol,
               s.name as status_name, s.color as status_color,
               (SELECT COUNT(*) FROM subtasks WHERE todo_id = t.id) as subtask_count,
               (SELECT COUNT(*) FROM subtasks WHERE todo_id = t.id AND completed = 1) as subtask_completed,
               (SELECT json_group_array(json_object('id', id, 'title', title, 'completed', completed)) FROM subtasks WHERE todo_id = t.id ORDER BY sort_order) as subtasks_json
        FROM todos t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.project_id IS NULL AND t.deleted_at IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all()
    } else if (projectId === 'trash') {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               c.name as category_name, c.symbol as category_symbol,
               s.name as status_name, s.color as status_color,
               (SELECT COUNT(*) FROM subtasks WHERE todo_id = t.id) as subtask_count,
               (SELECT COUNT(*) FROM subtasks WHERE todo_id = t.id AND completed = 1) as subtask_completed,
               (SELECT json_group_array(json_object('id', id, 'title', title, 'completed', completed)) FROM subtasks WHERE todo_id = t.id ORDER BY sort_order) as subtasks_json
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.deleted_at IS NOT NULL
        ORDER BY t.deleted_at DESC
      `).all()
    } else {
      return this.db.prepare(`
        SELECT t.*, p.name as project_name, p.color as project_color,
               c.name as category_name, c.symbol as category_symbol,
               s.name as status_name, s.color as status_color,
               (SELECT COUNT(*) FROM subtasks WHERE todo_id = t.id) as subtask_count,
               (SELECT COUNT(*) FROM subtasks WHERE todo_id = t.id AND completed = 1) as subtask_completed,
               (SELECT json_group_array(json_object('id', id, 'title', title, 'completed', completed)) FROM subtasks WHERE todo_id = t.id ORDER BY sort_order) as subtasks_json
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.project_id = ? AND t.deleted_at IS NULL
        ORDER BY t.sort_order ASC, t.created_at DESC
      `).all(projectId)
    }
  }

  getTodo(id) {
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             c.name as category_name, c.symbol as category_symbol,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE t.id = ?
    `).get(id)
  }

  createTodo(title, projectId = null, type = 'todo') {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM todos').get()
    const sortOrder = (maxOrder.max || 0) + 1

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

    this.db.prepare(`
      UPDATE todos
      SET title = ?, notes = ?, end_date = ?, start_date = ?, completed = ?, project_id = ?, category_id = ?, status_id = ?, importance = ?, recurrence_type = ?, recurrence_interval = ?, recurrence_end_date = ?, notes_sensitive = ?, type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(todo.title, todo.notes || '', endDate, startDate, todo.completed ? 1 : 0, todo.project_id || null, todo.category_id || null, todo.status_id || null, importance, recurrenceType, recurrenceInterval, recurrenceEndDate, notesSensitive, type, todo.id)

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
      INSERT INTO todos (title, notes, end_date, start_date, completed, sort_order, importance, project_id, category_id, status_id, recurrence_type, recurrence_interval, recurrence_end_date)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      todo.title,
      todo.notes || '',
      nextDateStr,
      nextStartDate,
      sortOrder,
      todo.importance,
      todo.project_id,
      todo.category_id,
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
             c.name as category_name, c.symbol as category_symbol,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
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

  reorderCategories(ids) {
    const stmt = this.db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?')
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
             c.name as category_name, c.symbol as category_symbol,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
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
               c.name as category_name, c.symbol as category_symbol,
               s.name as status_name, s.color as status_color
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN statuses s ON t.status_id = s.id
        WHERE t.title LIKE ? AND t.id != ? AND t.deleted_at IS NULL
        LIMIT 10
      `).all(`%${query}%`, excludeId)
    }
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             c.name as category_name, c.symbol as category_symbol,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE t.title LIKE ? AND t.deleted_at IS NULL
      LIMIT 10
    `).all(`%${query}%`)
  }

  // Global search across todos, persons, and projects
  globalSearch(query, limit = 20) {
    const searchTerm = `%${query}%`

    // Search todos (title + notes)
    const todos = this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             c.name as category_name, c.symbol as category_symbol,
             s.name as status_name, s.color as status_color
      FROM todos t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE (t.title LIKE ? OR t.notes LIKE ?) AND t.deleted_at IS NULL
      LIMIT ?
    `).all(searchTerm, searchTerm, limit)

    // Search persons (name + email + company)
    const persons = this.db.prepare(`
      SELECT *
      FROM persons
      WHERE name LIKE ? OR email LIKE ? OR company LIKE ?
      LIMIT ?
    `).all(searchTerm, searchTerm, searchTerm, limit)

    // Search projects
    const projects = this.db.prepare(`
      SELECT *
      FROM projects
      WHERE name LIKE ? AND deleted_at IS NULL
      LIMIT ?
    `).all(searchTerm, limit)

    return { todos, persons, projects }
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

  // Subtask operations
  getSubtasks(todoId) {
    return this.db.prepare(`
      SELECT * FROM subtasks WHERE todo_id = ? ORDER BY sort_order ASC
    `).all(todoId)
  }

  getAllSubtasks() {
    return this.db.prepare(`
      SELECT * FROM subtasks ORDER BY todo_id, sort_order ASC
    `).all()
  }

  getSubtask(id) {
    return this.db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id)
  }

  createSubtask(todoId, title) {
    const maxOrder = this.db.prepare('SELECT MAX(sort_order) as max FROM subtasks WHERE todo_id = ?').get(todoId)
    const sortOrder = (maxOrder.max || 0) + 1

    const result = this.db.prepare(`
      INSERT INTO subtasks (todo_id, title, sort_order) VALUES (?, ?, ?)
    `).run(todoId, title, sortOrder)

    return this.getSubtask(result.lastInsertRowid)
  }

  updateSubtask(subtask) {
    this.db.prepare(`
      UPDATE subtasks SET title = ?, completed = ? WHERE id = ?
    `).run(subtask.title, subtask.completed ? 1 : 0, subtask.id)

    return this.getSubtask(subtask.id)
  }

  deleteSubtask(id) {
    this.db.prepare('DELETE FROM subtasks WHERE id = ?').run(id)
    return true
  }

  reorderSubtasks(ids) {
    const stmt = this.db.prepare('UPDATE subtasks SET sort_order = ? WHERE id = ?')
    const transaction = this.db.transaction((ids) => {
      ids.forEach((id, index) => {
        stmt.run(index, id)
      })
    })
    transaction(ids)
    return true
  }

  // Todo-Person linking operations
  getTodoPersons(todoId) {
    return this.db.prepare(`
      SELECT p.*
      FROM persons p
      INNER JOIN todo_persons tp ON p.id = tp.person_id
      WHERE tp.todo_id = ?
      ORDER BY p.sort_order ASC
    `).all(todoId)
  }

  linkTodoPerson(todoId, personId) {
    try {
      this.db.prepare(`
        INSERT OR IGNORE INTO todo_persons (todo_id, person_id)
        VALUES (?, ?)
      `).run(todoId, personId)
      return true
    } catch {
      return false
    }
  }

  unlinkTodoPerson(todoId, personId) {
    this.db.prepare(`
      DELETE FROM todo_persons
      WHERE todo_id = ? AND person_id = ?
    `).run(todoId, personId)
    return true
  }

  getPersonTodos(personId) {
    return this.db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color,
             c.name as category_name, c.symbol as category_symbol,
             s.name as status_name, s.color as status_color
      FROM todos t
      INNER JOIN todo_persons tp ON t.id = tp.todo_id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN statuses s ON t.status_id = s.id
      WHERE tp.person_id = ? AND t.deleted_at IS NULL
      ORDER BY t.sort_order ASC
    `).all(personId)
  }

  // Project-Person linking operations
  getProjectPersons(projectId) {
    return this.db.prepare(`
      SELECT p.*,
             pp.influence_level,
             pp.interest_level,
             pp.stakeholder_type,
             pp.engagement_strategy,
             pp.notes as stakeholder_notes
      FROM persons p
      INNER JOIN project_persons pp ON p.id = pp.person_id
      WHERE pp.project_id = ?
      ORDER BY p.sort_order ASC
    `).all(projectId)
  }

  linkProjectPerson(projectId, personId, stakeholderData = {}) {
    try {
      const {
        influence_level = 3,
        interest_level = 3,
        stakeholder_type = 'Internal',
        engagement_strategy = 'Keep Informed',
        notes = ''
      } = stakeholderData

      this.db.prepare(`
        INSERT OR IGNORE INTO project_persons
        (project_id, person_id, influence_level, interest_level, stakeholder_type, engagement_strategy, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(projectId, personId, influence_level, interest_level, stakeholder_type, engagement_strategy, notes)
      return true
    } catch {
      return false
    }
  }

  updateProjectPersonStakeholder(projectId, personId, stakeholderData) {
    this.db.prepare(`
      UPDATE project_persons
      SET influence_level = ?,
          interest_level = ?,
          stakeholder_type = ?,
          engagement_strategy = ?,
          notes = ?
      WHERE project_id = ? AND person_id = ?
    `).run(
      stakeholderData.influence_level,
      stakeholderData.interest_level,
      stakeholderData.stakeholder_type,
      stakeholderData.engagement_strategy,
      stakeholderData.notes || '',
      projectId,
      personId
    )
    return true
  }

  unlinkProjectPerson(projectId, personId) {
    this.db.prepare(`
      DELETE FROM project_persons
      WHERE project_id = ? AND person_id = ?
    `).run(projectId, personId)
    return true
  }

  getPersonProjects(personId) {
    return this.db.prepare(`
      SELECT p.*
      FROM projects p
      INNER JOIN project_persons pp ON p.id = pp.project_id
      WHERE pp.person_id = ?
      ORDER BY p.sort_order ASC
    `).all(personId)
  }

  // Export/Import operations
  exportData() {
    const projects = this.db.prepare('SELECT * FROM projects').all()
    const categories = this.db.prepare('SELECT * FROM categories').all()
    const statuses = this.db.prepare('SELECT * FROM statuses').all()
    const todos = this.db.prepare('SELECT * FROM todos').all()
    const todoLinks = this.db.prepare('SELECT * FROM todo_links').all()
    const subtasks = this.db.prepare('SELECT * FROM subtasks').all()
    const persons = this.db.prepare('SELECT * FROM persons').all()
    const todoPersons = this.db.prepare('SELECT * FROM todo_persons').all()
    const projectPersons = this.db.prepare('SELECT * FROM project_persons').all()

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        projects,
        categories,
        statuses,
        todos,
        todoLinks,
        subtasks,
        persons,
        todoPersons,
        projectPersons
      }
    }
  }

  importData(importData, mode = 'merge') {
    if (!importData || !importData.data) {
      throw new Error('Invalid import data format')
    }

    const { projects, categories, statuses, todos, todoLinks, subtasks, persons, todoPersons, projectPersons } = importData.data

    // Create a transaction for atomic import
    const transaction = this.db.transaction(() => {
      // If replace mode, clear existing data
      if (mode === 'replace') {
        this.db.prepare('DELETE FROM project_persons').run()
        this.db.prepare('DELETE FROM todo_persons').run()
        this.db.prepare('DELETE FROM subtasks').run()
        this.db.prepare('DELETE FROM todo_links').run()
        this.db.prepare('DELETE FROM todos').run()
        this.db.prepare('DELETE FROM persons').run()
        this.db.prepare('DELETE FROM statuses').run()
        this.db.prepare('DELETE FROM categories').run()
        this.db.prepare('DELETE FROM projects').run()
      }

      // Maps to track old ID to new ID mappings
      const projectIdMap = new Map()
      const categoryIdMap = new Map()
      const statusIdMap = new Map()
      const todoIdMap = new Map()
      const personIdMap = new Map()

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

      // Import categories
      if (categories && categories.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO categories (name, symbol, sort_order, created_at)
          VALUES (?, ?, ?, ?)
        `)
        categories.forEach(c => {
          const result = stmt.run(c.name, c.symbol, c.sort_order, c.created_at)
          categoryIdMap.set(c.id, result.lastInsertRowid)
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

      // Import persons
      if (persons && persons.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO persons (name, email, phone, company, role, notes, color, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        persons.forEach(p => {
          const result = stmt.run(
            p.name,
            p.email || '',
            p.phone || '',
            p.company || '',
            p.role || '',
            p.notes || '',
            p.color,
            p.sort_order,
            p.created_at
          )
          personIdMap.set(p.id, result.lastInsertRowid)
        })
      }

      // Import todos
      if (todos && todos.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO todos (title, notes, end_date, start_date, completed, sort_order, importance, project_id, category_id, status_id, created_at, updated_at, deleted_at, recurrence_type, recurrence_interval, recurrence_end_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        todos.forEach(t => {
          const newProjectId = t.project_id ? projectIdMap.get(t.project_id) : null
          const newCategoryId = t.category_id ? categoryIdMap.get(t.category_id) : null
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
            newCategoryId,
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

      // Import subtasks
      if (subtasks && subtasks.length > 0) {
        const stmt = this.db.prepare(`
          INSERT INTO subtasks (todo_id, title, completed, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        subtasks.forEach(s => {
          const newTodoId = todoIdMap.get(s.todo_id)
          if (newTodoId) {
            stmt.run(newTodoId, s.title, s.completed, s.sort_order, s.created_at)
          }
        })
      }

      // Import todo-person links
      if (todoPersons && todoPersons.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO todo_persons (todo_id, person_id, created_at)
          VALUES (?, ?, ?)
        `)
        todoPersons.forEach(tp => {
          const newTodoId = todoIdMap.get(tp.todo_id)
          const newPersonId = personIdMap.get(tp.person_id)
          if (newTodoId && newPersonId) {
            stmt.run(newTodoId, newPersonId, tp.created_at)
          }
        })
      }

      // Import project-person links
      if (projectPersons && projectPersons.length > 0) {
        const stmt = this.db.prepare(`
          INSERT OR IGNORE INTO project_persons (project_id, person_id, created_at)
          VALUES (?, ?, ?)
        `)
        projectPersons.forEach(pp => {
          const newProjectId = projectIdMap.get(pp.project_id)
          const newPersonId = personIdMap.get(pp.person_id)
          if (newProjectId && newPersonId) {
            stmt.run(newProjectId, newPersonId, pp.created_at)
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
