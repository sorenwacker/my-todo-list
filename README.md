# Todo

A desktop todo application built with Electron and Vue 3. Local-first: all
data lives in a single SQLite file on your machine, with no account and no
network dependency.

## Features

- **Projects and statuses**: organize todos into color-coded projects with
  customizable statuses; per-project topic buckets and cross-cutting tags
- **Views**: cards, kanban, and list layouts with drag-and-drop reordering
- **Milestones**: hierarchical todos with milestone dates and groupings
- **Markdown notes**: per-todo and per-project notes with syntax
  highlighting and mermaid diagrams; notes can be marked sensitive to keep
  them hidden until explicitly revealed (a display flag, not encryption)
- **Dates and recurrence**: start/end dates, recurring tasks, importance
  ratings (1-5)
- **Archive and trash**: soft delete with recovery, archive for completed
  work, undo/redo
- **Export/import**: JSON backup with merge or replace
- **MCP server**: AI assistants (e.g. Claude Code) can read and write todos
  through a Model Context Protocol server sharing the same database
- **Database safety**: schema versioning with pre-migration backups; the
  app refuses files from newer versions instead of corrupting them, and a
  guarded reset can recover from an unusable database file

## Documentation

- [Database compatibility](docs/database-compatibility.md) — schema
  versioning, migrations, backups
- [Reset database](docs/reset-database.md) — recovering from an unusable
  database file
- [Auto-update](docs/auto-update.md) — per-platform update behavior and
  how to enable signed macOS builds
- [MCP server](docs/mcp-server.md) — exposing the database to AI assistants

## Installation

### Option A: Download a prebuilt release (recommended)

Most users should not build from source. Download the packaged app from the
[Releases page](https://github.com/sorenwacker/my-todo-list/releases):

- **macOS**: download the `.dmg`, open it, and drag `Todo.app` into `Applications`.

The macOS build is not code-signed. On first launch, right-click `Todo.app` and
choose **Open** (or allow it under **System Settings > Privacy & Security**) to
get past Gatekeeper. Because the build is unsigned, macOS cannot install
updates automatically; the app notifies once per new version instead (see
[Auto-update](docs/auto-update.md)).

### Option B: Build from source

Building compiles the native `better-sqlite3` module, so a C/C++ toolchain and a
supported Node version are required.

#### Prerequisites
- **Node.js 24 LTS** (pinned in `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm):
  `nvm install` then `nvm use` in the project directory. Newer Node versions
  (e.g. 26) are not yet validated against the native dependencies and can leave a
  half-built install.
- **Xcode Command Line Tools** (macOS): `xcode-select --install`. Without them the
  `better-sqlite3` native build fails, which is the most common cause of a fresh
  install that opens but cannot save data.

#### Setup
```bash
# Clone the repository
git clone https://github.com/sorenwacker/my-todo-list.git
cd my-todo-list

# Use the pinned Node version
nvm use

# Install dependencies
npm install
```

The native module is rebuilt for the correct target automatically when you run
the app or the tests; see [Development](#development) below.

## Development

```bash
# Start development server (rebuilds better-sqlite3 for Electron first)
npm run dev

# Run tests (rebuilds better-sqlite3 for Node first)
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint
```

better-sqlite3 is a native module whose binary must match the runtime ABI:
Electron for the app, Node for the test runner. The `dev`/`preview` and `test`
scripts rebuild it for the correct target automatically via their `pre*` hooks,
so switching between running the app and running tests needs no manual step.
The MCP server keeps its own `node_modules` for the same reason (see
[docs/mcp-server.md](docs/mcp-server.md)).

## Building

```bash
# Build the renderer/main bundles
npm run build

# Package a distributable for the current platform
npm run dist

# Package for a specific platform
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Built applications will be output to the `dist/` directory.

## Architecture

### Technology Stack
- **Frontend**: Vue 3 with Composition API
- **Desktop Framework**: Electron 39
- **Build Tool**: electron-vite
- **Database**: better-sqlite3 (WAL mode, shared with the MCP server)
- **Markdown Parser**: marked
- **Diagram Rendering**: mermaid
- **UI Components**: lucide-vue-next (icons), vuedraggable

### Project Structure
```
src/
├── main/          # Electron main process
│   ├── index.js    # Application entry point, IPC handlers
│   ├── database.js # SQLite operations
│   ├── schema.js   # Schema, migrations, verification
│   ├── updater.js  # Auto-update behavior
│   └── history.js  # Undo/redo state management
├── preload/       # Preload scripts (IPC bridge)
├── renderer/      # Vue application
└── config/        # Shared constants
mcp-server/        # Standalone MCP server (own node_modules)
docs/              # Documentation
tests/             # Vitest test suite
```

### Database Schema
SQLite with the following tables: `todos`, `projects`, `statuses`,
`project_topics`, `tags`, `todo_tags`, `project_tags`, `todo_links`,
`milestone_todos`, `settings`. The schema is versioned via
`PRAGMA user_version`; see
[docs/database-compatibility.md](docs/database-compatibility.md).

## Data Locations

- **macOS**: `~/Library/Application Support/todo/`
- **Windows**: `%APPDATA%/todo/`
- **Linux**: `~/.config/todo/`

Database file: `todos.db`. Backups created by resets and migrations sit next
to it, named `todos-backup-*.db` and `todos-premigrate-*.db`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Update documentation, add tests, then implement
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Version History

See the [Releases page](https://github.com/sorenwacker/my-todo-list/releases).
