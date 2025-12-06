<template>
  <div class="app">
    <aside class="sidebar">
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

        <div class="nav-divider"></div>

        <div
          v-for="project in projects"
          :key="project.id"
          class="nav-item project-item"
          :class="{ active: currentFilter === project.id }"
          @click="setFilter(project.id)"
        >
          <span class="project-dot" :style="{ background: project.color }"></span>
          <span class="project-name">{{ project.name }}</span>
          <span class="count">{{ getProjectCount(project.id) }}</span>
          <button class="edit-btn" @click.stop="editProject(project)">...</button>
        </div>
      </nav>

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

      <div class="sidebar-header category-header">
        <h2>Categories</h2>
      </div>

      <nav class="category-nav">
        <div
          v-for="category in categories"
          :key="category.id"
          class="nav-item category-item"
          @click="editCategory(category)"
        >
          <span class="category-dot" :style="{ background: category.color }"></span>
          <span class="category-name">{{ category.name }}</span>
          <span class="count">{{ getCategoryCount(category.id) }}</span>
        </div>
      </nav>

      <div class="add-category">
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

      <div v-if="editingCategory" class="project-modal" @click.self="cancelEditCategory">
        <div class="modal-content" @click.stop>
          <h3>Edit Category</h3>
          <input v-model="editingCategory.name" placeholder="Category name" />
          <div class="color-picker">
            <div
              v-for="color in categoryColors"
              :key="color"
              class="color-option"
              :class="{ selected: editingCategory.color === color }"
              :style="{ background: color }"
              @click="editingCategory.color = color"
            ></div>
          </div>
          <div class="modal-actions">
            <button class="delete-btn" @click.stop="deleteCategoryConfirm">Delete</button>
            <button @click.stop="cancelEditCategory">Cancel</button>
            <button class="primary" @click.stop="saveCategory">Save</button>
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
          <div class="modal-actions">
            <button class="delete-btn" @click.stop="deleteProjectConfirm">Delete</button>
            <button @click.stop="cancelEditProject">Cancel</button>
            <button class="primary" @click.stop="saveProject">Save</button>
          </div>
        </div>
      </div>
    </aside>

    <main class="main-content" :class="{ 'with-detail': selectedTodo }">
      <header class="main-header">
        <h1>{{ currentTitle }}</h1>
        <div class="header-controls">
          <div class="sort-controls">
            <select v-model="sortBy" class="sort-select">
              <option value="manual">Manual Order</option>
              <option value="deadline">By Deadline</option>
              <option value="alpha">Alphabetical</option>
            </select>
            <label class="group-toggle">
              <input type="checkbox" v-model="groupByProject" />
              <span>Group by Project</span>
            </label>
          </div>
          <div class="view-switcher">
            <button :class="{ active: currentView === 'list' }" @click="currentView = 'list'">List</button>
            <button :class="{ active: currentView === 'table' }" @click="currentView = 'table'">Table</button>
            <button :class="{ active: currentView === 'kanban' }" @click="currentView = 'kanban'">Kanban</button>
          </div>
        </div>
      </header>

      <div class="add-todo">
        <input
          v-model="newTodoTitle"
          @keyup.enter="addTodo"
          placeholder="Add a new todo..."
          type="text"
        />
        <button @click="addTodo">Add</button>
      </div>

      <!-- List View -->
      <div v-if="currentView === 'list'" class="list-view">
        <template v-if="groupByProject">
          <div v-for="group in groupedTodos" :key="group.id" class="todo-group">
            <div class="group-header" :style="{ borderLeftColor: group.color || '#666' }">
              <span class="group-dot" :style="{ background: group.color || '#666' }"></span>
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{ group.todos.length }}</span>
            </div>
            <div class="todo-list">
              <div
                v-for="element in group.todos"
                :key="element.id"
                class="todo-item"
                :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                :style="{ borderLeftColor: element.project_color || '#333' }"
                @click="selectTodo(element.id)"
              >
                <input
                  type="checkbox"
                  :checked="element.completed"
                  @click.stop="toggleComplete(element)"
                />
                <span class="title">{{ element.title }}</span>
                <span v-if="element.deadline" class="deadline" :class="{ overdue: isOverdue(element.deadline) }">
                  {{ formatDeadline(element.deadline) }}
                </span>
                <button class="delete-btn" @click.stop="deleteTodo(element.id)">x</button>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <draggable
            :modelValue="sortedTodos"
            @update:modelValue="updateSortedTodos"
            item-key="id"
            class="todo-list"
            ghost-class="ghost"
            :disabled="sortBy !== 'manual'"
            @end="onDragEnd"
          >
            <template #item="{ element }">
              <div
                class="todo-item"
                :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                :style="{ borderLeftColor: element.project_color || '#333' }"
                @click="selectTodo(element.id)"
              >
                <input
                  type="checkbox"
                  :checked="element.completed"
                  @click.stop="toggleComplete(element)"
                />
                <span class="title">{{ element.title }}</span>
                <span
                  v-if="element.project_name && currentFilter === null"
                  class="project-tag"
                  :style="{ background: element.project_color + '33', color: element.project_color }"
                >
                  {{ element.project_name }}
                </span>
                <span v-if="element.deadline" class="deadline" :class="{ overdue: isOverdue(element.deadline) }">
                  {{ formatDeadline(element.deadline) }}
                </span>
                <button class="delete-btn" @click.stop="deleteTodo(element.id)">x</button>
              </div>
            </template>
          </draggable>
        </template>
      </div>

      <!-- Table View -->
      <div v-if="currentView === 'table'" class="table-view">
        <table>
          <thead>
            <tr>
              <th class="col-status"></th>
              <th class="col-title">Title</th>
              <th class="col-project">Project</th>
              <th class="col-deadline">Deadline</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <template v-if="groupByProject">
            <tbody v-for="group in groupedTodos" :key="group.id">
              <tr class="group-row">
                <td colspan="5">
                  <span class="group-dot" :style="{ background: group.color }"></span>
                  <span class="group-name">{{ group.name }}</span>
                  <span class="group-count">{{ group.todos.length }}</span>
                </td>
              </tr>
              <tr
                v-for="todo in group.todos"
                :key="todo.id"
                :class="{ completed: todo.completed, selected: selectedTodo?.id === todo.id }"
                :style="{ backgroundColor: todo.project_color ? todo.project_color + '15' : 'transparent' }"
                @click="selectTodo(todo.id)"
              >
                <td class="col-status">
                  <input
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
                  <span v-else class="inbox-badge">Inbox</span>
                </td>
                <td class="col-deadline" :class="{ overdue: isOverdue(todo.deadline) }">
                  {{ todo.deadline ? formatDeadline(todo.deadline) : '-' }}
                </td>
                <td class="col-actions">
                  <button @click.stop="deleteTodo(todo.id)">x</button>
                </td>
              </tr>
            </tbody>
          </template>
          <tbody v-else>
            <tr
              v-for="todo in sortedTodos"
              :key="todo.id"
              :class="{ completed: todo.completed, selected: selectedTodo?.id === todo.id }"
              :style="{ backgroundColor: todo.project_color ? todo.project_color + '15' : 'transparent' }"
              @click="selectTodo(todo.id)"
            >
              <td class="col-status">
                <input
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
                <span v-else class="inbox-badge">Inbox</span>
              </td>
              <td class="col-deadline" :class="{ overdue: isOverdue(todo.deadline) }">
                {{ todo.deadline ? formatDeadline(todo.deadline) : '-' }}
              </td>
              <td class="col-actions">
                <button @click.stop="deleteTodo(todo.id)">x</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Kanban View -->
      <div v-if="currentView === 'kanban'" class="kanban-view-wrapper">
        <div class="kanban-group-toggle">
          <button :class="{ active: kanbanGroupBy === 'project' }" @click="kanbanGroupBy = 'project'">By Project</button>
          <button :class="{ active: kanbanGroupBy === 'category' }" @click="kanbanGroupBy = 'category'">By Category</button>
        </div>

        <div class="kanban-view">
          <!-- Project-based Kanban -->
          <template v-if="kanbanGroupBy === 'project'">
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
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.category_name" class="card-category" :style="{ color: element.category_color }">{{ element.category_name }}</span>
                    </div>
                    <div v-if="element.deadline" class="card-deadline" :class="{ overdue: isOverdue(element.deadline) }">
                      {{ formatDeadline(element.deadline) }}
                    </div>
                  </div>
                </template>
              </draggable>
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
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.category_name" class="card-category" :style="{ color: element.category_color }">{{ element.category_name }}</span>
                    </div>
                    <div v-if="element.deadline" class="card-deadline" :class="{ overdue: isOverdue(element.deadline) }">
                      {{ formatDeadline(element.deadline) }}
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
          </template>

          <!-- Category-based Kanban -->
          <template v-else>
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
                @end="onKanbanDropCategory($event, null)"
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
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.project_name" class="card-project" :style="{ color: element.project_color }">{{ element.project_name }}</span>
                    </div>
                    <div v-if="element.deadline" class="card-deadline" :class="{ overdue: isOverdue(element.deadline) }">
                      {{ formatDeadline(element.deadline) }}
                    </div>
                  </div>
                </template>
              </draggable>
            </div>

            <div
              v-for="category in categories"
              :key="category.id"
              class="kanban-column"
              :style="{ borderTopColor: category.color }"
            >
              <div class="column-header">
                <span class="column-dot" :style="{ background: category.color }"></span>
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
                @end="onKanbanDropCategory($event, category.id)"
              >
                <template #item="{ element }">
                  <div
                    class="kanban-card"
                    :class="{ completed: element.completed, selected: selectedTodo?.id === element.id }"
                    :style="{ borderLeftColor: element.project_color || category.color }"
                    @click="selectTodo(element.id)"
                  >
                    <div class="card-header">
                      <input
                        type="checkbox"
                        :checked="element.completed"
                        @click.stop="toggleComplete(element)"
                      />
                      <span class="card-title">{{ element.title }}</span>
                    </div>
                    <div class="card-meta">
                      <span v-if="element.importance" class="card-importance">{{ element.importance }}</span>
                      <span v-if="element.project_name" class="card-project" :style="{ color: element.project_color }">{{ element.project_name }}</span>
                    </div>
                    <div v-if="element.deadline" class="card-deadline" :class="{ overdue: isOverdue(element.deadline) }">
                      {{ formatDeadline(element.deadline) }}
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
          </template>
        </div>
      </div>

      <div v-if="todos.length === 0 && currentView !== 'kanban'" class="empty-state">
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
        <h2>Details</h2>
        <div class="header-actions">
          <button @click="detachDetail" class="detach-btn" title="Open in new window">^</button>
          <button @click="closeDetail" class="close-btn">x</button>
        </div>
      </div>

      <div class="detail-panel-content">
        <input
          v-model="selectedTodo.title"
          class="title-input"
          @change="saveSelectedTodo"
          placeholder="Todo title"
          :style="{ borderBottomColor: selectedTodo.project_color || '#333' }"
        />

        <div class="meta-section">
          <div class="meta-row">
            <label>Project:</label>
            <select v-model="selectedTodo.project_id" @change="saveProjectChange">
              <option :value="null">Inbox (No Project)</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div class="meta-row">
            <label>Category:</label>
            <select v-model="selectedTodo.category_id" @change="saveCategoryChange">
              <option :value="null">No Category</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="meta-row">
            <label>Importance:</label>
            <div class="importance-picker">
              <button
                v-for="level in 5"
                :key="level"
                class="importance-btn"
                :class="{ active: selectedTodo.importance === level }"
                @click="setImportance(level)"
              >{{ level }}</button>
            </div>
          </div>

          <div class="meta-row">
            <label>Deadline:</label>
            <input
              type="date"
              :value="selectedTodoDeadline"
              @change="updateDeadline($event)"
            />
            <button v-if="selectedTodo.deadline" @click="clearDeadline" class="clear-btn">Clear</button>
          </div>

          <div class="created-date">
            Created: {{ formatCreatedDate(selectedTodo.created_at) }}
          </div>
        </div>

        <div class="links-section">
          <div class="section-header">
            <h3>Linked Items</h3>
            <button @click="showLinkSearch = !showLinkSearch" class="link-btn">+ Link</button>
          </div>

          <div v-if="showLinkSearch" class="link-search">
            <input
              v-model="linkQuery"
              @input="searchForLinks"
              placeholder="Search todos to link..."
              ref="linkInput"
            />
            <div v-if="linkResults.length" class="link-results">
              <div
                v-for="result in linkResults"
                :key="result.id"
                class="link-result"
                @click="linkTo(result)"
              >
                <span>{{ result.title }}</span>
                <span v-if="result.project_name" class="result-project">{{ result.project_name }}</span>
              </div>
            </div>
          </div>

          <div class="linked-items">
            <div
              v-for="linked in linkedTodos"
              :key="linked.id"
              class="linked-item"
            >
              <span class="linked-title" @click="selectTodo(linked.id)">{{ linked.title }}</span>
              <span v-if="linked.project_name" class="linked-project" :style="{ color: linked.project_color }">
                {{ linked.project_name }}
              </span>
              <button @click="unlinkFrom(linked)" class="unlink-btn">x</button>
            </div>
            <p v-if="!linkedTodos.length" class="no-links">No linked items</p>
          </div>
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
            v-else
            class="notes-preview markdown-body"
            :style="{ borderColor: selectedTodo.project_color || '#333' }"
            v-html="renderedNotes"
          ></div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import { marked } from 'marked'

export default {
  name: 'App',
  components: {
    draggable
  },
  data() {
    return {
      todos: [],
      projects: [],
      categories: [],
      allTodos: [],
      currentFilter: null,
      currentView: 'list',
      kanbanGroupBy: 'project',
      newTodoTitle: '',
      newProjectName: '',
      newCategoryName: '',
      showProjectInput: false,
      showCategoryInput: false,
      editingProject: null,
      editingCategory: null,
      selectedTodo: null,
      linkedTodos: [],
      activeTab: 'edit',
      showLinkSearch: false,
      linkQuery: '',
      linkResults: [],
      saveTimeout: null,
      sortBy: 'manual',
      groupByProject: false,
      projectColors: [
        '#0f4c75', '#e74c3c', '#2ecc71', '#f39c12',
        '#9b59b6', '#1abc9c', '#e91e63', '#00bcd4',
        '#673ab7', '#ff5722', '#795548', '#607d8b',
        '#4caf50', '#3f51b5', '#ff9800', '#009688'
      ],
      categoryColors: [
        '#9b59b6', '#3498db', '#e67e22', '#1abc9c',
        '#e74c3c', '#f1c40f', '#95a5a6', '#34495e',
        '#673ab7', '#ff5722', '#795548', '#607d8b',
        '#4caf50', '#3f51b5', '#ff9800', '#009688'
      ],
      // Resize state
      isResizing: false,
      detailWidth: 400,
      detailHeight: 50,
      isVerticalLayout: false
    }
  },
  computed: {
    currentTitle() {
      if (this.currentFilter === null) return 'All Todos'
      if (this.currentFilter === 'inbox') return 'Inbox'
      const project = this.projects.find(p => p.id === this.currentFilter)
      return project ? project.name : 'Todos'
    },
    allCount() {
      return this.allTodos.length
    },
    inboxCount() {
      return this.allTodos.filter(t => !t.project_id).length
    },
    inboxTodos() {
      return this.allTodos.filter(t => !t.project_id)
    },
    uncategorizedTodos() {
      return this.allTodos.filter(t => !t.category_id)
    },
    selectedTodoDeadline() {
      if (!this.selectedTodo?.deadline) return ''
      return this.selectedTodo.deadline.split('T')[0]
    },
    renderedNotes() {
      if (!this.selectedTodo?.notes) return '<p class="placeholder">No notes yet</p>'
      return marked(this.selectedTodo.notes)
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
      let sorted = [...this.todos]
      if (this.sortBy === 'deadline') {
        sorted.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline) - new Date(b.deadline)
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
    }
  },
  async mounted() {
    await this.loadProjects()
    await this.loadCategories()
    await this.loadAllTodos()
    await this.loadTodos()

    window.api.onRefreshTodos(() => {
      this.loadAllTodos()
      this.loadTodos()
      if (this.selectedTodo) {
        this.loadSelectedTodo(this.selectedTodo.id)
      }
    })

    // Check layout on mount and resize
    this.checkLayout()
    window.addEventListener('resize', this.checkLayout)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkLayout)
  },
  methods: {
    async loadProjects() {
      this.projects = await window.api.getProjects()
    },
    async loadCategories() {
      this.categories = await window.api.getCategories()
    },
    async loadAllTodos() {
      this.allTodos = await window.api.getTodos(null)
    },
    async loadTodos() {
      this.todos = await window.api.getTodos(this.currentFilter)
    },
    getCategoryCount(categoryId) {
      return this.allTodos.filter(t => t.category_id === categoryId).length
    },
    getCategoryTodos(categoryId) {
      return this.allTodos.filter(t => t.category_id === categoryId)
    },
    getProjectCount(projectId) {
      return this.allTodos.filter(t => t.project_id === projectId).length
    },
    getProjectTodos(projectId) {
      return this.allTodos.filter(t => t.project_id === projectId)
    },
    updateProjectTodos(projectId, todos) {
      // Used by draggable for reactive updates
    },
    updateCategoryTodos(categoryId, todos) {
      // Used by draggable for reactive updates
    },
    updateSortedTodos(todos) {
      // Update the internal todos array for drag-and-drop
      this.todos = todos
    },
    async onKanbanDropCategory(event, targetCategoryId) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo && todo.category_id !== targetCategoryId) {
        await window.api.updateTodo({
          ...todo,
          category_id: targetCategoryId
        })
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
    async toggleComplete(todo) {
      await window.api.updateTodo({
        ...todo,
        completed: !todo.completed
      })
      await this.loadAllTodos()
      await this.loadTodos()
      if (this.selectedTodo?.id === todo.id) {
        this.selectedTodo.completed = !todo.completed
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
    async onDragEnd() {
      const ids = this.todos.map(t => t.id)
      await window.api.reorderTodos(ids)
    },
    async onKanbanDrop(event, targetProjectId) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo && todo.project_id !== targetProjectId) {
        await window.api.updateTodo({
          ...todo,
          project_id: targetProjectId
        })
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async selectTodo(id) {
      await this.loadSelectedTodo(id)
    },
    async loadSelectedTodo(id) {
      this.selectedTodo = await window.api.getTodo(id)
      this.linkedTodos = await window.api.getLinkedTodos(id)
      this.showLinkSearch = false
      this.linkQuery = ''
      this.linkResults = []
      this.activeTab = 'edit'
    },
    closeDetail() {
      this.selectedTodo = null
      this.linkedTodos = []
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
        const updated = await window.api.updateTodo(this.selectedTodo)
        this.selectedTodo = updated
        await this.loadAllTodos()
        await this.loadTodos()
      }, 300)
    },
    async saveProjectChange() {
      // Save immediately for project changes
      const updated = await window.api.updateTodo(this.selectedTodo)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async saveCategoryChange() {
      // Save immediately for category changes
      const updated = await window.api.updateTodo(this.selectedTodo)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateDeadline(event) {
      const value = event.target.value
      this.selectedTodo.deadline = value || null
      // Save immediately for deadline changes
      const updated = await window.api.updateTodo(this.selectedTodo)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async clearDeadline() {
      this.selectedTodo.deadline = null
      const updated = await window.api.updateTodo(this.selectedTodo)
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
    formatDeadline(deadline) {
      if (!deadline) return ''
      const date = new Date(deadline)
      return date.toLocaleDateString()
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
    editProject(project) {
      this.editingProject = { ...project }
    },
    cancelEditProject() {
      this.editingProject = null
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
      const randomColor = this.categoryColors[Math.floor(Math.random() * this.categoryColors.length)]
      await window.api.createCategory(this.newCategoryName.trim(), randomColor)
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
          color: this.editingCategory.color
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
    // Importance method
    async setImportance(level) {
      this.selectedTodo.importance = level
      const updated = await window.api.updateTodo(this.selectedTodo)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    formatCreatedDate(createdAt) {
      if (!createdAt) return ''
      const date = new Date(createdAt)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    // Resize methods
    checkLayout() {
      this.isVerticalLayout = window.innerWidth <= 1200
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
        this.detailWidth = Math.min(Math.max(newWidth, 300), 800)
      }
    },
    stopResize() {
      this.isResizing = false
      document.removeEventListener('mousemove', this.onResize)
      document.removeEventListener('mouseup', this.stopResize)
    }
  },
  watch: {
    showLinkSearch(val) {
      if (val) {
        this.$nextTick(() => {
          this.$refs.linkInput?.focus()
        })
      }
    }
  }
}
</script>
