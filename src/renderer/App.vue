<template>
  <div class="app" :class="{ 'light-theme': theme === 'light', 'sidebar-collapsed': !sidebarVisible, 'vertical-layout': isVerticalLayout }" :style="{ borderLeftColor: currentProjectColor }">
    <button class="sidebar-toggle" @click="sidebarVisible = !sidebarVisible" :title="sidebarVisible ? 'Hide sidebar' : 'Show sidebar'">
      <span v-if="sidebarVisible">&lt;</span>
      <span v-else>&gt;</span>
    </button>
    <aside class="sidebar" v-show="sidebarVisible">
      <div class="sidebar-header">
        <h2>Projects</h2>
      </div>

      <nav class="project-nav">
        <div
          class="nav-item"
          :class="{ active: currentFilter === null }"
          @click="setFilter(null)"
        >
          <span class="nav-icon">*</span>
          <span>All Todos</span>
          <span class="count">{{ allCount }}</span>
        </div>

        <div
          class="nav-item"
          :class="{ active: currentFilter === 'inbox' }"
          @click="setFilter('inbox')"
        >
          <span class="nav-icon">></span>
          <span>Inbox</span>
          <span class="count">{{ inboxCount }}</span>
        </div>

        <div
          class="nav-item trash-nav"
          :class="{ active: currentFilter === 'trash' }"
          @click="setFilter('trash')"
        >
          <span class="nav-icon">x</span>
          <span>Trash</span>
          <span class="count" v-if="trashCount > 0">{{ trashCount }}</span>
        </div>

        <div class="nav-divider"></div>

        <div class="add-project">
          <input
            v-if="showProjectInput"
            v-model="newProjectName"
            @keyup.enter="addProject"
            @blur="cancelAddProject"
            placeholder="Project name..."
            ref="projectInput"
            type="text"
          />
          <button v-else @click="showAddProject">+ Add Project</button>
        </div>

        <draggable
          v-model="projects"
          item-key="id"
          @end="onProjectDragEnd"
          class="projects-list"
        >
          <template #item="{ element: project }">
            <div
              class="nav-item project-item"
              :class="{ active: currentFilter === project.id, filtered: currentFilter === null && filterProjectId === project.id }"
              @click="setFilter(project.id)"
            >
              <span class="project-dot" :style="{ background: project.color }"></span>
              <span class="project-name">{{ project.name }}</span>
              <span class="count">{{ getProjectCount(project.id) }}</span>
              <button class="edit-btn" @click.stop="editProject(project)">...</button>
            </div>
          </template>
        </draggable>
      </nav>

      <div class="sidebar-header status-header" @click="toggleStatusesCollapsed">
        <span class="collapse-indicator">{{ statusesCollapsed ? '+' : '-' }}</span>
        <h2>Statuses</h2>
      </div>

      <nav class="status-nav" v-show="!statusesCollapsed">
        <draggable
          v-model="statuses"
          item-key="id"
          @end="onStatusDragEnd"
          class="statuses-list"
        >
          <template #item="{ element: status }">
            <div
              class="nav-item status-item"
              @click="editStatus(status)"
            >
              <span class="status-dot" :style="{ background: status.color }"></span>
              <span class="status-name">{{ status.name }}</span>
              <span class="count">{{ getStatusCount(status.id) }}</span>
            </div>
          </template>
        </draggable>
      </nav>

      <div class="add-status" v-show="!statusesCollapsed">
        <input
          v-if="showStatusInput"
          v-model="newStatusName"
          @keyup.enter="addStatus"
          @blur="cancelAddStatus"
          placeholder="Status name..."
          ref="statusInput"
          type="text"
        />
        <button v-else @click="showAddStatus">+ Add Status</button>
      </div>

      <div class="sidebar-header category-header" @click="toggleCategoriesCollapsed">
        <span class="collapse-indicator">{{ categoriesCollapsed ? '+' : '-' }}</span>
        <h2>Categories</h2>
      </div>

      <nav class="category-nav" v-show="!categoriesCollapsed">
        <draggable
          v-model="categories"
          item-key="id"
          @end="onCategoryDragEnd"
          class="categories-list"
        >
          <template #item="{ element: category }">
            <div
              class="nav-item category-item"
              @click="editCategory(category)"
            >
              <span class="category-symbol-icon">
                <component v-if="getIconComponent(category.symbol)" :is="getIconComponent(category.symbol)" :size="16" />
                <span v-else>{{ category.symbol || '*' }}</span>
              </span>
              <span class="category-name">{{ category.name }}</span>
              <span class="count">{{ getCategoryCount(category.id) }}</span>
            </div>
          </template>
        </draggable>
      </nav>

      <div class="add-category" v-show="!categoriesCollapsed">
        <input
          v-if="showCategoryInput"
          v-model="newCategoryName"
          @keyup.enter="addCategory"
          @blur="cancelAddCategory"
          placeholder="Category name..."
          ref="categoryInput"
          type="text"
        />
        <button v-else @click="showAddCategory">+ Add Category</button>
      </div>

      <div class="settings-section">
        <div class="sidebar-header settings-header" @click="toggleSettingsCollapsed">
          <span class="collapse-indicator">{{ settingsCollapsed ? '+' : '-' }}</span>
          <h2>Settings</h2>
        </div>
        <div v-show="!settingsCollapsed" class="settings-content">
          <div class="preference-item">
            <label class="checkbox-label">
              <input type="checkbox" v-model="openTodosInWindow" @change="saveOpenModePreference" />
              <span class="preference-text">Open todos in new window</span>
            </label>
          </div>
          <button @click="handleExport" class="settings-btn">Export</button>
          <button @click="showImportDialog = true" class="settings-btn">Import</button>
          <div class="database-location">
            <small>Database: {{ databasePath }}</small>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-header persons-header" @click="togglePersonsCollapsed">
          <span class="collapse-indicator">{{ personsCollapsed ? '+' : '-' }}</span>
          <h2>Persons</h2>
        </div>
        <div v-show="!personsCollapsed">
          <button @click="openSettings" class="manage-persons-btn">Manage Persons</button>
        </div>
      </div>

      <div v-if="showImportDialog" class="project-modal" @click.self="showImportDialog = false">
        <div class="modal-content" @click.stop>
          <h3>Import Backup</h3>
          <p>Choose how to import the backup:</p>
          <div class="modal-actions">
            <button @click.stop="handleImport('merge')" class="primary">Merge with Existing</button>
            <button @click.stop="handleImport('replace')" class="delete-btn">Replace All Data</button>
            <button @click.stop="showImportDialog = false">Cancel</button>
          </div>
        </div>
      </div>

      <div v-if="editingCategory" class="project-modal" @click.self="cancelEditCategory">
        <div class="modal-content" @click.stop>
          <h3>Edit Category</h3>
          <input v-model="editingCategory.name" placeholder="Category name" />
          <div class="symbol-picker">
            <div
              v-for="symbol in categorySymbols"
              :key="symbol"
              class="symbol-option"
              :class="{ selected: editingCategory.symbol === symbol }"
              @click="editingCategory.symbol = symbol"
            >
              <component :is="getIconComponent(symbol)" :size="20" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="delete-btn" @click.stop="deleteCategoryConfirm">Delete</button>
            <button @click.stop="cancelEditCategory">Cancel</button>
            <button class="primary" @click.stop="saveCategory">Save</button>
          </div>
        </div>
      </div>

      <div v-if="editingStatus" class="project-modal" @click.self="cancelEditStatus">
        <div class="modal-content" @click.stop>
          <h3>Edit Status</h3>
          <input v-model="editingStatus.name" placeholder="Status name" />
          <div class="color-picker">
            <div
              v-for="color in statusColors"
              :key="color"
              class="color-option"
              :class="{ selected: editingStatus.color === color }"
              :style="{ background: color }"
              @click="editingStatus.color = color"
            ></div>
          </div>
          <div class="modal-actions">
            <button class="delete-btn" @click.stop="deleteStatusConfirm">Delete</button>
            <button @click.stop="cancelEditStatus">Cancel</button>
            <button class="primary" @click.stop="saveStatus">Save</button>
          </div>
        </div>
      </div>

      <div v-if="editingProject" class="project-modal" @click.self="cancelEditProject">
        <div class="modal-content" @click.stop>
          <h3>Edit Project</h3>
          <input v-model="editingProject.name" placeholder="Project name" />
          <div class="color-picker">
            <div
              v-for="color in projectColors"
              :key="color"
              class="color-option"
              :class="{ selected: editingProject.color === color }"
              :style="{ background: color }"
              @click="editingProject.color = color"
            ></div>
          </div>

          <div class="stakeholders-section">
            <div class="section-header">
              <label>Stakeholders</label>
              <button @click.stop="showProjectPersonPicker = !showProjectPersonPicker" class="picker-toggle-btn">
                {{ showProjectPersonPicker ? 'Hide' : '+ Assign' }}
              </button>
            </div>

            <div v-if="showProjectPersonPicker" class="stakeholder-picker">
              <div v-for="person in persons" :key="person.id" class="person-option"
                   @click.stop="assignProjectPerson(person)">
                <span class="person-color-dot" :style="{ background: person.color }"></span>
                <span class="person-name">{{ person.name }}</span>
              </div>
            </div>

            <div class="assigned-stakeholders">
              <div v-for="person in currentProjectPersons" :key="person.id"
                   class="stakeholder-badge"
                   :style="{ background: person.color + '33', borderColor: person.color }">
                {{ person.name }}
                <button @click.stop="unassignProjectPerson(person)" class="stakeholder-remove">×</button>
              </div>
              <p v-if="!currentProjectPersons.length" class="no-stakeholders">No stakeholders assigned</p>
            </div>
          </div>

          <div class="stakeholder-register-link">
            <button @click.stop="openStakeholderRegister" class="register-btn" v-if="editingProject && editingProject.id">
              View Stakeholder Register
            </button>
          </div>

          <div class="modal-actions">
            <button class="delete-btn" @click.stop="deleteProjectConfirm">Delete</button>
            <button @click.stop="cancelEditProject">Cancel</button>
            <button class="primary" @click.stop="saveProject">Save</button>
          </div>
        </div>
      </div>
    </aside>

    <div class="main-wrapper">
    <main class="main-content" :class="{ 'with-detail': selectedTodo }">
      <header class="main-header">
        <h1>{{ currentTitle }}</h1>
        <div class="header-controls">
          <div class="sort-controls">
            <select v-model="sortBy" class="sort-select">
              <option value="manual">Manual Order</option>
              <option value="end_date">By End Date</option>
              <option value="alpha">Alphabetical</option>
            </select>
            <div class="importance-filter">
              <select v-model="importanceFilterOp" class="sort-select filter-op">
                <option value="none">Importance</option>
                <option value="gte">>=</option>
                <option value="lte"><=</option>
                <option value="eq">=</option>
              </select>
              <select v-if="importanceFilterOp !== 'none'" v-model.number="importanceFilterValue" class="sort-select filter-val">
                <option :value="1">1</option>
                <option :value="2">2</option>
                <option :value="3">3</option>
                <option :value="4">4</option>
                <option :value="5">5</option>
              </select>
            </div>
            <label class="group-toggle">
              <input type="checkbox" v-model="groupByProject" />
              <span>Group by Project</span>
            </label>
          </div>
          <div class="view-switcher">
            <button :class="{ active: currentView === 'cards' }" @click="currentView = 'cards'">Cards</button>
            <button :class="{ active: currentView === 'table' }" @click="currentView = 'table'">Table</button>
            <button :class="{ active: currentView === 'kanban' }" @click="currentView = 'kanban'" :disabled="isTrashView">Kanban</button>
            <button :class="{ active: currentView === 'timeline' }" @click="currentView = 'timeline'" :disabled="isTrashView">Timeline</button>
            <button :class="{ active: currentView === 'graph' }" @click="currentView = 'graph'" :disabled="isTrashView">Graph</button>
          </div>
          <label v-if="!isTrashView" class="hide-completed-toggle">
            <input type="checkbox" v-model="hideCompleted" @change="toggleHideCompleted" />
            <span>Hide completed</span>
          </label>
          <button @click="toggleTheme" class="theme-toggle-btn" :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            <span v-if="theme === 'dark'">☀️</span>
            <span v-else>🌙</span>
          </button>
          <button v-if="isTrashView && trashCount > 0" class="empty-trash-btn" @click="emptyTrash">Empty Trash</button>
        </div>
        <div v-if="!isTrashView" class="add-todo">
          <input
            ref="newTodoInput"
            v-model="newTodoTitle"
            @keyup.enter="addTodo"
            placeholder="Add a new todo... (press 'n')"
            type="text"
          />
          <button @click="addTodo">Add</button>
        </div>
      </header>

      <!-- Cards View -->
      <div v-if="currentView === 'cards'" class="cards-view">
        <template v-if="groupByProject">
          <div v-for="group in groupedTodos" :key="group.id" class="cards-group">
            <div class="group-header" :style="{ borderLeftColor: group.color || '#666' }">
              <span class="group-dot" :style="{ background: group.color || '#666' }"></span>
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{ group.todos.length }}</span>
            </div>
            <draggable
              :modelValue="group.todos"
              @update:modelValue="updateGroupTodos(group.id, $event)"
              item-key="id"
              class="cards-grid masonry"
              :style="{ '--card-width': cardSize + 'px' }"
              ghost-class="ghost"
              :disabled="sortBy !== 'manual'"
              @end="onGroupDragEnd(group.id, $event)"
            >
              <template #item="{ element }">
                <div
                  class="todo-card resizable"
                  :class="{ completed: element.completed, selected: selectedTodo?.id === element.id, 'keyboard-focused': focusedTodo?.id === element.id }"
                  :style="getCardStyle(element.id, element.project_color)"
                  @click="handleCardClick($event, element.id)"
                  @mouseup="onCardResize($event, element.id)"
                >
                  <div class="card-header">
                    <input
                      v-if="!isTrashView"
                      type="checkbox"
                      :checked="element.completed"
                      @click.stop="toggleComplete(element)"
                    />
                    <span class="card-title">{{ element.title }}</span>
                    <template v-if="isTrashView">
                      <button class="restore-btn" @click.stop="restoreTodo(element.id)" title="Restore">R</button>
                      <button class="delete-btn permanent" @click.stop="permanentlyDeleteTodo(element.id)" title="Delete permanently">x</button>
                    </template>
                    <button v-else class="delete-btn" @click.stop="deleteTodo(element.id)">x</button>
                  </div>
                  <div v-if="element.category_name" class="card-meta">
                    <span class="card-category">
                      <span class="category-symbol">
                        <component v-if="getIconComponent(element.category_symbol)" :is="getIconComponent(element.category_symbol)" :size="12" />
                        <span v-else>{{ element.category_symbol || '*' }}</span>
                      </span>
                      {{ element.category_name }}
                    </span>
                  </div>
                  <div v-if="element.start_date || element.end_date || (element.importance && element.importance > 0)" class="card-footer">
                    <span v-if="element.start_date" class="card-start">Start: {{ formatDeadline(element.start_date) }}</span>
                    <span v-if="element.end_date" class="card-deadline" :class="{ overdue: isOverdue(element.end_date) }">
                      Due: {{ formatDeadline(element.end_date) }}
                    </span>
                    <span v-if="element.importance && element.importance > 0" class="card-importance" :style="{ backgroundColor: getImportanceColor(element.importance) }">{{ element.importance }}</span>
                  </div>
                  <div v-if="element.notes" class="card-notes-preview markdown-body" :key="'notes-' + element.id + '-' + (element.notes?.length || 0)">
                    <div v-if="element.notes_sensitive" class="sensitive-notes-card">
                      <span class="sensitive-icon-small">🔒</span>
                      <span class="sensitive-text">Sensitive content hidden</span>
                    </div>
                    <div v-else v-html="renderCardNotes(element.notes)"></div>
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </template>
        <template v-else>
          <draggable
            :modelValue="sortedTodos"
            @update:modelValue="updateSortedTodos"
            item-key="id"
            class="cards-grid masonry"
            :style="{ '--card-width': cardSize + 'px' }"
            ghost-class="ghost"
            :disabled="sortBy !== 'manual'"
            @end="onDragEnd"
          >
            <template #item="{ element }">
              <div
                class="todo-card resizable"
                :class="{ completed: element.completed, selected: selectedTodo?.id === element.id, 'keyboard-focused': focusedTodo?.id === element.id }"
                :style="getCardStyle(element.id, element.project_color)"
                @click="handleCardClick($event, element.id)"
                @mouseup="onCardResize($event, element.id)"
              >
                <div class="card-header">
                  <input
                    v-if="!isTrashView"
                    type="checkbox"
                    :checked="element.completed"
                    @click.stop="toggleComplete(element)"
                  />
                  <span class="card-title">{{ element.title }}</span>
                  <template v-if="isTrashView">
                    <button class="restore-btn" @click.stop="restoreTodo(element.id)" title="Restore">R</button>
                    <button class="delete-btn permanent" @click.stop="permanentlyDeleteTodo(element.id)" title="Delete permanently">x</button>
                  </template>
                  <button v-else class="delete-btn" @click.stop="deleteTodo(element.id)">x</button>
                </div>
                <div v-if="(element.project_name && currentFilter === null) || element.category_name" class="card-meta">
                  <span
                    v-if="element.project_name && currentFilter === null"
                    class="card-project"
                    :style="{ background: element.project_color + '33', color: element.project_color }"
                  >
                    {{ element.project_name }}
                  </span>
                  <span v-if="element.category_name" class="card-category">
                    <span class="category-symbol">
                      <component v-if="getIconComponent(element.category_symbol)" :is="getIconComponent(element.category_symbol)" :size="12" />
                      <span v-else>{{ element.category_symbol || '*' }}</span>
                    </span>
                    {{ element.category_name }}
                  </span>
                </div>
                <div v-if="element.start_date || element.end_date || element.importance" class="card-footer">
                  <span v-if="element.start_date" class="card-start">Start: {{ formatDeadline(element.start_date) }}</span>
                  <span v-if="element.end_date" class="card-deadline" :class="{ overdue: isOverdue(element.end_date) }">
                    Due: {{ formatDeadline(element.end_date) }}
                  </span>
                  <span v-if="element.importance" class="card-importance" :style="{ backgroundColor: getImportanceColor(element.importance) }">{{ element.importance }}</span>
                </div>
                <div v-if="element.notes" class="card-notes-preview markdown-body" :key="'notes-' + element.id + '-' + (element.notes?.length || 0)">
                  <div v-if="element.notes_sensitive" class="sensitive-notes-card">
                    <span class="sensitive-icon-small">🔒</span>
                    <span class="sensitive-text">Sensitive content hidden</span>
                  </div>
                  <div v-else v-html="renderCardNotes(element.notes)"></div>
                </div>
              </div>
            </template>
          </draggable>
        </template>
        <div class="card-size-control">
          <label>Size:</label>
          <input type="range" v-model.number="cardSize" min="200" max="500" step="20" />
        </div>
      </div>

      <!-- Table View -->
      <div v-if="currentView === 'table'" class="table-view compact">
        <table>
          <thead>
            <tr>
              <th class="col-check resizable"></th>
              <th class="col-title resizable">Title</th>
              <th class="col-project resizable">Project</th>
              <th class="col-category resizable">Category</th>
              <th class="col-status-col resizable">Status</th>
              <th class="col-importance resizable">Imp</th>
              <th class="col-subtasks resizable">Tasks</th>
              <th class="col-notes resizable">Notes</th>
              <th class="col-start resizable">Start</th>
              <th class="col-end resizable">End</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <template v-if="groupByProject">
            <tbody v-for="group in groupedTodos" :key="group.id">
              <tr class="group-row">
                <td colspan="11">
                  <span class="group-dot" :style="{ background: group.color }"></span>
                  <span class="group-name">{{ group.name }}</span>
                  <span class="group-count">{{ group.todos.length }}</span>
                </td>
              </tr>
              <draggable
                :modelValue="group.todos"
                @update:modelValue="updateGroupTodos(group.id, $event)"
                item-key="id"
                tag="template"
                ghost-class="ghost"
                :disabled="sortBy !== 'manual'"
                @end="onGroupDragEnd(group.id, $event)"
              >
                <template #item="{ element: todo }">
                  <tr
                    :key="todo.id"
                    :class="{ completed: todo.completed, selected: selectedTodo?.id === todo.id, 'keyboard-focused': focusedTodo?.id === todo.id }"
                    @click="selectTodo(todo.id)"
                  >
                    <td class="col-check">
                      <input
                        v-if="!isTrashView"
                        type="checkbox"
                        :checked="todo.completed"
                        @click.stop="toggleComplete(todo)"
                      />
                    </td>
                    <td class="col-title">{{ todo.title }}</td>
                    <td class="col-project">
                      <span v-if="todo.project_name" class="project-badge" :style="{ background: todo.project_color }">
                        {{ todo.project_name }}
                      </span>
                      <span v-else class="inbox-badge">-</span>
                    </td>
                    <td class="col-category">
                      <span v-if="todo.category_name" class="category-badge">
                        <span class="category-symbol">
                          <component v-if="getIconComponent(todo.category_symbol)" :is="getIconComponent(todo.category_symbol)" :size="12" />
                          <span v-else>{{ todo.category_symbol || '*' }}</span>
                        </span>
                        {{ todo.category_name }}
                      </span>
                      <span v-else>-</span>
                    </td>
                    <td class="col-status-col">
                      <span v-if="todo.status_name" class="status-badge" :style="{ background: todo.status_color }">
                        {{ todo.status_name }}
                      </span>
                      <span v-else>-</span>
                    </td>
                    <td class="col-importance">
                      <span v-if="todo.importance" class="importance-badge" :style="{ color: getImportanceColor(todo.importance) }">
                        {{ todo.importance }}
                      </span>
                      <span v-else>-</span>
                    </td>
                    <td class="col-subtasks">
                      <span v-if="todo.subtask_info">{{ todo.subtask_info.completed }}/{{ todo.subtask_info.total }}</span>
                      <span v-else>-</span>
                    </td>
                    <td class="col-notes">
                      <span v-if="todo.notes" class="notes-indicator">✓</span>
                      <span v-else>-</span>
                    </td>
                    <td class="col-start">{{ todo.start_date ? formatShortDate(todo.start_date) : '-' }}</td>
                    <td class="col-end" :class="{ overdue: isOverdue(todo.end_date) }">
                      {{ todo.end_date ? formatShortDate(todo.end_date) : '-' }}
                    </td>
                    <td class="col-actions">
                      <template v-if="isTrashView">
                        <button class="restore-btn" @click.stop="restoreTodo(todo.id)" title="Restore">R</button>
                        <button class="permanent-delete-btn" @click.stop="permanentlyDeleteTodo(todo.id)" title="Delete permanently">x</button>
                      </template>
                      <button v-else @click.stop="deleteTodo(todo.id)">x</button>
                    </td>
                  </tr>
                </template>
              </draggable>
            </tbody>
          </template>
          <tbody v-else>
            <tr
              v-for="todo in sortedTodos"
              :key="todo.id"
              :class="{ completed: todo.completed, selected: selectedTodo?.id === todo.id, 'keyboard-focused': focusedTodo?.id === todo.id }"
              @click="selectTodo(todo.id)"
            >
              <td class="col-check">
                <input
                  v-if="!isTrashView"
                  type="checkbox"
                  :checked="todo.completed"
                  @click.stop="toggleComplete(todo)"
                />
              </td>
              <td class="col-title">{{ todo.title }}</td>
              <td class="col-project">
                <span v-if="todo.project_name" class="project-badge" :style="{ background: todo.project_color }">
                  {{ todo.project_name }}
                </span>
                <span v-else class="inbox-badge">-</span>
              </td>
              <td class="col-category">
                <span v-if="todo.category_name" class="category-badge">
                  <span class="category-symbol">
                    <component v-if="getIconComponent(todo.category_symbol)" :is="getIconComponent(todo.category_symbol)" :size="12" />
                    <span v-else>{{ todo.category_symbol || '*' }}</span>
                  </span>
                  {{ todo.category_name }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="col-status-col">
                <span v-if="todo.status_name" class="status-badge" :style="{ background: todo.status_color }">
                  {{ todo.status_name }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="col-importance">
                <span v-if="todo.importance" class="importance-badge" :style="{ color: getImportanceColor(todo.importance) }">
                  {{ todo.importance }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="col-subtasks">
                <span v-if="todo.subtask_info">{{ todo.subtask_info.completed }}/{{ todo.subtask_info.total }}</span>
                <span v-else>-</span>
              </td>
              <td class="col-notes">
                <span v-if="todo.notes" class="notes-indicator">✓</span>
                <span v-else>-</span>
              </td>
              <td class="col-start">{{ todo.start_date ? formatShortDate(todo.start_date) : '-' }}</td>
              <td class="col-end" :class="{ overdue: isOverdue(todo.end_date) }">
                {{ todo.end_date ? formatShortDate(todo.end_date) : '-' }}
              </td>
              <td class="col-actions">
                <template v-if="isTrashView">
                  <button class="restore-btn" @click.stop="restoreTodo(todo.id)" title="Restore">R</button>
                  <button class="permanent-delete-btn" @click.stop="permanentlyDeleteTodo(todo.id)" title="Delete permanently">x</button>
                </template>
                <button v-else @click.stop="deleteTodo(todo.id)">x</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Kanban View -->
      <div v-if="currentView === 'kanban'" class="kanban-view-wrapper">
        <div class="kanban-group-toggle">
          <button v-if="!isProjectSelected" :class="{ active: kanbanGroupBy === 'project' }" @click="kanbanGroupBy = 'project'">By Project</button>
          <button :class="{ active: kanbanGroupBy === 'category' }" @click="kanbanGroupBy = 'category'">By Category</button>
          <button :class="{ active: kanbanGroupBy === 'status' }" @click="kanbanGroupBy = 'status'">By Status</button>
        </div>

        <div class="kanban-view">
          <!-- Project-based Kanban -->
          <template v-if="effectiveKanbanGroupBy === 'project'">
            <div class="kanban-column inbox-column">
              <div class="column-header">
                <span class="column-dot" style="background: #666"></span>
                <h3>Inbox</h3>
                <span class="column-count">{{ inboxTodos.length }}</span>
              </div>
              <draggable
                v-model="inboxTodos"
                item-key="id"
                class="kanban-cards"
                group="kanban"
                ghost-class="ghost"
                @end="onKanbanDrop($event, null)"
              >
                <template #item="{ element }">
                  <div
                    class="kanban-card"
                    :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                    :style="{ borderLeftColor: element.category_color || '#666' }"
                    :data-todo-id="element.id"
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                      <button class="card-delete-btn" @click.stop="deleteTodo(element.id)">x</button>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance && element.importance > 0" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.category_name" class="card-category" :style="{ color: element.category_color }">{{ element.category_name }}</span>
                    </div>
                    <div v-if="element.start_date || element.end_date" class="card-dates">
                      <span v-if="element.start_date" class="card-start">Start: {{ formatDeadline(element.start_date) }}</span>
                      <span v-if="element.end_date" class="card-deadline" :class="{ overdue: isOverdue(element.end_date) }">
                        Due: {{ formatDeadline(element.end_date) }}
                      </span>
                    </div>
                    <div v-if="element.subtask_count > 0" class="card-subtasks">
                      {{ element.subtask_completed }}/{{ element.subtask_count }} subtasks
                    </div>
                  </div>
                </template>
              </draggable>
              <button class="kanban-add-btn" @click="addTodoToProject(null)">+ Add</button>
            </div>

            <div
              v-for="project in projects"
              :key="project.id"
              class="kanban-column"
              :style="{ borderTopColor: project.color }"
            >
              <div class="column-header">
                <span class="column-dot" :style="{ background: project.color }"></span>
                <h3>{{ project.name }}</h3>
                <span class="column-count">{{ getProjectTodos(project.id).length }}</span>
              </div>
              <draggable
                :modelValue="getProjectTodos(project.id)"
                @update:modelValue="updateProjectTodos(project.id, $event)"
                item-key="id"
                class="kanban-cards"
                group="kanban"
                ghost-class="ghost"
                @end="onKanbanDrop($event, project.id)"
              >
                <template #item="{ element }">
                  <div
                    class="kanban-card"
                    :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                    :style="{ borderLeftColor: project.color }"
                    :data-todo-id="element.id"
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                      <button class="card-delete-btn" @click.stop="deleteTodo(element.id)">x</button>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance && element.importance > 0" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.category_name" class="card-category" :style="{ color: element.category_color }">{{ element.category_name }}</span>
                    </div>
                    <div v-if="element.start_date || element.end_date" class="card-dates">
                      <span v-if="element.start_date" class="card-start">Start: {{ formatDeadline(element.start_date) }}</span>
                      <span v-if="element.end_date" class="card-deadline" :class="{ overdue: isOverdue(element.end_date) }">
                        Due: {{ formatDeadline(element.end_date) }}
                      </span>
                    </div>
                    <div v-if="element.subtask_count > 0" class="card-subtasks">
                      {{ element.subtask_completed }}/{{ element.subtask_count }} subtasks
                    </div>
                  </div>
                </template>
              </draggable>
              <button class="kanban-add-btn" @click="addTodoToProject(project.id)">+ Add</button>
            </div>
          </template>

          <!-- Category-based Kanban -->
          <template v-else-if="effectiveKanbanGroupBy === 'category'">
            <div class="kanban-column uncategorized-column">
              <div class="column-header">
                <span class="column-dot" style="background: #fff; border: 1px solid #ccc"></span>
                <h3>Uncategorized</h3>
                <span class="column-count">{{ uncategorizedTodos.length }}</span>
              </div>
              <draggable
                :modelValue="uncategorizedTodos"
                @update:modelValue="updateCategoryTodos(null, $event)"
                item-key="id"
                class="kanban-cards"
                group="kanban-category"
                ghost-class="ghost"
                data-category-id=""
                @end="onKanbanDropCategory"
              >
                <template #item="{ element }">
                  <div
                    class="kanban-card"
                    :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                    :style="{ borderLeftColor: element.project_color || '#333' }"
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                      <button class="card-delete-btn" @click.stop="deleteTodo(element.id)">x</button>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance && element.importance > 0" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.project_name" class="card-project" :style="{ color: element.project_color }">{{ element.project_name }}</span>
                    </div>
                    <div v-if="element.start_date || element.end_date" class="card-dates">
                      <span v-if="element.start_date" class="card-start">Start: {{ formatDeadline(element.start_date) }}</span>
                      <span v-if="element.end_date" class="card-deadline" :class="{ overdue: isOverdue(element.end_date) }">
                        Due: {{ formatDeadline(element.end_date) }}
                      </span>
                    </div>
                    <div v-if="element.subtask_count > 0" class="card-subtasks">
                      {{ element.subtask_completed }}/{{ element.subtask_count }} subtasks
                    </div>
                  </div>
                </template>
              </draggable>
              <button class="kanban-add-btn" @click="addTodoToCategory(null)">+ Add</button>
            </div>

            <div
              v-for="category in categories"
              :key="category.id"
              class="kanban-column"
            >
              <div class="column-header">
                <span class="column-symbol">{{ category.symbol || '*' }}</span>
                <h3>{{ category.name }}</h3>
                <span class="column-count">{{ getCategoryTodos(category.id).length }}</span>
              </div>
              <draggable
                :modelValue="getCategoryTodos(category.id)"
                @update:modelValue="updateCategoryTodos(category.id, $event)"
                item-key="id"
                class="kanban-cards"
                group="kanban-category"
                ghost-class="ghost"
                :data-category-id="category.id"
                @end="onKanbanDropCategory"
              >
                <template #item="{ element }">
                  <div
                    class="kanban-card"
                    :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                    :style="{ borderLeftColor: element.project_color || '#666' }"
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                      <button class="card-delete-btn" @click.stop="deleteTodo(element.id)">x</button>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance && element.importance > 0" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.project_name" class="card-project" :style="{ color: element.project_color }">{{ element.project_name }}</span>
                    </div>
                    <div v-if="element.start_date || element.end_date" class="card-dates">
                      <span v-if="element.start_date" class="card-start">Start: {{ formatDeadline(element.start_date) }}</span>
                      <span v-if="element.end_date" class="card-deadline" :class="{ overdue: isOverdue(element.end_date) }">
                        Due: {{ formatDeadline(element.end_date) }}
                      </span>
                    </div>
                    <div v-if="element.subtask_count > 0" class="card-subtasks">
                      {{ element.subtask_completed }}/{{ element.subtask_count }} subtasks
                    </div>
                  </div>
                </template>
              </draggable>
              <button class="kanban-add-btn" @click="addTodoToCategory(category.id)">+ Add</button>
            </div>
          </template>

          <!-- Status-based Kanban -->
          <template v-else-if="effectiveKanbanGroupBy === 'status'">
            <div class="kanban-column no-status-column">
              <div class="column-header">
                <span class="column-dot" style="background: #666"></span>
                <h3>No Status</h3>
                <span class="column-count">{{ noStatusTodos.length }}</span>
              </div>
              <draggable
                :modelValue="noStatusTodos"
                @update:modelValue="updateStatusTodos(null, $event)"
                item-key="id"
                class="kanban-cards"
                group="kanban-status"
                ghost-class="ghost"
                data-status-id=""
                @end="onKanbanDropStatus"
              >
                <template #item="{ element }">
                  <div
                    class="kanban-card"
                    :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                    :style="{ borderLeftColor: element.project_color || '#333' }"
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                      <button class="card-delete-btn" @click.stop="deleteTodo(element.id)">x</button>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance && element.importance > 0" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.project_name" class="card-project" :style="{ color: element.project_color }">{{ element.project_name }}</span>
                    </div>
                    <div v-if="element.start_date || element.end_date" class="card-dates">
                      <span v-if="element.start_date" class="card-start">Start: {{ formatDeadline(element.start_date) }}</span>
                      <span v-if="element.end_date" class="card-deadline" :class="{ overdue: isOverdue(element.end_date) }">
                        Due: {{ formatDeadline(element.end_date) }}
                      </span>
                    </div>
                    <div v-if="element.subtask_count > 0" class="card-subtasks">
                      {{ element.subtask_completed }}/{{ element.subtask_count }} subtasks
                    </div>
                  </div>
                </template>
              </draggable>
              <button class="kanban-add-btn" @click="addTodoToStatus(null)">+ Add</button>
            </div>

            <div
              v-for="status in statuses"
              :key="status.id"
              class="kanban-column"
              :style="{ borderTopColor: status.color }"
            >
              <div class="column-header">
                <span class="column-dot" :style="{ background: status.color }"></span>
                <h3>{{ status.name }}</h3>
                <span class="column-count">{{ getStatusTodos(status.id).length }}</span>
              </div>
              <draggable
                :modelValue="getStatusTodos(status.id)"
                @update:modelValue="updateStatusTodos(status.id, $event)"
                item-key="id"
                class="kanban-cards"
                group="kanban-status"
                ghost-class="ghost"
                :data-status-id="status.id"
                @end="onKanbanDropStatus"
              >
                <template #item="{ element }">
                  <div
                    class="kanban-card"
                    :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                    :style="{ borderLeftColor: element.project_color || status.color }"
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                      <button class="card-delete-btn" @click.stop="deleteTodo(element.id)">x</button>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance && element.importance > 0" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.project_name" class="card-project" :style="{ color: element.project_color }">{{ element.project_name }}</span>
                    </div>
                    <div v-if="element.start_date || element.end_date" class="card-dates">
                      <span v-if="element.start_date" class="card-start">Start: {{ formatDeadline(element.start_date) }}</span>
                      <span v-if="element.end_date" class="card-deadline" :class="{ overdue: isOverdue(element.end_date) }">
                        Due: {{ formatDeadline(element.end_date) }}
                      </span>
                    </div>
                    <div v-if="element.subtask_count > 0" class="card-subtasks">
                      {{ element.subtask_completed }}/{{ element.subtask_count }} subtasks
                    </div>
                  </div>
                </template>
              </draggable>
              <button class="kanban-add-btn" @click="addTodoToStatus(status.id)">+ Add</button>
            </div>
          </template>
        </div>
      </div>

      <!-- Gantt/Timeline View -->
      <div v-if="currentView === 'timeline'" class="gantt-view">
        <div class="gantt-controls">
          <select v-model="ganttGroupBy" class="gantt-groupby">
            <option value="project">By Project</option>
            <option value="category">By Category</option>
            <option value="importance">By Importance</option>
          </select>
          <button @click="timelineOffset -= 200">&#8592;</button>
          <button @click="timelineScale = Math.max(20, timelineScale - 20)">-</button>
          <span class="timeline-scale-label">{{ timelineScale }}px/day</span>
          <button @click="timelineScale = Math.min(500, timelineScale + 20)">+</button>
          <button @click="timelineOffset += 200">&#8594;</button>
          <button @click="timelineOffset = 0; timelineScale = 100" class="reset-btn">Reset</button>
        </div>
        <div class="gantt-container">
          <div class="gantt-sidebar">
            <div class="gantt-header-cell">Task</div>
            <div
              v-for="row in ganttRows"
              :key="row.id"
              class="gantt-row-label"
              :style="{ borderLeftColor: row.color, height: getRowHeight(row) + 'px' }"
            >
              <span class="row-name">{{ row.name }}</span>
              <span class="row-count">{{ row.todos.length }}</span>
            </div>
          </div>
          <div class="gantt-chart-area" ref="ganttChartArea" @wheel.prevent="onTimelineWheel">
            <div class="gantt-scroll" :style="{ transform: `translateX(${-timelineOffset}px)` }">
              <div class="gantt-header" :style="{ width: timelineRange.days * timelineScale + 'px' }">
                <div
                  v-for="(date, i) in timelineDates"
                  :key="i"
                  class="gantt-date-header"
                  :class="{ 'is-today': isToday(date), 'is-weekend': isWeekend(date), 'show-label': shouldShowDateLabel(i) }"
                  :style="{ left: i * timelineScale + 'px', width: timelineScale + 'px' }"
                >
                  <template v-if="shouldShowDateLabel(i)">
                    <span class="date-weekday">{{ getWeekdayName(date) }}</span>
                    <span class="date-day">{{ formatTimelineDate(date) }}</span>
                  </template>
                </div>
                <!-- Today marker -->
                <div v-if="todayPosition >= 0" class="today-marker" :style="{ left: todayPosition + 'px' }"></div>
              </div>
              <div class="gantt-rows">
                <div
                  v-for="row in ganttRows"
                  :key="row.id"
                  class="gantt-row"
                  :style="{ height: getRowHeight(row) + 'px' }"
                >
                  <div class="gantt-row-bg" :style="{ width: timelineRange.days * timelineScale + 'px', height: getRowHeight(row) + 'px' }">
                    <div
                      v-for="(date, i) in timelineDates"
                      :key="i"
                      class="gantt-grid-line"
                      :style="{ left: i * timelineScale + 'px' }"
                    ></div>
                  </div>
                  <div
                    v-for="todo in row.todos"
                    :key="todo.id"
                    class="gantt-bar"
                    :class="{ completed: todo.completed, selected: selectedTodo?.id === todo.id, dragging: draggingBarId === todo.id }"
                    :style="getGanttBarStyle(todo, row)"
                    :title="todo.title"
                    @click="selectTodo(todo.id)"
                    @mousedown.stop="startBarDrag($event, todo, 'move')"
                  >
                    <div class="gantt-bar-handle left" @mousedown.stop="startBarDrag($event, todo, 'resize-start')"></div>
                    <span class="gantt-bar-title">{{ todo.title }}</span>
                    <div class="gantt-bar-handle right" @mousedown.stop="startBarDrag($event, todo, 'resize-end')"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Graph View -->
      <div v-if="currentView === 'graph'" class="graph-view" ref="graphContainer"
        @wheel.prevent="onGraphWheel"
        @mousedown="onGraphMouseDown"
        @mousemove="onGraphMouseMove"
        @mouseup="onGraphMouseUp"
        @mouseleave="onGraphMouseUp"
      >
        <svg class="graph-svg" :viewBox="`0 0 ${graphWidth} ${graphHeight}`">
          <g :transform="`translate(${graphPan.x}, ${graphPan.y}) scale(${graphZoom})`">
            <!-- Connection lines -->
            <g class="graph-links">
              <line
                v-for="link in graphLinks"
                :key="`${link.source}-${link.target}`"
                :x1="getNodeX(link.source)"
                :y1="getNodeY(link.source)"
                :x2="getNodeX(link.target)"
                :y2="getNodeY(link.target)"
                class="graph-link"
                @contextmenu.prevent="onLinkRightClick(link)"
              />
            </g>
            <!-- Nodes -->
            <g class="graph-nodes">
              <g
                v-for="(todo, index) in graphNodes"
                :key="todo.id"
                class="graph-node"
                :class="{
                  person: todo.type === 'person',
                  completed: todo.completed,
                  selected: selectedTodo?.id === todo.id,
                  linking: graphLinkMode && graphLinkSource?.id === todo.id,
                  dragging: draggingNode?.id === todo.id
                }"
                :transform="`translate(${getNodeX(todo.id)}, ${getNodeY(todo.id)})`"
                @mousedown.stop="onNodeMouseDown($event, todo)"
                @mouseenter="hoveredNode = todo"
                @mouseleave="hoveredNode = null"
              >
                <!-- Person node (square) -->
                <rect v-if="todo.type === 'person'" x="-25" y="-25" width="50" height="50" rx="5" :fill="todo.color || '#8e44ad'" />
                <!-- Todo node (circle) -->
                <circle v-else r="30" :fill="todo.project_color || '#0f4c75'" />
                <text class="node-title" dy="4" text-anchor="middle">{{ todo.title.slice(0, 10) }}{{ todo.title.length > 10 ? '...' : '' }}</text>
              </g>
            </g>
          </g>
        </svg>
        <!-- Tooltip -->
        <div v-if="hoveredNode && !draggingNode" class="graph-tooltip" :style="tooltipStyle">
          <div class="tooltip-title">{{ hoveredNode.title }}</div>
          <div v-if="hoveredNode.project_name" class="tooltip-project">{{ hoveredNode.project_name }}</div>
          <div v-if="hoveredNode.end_date" class="tooltip-deadline">Due: {{ formatDeadline(hoveredNode.end_date) }}</div>
        </div>
        <div class="graph-controls">
          <button @click="graphZoom = Math.max(0.3, graphZoom - 0.2)">-</button>
          <span class="zoom-label">{{ Math.round(graphZoom * 100) }}%</span>
          <button @click="graphZoom = Math.min(3, graphZoom + 0.2)">+</button>
          <button @click="resetGraphView">Reset</button>
          <div class="control-divider"></div>
          <button
            :class="{ active: isSimulating }"
            @click="runForceLayout"
          >{{ isSimulating ? 'Stop' : 'Auto Layout' }}</button>
          <button @click="showGraphSettings = !showGraphSettings" :class="{ active: showGraphSettings }">Settings</button>
          <div class="control-divider"></div>
          <button
            :class="{ active: graphLinkMode }"
            @click="toggleGraphLinkMode"
          >{{ graphLinkMode ? 'Cancel' : 'Link' }}</button>
          <span v-if="graphLinkMode && graphLinkSource" class="link-hint">Click another node to link with "{{ graphLinkSource.title }}"</span>
          <span v-else-if="graphLinkMode" class="link-hint">Click a node to start linking</span>
        </div>
        <div v-if="showGraphSettings" class="graph-settings">
          <div class="setting-row">
            <label>
              <input type="checkbox" v-model="showPersonsInGraph" @change="updateGraphData" />
              Show Persons
            </label>
          </div>
          <div class="setting-row">
            <label>Repulsion:</label>
            <input type="range" min="-1000" max="-50" step="50" v-model.number="graphRepulsion" @input="onGraphSettingChange" />
            <span>{{ Math.abs(graphRepulsion) }}</span>
          </div>
          <div class="setting-row">
            <label>Link Distance:</label>
            <input type="range" min="30" max="300" step="10" v-model.number="graphEdgeLength" @input="onGraphSettingChange" />
            <span>{{ graphEdgeLength }}px</span>
          </div>
          <button @click="resetGraphSettings" class="reset-settings-btn">Reset Defaults</button>
        </div>
      </div>

      <div v-if="todos.length === 0 && currentView !== 'kanban' && currentView !== 'timeline' && currentView !== 'graph'" class="empty-state">
        <p>No todos yet. Add one above.</p>
      </div>
    </main>

    <!-- Detail Panel -->
    <aside v-if="selectedTodo" class="detail-panel" :style="detailPanelStyle" ref="detailPanel">
      <div
        class="resize-handle"
        :class="{ dragging: isResizing }"
        @mousedown="startResize"
      ></div>
      <div class="detail-panel-header">
        <div class="header-actions">
          <button @click="toggleDetailLayout" class="layout-btn" :title="layoutButtonTitle">
            <span v-if="detailLayoutPreference === 'auto'">A</span>
            <span v-else-if="detailLayoutPreference === 'horizontal'">|</span>
            <span v-else>-</span>
          </button>
          <button @click="detachDetail" class="detach-btn" title="Open in new window">^</button>
          <button @click="closeDetail" class="close-btn">x</button>
        </div>
      </div>

      <div class="detail-panel-content">
        <div class="title-row">
          <input
            type="checkbox"
            :checked="selectedTodo.completed"
            @change="toggleSelectedComplete"
            class="title-checkbox"
          />
          <input
            v-model="selectedTodo.title"
            class="title-input"
            @change="saveSelectedTodo"
            placeholder="Todo title"
            :style="{ borderBottomColor: selectedTodo.project_color || '#333' }"
          />
        </div>

        <div class="meta-row project-row">
          <label>Project:</label>
          <select v-model="selectedTodo.project_id" @change="saveProjectChange">
            <option :value="null">Inbox (No Project)</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>

        <div class="notes-section">
          <div class="tabs">
            <button
              :class="{ active: activeTab === 'edit' }"
              @click="activeTab = 'edit'"
            >Edit</button>
            <button
              :class="{ active: activeTab === 'preview' }"
              @click="activeTab = 'preview'"
            >Preview</button>
            <button
              :class="{ active: activeTab === 'split' }"
              @click="activeTab = 'split'"
            >Split</button>
          </div>

          <textarea
            v-if="activeTab === 'edit'"
            v-model="selectedTodo.notes"
            @input="saveSelectedTodo"
            placeholder="Add notes (Markdown supported)..."
            class="notes-editor"
            :style="{ borderColor: selectedTodo.project_color || '#333' }"
          ></textarea>

          <div
            v-else-if="activeTab === 'preview'"
            class="notes-preview markdown-body"
            :style="{ borderColor: selectedTodo.project_color || '#333' }"
            v-html="renderedNotes"
            @click="handleMarkdownClick"
          ></div>

          <div v-else class="notes-split">
            <textarea
              v-model="selectedTodo.notes"
              @input="saveSelectedTodo"
              placeholder="Add notes (Markdown supported)..."
              class="notes-editor split-editor"
              :style="{ borderColor: selectedTodo.project_color || '#333' }"
            ></textarea>
            <div
              class="notes-preview markdown-body split-preview"
              :style="{ borderColor: selectedTodo.project_color || '#333' }"
              v-html="renderedNotes"
              @click="handleMarkdownClick"
            ></div>
          </div>
        </div>

        <div class="subtasks-section">
          <div class="subtasks-header">
            <label>Subtasks</label>
            <span v-if="subtasks.length" class="subtask-count">{{ completedSubtasksCount }}/{{ subtasks.length }}</span>
          </div>
          <div class="subtasks-list">
            <div v-for="subtask in subtasks" :key="subtask.id" class="subtask-item" :class="{ completed: subtask.completed }">
              <input type="checkbox" :checked="subtask.completed" @change="toggleSubtask(subtask)" />
              <span class="subtask-title">{{ subtask.title }}</span>
              <button @click="deleteSubtask(subtask.id)" class="subtask-delete">x</button>
            </div>
          </div>
          <div class="subtask-add">
            <input
              v-model="newSubtaskTitle"
              @keyup.enter="addSubtask"
              placeholder="Add subtask..."
              class="subtask-input"
            />
            <button @click="addSubtask" :disabled="!newSubtaskTitle.trim()" class="subtask-add-btn">+</button>
          </div>
        </div>

        <div class="meta-section compact">
          <div class="meta-grid">
            <div class="meta-item">
              <label>Category</label>
              <select v-model="selectedTodo.category_id" @change="saveCategoryChange">
                <option :value="null">None</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
              </select>
            </div>
            <div class="meta-item">
              <label>Status</label>
              <select v-model="selectedTodo.status_id" @change="saveStatusChange">
                <option :value="null">None</option>
                <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
              </select>
            </div>
            <div class="meta-item">
              <label>Importance</label>
              <div class="importance-picker compact">
                <button v-for="level in 5" :key="level" class="importance-btn" :class="{ active: selectedTodo.importance == level && selectedTodo.importance > 0 }" @click="setImportance(level)">{{ level }}</button>
              </div>
            </div>
            <div class="meta-item">
              <label>Created</label>
              <span class="created-value">{{ formatCreatedDate(selectedTodo.created_at) }}</span>
            </div>
            <div class="meta-item">
              <label>Start</label>
              <div class="date-field">
                <input type="date" :value="selectedTodoStartDate" @change="updateStartDate($event)" lang="sv-SE" />
                <button v-if="selectedTodo.start_date" @click="clearStartDate" class="clear-btn">x</button>
              </div>
            </div>
            <div class="meta-item">
              <label>End</label>
              <div class="date-field">
                <input type="date" :value="selectedTodoEndDate" @change="updateEndDate($event)" lang="sv-SE" />
                <button v-if="selectedTodo.end_date" @click="clearEndDate" class="clear-btn">x</button>
              </div>
            </div>
            <div class="meta-item recurrence-item">
              <label>Repeat</label>
              <div class="recurrence-controls">
                <select v-model="selectedTodo.recurrence_type" @change="saveRecurrence">
                  <option :value="null">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <div v-if="selectedTodo.recurrence_type" class="recurrence-interval">
                  <span>every</span>
                  <input
                    type="number"
                    v-model.number="selectedTodo.recurrence_interval"
                    @change="saveRecurrence"
                    min="1"
                    max="99"
                    class="interval-input"
                  />
                  <span>{{ recurrenceUnit }}</span>
                </div>
              </div>
            </div>
            <div v-if="selectedTodo.recurrence_type" class="meta-item">
              <label>Until</label>
              <div class="date-field">
                <input type="date" :value="selectedTodo.recurrence_end_date || ''" @change="updateRecurrenceEndDate($event)" lang="sv-SE" />
                <button v-if="selectedTodo.recurrence_end_date" @click="clearRecurrenceEndDate" class="clear-btn">x</button>
              </div>
            </div>
            <div class="meta-item links-item">
              <label>Links</label>
              <div class="inline-links">
                <span v-for="linked in linkedTodos" :key="linked.id" class="link-chip" @click="selectTodo(linked.id)">
                  {{ linked.title }}<button @click.stop="unlinkFrom(linked)" class="chip-x">x</button>
                </span>
                <button @click="showLinkSearch = !showLinkSearch" class="add-link-btn">+</button>
              </div>
            </div>
            <div class="meta-item persons-item">
              <label>Persons</label>
              <div class="inline-persons">
                <span
                  v-for="person in assignedPersons"
                  :key="person.id"
                  class="person-avatar"
                  :style="{ background: person.color }"
                  :title="person.name"
                  @click="unassignPerson(person)"
                >{{ getInitials(person.name) }}</span>
                <button @click="showPersonPicker = !showPersonPicker" class="add-person-btn">+</button>
              </div>
            </div>
          </div>
          <div v-if="showLinkSearch" class="link-search-popup">
            <input v-model="linkQuery" @input="searchForLinks" placeholder="Search todos..." ref="linkInput" />
            <div v-if="linkResults.length" class="link-results">
              <div v-for="result in linkResults" :key="result.id" class="link-result" @click="linkTo(result)">
                {{ result.title }}
              </div>
            </div>
          </div>
          <div v-if="showPersonPicker" class="person-picker-popup">
            <div class="person-picker-list">
              <div v-for="person in persons" :key="person.id" class="person-option" :class="{ assigned: assignedPersons.some(p => p.id === person.id) }" @click="assignPerson(person)">
                <span class="person-color-dot" :style="{ background: person.color }"></span>
                <span class="person-name">{{ person.name }}</span>
                <span v-if="person.email" class="person-email">{{ person.email }}</span>
              </div>
              <div v-if="!persons.length" class="person-picker-empty">
                <p>No persons available</p>
                <button @click="openSettings">Manage Persons</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
    </div>

    <!-- Command Palette / Global Search -->
    <div v-if="showCommandPalette" class="command-palette-overlay" @click.self="closeCommandPalette">
      <div class="command-palette">
        <div class="command-palette-header">
          <input
            ref="searchInput"
            v-model="searchQuery"
            @input="onSearchInput"
            @keydown.esc="closeCommandPalette"
            placeholder="Search todos and persons... (Esc to close)"
            class="command-palette-input"
            autofocus
          />
        </div>
        <div class="command-palette-results" v-if="searchResults.length > 0">
          <div
            v-for="(result, index) in searchResults"
            :key="result.type + '-' + result.id"
            class="command-palette-result"
            :class="{ 'is-completed': result.completed, 'is-person': result.type === 'person' }"
            @click="selectSearchResult(result)"
          >
            <template v-if="result.type === 'person'">
              <span class="person-color-dot" :style="{ background: result.color }">{{ getInitials(result.name) }}</span>
              <span class="result-title">{{ result.name }}</span>
              <span v-if="result.email" class="result-project">{{ result.email }}</span>
              <span v-else-if="result.company" class="result-project">{{ result.company }}</span>
            </template>
            <template v-else>
              <span class="result-title">{{ result.title }}</span>
              <span v-if="result.project_name" class="result-project" :style="{ color: result.project_color }">
                {{ result.project_name }}
              </span>
              <span v-else class="result-project inbox">Inbox</span>
            </template>
          </div>
        </div>
        <div class="command-palette-empty" v-else-if="searchQuery && searchQuery.length > 0">
          <p>No results found</p>
        </div>
        <div class="command-palette-hint" v-else>
          <p>Type to search across all todos and persons</p>
          <div class="keyboard-hints">
            <span><kbd>j</kbd>/<kbd>k</kbd> Navigate</span>
            <span><kbd>x</kbd> Toggle complete</span>
            <span><kbd>n</kbd> New todo</span>
            <span><kbd>d</kbd> Delete</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import { marked } from 'marked'
import mermaid from 'mermaid'
import * as d3Force from 'd3-force'
import {
  Folder, Home, Briefcase, ShoppingCart, Heart, BookOpen, Target, Star,
  Calendar, Clock, Tag, Flag, Bookmark, Zap, Coffee, Music, Camera, Film,
  MessageCircle, Mail, Phone, Users, User, Settings, Search, Plus, Check,
  AlertCircle, Info, HelpCircle, Bell, Gift, Award, Trophy, Crown
} from 'lucide-vue-next'

const categoryIcons = {
  Folder, Home, Briefcase, ShoppingCart, Heart, BookOpen, Target, Star,
  Calendar, Clock, Tag, Flag, Bookmark, Zap, Coffee, Music, Camera, Film,
  MessageCircle, Mail, Phone, Users, User, Settings, Search, Plus, Check,
  AlertCircle, Info, HelpCircle, Bell, Gift, Award, Trophy, Crown
}

const savedTheme = localStorage.getItem('todo-theme') || 'dark'
mermaid.initialize({
  startOnLoad: false,
  theme: savedTheme === 'light' ? 'default' : 'dark',
  securityLevel: 'loose'
})

function reinitializeMermaid(theme) {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'light' ? 'default' : 'dark',
    securityLevel: 'loose',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 15,
      useMaxWidth: true
    },
    themeVariables: theme === 'dark' ? {
      primaryColor: '#0f4c75',
      primaryTextColor: '#e0e0e0',
      primaryBorderColor: '#4fc3f7',
      lineColor: '#4fc3f7',
      secondaryColor: '#252a3d',
      tertiaryColor: '#1a1f2e',
      background: '#1a1a1a',
      mainBkg: '#252a3d',
      secondBkg: '#1a1f2e',
      mainContrastColor: '#e0e0e0',
      darkMode: true,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px'
    } : {}
  })
}

const mermaidExtension = {
  name: 'mermaid',
  renderer: {
    code(token) {
      if (token.lang === 'mermaid') {
        return `<pre class="mermaid">${token.text}</pre>`
      }
      return `<pre><code class="language-${token.lang || ''}">${token.text}</code></pre>`
    }
  }
}
marked.use(mermaidExtension)

export default {
  name: 'App',
  components: {
    draggable,
    ...categoryIcons
  },
  data() {
    return {
      todos: [],
      projects: [],
      categories: [],
      statuses: [],
      allTodos: [],
      currentFilter: null,
      currentView: localStorage.getItem('current-view') || 'cards',
      hideCompleted: localStorage.getItem('hide-completed') === 'true',
      kanbanGroupBy: 'status',
      newTodoTitle: '',
      newProjectName: '',
      newCategoryName: '',
      newStatusName: '',
      showProjectInput: false,
      showCategoryInput: false,
      showStatusInput: false,
      editingProject: null,
      editingCategory: null,
      editingStatus: null,
      selectedTodo: null,
      linkedTodos: [],
      subtasks: [],
      newSubtaskTitle: '',
      activeTab: 'edit',
      showLinkSearch: false,
      linkQuery: '',
      linkResults: [],
      assignedPersons: [],
      showPersonPicker: false,
      saveTimeout: null,
      sortBy: localStorage.getItem('sort-by') || 'manual',
      groupByProject: localStorage.getItem('group-by-project') === 'true',
      cardSize: parseInt(localStorage.getItem('card-size')) || 280,
      cardSizes: JSON.parse(localStorage.getItem('card-sizes-v2') || '{}'),
      filterProjectId: null,
      filterCategoryId: null,
      importanceFilterOp: 'none',
      importanceFilterValue: 3,
      timelineScale: 100,
      timelineOffset: 0,
      ganttGroupBy: 'project',
      draggingBarId: null,
      draggingBarTodo: null,
      barDragStartX: 0,
      barDragMode: 'move',
      barDragOriginalDates: null,
      graphLinkMode: false,
      graphLinkSource: null,
      graphWidth: 800,
      graphHeight: 600,
      nodePositions: {},
      allLinks: [],
      graphZoom: 1,
      graphPan: { x: 0, y: 0 },
      draggingNode: null,
      dragOffset: { x: 0, y: 0 },
      isPanning: false,
      lastMousePos: { x: 0, y: 0 },
      hoveredNode: null,
      mousePos: { x: 0, y: 0 },
      isSimulating: false,
      projectColors: [
        '#0f4c75', '#e74c3c', '#2ecc71', '#f39c12',
        '#9b59b6', '#1abc9c', '#e91e63', '#00bcd4',
        '#673ab7', '#ff5722', '#795548', '#607d8b',
        '#4caf50', '#3f51b5', '#ff9800', '#009688'
      ],
      categorySymbols: [
        'Folder', 'Home', 'Briefcase', 'ShoppingCart', 'Heart', 'BookOpen', 'Target', 'Star',
        'Calendar', 'Clock', 'Tag', 'Flag', 'Bookmark', 'Zap', 'Coffee', 'Music',
        'Camera', 'Film', 'MessageCircle', 'Mail', 'Phone', 'Users', 'User', 'Settings',
        'Bell', 'Gift', 'Award', 'Trophy', 'Crown', 'AlertCircle', 'Info', 'HelpCircle'
      ],
      statusColors: [
        '#3498db', '#2ecc71', '#f39c12', '#e74c3c',
        '#9b59b6', '#1abc9c', '#95a5a6', '#34495e',
        '#00bcd4', '#ff5722', '#795548', '#607d8b'
      ],
      // Resize state
      isResizing: false,
      detailWidth: 600,
      detailHeight: 50,
      isVerticalLayout: false,
      detailLayoutPreference: localStorage.getItem('detail-layout') || 'auto', // 'auto', 'horizontal', 'vertical'
      // Graph layout parameters
      // d3-force parameters
      graphRepulsion: parseInt(localStorage.getItem('graph-repulsion')) || -400,
      graphEdgeLength: parseInt(localStorage.getItem('graph-edge-length')) || 100,
      showGraphSettings: false,
      showPersonsInGraph: localStorage.getItem('show-persons-in-graph') === 'true',
      todoPersons: {},
      d3Simulation: null,
      // Theme
      theme: localStorage.getItem('todo-theme') || 'dark',
      openTodosInWindow: localStorage.getItem('todo-open-mode') === 'window',
      // Sidebar visibility
      sidebarVisible: localStorage.getItem('sidebar-visible') !== 'false',
      categoriesCollapsed: localStorage.getItem('categories-collapsed') === 'true',
      statusesCollapsed: localStorage.getItem('statuses-collapsed') === 'true',
      personsCollapsed: localStorage.getItem('persons-collapsed') !== 'false',
      settingsCollapsed: localStorage.getItem('settings-collapsed') !== 'false',
      // Trash
      trashCount: 0,
      // Keyboard navigation
      focusedTodoIndex: -1,
      // Command palette / global search
      showCommandPalette: false,
      searchQuery: '',
      searchResults: [],
      // Export/Import
      showImportDialog: false,
      databasePath: '',
      // Persons/Stakeholders
      persons: [],
      projectPersons: {},
      showProjectPersonPicker: false
    }
  },
  computed: {
    currentProjectColor() {
      if (this.currentFilter && this.currentFilter !== 'inbox' && this.currentFilter !== 'trash') {
        const project = this.projects.find(p => p.id === this.currentFilter)
        return project ? project.color : '#333'
      }
      return '#333'
    },
    isProjectSelected() {
      return this.currentFilter !== null && this.currentFilter !== 'inbox'
    },
    effectiveKanbanGroupBy() {
      // When project is selected, allow category or status (not project)
      if (this.isProjectSelected && this.kanbanGroupBy === 'project') {
        return 'category'
      }
      return this.kanbanGroupBy
    },
    currentTitle() {
      if (this.currentFilter === null) return 'All Todos'
      if (this.currentFilter === 'inbox') return 'Inbox'
      if (this.currentFilter === 'trash') return 'Trash'
      const project = this.projects.find(p => p.id === this.currentFilter)
      return project ? project.name : 'Todos'
    },
    isTrashView() {
      return this.currentFilter === 'trash'
    },
    completedSubtasksCount() {
      return this.subtasks.filter(s => s.completed).length
    },
    recurrenceUnit() {
      if (!this.selectedTodo) return ''
      const interval = this.selectedTodo.recurrence_interval || 1
      const plural = interval > 1
      switch (this.selectedTodo.recurrence_type) {
        case 'daily': return plural ? 'days' : 'day'
        case 'weekly': return plural ? 'weeks' : 'week'
        case 'monthly': return plural ? 'months' : 'month'
        case 'yearly': return plural ? 'years' : 'year'
        default: return ''
      }
    },
    currentProjectPersons() {
      if (!this.editingProject || !this.editingProject.id) return []
      return this.projectPersons[this.editingProject.id] || []
    },
    allCount() {
      return this.allTodos.length
    },
    inboxCount() {
      return this.allTodos.filter(t => !t.project_id).length
    },
    inboxTodos() {
      return this.filteredTodos.filter(t => !t.project_id)
    },
    uncategorizedTodos() {
      return this.filteredTodos.filter(t => !t.category_id)
    },
    noStatusTodos() {
      return this.filteredTodos.filter(t => !t.status_id)
    },
    selectedTodoEndDate() {
      if (!this.selectedTodo?.end_date) return ''
      return this.selectedTodo.end_date.split('T')[0]
    },
    focusedTodo() {
      if (this.focusedTodoIndex >= 0 && this.focusedTodoIndex < this.todos.length) {
        return this.todos[this.focusedTodoIndex]
      }
      return null
    },
    selectedTodoStartDate() {
      if (!this.selectedTodo?.start_date) return ''
      return this.selectedTodo.start_date.split('T')[0]
    },
    renderedNotes() {
      if (!this.selectedTodo?.notes) return '<p class="placeholder">No notes yet</p>'
      return marked(this.selectedTodo.notes)
    },
    layoutButtonTitle() {
      if (this.detailLayoutPreference === 'auto') return 'Layout: Auto (click to change)'
      if (this.detailLayoutPreference === 'horizontal') return 'Layout: Side-by-side (click to change)'
      return 'Layout: Stacked (click to change)'
    },
    detailPanelStyle() {
      const style = {
        borderLeftColor: this.selectedTodo?.project_color || '#333'
      }
      if (this.isVerticalLayout) {
        style['--detail-height'] = `${this.detailHeight}%`
      } else {
        style['--detail-width'] = `${this.detailWidth}px`
      }
      return style
    },
    sortedTodos() {
      let sorted = [...this.filteredTodos]
      if (this.sortBy === 'end_date') {
        sorted.sort((a, b) => {
          if (!a.end_date && !b.end_date) return 0
          if (!a.end_date) return 1
          if (!b.end_date) return -1
          return new Date(a.end_date) - new Date(b.end_date)
        })
      } else if (this.sortBy === 'alpha') {
        sorted.sort((a, b) => a.title.localeCompare(b.title))
      }
      return sorted
    },
    groupedTodos() {
      const groups = []
      const sorted = this.sortedTodos

      // Inbox group (todos without project)
      const inboxTodos = sorted.filter(t => !t.project_id)
      if (inboxTodos.length > 0) {
        groups.push({
          id: 'inbox',
          name: 'Inbox',
          color: '#666',
          todos: inboxTodos
        })
      }

      // Project groups
      for (const project of this.projects) {
        const projectTodos = sorted.filter(t => t.project_id === project.id)
        if (projectTodos.length > 0) {
          groups.push({
            id: project.id,
            name: project.name,
            color: project.color,
            todos: projectTodos
          })
        }
      }

      return groups
    },
    filteredTodos() {
      let todos = this.currentFilter === null ? this.allTodos : this.todos
      if (this.filterProjectId !== null) {
        todos = todos.filter(t => t.project_id === this.filterProjectId)
      }
      if (this.filterCategoryId !== null) {
        todos = todos.filter(t => t.category_id === this.filterCategoryId)
      }
      // Apply importance filter
      if (this.importanceFilterOp !== 'none') {
        const val = this.importanceFilterValue
        if (this.importanceFilterOp === 'gte') {
          todos = todos.filter(t => (t.importance || 0) >= val)
        } else if (this.importanceFilterOp === 'lte') {
          todos = todos.filter(t => (t.importance || 0) <= val)
        } else if (this.importanceFilterOp === 'eq') {
          todos = todos.filter(t => (t.importance || 0) === val)
        }
      }
      // Hide completed items if enabled
      if (this.hideCompleted) {
        todos = todos.filter(t => !t.completed)
      }
      return todos
    },
    timelineTodos() {
      // Only show todos that have at least one date (start_date or end_date)
      return [...this.filteredTodos]
        .filter(t => t.start_date || t.end_date)
        .sort((a, b) => {
          // Sort by start_date, then end_date, then created_at
          const aDate = a.start_date || a.end_date || a.created_at
          const bDate = b.start_date || b.end_date || b.created_at
          return new Date(aDate) - new Date(bDate)
        })
    },
    timelineRange() {
      const now = new Date()
      if (this.timelineTodos.length === 0) {
        // Show current month + 2 months when no todos with dates
        const end = new Date(now)
        end.setMonth(end.getMonth() + 2)
        const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1
        return { start: now, end, days }
      }
      const allDates = []
      this.timelineTodos.forEach(t => {
        if (t.start_date) allDates.push(new Date(t.start_date))
        if (t.end_date) allDates.push(new Date(t.end_date))
      })
      allDates.push(now) // Include today
      // Add a date 2 months from now to ensure timeline extends into the future
      const futureDate = new Date(now)
      futureDate.setMonth(futureDate.getMonth() + 2)
      allDates.push(futureDate)
      const start = new Date(Math.min(...allDates))
      const end = new Date(Math.max(...allDates))
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() + 1)
      const days = Math.max(14, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1)
      return { start, end, days }
    },
    timelineDates() {
      const dates = []
      const start = new Date(this.timelineRange.start)
      for (let i = 0; i < this.timelineRange.days; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        dates.push(d)
      }
      return dates
    },
    todayPosition() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(this.timelineRange.start)
      start.setHours(0, 0, 0, 0)
      const diffDays = (today - start) / (1000 * 60 * 60 * 24)
      if (diffDays < 0 || diffDays > this.timelineRange.days) {
        return -1
      }
      return diffDays * this.timelineScale
    },
    dateLabelInterval() {
      // Determine how many days to skip between labels based on zoom level
      if (this.timelineScale >= 80) return 1      // Show every day
      if (this.timelineScale >= 40) return 2      // Every 2 days
      if (this.timelineScale >= 25) return 7      // Weekly
      return 14                                    // Every 2 weeks
    },
    graphNodes() {
      const nodes = [...this.filteredTodos]

      // Add person nodes if enabled
      if (this.showPersonsInGraph) {
        const personSet = new Set()

        // Collect all unique persons from todos
        Object.values(this.todoPersons).forEach(persons => {
          persons.forEach(person => {
            personSet.add(person.id)
          })
        })

        // Add person nodes
        personSet.forEach(personId => {
          const person = this.persons.find(p => p.id === personId)
          if (person) {
            nodes.push({
              id: `person-${person.id}`,
              personId: person.id,
              type: 'person',
              title: person.name,
              color: person.color,
              person: person
            })
          }
        })
      }

      return nodes
    },
    tooltipStyle() {
      return {
        left: this.mousePos.x + 15 + 'px',
        top: this.mousePos.y + 15 + 'px'
      }
    },
    graphLinks() {
      const todoIds = new Set(this.filteredTodos.map(t => t.id))
      // Filter links to only include those where both ends are visible
      const links = this.allLinks.filter(link =>
        todoIds.has(link.source) && todoIds.has(link.target)
      )

      // Add person-todo links if enabled
      if (this.showPersonsInGraph) {
        Object.entries(this.todoPersons).forEach(([todoId, persons]) => {
          const numTodoId = parseInt(todoId)
          if (todoIds.has(numTodoId)) {
            persons.forEach(person => {
              links.push({
                source: `person-${person.id}`,
                target: numTodoId,
                type: 'person-todo'
              })
            })
          }
        })
      }

      return links
    },
    ganttRows() {
      const rows = []
      const todos = this.timelineTodos

      // Helper to calculate lanes for todos to avoid overlaps
      const assignLanes = (rowTodos) => {
        const todoLanes = {}
        const lanes = [] // Each lane is an array of { end: endPosition }

        // Sort todos by start date (items without dates are already filtered out)
        const sortedTodos = [...rowTodos].sort((a, b) => {
          const aStart = a.start_date ? new Date(a.start_date) : new Date(a.end_date)
          const bStart = b.start_date ? new Date(b.start_date) : new Date(b.end_date)
          return aStart - bStart
        })

        for (const todo of sortedTodos) {
          const startDate = todo.start_date ? new Date(todo.start_date) : new Date(todo.end_date)
          const endDate = todo.end_date ? new Date(todo.end_date) : startDate
          const startPos = this.getTimelinePosition(startDate)
          const endPos = this.getTimelinePosition(endDate) + 20 // Add minimum width

          // Find the first lane where this todo fits
          let assignedLane = -1
          for (let i = 0; i < lanes.length; i++) {
            if (lanes[i] <= startPos) {
              assignedLane = i
              lanes[i] = endPos
              break
            }
          }

          // If no lane fits, create a new one
          if (assignedLane === -1) {
            assignedLane = lanes.length
            lanes.push(endPos)
          }

          todoLanes[todo.id] = assignedLane
        }

        return { todoLanes, laneCount: Math.max(1, lanes.length) }
      }

      if (this.ganttGroupBy === 'project') {
        // Inbox row
        const inboxTodos = todos.filter(t => !t.project_id)
        if (inboxTodos.length > 0) {
          const { todoLanes, laneCount } = assignLanes(inboxTodos)
          rows.push({ id: 'inbox', name: 'Inbox', color: '#666', todos: inboxTodos, todoLanes, laneCount })
        }
        // Project rows
        for (const project of this.projects) {
          const projectTodos = todos.filter(t => t.project_id === project.id)
          if (projectTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(projectTodos)
            rows.push({ id: project.id, name: project.name, color: project.color, todos: projectTodos, todoLanes, laneCount })
          }
        }
      } else if (this.ganttGroupBy === 'category') {
        // Uncategorized row
        const uncatTodos = todos.filter(t => !t.category_id)
        if (uncatTodos.length > 0) {
          const { todoLanes, laneCount } = assignLanes(uncatTodos)
          rows.push({ id: 'uncat', name: 'Uncategorized', color: '#666', todos: uncatTodos, todoLanes, laneCount })
        }
        // Category rows
        for (const category of this.categories) {
          const catTodos = todos.filter(t => t.category_id === category.id)
          if (catTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(catTodos)
            rows.push({ id: category.id, name: category.name, color: category.color, todos: catTodos, todoLanes, laneCount })
          }
        }
      } else if (this.ganttGroupBy === 'importance') {
        // Group by importance (5 to 1)
        for (let i = 5; i >= 1; i--) {
          const impTodos = todos.filter(t => (t.importance || 0) === i)
          if (impTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(impTodos)
            rows.push({ id: `imp-${i}`, name: `Importance ${i}`, color: this.getImportanceColor(i), todos: impTodos, todoLanes, laneCount })
          }
        }
      }

      return rows
    }
  },
  async mounted() {
    await this.loadProjects()
    await this.loadCategories()
    await this.loadStatuses()
    await this.loadPersons()
    await this.loadAllTodos()
    await this.loadTodos()
    await this.loadAllLinks()
    this.databasePath = await window.api.getDatabasePath()

    // Load graph person data if enabled
    if (this.showPersonsInGraph) {
      await this.updateGraphData()
    }

    window.api.onRefreshTodos(() => {
      this.loadAllTodos()
      this.loadTodos()
      this.loadAllLinks()
      if (this.selectedTodo) {
        this.loadSelectedTodo(this.selectedTodo.id)
      }
    })

    // Close sidebar detail when opened in detached window
    window.api.onDetailOpenedInWindow((todoId) => {
      if (this.selectedTodo && this.selectedTodo.id === todoId) {
        this.selectedTodo = null
      }
    })

    // Check layout on mount and resize
    this.checkLayout()
    window.addEventListener('resize', this.checkLayout)
    window.addEventListener('resize', this.updateGraphSize)

    // Keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyDown)

    // Add native event listener for links in markdown
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a')
      if (link && link.href && (link.closest('.notes-preview') || link.closest('.card-notes-preview'))) {
        console.log('Native click on link:', link.href)
        event.preventDefault()
        event.stopPropagation()
        if (window.api && window.api.openExternal) {
          window.api.openExternal(link.href)
        } else {
          console.error('window.api.openExternal is not available')
        }
      }
    })
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkLayout)
    window.removeEventListener('resize', this.updateGraphSize)
    window.removeEventListener('keydown', this.handleKeyDown)
    this.stopForceLayout()
  },
  methods: {
    isIconName(symbol) {
      return symbol && this.categorySymbols.includes(symbol)
    },
    getIconComponent(name) {
      return categoryIcons[name] || null
    },
    getInitials(name) {
      if (!name) return ''
      const parts = name.trim().split(' ')
      if (parts.length === 1) {
        return parts[0].substring(0, 2)
      }
      return parts[0][0] + parts[parts.length - 1][0]
    },
    toggleHideCompleted() {
      localStorage.setItem('hide-completed', this.hideCompleted.toString())
    },
    async loadProjects() {
      this.projects = await window.api.getProjects()
    },
    async loadCategories() {
      this.categories = await window.api.getCategories()
    },
    async loadStatuses() {
      this.statuses = await window.api.getStatuses()
    },
    async loadAllTodos() {
      this.allTodos = await window.api.getTodos(null)
      this.trashCount = await window.api.getTrashCount()
    },
    async loadTodos() {
      this.todos = await window.api.getTodos(this.currentFilter)
    },
    renderCardNotes(notes) {
      if (!notes) return ''
      // Strip mermaid code blocks and replace with placeholder (for performance)
      let processed = notes.replace(/```mermaid[\s\S]*?```/g, '[diagram]')
      // Render full notes - CSS handles overflow with scrolling for resizable cards
      return marked(processed)
    },
    getCategoryCount(categoryId) {
      return this.allTodos.filter(t => t.category_id === categoryId).length
    },
    getCategoryTodos(categoryId) {
      return this.filteredTodos.filter(t => t.category_id === categoryId)
    },
    getStatusCount(statusId) {
      return this.allTodos.filter(t => t.status_id === statusId).length
    },
    getStatusTodos(statusId) {
      return this.filteredTodos.filter(t => t.status_id === statusId)
    },
    getProjectCount(projectId) {
      return this.allTodos.filter(t => t.project_id === projectId).length
    },
    getProjectTodos(projectId) {
      return this.filteredTodos.filter(t => t.project_id === projectId)
    },
    updateProjectTodos(projectId, todos) {
      // Used by draggable for reactive updates
    },
    updateCategoryTodos(categoryId, todos) {
      // Used by draggable for reactive updates
    },
    updateStatusTodos(statusId, todos) {
      // Used by draggable for reactive updates
    },
    updateSortedTodos(todos) {
      // Update the internal todos array for drag-and-drop
      this.todos = todos
    },
    async onKanbanDropCategory(event) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      // Get target category from the drop target element
      const targetCategoryId = event.to?.dataset?.categoryId
      const parsedCategoryId = targetCategoryId === '' ? null : parseInt(targetCategoryId)

      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo && todo.category_id !== parsedCategoryId) {
        const todoData = this.toPlainTodo(todo)
        todoData.category_id = parsedCategoryId
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async onKanbanDropStatus(event) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      // Get target status from the drop target element
      const targetStatusId = event.to?.dataset?.statusId
      const parsedStatusId = targetStatusId === '' ? null : parseInt(targetStatusId)

      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo && todo.status_id !== parsedStatusId) {
        const todoData = this.toPlainTodo(todo)
        todoData.status_id = parsedStatusId
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async setFilter(filter) {
      this.currentFilter = filter
      await this.loadTodos()
    },
    async addTodo() {
      if (!this.newTodoTitle.trim()) return
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      await window.api.createTodo(this.newTodoTitle.trim(), projectId)
      this.newTodoTitle = ''
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async addTodoToProject(projectId) {
      const todo = await window.api.createTodo('', projectId)
      await this.loadAllTodos()
      await this.loadTodos()
      this.selectTodo(todo.id)
    },
    async addTodoToCategory(categoryId) {
      const projectId = this.isProjectSelected ? this.currentFilter : null
      const todo = await window.api.createTodo('', projectId)
      if (categoryId !== null) {
        const todoData = this.toPlainTodo(todo)
        todoData.category_id = categoryId
        await window.api.updateTodo(todoData)
      }
      await this.loadAllTodos()
      await this.loadTodos()
      this.selectTodo(todo.id)
    },
    async addTodoToStatus(statusId) {
      const projectId = this.isProjectSelected ? this.currentFilter : null
      const todo = await window.api.createTodo('', projectId)
      if (statusId !== null) {
        const todoData = this.toPlainTodo(todo)
        todoData.status_id = statusId
        await window.api.updateTodo(todoData)
      }
      await this.loadAllTodos()
      await this.loadTodos()
      this.selectTodo(todo.id)
    },
    async toggleComplete(todo) {
      const todoData = this.toPlainTodo(todo)
      const isCompleting = !todo.completed
      todoData.completed = isCompleting
      await window.api.updateTodo(todoData)

      // If completing a recurring task, create the next occurrence
      if (isCompleting && todo.recurrence_type) {
        await window.api.createNextRecurrence(todo.id)
      }

      await this.loadAllTodos()
      await this.loadTodos()
      if (this.selectedTodo?.id === todo.id) {
        this.selectedTodo.completed = isCompleting
      }
    },
    async toggleSelectedComplete() {
      if (this.selectedTodo) {
        await this.toggleComplete(this.selectedTodo)
      }
    },
    async deleteTodo(id) {
      await window.api.deleteTodo(id)
      if (this.selectedTodo?.id === id) {
        this.selectedTodo = null
      }
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async restoreTodo(id) {
      await window.api.restoreTodo(id)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async permanentlyDeleteTodo(id) {
      await window.api.permanentlyDeleteTodo(id)
      if (this.selectedTodo?.id === id) {
        this.selectedTodo = null
      }
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async emptyTrash() {
      if (confirm('Are you sure you want to permanently delete all items in trash?')) {
        await window.api.emptyTrash()
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async onDragEnd() {
      const ids = this.todos.map(t => t.id)
      await window.api.reorderTodos(ids)
    },
    updateGroupTodos(groupId, todos) {
      // Update todos for a specific group
      const group = this.groupedTodos.find(g => g.id === groupId)
      if (group) {
        group.todos = todos
      }
    },
    async onGroupDragEnd(groupId, event) {
      // Get the todos from this specific group and reorder them
      const group = this.groupedTodos.find(g => g.id === groupId)
      if (group && group.todos) {
        const ids = group.todos.map(t => t.id)
        await window.api.reorderTodos(ids)
      }
    },
    async onProjectDragEnd() {
      const ids = this.projects.map(p => p.id)
      await window.api.reorderProjects(ids)
    },
    async onCategoryDragEnd() {
      const ids = this.categories.map(c => c.id)
      await window.api.reorderCategories(ids)
    },
    async onStatusDragEnd() {
      const ids = this.statuses.map(s => s.id)
      await window.api.reorderStatuses(ids)
    },
    async onKanbanDrop(event, targetProjectId) {
      const todoId = parseInt(event.item.dataset.todoId)
      if (!todoId) return

      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo && todo.project_id !== targetProjectId) {
        const todoData = this.toPlainTodo(todo)
        todoData.project_id = targetProjectId
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    handleCardClick(event, id) {
      // Check if the click was on a link
      const link = event.target.closest('a')
      if (link && link.href) {
        event.preventDefault()
        event.stopPropagation()
        if (window.api && window.api.openExternal) {
          window.api.openExternal(link.href)
        } else {
          console.error('window.api.openExternal is not available')
        }
        return
      }

      const card = event.currentTarget
      const rect = card.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const clickY = event.clientY - rect.top

      // Check if click was on resize handle (bottom 20px or bottom-right 20x20px corner)
      const isBottomEdge = clickY > rect.height - 20
      const isRightEdge = clickX > rect.width - 20

      // Don't open detail if clicking on resize handle area
      if (isBottomEdge || (isBottomEdge && isRightEdge)) {
        return
      }

      this.selectTodo(id)
    },
    async selectTodo(id) {
      const openInWindow = localStorage.getItem('todo-open-mode') === 'window'
      if (openInWindow) {
        await window.api.openDetail(id)
      } else {
        await this.loadSelectedTodo(id)
      }
    },
    async loadSelectedTodo(id) {
      // Flush any pending saves before loading a new todo
      if (this.saveTimeout && this.selectedTodo) {
        clearTimeout(this.saveTimeout)
        const todoData = this.toPlainTodo(this.selectedTodo)
        await window.api.updateTodo(todoData)
      }

      // Close any detached window for this todo
      await window.api.closeDetailWindow(id)

      this.selectedTodo = await window.api.getTodo(id)
      this.linkedTodos = await window.api.getLinkedTodos(id)
      this.subtasks = await window.api.getSubtasks(id)
      this.assignedPersons = await window.api.getTodoPersons(id)
      this.newSubtaskTitle = ''
      this.showLinkSearch = false
      this.showPersonPicker = false
      this.linkQuery = ''
      this.linkResults = []
      this.activeTab = 'edit'
    },
    async closeDetail() {
      // Flush any pending saves before closing
      if (this.saveTimeout && this.selectedTodo) {
        clearTimeout(this.saveTimeout)
        const todoData = this.toPlainTodo(this.selectedTodo)
        await window.api.updateTodo(todoData)
      }

      this.selectedTodo = null
      this.linkedTodos = []
      this.subtasks = []
      this.assignedPersons = []
      this.newSubtaskTitle = ''
      this.showPersonPicker = false
    },
    async detachDetail() {
      const todoId = this.selectedTodo.id
      await window.api.openDetail(todoId)
      this.selectedTodo = null
      this.linkedTodos = []
    },
    async saveSelectedTodo() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }

      this.saveTimeout = setTimeout(async () => {
        const todoData = this.toPlainTodo(this.selectedTodo)
        const updated = await window.api.updateTodo(todoData)
        this.selectedTodo = updated
        await this.loadAllTodos()
        await this.loadTodos()
      }, 300)
    },
    toPlainTodo(todo) {
      return {
        id: todo.id,
        title: todo.title,
        notes: todo.notes,
        end_date: todo.end_date,
        start_date: todo.start_date,
        completed: todo.completed,
        importance: todo.importance,
        project_id: todo.project_id,
        category_id: todo.category_id,
        status_id: todo.status_id,
        sort_order: todo.sort_order
      }
    },
    async saveProjectChange() {
      // Save immediately for project changes
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async saveCategoryChange() {
      // Save immediately for category changes
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateEndDate(event) {
      const value = event.target.value
      this.selectedTodo.end_date = value || null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async clearEndDate() {
      this.selectedTodo.end_date = null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateStartDate(event) {
      const value = event.target.value
      this.selectedTodo.start_date = value || null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async clearStartDate() {
      this.selectedTodo.start_date = null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async searchForLinks() {
      if (!this.linkQuery.trim()) {
        this.linkResults = []
        return
      }
      this.linkResults = await window.api.searchTodos(this.linkQuery, this.selectedTodo.id)
      const linkedIds = this.linkedTodos.map(t => t.id)
      this.linkResults = this.linkResults.filter(r => !linkedIds.includes(r.id))
    },
    async linkTo(target) {
      await window.api.linkTodos(this.selectedTodo.id, target.id)
      this.linkedTodos = await window.api.getLinkedTodos(this.selectedTodo.id)
      this.linkQuery = ''
      this.linkResults = []
      this.showLinkSearch = false
    },
    async unlinkFrom(linked) {
      await window.api.unlinkTodos(this.selectedTodo.id, linked.id)
      this.linkedTodos = await window.api.getLinkedTodos(this.selectedTodo.id)
    },
    async assignPerson(person) {
      if (!this.selectedTodo) return
      // Check if already assigned
      if (this.assignedPersons.some(p => p.id === person.id)) {
        this.showPersonPicker = false
        return
      }
      await window.api.linkTodoPerson(this.selectedTodo.id, person.id)
      this.assignedPersons = await window.api.getTodoPersons(this.selectedTodo.id)
      this.showPersonPicker = false
      // Update graph data if persons are shown in graph
      if (this.showPersonsInGraph) {
        await this.updateGraphData()
      }
    },
    async unassignPerson(person) {
      if (!this.selectedTodo) return
      await window.api.unlinkTodoPerson(this.selectedTodo.id, person.id)
      this.assignedPersons = await window.api.getTodoPersons(this.selectedTodo.id)
      // Update graph data if persons are shown in graph
      if (this.showPersonsInGraph) {
        await this.updateGraphData()
      }
    },
    async loadSubtasks() {
      if (this.selectedTodo) {
        this.subtasks = await window.api.getSubtasks(this.selectedTodo.id)
      } else {
        this.subtasks = []
      }
    },
    async addSubtask() {
      if (!this.newSubtaskTitle.trim() || !this.selectedTodo) return
      await window.api.createSubtask(this.selectedTodo.id, this.newSubtaskTitle.trim())
      this.newSubtaskTitle = ''
      await this.loadSubtasks()
    },
    async toggleSubtask(subtask) {
      await window.api.updateSubtask({
        id: subtask.id,
        title: subtask.title,
        completed: !subtask.completed
      })
      await this.loadSubtasks()
    },
    async deleteSubtask(id) {
      await window.api.deleteSubtask(id)
      await this.loadSubtasks()
    },
    async saveRecurrence() {
      if (!this.selectedTodo) return
      if (!this.selectedTodo.recurrence_interval) {
        this.selectedTodo.recurrence_interval = 1
      }
      await this.saveSelectedTodo()
    },
    updateRecurrenceEndDate(event) {
      if (!this.selectedTodo) return
      this.selectedTodo.recurrence_end_date = event.target.value || null
      this.saveSelectedTodo()
    },
    clearRecurrenceEndDate() {
      if (!this.selectedTodo) return
      this.selectedTodo.recurrence_end_date = null
      this.saveSelectedTodo()
    },
    formatDeadline(deadline) {
      if (!deadline) return ''
      const date = new Date(deadline)
      return date.toISOString().split('T')[0]
    },
    formatShortDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toISOString().split('T')[0]
    },
    isOverdue(deadline) {
      if (!deadline) return false
      return new Date(deadline) < new Date()
    },
    showAddProject() {
      this.showProjectInput = true
      this.$nextTick(() => {
        this.$refs.projectInput?.focus()
      })
    },
    async addProject() {
      if (!this.newProjectName.trim()) {
        this.cancelAddProject()
        return
      }
      const randomColor = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProject(this.newProjectName.trim(), randomColor)
      this.newProjectName = ''
      this.showProjectInput = false
      await this.loadProjects()
    },
    cancelAddProject() {
      this.newProjectName = ''
      this.showProjectInput = false
    },
    async editProject(project) {
      this.editingProject = { ...project }
      this.showProjectPersonPicker = false
      if (project.id) {
        await this.loadProjectPersons(project.id)
      }
    },
    cancelEditProject() {
      this.editingProject = null
      this.showProjectPersonPicker = false
    },
    async saveProject() {
      try {
        if (!this.editingProject) return
        // Convert reactive proxy to plain object for IPC
        const projectData = {
          id: this.editingProject.id,
          name: this.editingProject.name,
          color: this.editingProject.color
        }
        await window.api.updateProject(projectData)
        await this.loadProjects()
        await this.loadAllTodos()
        await this.loadTodos()
        this.editingProject = null
      } catch (error) {
        console.error('Error saving project:', error)
      }
    },
    async deleteProjectConfirm() {
      if (confirm(`Delete project "${this.editingProject.name}"? Todos will be moved to Inbox.`)) {
        await window.api.deleteProject(this.editingProject.id)
        if (this.currentFilter === this.editingProject.id) {
          this.currentFilter = null
        }
        this.editingProject = null
        await this.loadProjects()
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    // Category methods
    showAddCategory() {
      this.showCategoryInput = true
      this.$nextTick(() => {
        this.$refs.categoryInput?.focus()
      })
    },
    async addCategory() {
      if (!this.newCategoryName.trim()) {
        this.cancelAddCategory()
        return
      }
      const randomSymbol = this.categorySymbols[Math.floor(Math.random() * this.categorySymbols.length)]
      await window.api.createCategory(this.newCategoryName.trim(), randomSymbol)
      this.newCategoryName = ''
      this.showCategoryInput = false
      await this.loadCategories()
    },
    cancelAddCategory() {
      this.newCategoryName = ''
      this.showCategoryInput = false
    },
    editCategory(category) {
      this.editingCategory = { ...category }
    },
    cancelEditCategory() {
      this.editingCategory = null
    },
    async saveCategory() {
      try {
        if (!this.editingCategory) return
        // Convert reactive proxy to plain object for IPC
        const categoryData = {
          id: this.editingCategory.id,
          name: this.editingCategory.name,
          symbol: this.editingCategory.symbol
        }
        await window.api.updateCategory(categoryData)
        await this.loadCategories()
        await this.loadAllTodos()
        await this.loadTodos()
        this.editingCategory = null
      } catch (error) {
        console.error('Error saving category:', error)
      }
    },
    async deleteCategoryConfirm() {
      if (confirm(`Delete category "${this.editingCategory.name}"?`)) {
        await window.api.deleteCategory(this.editingCategory.id)
        this.editingCategory = null
        await this.loadCategories()
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    // Status methods
    showAddStatus() {
      this.showStatusInput = true
      this.$nextTick(() => {
        this.$refs.statusInput?.focus()
      })
    },
    async addStatus() {
      if (!this.newStatusName.trim()) {
        this.cancelAddStatus()
        return
      }
      const randomColor = this.statusColors[Math.floor(Math.random() * this.statusColors.length)]
      await window.api.createStatus(this.newStatusName.trim(), randomColor)
      this.newStatusName = ''
      this.showStatusInput = false
      await this.loadStatuses()
    },
    cancelAddStatus() {
      this.newStatusName = ''
      this.showStatusInput = false
    },
    editStatus(status) {
      this.editingStatus = { ...status }
    },
    cancelEditStatus() {
      this.editingStatus = null
    },
    async saveStatus() {
      try {
        if (!this.editingStatus) return
        const statusData = {
          id: this.editingStatus.id,
          name: this.editingStatus.name,
          color: this.editingStatus.color
        }
        await window.api.updateStatus(statusData)
        await this.loadStatuses()
        await this.loadAllTodos()
        await this.loadTodos()
        this.editingStatus = null
      } catch (error) {
        console.error('Error saving status:', error)
      }
    },
    async deleteStatusConfirm() {
      if (confirm(`Delete status "${this.editingStatus.name}"?`)) {
        await window.api.deleteStatus(this.editingStatus.id)
        this.editingStatus = null
        await this.loadStatuses()
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async saveStatusChange() {
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    // Importance method
    async setImportance(level) {
      // Toggle off if clicking the same level
      if (this.selectedTodo.importance == level) {
        this.selectedTodo.importance = 0
      } else {
        this.selectedTodo.importance = level
      }
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    formatCreatedDate(createdAt) {
      if (!createdAt) return ''
      const date = new Date(createdAt)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    // Timeline methods
    formatTimelineDate(date) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    },
    getWeekdayName(date) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    },
    isToday(date) {
      const today = new Date()
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear()
    },
    isWeekend(date) {
      const day = date.getDay()
      return day === 0 || day === 6
    },
    shouldShowDateLabel(index) {
      // Always show first date
      if (index === 0) return true
      // Show based on interval determined by zoom level
      const interval = this.dateLabelInterval
      // For weekly interval, show Mondays
      if (interval === 7) {
        const date = this.timelineDates[index]
        return date.getDay() === 1 // Monday
      }
      // For bi-weekly, show every other Monday
      if (interval === 14) {
        const date = this.timelineDates[index]
        if (date.getDay() !== 1) return false
        // Count Mondays from start
        const mondayCount = this.timelineDates.slice(0, index).filter(d => d.getDay() === 1).length
        return mondayCount % 2 === 0
      }
      return index % interval === 0
    },
    getTimelinePosition(dateStr) {
      const date = new Date(dateStr)
      const start = this.timelineRange.start
      const diffDays = (date - start) / (1000 * 60 * 60 * 24)
      return diffDays * this.timelineScale
    },
    getGanttBarStyle(todo, row) {
      const startDate = todo.start_date ? new Date(todo.start_date) : new Date(todo.end_date)
      const endDate = todo.end_date ? new Date(todo.end_date) : startDate
      const startPos = this.getTimelinePosition(startDate)
      const endPos = this.getTimelinePosition(endDate)
      const width = Math.max(endPos - startPos, 20)
      const lane = row?.todoLanes?.[todo.id] || 0
      const barHeight = 26
      const barGap = 4
      return {
        left: startPos + 'px',
        width: width + 'px',
        background: todo.project_color || '#0f4c75',
        top: (6 + lane * (barHeight + barGap)) + 'px',
        height: barHeight + 'px'
      }
    },
    getRowHeight(row) {
      const lanes = row.laneCount || 1
      const barHeight = 26
      const barGap = 4
      return Math.max(50, 12 + lanes * (barHeight + barGap))
    },
    getImportanceColor(level) {
      const colors = { 5: '#e74c3c', 4: '#e67e22', 3: '#f1c40f', 2: '#3498db', 1: '#95a5a6' }
      return colors[level] || '#666'
    },
    // Individual card sizing methods
    getCardStyle(todoId, projectColor) {
      const size = this.cardSizes[todoId]
      const style = { borderTopColor: projectColor || '#0f4c75' }
      if (size && size.height) {
        // Only apply saved height when user has manually resized
        style.height = size.height + 'px'
      }
      // Otherwise let the card size naturally based on content (no min-height)
      return style
    },
    onCardResize(event, todoId) {
      const card = event.currentTarget
      if (!card) return

      // Use requestAnimationFrame to ensure browser has updated the height after resize
      requestAnimationFrame(() => {
        const height = card.offsetHeight
        // Only save if height differs from default min-height
        const defaultMinHeight = Math.round(this.cardSize * 0.6)
        if (height > defaultMinHeight + 10) {
          this.cardSizes[todoId] = { height }
          this.saveCardSizes()
        }
      })
    },
    saveCardSizes() {
      localStorage.setItem('card-sizes-v2', JSON.stringify(this.cardSizes))
    },
    resetCardSize(todoId, event) {
      event.stopPropagation()
      delete this.cardSizes[todoId]
      this.saveCardSizes()
    },
    // Bar drag methods for timeline
    startBarDrag(e, todo, mode = 'move') {
      this.draggingBarId = todo.id
      this.draggingBarTodo = todo
      this.barDragStartX = e.clientX
      this.barDragMode = mode // 'move', 'resize-start', or 'resize-end'
      this.barDragOriginalDates = {
        start_date: todo.start_date,
        end_date: todo.end_date
      }
      document.addEventListener('mousemove', this.onBarDrag)
      document.addEventListener('mouseup', this.stopBarDrag)
      e.preventDefault()
    },
    onBarDrag(e) {
      if (!this.draggingBarTodo) return
      const deltaX = e.clientX - this.barDragStartX
      const deltaDays = Math.round(deltaX / this.timelineScale)
      if (deltaDays === 0) return

      const todo = this.draggingBarTodo
      const mode = this.barDragMode

      if (mode === 'move') {
        // Move both dates together (original behavior)
        if (this.barDragOriginalDates.start_date) {
          const newStart = new Date(this.barDragOriginalDates.start_date)
          newStart.setDate(newStart.getDate() + deltaDays)
          todo.start_date = newStart.toISOString().split('T')[0]
        }
        if (this.barDragOriginalDates.end_date) {
          const newEnd = new Date(this.barDragOriginalDates.end_date)
          newEnd.setDate(newEnd.getDate() + deltaDays)
          todo.end_date = newEnd.toISOString().split('T')[0]
        }
      } else if (mode === 'resize-start') {
        // Only change start date
        if (this.barDragOriginalDates.start_date) {
          const newStart = new Date(this.barDragOriginalDates.start_date)
          newStart.setDate(newStart.getDate() + deltaDays)
          // Ensure start doesn't go past end
          const endDate = this.barDragOriginalDates.end_date ? new Date(this.barDragOriginalDates.end_date) : null
          if (!endDate || newStart <= endDate) {
            todo.start_date = newStart.toISOString().split('T')[0]
          }
        }
      } else if (mode === 'resize-end') {
        // Only change end date
        if (this.barDragOriginalDates.end_date) {
          const newEnd = new Date(this.barDragOriginalDates.end_date)
          newEnd.setDate(newEnd.getDate() + deltaDays)
          // Ensure end doesn't go before start
          const startDate = this.barDragOriginalDates.start_date ? new Date(this.barDragOriginalDates.start_date) : null
          if (!startDate || newEnd >= startDate) {
            todo.end_date = newEnd.toISOString().split('T')[0]
          }
        }
      }
    },
    async stopBarDrag() {
      document.removeEventListener('mousemove', this.onBarDrag)
      document.removeEventListener('mouseup', this.stopBarDrag)

      if (this.draggingBarTodo) {
        // Save the updated dates
        await window.api.updateTodo(this.draggingBarTodo)
        await this.loadTodos()
      }

      this.draggingBarId = null
      this.draggingBarTodo = null
      this.barDragMode = 'move'
      this.barDragOriginalDates = null
    },
    // Filter methods
    toggleProjectFilter(projectId) {
      if (this.filterProjectId === projectId) {
        this.filterProjectId = null
      } else {
        this.filterProjectId = projectId
      }
    },
    toggleCategoryFilter(categoryId) {
      if (this.filterCategoryId === categoryId) {
        this.filterCategoryId = null
      } else {
        this.filterCategoryId = categoryId
      }
    },
    // Graph methods
    async loadAllLinks() {
      const links = []
      const seen = new Set()
      for (const todo of this.allTodos) {
        const linked = await window.api.getLinkedTodos(todo.id)
        for (const l of linked) {
          const key = [Math.min(todo.id, l.id), Math.max(todo.id, l.id)].join('-')
          if (!seen.has(key)) {
            seen.add(key)
            links.push({ source: todo.id, target: l.id })
          }
        }
      }
      this.allLinks = links
    },
    getNodeX(todoId) {
      if (this.nodePositions[todoId]) {
        return this.nodePositions[todoId].x
      }
      // Calculate position without modifying state
      return this.calculateNodePosition(todoId).x
    },
    getNodeY(todoId) {
      if (this.nodePositions[todoId]) {
        return this.nodePositions[todoId].y
      }
      // Calculate position without modifying state
      return this.calculateNodePosition(todoId).y
    },
    calculateNodePosition(todoId) {
      const nodes = this.graphNodes
      const index = nodes.findIndex(t => t.id === todoId)
      const centerX = this.graphWidth / 2 || 400
      const centerY = this.graphHeight / 2 || 300
      const radius = Math.min(this.graphWidth || 800, this.graphHeight || 600) / 3
      const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1)
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      }
    },
    async onGraphNodeClick(todo) {
      if (this.graphLinkMode) {
        if (this.graphLinkSource) {
          if (this.graphLinkSource.id !== todo.id) {
            // Create link between source and target
            await window.api.linkTodos(this.graphLinkSource.id, todo.id)
            await this.loadAllLinks()
          }
          this.graphLinkSource = null
          this.graphLinkMode = false
        } else {
          this.graphLinkSource = todo
        }
      } else {
        this.selectTodo(todo.id)
      }
    },
    toggleGraphLinkMode() {
      this.graphLinkMode = !this.graphLinkMode
      if (!this.graphLinkMode) {
        this.graphLinkSource = null
      }
    },
    updateGraphSize() {
      const container = this.$refs.graphContainer
      if (container) {
        this.graphWidth = container.clientWidth || 800
        this.graphHeight = container.clientHeight || 600
      }
    },
    screenToSvgCoords(event) {
      const svg = this.$refs.graphContainer.querySelector('svg')
      const svgRect = svg.getBoundingClientRect()
      // Calculate scale factor between SVG viewBox and rendered size
      const scaleX = this.graphWidth / svgRect.width
      const scaleY = this.graphHeight / svgRect.height
      // Convert screen coords to viewBox coords
      const viewBoxX = (event.clientX - svgRect.left) * scaleX
      const viewBoxY = (event.clientY - svgRect.top) * scaleY
      // Then apply inverse of pan and zoom transforms
      const x = (viewBoxX - this.graphPan.x) / this.graphZoom
      const y = (viewBoxY - this.graphPan.y) / this.graphZoom
      return { x, y }
    },
    onNodeMouseDown(event, todo) {
      if (this.graphLinkMode) {
        // In link mode, handle as click
        this.onGraphNodeClick(todo)
        return
      }
      this.draggingNode = todo
      // Initialize position if not set
      if (!this.nodePositions[todo.id]) {
        this.nodePositions[todo.id] = { x: this.getNodeX(todo.id), y: this.getNodeY(todo.id) }
      }
      // Store offset from node center to mouse position for smooth dragging
      const coords = this.screenToSvgCoords(event)
      const nodePos = this.nodePositions[todo.id]
      this.dragOffset = { x: nodePos.x - coords.x, y: nodePos.y - coords.y }
      this.lastMousePos = { x: event.clientX, y: event.clientY }
    },
    onGraphMouseDown(event) {
      if (this.draggingNode) return
      // Start panning
      this.isPanning = true
      this.lastMousePos = { x: event.clientX, y: event.clientY }
    },
    onGraphMouseMove(event) {
      // Update mouse position for tooltip
      this.mousePos = { x: event.clientX, y: event.clientY }

      if (this.draggingNode) {
        const coords = this.screenToSvgCoords(event)
        // Apply stored offset to keep node under cursor
        const x = coords.x + (this.dragOffset?.x || 0)
        const y = coords.y + (this.dragOffset?.y || 0)
        this.nodePositions[this.draggingNode.id] = { x, y }
        // Force reactivity
        this.nodePositions = { ...this.nodePositions }
      } else if (this.isPanning) {
        const svg = this.$refs.graphContainer.querySelector('svg')
        const svgRect = svg.getBoundingClientRect()
        // Scale pan movement by viewBox ratio
        const scaleX = this.graphWidth / svgRect.width
        const scaleY = this.graphHeight / svgRect.height
        const dx = (event.clientX - this.lastMousePos.x) * scaleX
        const dy = (event.clientY - this.lastMousePos.y) * scaleY
        this.graphPan.x += dx
        this.graphPan.y += dy
        this.lastMousePos = { x: event.clientX, y: event.clientY }
      }
    },
    onGraphMouseUp(event) {
      if (this.draggingNode) {
        // Check if it was just a click (minimal movement)
        const dx = Math.abs(event.clientX - this.lastMousePos.x)
        const dy = Math.abs(event.clientY - this.lastMousePos.y)
        if (dx < 5 && dy < 5) {
          // Treat as click
          this.selectTodo(this.draggingNode.id)
        }
      }
      this.draggingNode = null
      this.isPanning = false
    },
    onGraphWheel(event) {
      const delta = event.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.3, Math.min(3, this.graphZoom + delta))

      // Zoom towards mouse position in viewBox coordinates
      const svg = this.$refs.graphContainer.querySelector('svg')
      const svgRect = svg.getBoundingClientRect()
      // Convert screen coords to viewBox coords
      const scaleX = this.graphWidth / svgRect.width
      const scaleY = this.graphHeight / svgRect.height
      const mouseX = (event.clientX - svgRect.left) * scaleX
      const mouseY = (event.clientY - svgRect.top) * scaleY

      const zoomRatio = newZoom / this.graphZoom
      this.graphPan.x = mouseX - (mouseX - this.graphPan.x) * zoomRatio
      this.graphPan.y = mouseY - (mouseY - this.graphPan.y) * zoomRatio

      this.graphZoom = newZoom
    },
    onTimelineWheel(event) {
      if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd + scroll = zoom
        const delta = event.deltaY > 0 ? -10 : 10
        this.timelineScale = Math.max(10, Math.min(500, this.timelineScale + delta))
      } else if (event.shiftKey) {
        // Shift + scroll = horizontal scroll
        this.timelineOffset += event.deltaY
      } else {
        // Regular scroll = horizontal scroll
        this.timelineOffset += event.deltaX || event.deltaY
      }
    },
    resetGraphView() {
      this.graphZoom = 1
      this.graphPan = { x: 0, y: 0 }
      this.nodePositions = {}
    },
    async onLinkRightClick(link) {
      if (confirm('Remove this link?')) {
        await window.api.unlinkTodos(link.source, link.target)
        await this.loadAllLinks()
      }
    },
    initializeNodePositions() {
      // Initialize positions for all nodes
      const newPositions = { ...this.nodePositions }
      this.graphNodes.forEach(node => {
        if (!newPositions[node.id]) {
          newPositions[node.id] = this.calculateNodePosition(node.id)
        }
      })
      this.nodePositions = newPositions
    },
    runForceLayout() {
      if (this.isSimulating) {
        this.stopForceLayout()
        return
      }

      this.isSimulating = true
      this.initializeNodePositions()

      // Create d3-force simulation
      const nodes = this.graphNodes.map(n => ({
        id: n.id,
        x: this.nodePositions[n.id]?.x || this.graphWidth / 2,
        y: this.nodePositions[n.id]?.y || this.graphHeight / 2
      }))

      const links = this.graphLinks.map(l => ({
        source: l.source,
        target: l.target
      }))

      this.d3Simulation = d3Force.forceSimulation(nodes)
        .force('link', d3Force.forceLink(links)
          .id(d => d.id)
          .distance(this.graphEdgeLength))
        .force('charge', d3Force.forceManyBody()
          .strength(this.graphRepulsion))
        .force('center', d3Force.forceCenter(this.graphWidth / 2, this.graphHeight / 2))
        .force('collision', d3Force.forceCollide().radius(40))
        .on('tick', () => {
          const newPositions = {}
          nodes.forEach(node => {
            newPositions[node.id] = { x: node.x, y: node.y }
          })
          this.nodePositions = newPositions
        })
        .on('end', () => {
          this.isSimulating = false
        })
    },
    stopForceLayout() {
      this.isSimulating = false
      if (this.d3Simulation) {
        this.d3Simulation.stop()
        this.d3Simulation = null
      }
    },
    saveGraphSettings() {
      localStorage.setItem('graph-repulsion', this.graphRepulsion)
      localStorage.setItem('graph-edge-length', this.graphEdgeLength)
    },
    onGraphSettingChange() {
      this.saveGraphSettings()
      // Update running simulation with new parameters
      if (this.d3Simulation) {
        this.d3Simulation
          .force('charge', d3Force.forceManyBody().strength(this.graphRepulsion))
          .force('link', d3Force.forceLink(this.d3Simulation.force('link').links())
            .id(d => d.id)
            .distance(this.graphEdgeLength))
        this.d3Simulation.alpha(0.3).restart()
      } else if (this.currentView === 'graph' && this.graphNodes.length > 0) {
        this.runForceLayout()
      }
    },
    resetGraphSettings() {
      this.graphRepulsion = -400
      this.graphEdgeLength = 100
      this.onGraphSettingChange()
    },
    // Keyboard shortcuts
    handleKeyDown(e) {
      // Ignore if typing in input/textarea
      const target = e.target
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Command palette: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        this.openCommandPalette()
        return
      }

      // Escape closes command palette or clears selection
      if (e.key === 'Escape') {
        if (this.showCommandPalette) {
          this.closeCommandPalette()
        } else if (this.selectedTodo) {
          this.selectedTodo = null
          this.focusedTodoIndex = -1
        }
        return
      }

      // If command palette is open, handle its navigation
      if (this.showCommandPalette) {
        this.handleCommandPaletteKey(e)
        return
      }

      // Don't process navigation shortcuts when in input field
      if (isInputField) return

      // Global shortcuts that work in any view
      switch (e.key) {
        case 'n': // New todo
          e.preventDefault()
          this.$refs.newTodoInput?.focus()
          return
        case '/': // Open search
          e.preventDefault()
          this.openCommandPalette()
          return
      }

      // Navigation shortcuts only work in list/table/cards view with todos
      const todoCount = this.todos.length
      if (todoCount === 0) return

      switch (e.key) {
        case 'j': // Move down
        case 'ArrowDown':
          e.preventDefault()
          this.focusedTodoIndex = Math.min(this.focusedTodoIndex + 1, todoCount - 1)
          if (this.focusedTodoIndex >= 0 && this.todos[this.focusedTodoIndex]) {
            this.selectTodo(this.todos[this.focusedTodoIndex].id)
          }
          break
        case 'k': // Move up
        case 'ArrowUp':
          e.preventDefault()
          if (this.focusedTodoIndex < 0) this.focusedTodoIndex = 0
          else this.focusedTodoIndex = Math.max(this.focusedTodoIndex - 1, 0)
          if (this.todos[this.focusedTodoIndex]) {
            this.selectTodo(this.todos[this.focusedTodoIndex].id)
          }
          break
        case 'x': // Toggle complete
        case ' ': // Space also toggles
          e.preventDefault()
          if (this.focusedTodoIndex >= 0 && this.todos[this.focusedTodoIndex]) {
            this.toggleComplete(this.todos[this.focusedTodoIndex])
          }
          break
        case 'e': // Edit (open detail)
        case 'Enter':
          e.preventDefault()
          if (this.focusedTodoIndex >= 0 && this.todos[this.focusedTodoIndex]) {
            this.selectTodo(this.todos[this.focusedTodoIndex].id)
          }
          break
        case 'Delete':
          e.preventDefault()
          if (this.focusedTodoIndex >= 0 && this.todos[this.focusedTodoIndex]) {
            this.deleteTodo(this.todos[this.focusedTodoIndex].id)
            // Adjust focus after deletion
            if (this.focusedTodoIndex >= this.todos.length) {
              this.focusedTodoIndex = this.todos.length - 1
            }
          }
          break
      }
    },
    openCommandPalette() {
      this.showCommandPalette = true
      this.searchQuery = ''
      this.searchResults = []
      this.$nextTick(() => {
        this.$refs.searchInput?.focus()
      })
    },
    closeCommandPalette() {
      this.showCommandPalette = false
      this.searchQuery = ''
      this.searchResults = []
    },
    handleCommandPaletteKey(e) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          // Move selection down in results
          break
        case 'ArrowUp':
          e.preventDefault()
          // Move selection up in results
          break
        case 'Enter':
          e.preventDefault()
          if (this.searchResults.length > 0) {
            this.selectSearchResult(this.searchResults[0])
          }
          break
      }
    },
    onSearchInput() {
      const query = this.searchQuery.toLowerCase().trim()
      if (!query) {
        this.searchResults = []
        return
      }

      // Search across all todos
      const todoResults = this.allTodos.filter(todo => {
        const titleMatch = todo.title.toLowerCase().includes(query)
        const notesMatch = todo.notes?.toLowerCase().includes(query)
        const projectMatch = todo.project_name?.toLowerCase().includes(query)
        return titleMatch || notesMatch || projectMatch
      }).slice(0, 8).map(t => ({ ...t, type: 'todo' }))

      // Search across all persons
      const personResults = this.persons.filter(person => {
        const nameMatch = person.name.toLowerCase().includes(query)
        const emailMatch = person.email?.toLowerCase().includes(query)
        const companyMatch = person.company?.toLowerCase().includes(query)
        return nameMatch || emailMatch || companyMatch
      }).slice(0, 5).map(p => ({ ...p, type: 'person' }))

      this.searchResults = [...todoResults, ...personResults]
    },
    selectSearchResult(result) {
      if (result.type === 'person') {
        // Open settings window for persons
        this.closeCommandPalette()
        window.api.openSettings()
      } else {
        // Navigate to the todo's project and select it
        if (result.project_id) {
          this.setFilter(result.project_id)
        } else {
          this.setFilter('inbox')
        }
        this.closeCommandPalette()
        // Wait for todos to load then select
        this.$nextTick(() => {
          const index = this.todos.findIndex(t => t.id === result.id)
          if (index >= 0) {
            this.focusedTodoIndex = index
            this.selectTodo(result.id)
          } else {
            // Todo might not be in filtered view, select it anyway
            this.selectTodo(result.id)
          }
        })
      }
    },
    // Resize methods
    checkLayout() {
      if (this.detailLayoutPreference === 'auto') {
        // Improved auto layout: consider aspect ratio and available content width
        const width = window.innerWidth
        const height = window.innerHeight
        const aspectRatio = width / height
        const sidebarWidth = this.sidebarVisible ? 240 : 0
        const availableWidth = width - sidebarWidth

        // Switch to vertical if:
        // - Window is narrow (< 1000px available content area)
        // - Or aspect ratio is portrait-ish (< 1.2) and window isn't super wide
        const isNarrow = availableWidth < 1000
        const isPortraitish = aspectRatio < 1.2 && width < 1400

        this.isVerticalLayout = isNarrow || isPortraitish
      } else {
        this.isVerticalLayout = this.detailLayoutPreference === 'vertical'
      }
    },
    toggleDetailLayout() {
      // Cycle through: auto -> horizontal -> vertical -> auto
      if (this.detailLayoutPreference === 'auto') {
        this.detailLayoutPreference = 'horizontal'
      } else if (this.detailLayoutPreference === 'horizontal') {
        this.detailLayoutPreference = 'vertical'
      } else {
        this.detailLayoutPreference = 'auto'
      }
      localStorage.setItem('detail-layout', this.detailLayoutPreference)
      this.checkLayout()
    },
    startResize(e) {
      this.isResizing = true
      document.addEventListener('mousemove', this.onResize)
      document.addEventListener('mouseup', this.stopResize)
      e.preventDefault()
    },
    onResize(e) {
      if (!this.isResizing) return

      if (this.isVerticalLayout) {
        // Vertical resize (top/bottom split)
        const container = this.$refs.detailPanel?.parentElement
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const percentage = ((containerRect.bottom - e.clientY) / containerRect.height) * 100
          this.detailHeight = Math.min(Math.max(percentage, 20), 70)
        }
      } else {
        // Horizontal resize (left/right split)
        const newWidth = window.innerWidth - e.clientX
        this.detailWidth = Math.min(Math.max(newWidth, 300), 1200)
      }
    },
    stopResize() {
      this.isResizing = false
      document.removeEventListener('mousemove', this.onResize)
      document.removeEventListener('mouseup', this.stopResize)
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('todo-theme', this.theme)
      reinitializeMermaid(this.theme)
      // Clear processed mermaid diagrams to force re-render
      document.querySelectorAll('.mermaid[data-processed]').forEach(el => {
        el.removeAttribute('data-processed')
      })
      this.renderMermaid()
    },
    toggleCategoriesCollapsed() {
      this.categoriesCollapsed = !this.categoriesCollapsed
      localStorage.setItem('categories-collapsed', this.categoriesCollapsed)
    },
    toggleStatusesCollapsed() {
      this.statusesCollapsed = !this.statusesCollapsed
      localStorage.setItem('statuses-collapsed', this.statusesCollapsed)
    },
    togglePersonsCollapsed() {
      this.personsCollapsed = !this.personsCollapsed
      localStorage.setItem('persons-collapsed', this.personsCollapsed)
    },
    toggleSettingsCollapsed() {
      this.settingsCollapsed = !this.settingsCollapsed
      localStorage.setItem('settings-collapsed', this.settingsCollapsed)
    },
    saveOpenModePreference() {
      const mode = this.openTodosInWindow ? 'window' : 'sidebar'
      localStorage.setItem('todo-open-mode', mode)
    },
    openSettings() {
      window.api.openSettings()
    },
    async loadPersons() {
      this.persons = await window.api.getPersons()
    },
    async updateGraphData() {
      // Save preference
      localStorage.setItem('show-persons-in-graph', this.showPersonsInGraph)

      // Load person assignments for all todos if enabled
      if (this.showPersonsInGraph) {
        this.todoPersons = {}
        for (const todo of this.filteredTodos) {
          const persons = await window.api.getTodoPersons(todo.id)
          if (persons && persons.length > 0) {
            this.$set(this.todoPersons, todo.id, persons)
          }
        }
      } else {
        this.todoPersons = {}
      }
    },
    async loadProjectPersons(projectId) {
      const persons = await window.api.getProjectPersons(projectId)
      this.$set(this.projectPersons, projectId, persons)
    },
    async assignProjectPerson(person) {
      if (!this.editingProject || !this.editingProject.id) return
      // Check if already assigned
      if (this.currentProjectPersons.some(p => p.id === person.id)) return

      await window.api.linkProjectPerson(this.editingProject.id, person.id)
      await this.loadProjectPersons(this.editingProject.id)
      this.showProjectPersonPicker = false
    },
    async unassignProjectPerson(person) {
      if (!this.editingProject || !this.editingProject.id) return

      await window.api.unlinkProjectPerson(this.editingProject.id, person.id)
      await this.loadProjectPersons(this.editingProject.id)
    },
    openStakeholderRegister() {
      if (this.editingProject && this.editingProject.id) {
        window.api.openStakeholderRegister(this.editingProject.id)
      }
    },
    async handleExport() {
      try {
        const result = await window.api.exportData()
        if (result.success) {
          alert('Backup exported successfully!')
        }
      } catch (error) {
        alert('Failed to export backup: ' + error.message)
      }
    },
    async handleImport(mode) {
      try {
        this.showImportDialog = false
        const result = await window.api.importData(mode)
        if (result.success) {
          alert('Backup imported successfully! Reloading data...')
          await this.loadData()
        } else if (result.error) {
          alert('Failed to import backup: ' + result.error)
        }
      } catch (error) {
        alert('Failed to import backup: ' + error.message)
      }
    },
    handleMarkdownClick(event) {
      console.log('Click event:', event.target)
      // Check if clicked element is a link or inside a link
      const link = event.target.tagName === 'A' ? event.target : event.target.closest('a')
      console.log('Found link:', link)
      if (link && link.href) {
        console.log('Opening link:', link.href)
        event.preventDefault()
        event.stopPropagation()
        window.api.openExternal(link.href)
      }
    },
    async renderMermaid() {
      await this.$nextTick()
      try {
        await mermaid.run({
          querySelector: '.notes-preview pre.mermaid:not([data-processed])'
        })
        document.querySelectorAll('.notes-preview pre.mermaid').forEach(el => {
          el.setAttribute('data-processed', 'true')
        })
      } catch (e) {
        console.error('Mermaid render error:', e)
      }
    }
  },
  watch: {
    showLinkSearch(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.linkInput?.focus()
        })
      }
    },
    currentView(val, oldVal) {
      if (val === 'graph') {
        this.$nextTick(() => {
          this.updateGraphSize()
          this.initializeNodePositions()
        })
      } else if (oldVal === 'graph') {
        this.stopForceLayout()
      }
      localStorage.setItem('current-view', val)
    },
    sidebarVisible(val) {
      localStorage.setItem('sidebar-visible', val)
    },
    cardSize(val) {
      localStorage.setItem('card-size', val)
    },
    groupByProject(val) {
      localStorage.setItem('group-by-project', val)
    },
    sortBy(val) {
      localStorage.setItem('sort-by', val)
    },
    activeTab(val) {
      if (val === 'preview' || val === 'split') {
        this.renderMermaid()
      }
    },
    renderedNotes() {
      if (this.activeTab === 'preview' || this.activeTab === 'split') {
        this.renderMermaid()
      }
    }
  }
}
</script>
