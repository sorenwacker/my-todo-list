/**
 * Database schema creation and migrations.
 */

/**
 * Create all tables if they do not exist.
 * @param {Object} db - better-sqlite3 database handle
 */
export function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#0f4c75',
      notes TEXT DEFAULT '',
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
}

/**
 * Add a column to a table, ignoring the error when it already exists.
 * @param {Object} db - better-sqlite3 database handle
 * @param {Object} log - logger instance
 * @param {string} table - table to alter
 * @param {string} columnDdl - column definition, e.g. "importance INTEGER DEFAULT NULL"
 * @param {string} [label] - migration label for log messages; defaults to
 *   "ADD COLUMN <column name>"
 */
function addColumn(db, log, table, columnDdl, label = null) {
  const migration = label || `ADD COLUMN ${columnDdl.split(' ')[0]}`
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDdl}`)
  } catch (error) {
    if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
      log.warn('Migration warning', { migration, error: error.message })
    }
  }
}

/**
 * Run schema migrations in order. Each step is idempotent.
 * @param {Object} db - better-sqlite3 database handle
 * @param {Object} log - logger instance
 */
export function runMigrations(db, log) {
  addColumn(db, log, 'todos', 'importance INTEGER DEFAULT NULL')
  addColumn(db, log, 'todos', 'start_date TEXT')
  addColumn(db, log, 'todos', 'status_id INTEGER')

  // Migration: rename deadline to end_date. The data copy must only run when
  // the column is newly added, so this step stays outside addColumn.
  try {
    db.exec('ALTER TABLE todos ADD COLUMN end_date TEXT')
    // Migrate data from deadline to end_date
    db.exec('UPDATE todos SET end_date = deadline WHERE deadline IS NOT NULL AND end_date IS NULL')
  } catch (error) {
    if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
      log.warn('Migration warning', { migration: 'ADD COLUMN end_date', error: error.message })
    }
  }

  // Soft delete (trashbin) timestamps
  addColumn(db, log, 'todos', 'deleted_at TEXT', 'ADD COLUMN deleted_at to todos')
  addColumn(db, log, 'projects', 'deleted_at TEXT', 'ADD COLUMN deleted_at to projects')

  // Migration: drop categories table
  try {
    db.exec('DROP TABLE IF EXISTS categories')
  } catch (error) {
    log.warn('Migration warning', { migration: 'DROP TABLE categories', error: error.message })
  }

  // Recurrence fields
  addColumn(db, log, 'todos', 'recurrence_type TEXT')
  addColumn(db, log, 'todos', 'recurrence_interval INTEGER DEFAULT 1')
  addColumn(db, log, 'todos', 'recurrence_end_date TEXT')

  // Note: a previous migration nulled importance = 3 on every startup to undo
  // an old default. importance = 3 is now a valid user value ("Medium"), and
  // the historical default is no longer distinguishable from a user-set value,
  // so that migration was removed to stop destroying legitimate data. The
  // column default is NULL (see ADD COLUMN importance above), so new todos are
  // unaffected.

  addColumn(db, log, 'todos', 'notes_sensitive INTEGER DEFAULT 0')
  // Todo vs note distinction
  addColumn(db, log, 'todos', "type TEXT DEFAULT 'todo'")
  // Milestone hierarchy
  addColumn(db, log, 'todos', 'parent_id INTEGER REFERENCES todos(id) ON DELETE SET NULL')
  addColumn(db, log, 'todos', 'milestone_date TEXT')
  // Project-specific topic buckets
  addColumn(db, log, 'todos', 'topic_id INTEGER REFERENCES project_topics(id) ON DELETE SET NULL')
  addColumn(db, log, 'todos', 'completed_at TEXT')
  addColumn(db, log, 'todos', 'archived_at TEXT')
  // Persistent per-project notes
  addColumn(db, log, 'projects', "notes TEXT DEFAULT ''", 'ADD COLUMN notes to projects')
}
