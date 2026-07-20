# Todo

A feature-rich desktop todo application built with Electron and Vue 3. Designed for project management with support for hierarchical organization, markdown notes, and visual data representation.

## Features

### Core Functionality
- **Projects and Categories**: Organize todos into projects with customizable categories and statuses
- **Importance Ratings**: Assign priority levels (1-5) to tasks
- **Deadlines**: Set start and end dates for time-sensitive tasks
- **Completion Tracking**: Mark tasks as complete with automatic timestamping

### Advanced Features
- **Markdown Notes**: Full markdown support with syntax highlighting
- **Project Notes**: Persistent per-project markdown notes, editable in a toggleable pane
- **Mermaid Diagrams**: Embed flowcharts, sequence diagrams, and other visualizations
- **Todo Linking**: Create dependencies and relationships between tasks
- **Subtasks**: Break down complex tasks into manageable subtasks
- **Recurrence**: Set up recurring tasks with automatic regeneration
- **Sensitive Notes**: Password-protected notes with reveal confirmation

### Organization
- **Multiple Views**: Switch between list, kanban board, and table layouts
- **Drag-and-Drop**: Reorder todos, projects, and categories
- **Color Coding**: Visual identification through customizable colors
- **Person Management**: Assign contacts to todos and projects
- **Stakeholder Register**: Track project stakeholders with role definitions

### Data Management
- **SQLite Database**: Local storage with efficient querying
- **Export/Import**: Backup and restore data in JSON format
- **Archive System**: Archive completed tasks to declutter active view
- **Trash System**: Soft delete with recovery options
- **Undo/Redo**: Full undo support for archive, trash, and restore operations

## Installation

### Option A: Download a prebuilt release (recommended)

Most users should not build from source. Download the packaged app from the
[Releases page](https://github.com/sorenwacker/my-todo-list/releases):

- **macOS**: download the `.dmg`, open it, and drag `Todo.app` into `Applications`.

The macOS build is not code-signed. On first launch, right-click `Todo.app` and
choose **Open** (or allow it under **System Settings > Privacy & Security**) to
get past Gatekeeper.

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
```

better-sqlite3 is a native module whose binary must match the runtime ABI:
Electron for the app, Node for the test runner. The `dev`/`preview` and `test`
scripts rebuild it for the correct target automatically via their `pre*` hooks,
so switching between running the app and running tests needs no manual step.

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
- **Desktop Framework**: Electron 36
- **Build Tool**: electron-vite
- **Database**: better-sqlite3
- **Markdown Parser**: marked
- **Diagram Rendering**: mermaid
- **UI Components**: lucide-vue-next (icons), vuedraggable

### Project Structure
```
src/
├── main/          # Electron main process
│   ├── index.js   # Application entry point
│   ├── database.js # SQLite database operations
│   └── history.js  # Undo/redo state management
├── preload/       # Preload scripts (IPC bridge)
│   └── index.js
├── renderer/      # Vue application
│   ├── App.vue           # Main application view
│   ├── components/       # Reusable Vue components
│   └── utils/            # Utility functions
└── resources/     # Application icons and assets
```

### Database Schema
The application uses SQLite with the following main tables:
- `todos`: Task records with metadata
- `projects`: Project definitions
- `categories`: Categorization labels
- `statuses`: Task status tracking
- `persons`: Contact/stakeholder information
- `subtasks`: Sub-task hierarchy
- `todo_links`: Task dependencies
- `todo_persons`: Task-person associations
- `project_persons`: Project stakeholder mapping

## Usage

### Creating Todos
1. Select or create a project
2. Click "New Todo" or press the add button
3. Enter task title and optional details
4. Set importance, deadline, category, and status as needed

### Managing Projects
- Click the project name to rename
- Use the color picker to assign visual identification
- Access project settings through the gear icon
- View project stakeholders in the dedicated register
- Toggle the Notes pane to keep persistent per-project notes; they are stored
  with the project and reload when the project is reopened

### Working with Notes
- Click a todo to open the detail panel
- Write markdown-formatted notes in the editor
- Preview renders automatically
- Use mermaid code blocks for diagrams
- Enable "Sensitive Notes" for password-protected content

### Organizing Tasks
- Drag todos to reorder within a project
- Link related todos using the link interface
- Create subtasks for complex activities
- Use categories and statuses for filtering

### Data Backup
1. Navigate to Settings
2. Select "Export Data"
3. Choose save location for JSON backup
4. Import using "Import Data" with merge or replace options

## Configuration

The application stores data in the following locations:
- **macOS**: `~/Library/Application Support/todo/`
- **Windows**: `%APPDATA%/todo/`
- **Linux**: `~/.config/todo/`

Database file: `todos.db`

## Security

The sensitive notes feature encrypts note content locally. This is designed to protect against casual viewing but should not be considered cryptographically secure for highly sensitive data.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

Follow the existing code patterns and maintain compatibility with the current database schema.

## License

This project is licensed under the MIT License.

## Version History

### v0.1.0
- Initial release with core todo management
- Project and category organization
- Markdown and mermaid support
- Export/import functionality
- Person management system
- Sensitive notes feature

### v0.1.1
- Security updates for electron, vite, and vitest dependencies
- Fixed ASAR integrity bypass vulnerability
- Fixed esbuild development server vulnerability

### v0.3.0
- Multiple view modes: cards, list, table, kanban
- Calendar view for deadline visualization
- Global search across all content
- Improved markdown rendering with task list support
- Light and dark theme support

### v0.3.1
- Fixed light theme backgrounds
- Fixed inbox item styling

### v0.3.2
- Archive system with "Archive Done" bulk action
- Distinguished archive vs trash views with proper actions
- Progress counts displayed as done/total format
- Styled completed markdown checkboxes (green with strikethrough)
- Undo integration for archive/unarchive/restore operations
- Descriptive tooltips with undo hints on action buttons
- Version display in settings
