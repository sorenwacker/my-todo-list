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
- **Trash System**: Soft delete with recovery options

## Installation

### Prerequisites
- Node.js 16 or higher
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/sorenwacker/todo.git
cd todo

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild
```

## Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Building

```bash
# Build for production
npm run build

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for both platforms
npm run build:all
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
│   └── database.js # SQLite database operations
├── preload/       # Preload scripts (IPC bridge)
│   └── index.js
├── renderer/      # Vue application
│   ├── App.vue           # Main application view
│   ├── DetailApp.vue     # Todo detail panel
│   ├── SettingsApp.vue   # Settings interface
│   └── StakeholderRegisterApp.vue
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
