<template>
  <div class="app" :class="{ 'light-theme': theme === 'light', 'sidebar-collapsed': !sidebarVisible, 'vertical-layout': isVerticalLayout }" :style="{ borderLeftColor: currentProjectColor }">
    <div
      v-if="!sidebarVisible"
      class="sidebar-hover-trigger"
      @mouseenter="sidebarVisible = true"
    ></div>
    <AppSidebar
      :visible="sidebarVisible"
      :pinned="sidebarPinned"
      :on-mouse-leave="onSidebarMouseLeave"
      :on-mouse-enter="() => sidebarVisible = true"
      @toggle-pin="toggleSidebarPin"
      :current-filter="currentFilter"
      :projects="projects"
      :statuses="statuses"
      :categories="categories"
      :all-count="allCount"
      :inbox-count="inboxCount"
      :trash-count="trashCount"
      :project-counts="projectCounts"
      :status-counts="statusCounts"
      :category-counts="categoryCounts"
      :topics="projectTopics"
      :selected-topic-id="selectedTopicId"
      :topic-counts="topicCounts"
      :is-project-selected="isProjectSelected"
      :open-todos-in-window="openTodosInWindow"
      :grid-lock="gridLock"
      :timezone="timezone"
      :database-path="databasePath"
      @set-filter="setFilter"
      @select-topic="selectTopic"
      @add-topic="addTopicFromSidebar"
      @edit-topic="editTopic"
      @delete-topic="deleteTopic"
      @update:projects="projects = $event"
      @projects-reorder="onProjectDragEnd"
      @add-project="addProjectFromSidebar"
      @edit-project="editProject"
      @update:statuses="statuses = $event"
      @statuses-reorder="onStatusDragEnd"
      @add-status="addStatusFromSidebar"
      @edit-status="editStatus"
      @update:categories="categories = $event"
      @categories-reorder="onCategoryDragEnd"
      @add-category="addCategoryFromSidebar"
      @edit-category="editCategory"
      @update:open-todos-in-window="onOpenTodosInWindowChange"
      @update:grid-lock="onGridLockChange"
      @update:timezone="onTimezoneChange"
      @export="handleExport"
      @show-import="showImportDialog = true"
    />

    <!-- Import Dialog -->
    <div v-if="showImportDialog" class="project-modal" @click.self="showImportDialog = false">
      <div class="modal-content" @click.stop>
        <h3>Import Backup</h3>
        <p>Choose how to import the backup:</p>
        <div class="modal-actions">
          <button class="primary" @click.stop="handleImport('merge')">Merge with Existing</button>
          <button class="delete-btn" @click.stop="handleImport('replace')">Replace All Data</button>
          <button @click.stop="showImportDialog = false">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Help Modal -->
    <div v-if="showHelpModal" class="project-modal" @click.self="showHelpModal = false">
      <div class="modal-content help-modal" @click.stop>
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcuts-grid">
          <div class="shortcut-section">
            <h4>Navigation</h4>
            <div class="shortcut-item"><kbd>j</kbd> / <kbd>↓</kbd><span>Move down</span></div>
            <div class="shortcut-item"><kbd>k</kbd> / <kbd>↑</kbd><span>Move up</span></div>
            <div class="shortcut-item"><kbd>Enter</kbd> / <kbd>e</kbd><span>Open/Edit todo</span></div>
            <div class="shortcut-item"><kbd>Esc</kbd><span>Close detail / Clear selection</span></div>
          </div>
          <div class="shortcut-section">
            <h4>Actions</h4>
            <div class="shortcut-item"><kbd>n</kbd><span>New todo</span></div>
            <div class="shortcut-item"><kbd>x</kbd> / <kbd>Space</kbd><span>Toggle complete</span></div>
            <div class="shortcut-item"><kbd>Delete</kbd><span>Delete todo</span></div>
            <div class="shortcut-item"><kbd>/</kbd><span>Open search</span></div>
          </div>
          <div class="shortcut-section">
            <h4>Global</h4>
            <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>K</kbd><span>Command palette</span></div>
            <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>Z</kbd><span>Undo</span></div>
            <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd><span>Redo</span></div>
            <div class="shortcut-item"><kbd>?</kbd><span>Show this help</span></div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="primary" @click="showHelpModal = false">Close</button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CategoryModal
      :category="editingCategory"
      @save="saveCategoryFromModal"
      @cancel="cancelEditCategory"
      @delete="deleteCategoryConfirm"
    />

    <StatusModal
      :status="editingStatus"
      :colors="statusColors"
      @save="saveStatusFromModal"
      @cancel="cancelEditStatus"
      @delete="deleteStatusConfirm"
    />

    <ProjectModal
      :project="editingProject"
      :colors="projectColors"
      :available-persons="persons"
      :assigned-persons="currentProjectPersons"
      :project-tags="editingProjectTags"
      :all-tags="allTags"
      @save="saveProjectFromModal"
      @cancel="cancelEditProject"
      @delete="deleteProjectConfirm"
      @assign-person="assignProjectPerson"
      @unassign-person="unassignProjectPerson"
      @open-register="openStakeholderRegister"
      @add-tag="addProjectTag"
      @remove-tag="removeProjectTag"
    />

    <div class="main-wrapper" :class="{ 'detail-fullscreen': detailFullscreen && selectedTodo }">
    <main class="main-content" :class="{ 'with-detail': selectedTodo }">
      <header class="main-header">
        <div class="header-title-row">
          <h1 class="header-title">
            <span>{{ currentTitle }}</span>
            <select v-if="projectTopics.length > 0 && isProjectSelected" v-model="splitTopicFilter" class="header-topic-select">
              <option value="all">All Topics</option>
              <option value="none">No Topic</option>
              <option v-for="topic in projectTopics" :key="topic.id" :value="topic.id">{{ topic.name }}</option>
            </select>
          </h1>
          <MainTabs
            v-if="currentFilter !== 'trash'"
            :active-tab="activeTab"
            :notes-count="notesCount"
            :todos-count="todosCount"
            :milestones-count="milestonesCount"
            :stakeholders-count="stakeholdersCount"
            :theme="theme"
            :is-project-selected="isProjectSelected"
            @change="setTab"
          />
          <div class="header-actions">
            <button
              class="header-btn"
              :class="{ disabled: !historyState.canUndo }"
              :disabled="!historyState.canUndo"
              :title="historyState.undoDescription ? `Undo: ${historyState.undoDescription}` : 'Nothing to undo'"
              @click="undo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 10h10a5 5 0 0 1 5 5v2"/>
                <polyline points="3,10 7,6"/>
                <polyline points="3,10 7,14"/>
              </svg>
            </button>
            <button
              class="header-btn"
              :class="{ disabled: !historyState.canRedo }"
              :disabled="!historyState.canRedo"
              :title="historyState.redoDescription ? `Redo: ${historyState.redoDescription}` : 'Nothing to redo'"
              @click="redo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10H11a5 5 0 0 0-5 5v2"/>
                <polyline points="21,10 17,6"/>
                <polyline points="21,10 17,14"/>
              </svg>
            </button>
            <button class="header-btn" title="Keyboard shortcuts (?)" @click="showHelpModal = true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
            <button class="theme-toggle" :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
              <span v-if="theme === 'dark'">☀️</span>
              <span v-else>🌙</span>
            </button>
          </div>
        </div>
        <div v-if="currentFilter !== 'persons' && activeTab !== 'split'" class="header-controls">
          <div class="sort-controls">
            <select v-model="sortBy" class="sort-select">
              <option value="manual">Manual Order</option>
              <option value="created">By Created</option>
              <option value="end_date">By End Date</option>
              <option value="alpha">Alphabetical</option>
            </select>
            <div class="importance-filter">
              <select v-model="importanceFilterOp" class="sort-select filter-op">
                <option value="none">Importance</option>
                <option value="gte">>=</option>
                <option value="lte">&lt;=</option>
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
            <label v-if="!isTrashView" class="hide-completed-toggle">
              <input v-model="hideCompleted" type="checkbox" @change="toggleHideCompleted" />
              <span>Hide completed</span>
            </label>
            <label v-if="!isProjectSelected" class="group-toggle">
              <input v-model="groupByProject" type="checkbox" @change="onGroupByProjectChange" />
              <span>Group by Project</span>
            </label>
          </div>
          <div class="view-switcher">
            <button
              v-for="view in availableViews"
              :key="view"
              :class="{ active: currentView === view }"
              :disabled="isTrashView && (view === 'kanban' || view === 'graph' || view === 'timeline')"
              @click="setView(view)"
            >{{ view.charAt(0).toUpperCase() + view.slice(1) }}</button>
          </div>
          <button v-if="isTrashView && trashCount > 0" class="empty-trash-btn" @click="emptyTrash">Empty Trash</button>
        </div>
        <div v-if="!isTrashView && activeTab !== 'stakeholders' && activeTab !== 'split'" class="add-todo">
          <input
            ref="newTodoInput"
            v-model="newTodoTitle"
            :placeholder="activeTab === 'notes' ? 'Add a new note... (press n)' : 'Add a new todo... (press n)'"
            type="text"
            @keyup.enter="addTodo"
          />
          <button @click="addTodo">Add</button>
          <button v-if="activeTab === 'todos'" class="add-milestone-btn" @click="addMilestone" title="Add Milestone">+ Milestone</button>
        </div>
        <div v-if="activeTab === 'stakeholders'" class="add-todo stakeholder-add-wrapper">
          <input
            ref="stakeholderSearchInput"
            v-model="newPersonName"
            placeholder="Add stakeholder..."
            type="text"
            @focus="showStakeholderPicker = true"
            @blur="onStakeholderInputBlur"
            @keyup.enter="addPersonFromHeader"
            @keydown.esc="showStakeholderPicker = false"
          />
          <button @click="addPersonFromHeader">Add</button>
          <div v-if="showStakeholderPicker && newPersonName.trim()" class="stakeholder-picker-dropdown">
            <div v-if="filteredAvailableStakeholders.length > 0" class="picker-results">
              <div
                v-for="person in filteredAvailableStakeholders.slice(0, 10)"
                :key="person.id"
                class="picker-item"
                @mousedown.prevent="assignStakeholderFromPicker(person)"
              >
                <div class="person-avatar-small" :style="{ background: person.color }">{{ getInitials(person.name) }}</div>
                <span class="picker-item-name">{{ person.name }}</span>
                <span v-if="person.role" class="picker-item-role">{{ person.role }}</span>
              </div>
            </div>
            <div v-if="!hasExactStakeholderMatch && newPersonName.trim()" class="picker-create-hint" @mousedown.prevent="addPersonFromHeader">
              Press Enter to create "{{ newPersonName.trim() }}"
            </div>
          </div>
        </div>
      </header>

      <!-- Project fade transition -->
      <Transition name="fade" mode="out-in">
        <div :key="currentFilter" class="project-content">
          <!-- Stakeholders View (tab-based) -->
          <PersonsView
            v-if="activeTab === 'stakeholders'"
            :persons="isProjectSelected ? selectedProjectStakeholders : persons"
            :all-persons="persons"
            :all-tags="allTags"
            :theme="theme"
            :project-id="isProjectSelected ? currentFilter : null"
            :pending-edit="pendingPersonEdit"
            :current-view="currentView"
            @refresh="() => { loadProjectStakeholders(); loadAllTags() }"
            @edit-opened="pendingPersonEdit = null"
            @assign-person="assignStakeholder"
            @unassign-person="unassignStakeholder"
            @update-stakeholder="updateStakeholder"
          />

          <!-- Split View (tab-based) -->
          <div v-else-if="activeTab === 'split'" class="split-view">
            <div
              class="split-panels"
              ref="splitPanelsRef"
              @mousedown="onSplitMouseDown"
              @mousemove="onSplitMouseMove"
              @mouseup="onSplitMouseUp"
              @mouseleave="onSplitMouseUp"
            >
              <!-- Selection Box -->
              <div
                v-if="splitIsSelecting"
                class="selection-box"
                :style="splitSelectionBoxStyle"
              ></div>
              <!-- Todos panel (left) - using TableView -->
              <div
                class="split-panel split-todos"
                :class="{ 'drop-target': splitDropTarget === 'todos' }"
                @dragover.prevent
                @dragenter="onSplitDragEnter('todos')"
                @dragleave="onSplitDragLeave"
                @drop="onSplitDrop($event, 'todo')"
              >
                <div class="split-panel-header">
                  <div class="split-panel-title">
                    <span>Todos</span>
                    <span class="split-count">{{ splitTodos.length }}</span>
                  </div>
                </div>
                <div class="split-add-row">
                  <input
                    v-model="splitTodoTitle"
                    class="split-add-input"
                    placeholder="Add a new todo..."
                    @keyup.enter="addSplitTodo"
                  />
                  <button class="split-add-btn" @click="addSplitTodo">+</button>
                </div>
                <div class="split-panel-content">
                  <draggable
                    :model-value="splitTodos"
                    item-key="id"
                    class="split-draggable-list"
                    group="split-items"
                    ghost-class="ghost"
                    @end="onSplitDragEnd($event, 'todo')"
                  >
                    <template #item="{ element: todo }">
                      <div
                        class="split-item"
                        :class="{ selected: selectedTodo?.id === todo.id || selectedTodoIds.has(todo.id), completed: todo.completed }"
                        :data-id="todo.id"
                        @click="selectTodo(todo.id)"
                      >
                        <input type="checkbox" :checked="todo.completed" @click.stop="toggleComplete(todo)" />
                        <span class="split-item-title">{{ todo.title }}</span>
                        <span v-if="todo.project_name" class="split-item-project" :style="{ color: todo.project_color }">{{ todo.project_name }}</span>
                        <span v-if="todo.end_date" class="split-item-deadline" :class="{ overdue: isOverdue(todo.end_date) }">{{ formatShortDate(todo.end_date) }}</span>
                      </div>
                    </template>
                  </draggable>
                  <div v-if="splitTodos.length === 0" class="split-empty">No todos</div>
                </div>
              </div>
              <div class="split-divider"></div>
              <!-- Notes panel (right) -->
              <div
                class="split-panel split-notes"
                :class="{ 'drop-target': splitDropTarget === 'notes' }"
                @dragover.prevent
                @dragenter="onSplitDragEnter('notes')"
                @dragleave="onSplitDragLeave"
                @drop="onSplitDrop($event, 'note')"
              >
                <div class="split-panel-header">
                  <div class="split-panel-title">
                    <span>Notes</span>
                    <span class="split-count">{{ splitNotes.length }}</span>
                  </div>
                  <div class="split-panel-controls">
                    <select v-model="splitNotesView" class="split-view-select">
                      <option value="list">List</option>
                      <option value="cards">Cards</option>
                    </select>
                  </div>
                </div>
                <div class="split-add-row">
                  <input
                    v-model="splitNoteTitle"
                    class="split-add-input"
                    placeholder="Add a new note..."
                    @keyup.enter="addSplitNote"
                  />
                  <button class="split-add-btn" @click="addSplitNote">+</button>
                </div>
                <div class="split-panel-content" :class="{ 'cards-mode': splitNotesView === 'cards' }">
                  <!-- Topic boxes when project has topics -->
                  <template v-if="splitHasTopics">
                    <div class="split-topic-boxes">
                      <div
                        v-for="group in splitNoteTopicGroups"
                        :key="group.id ?? 'no-topic'"
                        class="split-topic-box"
                      >
                        <div class="split-topic-header">
                          <span class="split-topic-dot" :style="{ background: group.color }"></span>
                          <span class="split-topic-name">{{ group.name }}</span>
                          <span class="split-topic-count">{{ group.todos.length }}</span>
                        </div>
                        <draggable
                          :model-value="group.todos"
                          item-key="id"
                          class="split-topic-items split-draggable-list"
                          group="split-items"
                          ghost-class="ghost"
                          @end="onSplitTopicDragEnd($event, group.id)"
                        >
                          <template #item="{ element: note }">
                            <div
                              class="split-item"
                              :class="{ selected: selectedTodo?.id === note.id || selectedTodoIds.has(note.id), completed: note.completed, card: splitNotesView === 'cards' }"
                              :data-id="note.id"
                              @click="selectTodo(note.id)"
                            >
                              <input type="checkbox" :checked="note.completed" @click.stop="toggleComplete(note)" />
                              <span class="split-item-title">{{ note.title }}</span>
                            </div>
                          </template>
                        </draggable>
                      </div>
                      <div class="split-topic-box add-topic-box" @click="addTopicFromSidebar">
                        <span class="add-topic-label">+ Add Topic</span>
                      </div>
                    </div>
                  </template>
                  <!-- Simple list when no topics -->
                  <draggable
                    v-else
                    :model-value="splitNotes"
                    item-key="id"
                    class="split-draggable-list"
                    group="split-items"
                    ghost-class="ghost"
                    @end="onSplitDragEnd($event, 'note')"
                  >
                    <template #item="{ element: note }">
                      <div
                        class="split-item"
                        :class="{ selected: selectedTodo?.id === note.id || selectedTodoIds.has(note.id), completed: note.completed, card: splitNotesView === 'cards' }"
                        :data-id="note.id"
                        @click="selectTodo(note.id)"
                      >
                        <input type="checkbox" :checked="note.completed" @click.stop="toggleComplete(note)" />
                        <span class="split-item-title">{{ note.title }}</span>
                        <span v-if="note.project_name" class="split-item-project" :style="{ color: note.project_color }">{{ note.project_name }}</span>
                      </div>
                    </template>
                  </draggable>
                  <div v-if="splitNotes.length === 0" class="split-empty">No notes</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Views Container -->
          <div v-else-if="activeTab !== 'stakeholders' && currentFilter !== 'persons'" class="views-container">
          <!-- Cards View -->
          <CardsView
            v-if="currentView === 'cards'"
            :sorted-todos="sortedTodos"
            :grouped-todos="groupedTodos"
            :group-by-project="groupByProject"
            :topics="isProjectSelected ? projectTopics : []"
            :selected-topic-id="selectedTopicId"
            :is-project-view="isProjectSelected"
            :selected-todo-id="selectedTodo?.id"
            :selected-todo-ids="selectedTodoIds"
            :focused-todo-id="focusedTodo?.id"
            :is-trash-view="isTrashView"
            :card-columns="cardColumns"
            :sort-by="sortBy"
            :current-filter="currentFilter"
            :card-widths="cardWidths"
            :grid-lock="gridLock"
            @card-click="handleCardClick"
            @card-mousedown="onCardMouseDown"
            @card-resize="onCardResize"
            @toggle-complete="toggleComplete"
            @toggle-subtask="toggleSubtask"
            @delete-todo="deleteTodo"
            @restore-todo="restoreTodo"
            @permanent-delete-todo="permanentlyDeleteTodo"
            @update-sorted-todos="updateSortedTodos"
            @drag-end="onDragEnd"
            @update-group-todos="updateGroupTodos"
            @group-drag-end="onGroupDragEnd"
            @add-todo-to-project="addTodoToProject"
            @drop-on-topic="handleDropOnTopic"
            @add-topic="addTopicFromCards"
            @select-topic="selectTopic"
            @edit-topic="editTopic"
            @delete-topic="deleteTopic"
            @add-todo-to-topic="addTodoToTopic"
            @marquee-select="handleMarqueeSelect"
          />

          <!-- Table View -->
          <TableView
            v-else-if="currentView === 'table'"
            key="table"
            :sorted-todos="sortedTodos"
            :grouped-todos="groupedTodos"
            :group-by-project="groupByProject"
            :selected-todo-id="selectedTodo?.id"
            :selected-todo-ids="selectedTodoIds"
            :focused-todo-id="focusedTodo?.id"
            :is-trash-view="isTrashView"
            :subtasks-map="allSubtasksMap"
            @row-click="handleRowClick"
            @toggle-complete="toggleComplete"
            @toggle-subtask="toggleSubtask"
            @delete-todo="deleteTodo"
            @delete-subtask="deleteSubtaskFromTable"
            @restore-todo="restoreTodo"
            @permanent-delete-todo="permanentlyDeleteTodo"
            @add-todo-to-project="addTodoToProject"
            @add-subtask="addSubtaskFromTable"
            @update-subtask="updateSubtaskFromTable"
            @update-subtask-due-date="updateSubtaskDueDate"
          />

          <!-- Kanban View -->
          <KanbanView
            v-else-if="currentView === 'kanban'"
            key="kanban"
            :kanban-group-by="kanbanGroupBy"
            :effective-kanban-group-by="effectiveKanbanGroupBy"
            :is-project-selected="isProjectSelected"
            :group-by-project="groupByProject"
            :grouped-todos="groupedTodos"
            :projects="projects"
            :categories="categories"
            :statuses="statuses"
            :inbox-todos="inboxTodos"
            :uncategorized-todos="uncategorizedTodos"
            :no-status-todos="noStatusTodos"
            :selected-todo-id="selectedTodo?.id"
            :selected-todo-ids="selectedTodoIds"
            :all-todos="filteredTodos"
            @update:kanban-group-by="kanbanGroupBy = $event"
            @card-click="handleCardClick"
            @toggle-complete="toggleComplete"
            @delete-todo="deleteTodo"
            @add-todo-to-project="addTodoToProject"
            @add-todo-to-category="addTodoToCategory"
            @add-todo-to-status="addTodoToStatus"
            @update-project-todos="updateProjectTodos"
            @update-category-todos="updateCategoryTodos"
            @update-status-todos="updateStatusTodos"
            @kanban-drop="onKanbanDrop"
            @kanban-drop-category="onKanbanDropCategory"
            @kanban-drop-status="onKanbanDropStatus"
            @stacked-kanban-drop="onStackedKanbanDrop"
          />

          <!-- Gantt/Timeline View -->
          <div v-else-if="currentView === 'timeline'" key="timeline" class="gantt-view">
            <div class="gantt-controls">
          <div class="timeline-mode-switcher">
            <button :class="{ active: timelineMode === 'gantt' }" @click="timelineMode = 'gantt'">Gantt</button>
            <button :class="{ active: timelineMode === 'month' }" @click="timelineMode = 'month'">Month</button>
            <button :class="{ active: timelineMode === 'week' }" @click="timelineMode = 'week'">Week</button>
            <button :class="{ active: timelineMode === 'day' }" @click="timelineMode = 'day'">Day</button>
          </div>
          <template v-if="timelineMode === 'gantt'">
            <select v-model="ganttGroupBy" class="gantt-groupby">
              <option value="project">By Project</option>
              <option value="category">By Category</option>
              <option value="importance">By Importance</option>
              <option value="milestone">By Milestone</option>
            </select>
            <button @click="timelineOffset -= 200">&#8592;</button>
            <button @click="timelineScale = Math.max(20, timelineScale - 20)">-</button>
            <span class="timeline-scale-label">{{ timelineScale }}px/day</span>
            <button @click="timelineScale = Math.min(500, timelineScale + 20)">+</button>
            <button @click="timelineOffset += 200">&#8594;</button>
            <button class="reset-btn" @click="timelineOffset = 0; timelineScale = 100">Reset</button>
          </template>
          <template v-else>
            <button @click="navigateCalendar(-1)">&lt;</button>
            <button class="today-btn" @click="goToToday">Today</button>
            <button @click="navigateCalendar(1)">&gt;</button>
            <span class="calendar-period">{{ calendarPeriodLabel }}</span>
          </template>
        </div>

        <!-- Gantt Chart -->
        <div v-if="timelineMode === 'gantt'" class="gantt-container">
          <div class="gantt-sidebar">
            <div class="gantt-header-cell">Task</div>
            <div
              v-for="row in ganttRows"
              :key="row.id"
              class="gantt-row-label"
              :class="{ 'drop-target': dropTargetRowId === row.id, 'is-milestone-row': row.isMilestone }"
              :style="{ borderLeftColor: row.color, height: getRowHeight(row) + 'px' }"
            >
              <div class="row-main">
                <span class="row-name">{{ row.name }}</span>
                <span class="row-count">{{ row.todos.length }}</span>
              </div>
              <div v-if="row.persons && row.persons.length" class="row-persons">
                <span
                  v-for="person in row.persons"
                  :key="person.id"
                  class="person-badge"
                  :style="{ background: person.color || '#666' }"
                  :title="person.role ? `${person.name} (${person.role})` : person.name"
                >{{ person.name.charAt(0) }}</span>
              </div>
            </div>
          </div>
          <div ref="ganttChartArea" class="gantt-chart-area" @wheel.prevent="onTimelineWheel" @dblclick="onTimelineChartDblClick">
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
                  :class="{ 'drop-target': dropTargetRowId === row.id }"
                  :style="{ height: getRowHeight(row) + 'px' }"
                >
                  <div
                    class="gantt-row-bg"
                    :style="{ width: timelineRange.days * timelineScale + 'px', height: getRowHeight(row) + 'px' }"
                    @dblclick="createTodoFromTimeline($event, row)"
                  >
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
                    :class="{ completed: todo.completed, selected: selectedTodo?.id === todo.id, dragging: draggingBarId === todo.id, resizing: draggingBarId === todo.id && barDragMode !== 'move', milestone: todo.type === 'milestone' }"
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

        <!-- Month Calendar -->
        <div v-if="timelineMode === 'month'" class="calendar-month">
          <div class="weekday-headers">
            <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="weekday-header">{{ day }}</div>
          </div>
          <div class="month-grid">
            <div
              v-for="(day, index) in calendarMonthDays"
              :key="index"
              class="month-cell"
              :class="{ 'other-month': !day.isCurrentMonth, 'is-today': day.isToday, 'is-weekend': day.isWeekend }"
              @dblclick="createTodoOnDate(day.date)"
            >
              <div class="cell-date">{{ day.dayNumber }}</div>
              <div class="cell-events">
                <div
                  v-for="todo in getTodosForCalendarDate(day.date)"
                  :key="todo.id"
                  class="cal-event"
                  :class="{ completed: todo.completed, milestone: todo.type === 'milestone' }"
                  :style="{ borderLeftColor: todo.project_color || '#666' }"
                  @click.stop="selectTodo(todo.id)"
                >{{ todo.title }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Week Calendar -->
        <div v-if="timelineMode === 'week'" class="calendar-week">
          <div class="week-header">
            <div class="time-gutter-header"></div>
            <div v-for="day in calendarWeekDays" :key="day.date" class="week-day-header" :class="{ 'is-today': day.isToday }">
              <span class="day-name">{{ day.dayName }}</span>
              <span class="day-number" :class="{ 'today-circle': day.isToday }">{{ day.dayNumber }}</span>
            </div>
          </div>
          <div class="week-body">
            <div class="time-gutter">
              <div v-for="hour in 24" :key="hour" class="hour-label">{{ hour === 1 ? '12 AM' : hour < 13 ? (hour-1) + ' AM' : hour === 13 ? '12 PM' : (hour-13) + ' PM' }}</div>
            </div>
            <div class="week-columns">
              <div v-for="day in calendarWeekDays" :key="day.date" class="week-column" :class="{ 'is-today': day.isToday, 'is-weekend': day.isWeekend }">
                <div class="hour-slots">
                  <div v-for="hour in 24" :key="hour" class="hour-slot" @dblclick="createTodoOnDate(day.date)"></div>
                </div>
                <div class="day-events">
                  <div
                    v-for="todo in getTodosForCalendarDate(day.date)"
                    :key="todo.id"
                    class="week-event"
                    :class="{ completed: todo.completed, milestone: todo.type === 'milestone' }"
                    :style="{ borderLeftColor: todo.project_color || '#666' }"
                    @click.stop="selectTodo(todo.id)"
                  >{{ todo.title }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Day Calendar -->
        <div v-if="timelineMode === 'day'" class="calendar-day">
          <div class="day-body">
            <div class="time-gutter">
              <div v-for="hour in 24" :key="hour" class="hour-label">{{ hour === 1 ? '12 AM' : hour < 13 ? (hour-1) + ' AM' : hour === 13 ? '12 PM' : (hour-13) + ' PM' }}</div>
            </div>
            <div class="day-column">
              <div class="hour-slots">
                <div v-for="hour in 24" :key="hour" class="hour-slot" @dblclick="createTodoOnDate(formatDateKey(calendarDate))"></div>
              </div>
              <div class="day-events-list">
                <div
                  v-for="todo in calendarDayTodos"
                  :key="todo.id"
                  class="day-event"
                  :class="{ completed: todo.completed, milestone: todo.type === 'milestone' }"
                  :style="{ borderLeftColor: todo.project_color || '#666' }"
                  @click.stop="selectTodo(todo.id)"
                >
                  <div class="event-title">{{ todo.title }}</div>
                  <div v-if="todo.project_name" class="event-project">{{ todo.project_name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

          <!-- Graph View -->
          <div
            v-else-if="currentView === 'graph'" key="graph" ref="graphContainer" class="graph-view" :class="{ dragging: draggingNode, panning: isPanning }"
        @wheel.prevent="onGraphWheel"
        @mousedown="onGraphMouseDown"
        @mousemove="onGraphMouseMove"
        @mouseup="onGraphMouseUp"
        @mouseleave="onGraphMouseUp"
      >
        <svg ref="graphSvg" class="graph-svg" :viewBox="`0 0 ${graphWidth} ${graphHeight}`" preserveAspectRatio="xMidYMid meet" @dblclick="onGraphDblClick" @click="onGraphCanvasClick">
          <g :transform="`translate(${graphPan.x}, ${graphPan.y}) scale(${graphZoom})`">
            <!-- Connection lines -->
            <g class="graph-links">
              <g v-for="link in graphLinks" :key="`${link.source}-${link.target}`">
                <!-- Invisible wider path for hover detection -->
                <path
                  :d="getEdgePath(link)"
                  class="graph-link-hover"
                  @mouseenter="hoveredLink = link"
                  @mouseleave="hoveredLink = null"
                  @click="onLinkClick($event, link)"
                  @contextmenu.prevent="onLinkRightClick($event, link)"
                />
                <!-- Visible path -->
                <path
                  :d="getEdgePath(link)"
                  class="graph-link"
                  :class="{ hovered: hoveredLink === link, 'person-link': isPersonLink(link) }"
                  :style="{ stroke: getLinkColor(link) }"
                />
                <!-- Buttons in middle of selected link -->
                <g
                  v-if="selectedLink === link"
                  :transform="`translate(${(getNodeX(link.source) + getNodeX(link.target)) / 2}, ${(getNodeY(link.source) + getNodeY(link.target)) / 2})`"
                >
                  <!-- Add node button -->
                  <g class="link-add-btn" transform="translate(-16, 0)" @click.stop="insertNodeInLinkDirect(link); selectedLink = null">
                    <circle r="12" class="link-add-circle" />
                    <text class="link-add-icon" text-anchor="middle" dominant-baseline="central">+</text>
                  </g>
                  <!-- Remove link button -->
                  <g class="link-remove-btn" transform="translate(16, 0)" @click.stop="removeLink(link); selectedLink = null">
                    <circle r="12" class="link-remove-circle" />
                    <text class="link-remove-icon" text-anchor="middle" dominant-baseline="central">×</text>
                  </g>
                </g>
              </g>
            </g>
            <!-- Nodes -->
            <g class="graph-nodes">
              <g
                v-for="todo in graphNodes"
                :key="todo.id"
                class="graph-node"
                :class="{
                  person: todo.type === 'person',
                  completed: todo.completed,
                  selected: selectedTodo?.id === todo.id || selectedNodeIds.includes(todo.id),
                  linking: graphLinkMode && graphLinkSource?.id === todo.id,
                  dragging: draggingNode?.id === todo.id
                }"
                :transform="`translate(${getNodeX(todo.id)}, ${getNodeY(todo.id)})`"
                @mousedown.stop="onNodeMouseDown($event, todo)"
                @mouseenter="hoveredNode = todo"
                @mouseleave="hoveredNode = null"
              >
                <!-- Person node (pill shape) -->
                <template v-if="todo.type === 'person'">
                  <foreignObject x="-80" y="-25" width="160" height="50" class="node-foreign" overflow="visible">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      class="person-node-wrapper"
                      :style="{ borderColor: todo.color || '#8e44ad' }"
                    >
                      <button class="person-node-remove" @mousedown.stop.prevent="removePersonFromGraph(todo)" title="Remove from graph">×</button>
                      {{ todo.title }}
                    </div>
                  </foreignObject>
                </template>
                <!-- Todo node (auto-sizing with foreignObject) -->
                <template v-else>
                  <foreignObject x="-150" y="-200" width="300" height="400" class="node-foreign" overflow="visible">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      class="node-content-wrapper"
                      :style="{ borderColor: todo.project_color || '#0f4c75' }"
                      @mousedown="onNodeContentMouseDown($event, todo)"
                      @click.stop="startEditingNode($event, todo)"
                      @dblclick.stop="selectTodo(todo.id)"
                    >
                      <button class="node-delete-btn" @mousedown.stop.prevent="deleteTodoFromGraph(todo.id)" title="Delete">×</button>
                      <div v-if="todo.category_symbol" class="node-category-symbol" :title="todo.category_name">
                        <component :is="getIconComponent(todo.category_symbol)" v-if="getIconComponent(todo.category_symbol)" :size="14" />
                        <span v-else>{{ todo.category_symbol }}</span>
                      </div>
                      <template v-if="editingNodeId === todo.id">
                        <input
                          class="node-title-editor"
                          v-model="editingNodeTitle"
                          @keydown.enter.prevent="focusNotesEditor"
                          @keydown.escape="closeEverything"
                          @blur="onNodeTitleBlur($event, todo)"
                          @input="debouncedSaveNode"
                          @mousedown.stop
                          @click.stop
                          placeholder="Title..."
                        />
                      </template>
                      <div v-else-if="todo.title && todo.title !== 'Untitled' && todo.title !== 'New Node'" class="node-title-text">{{ todo.title }}</div>
                      <template v-if="editingNodeId === todo.id">
                        <textarea
                          ref="nodeNotesEditor"
                          class="node-notes-editor"
                          v-model="editingNodeNotes"
                          @blur="onNodeNotesBlur($event, todo)"
                          @keydown.escape="closeEverything"
                          @keydown.ctrl.enter.stop="saveAndCloseNode(todo)"
                          @keydown.meta.enter.stop="saveAndCloseNode(todo)"
                          @input="autoResizeNodeEditor"
                          @mousedown.stop
                          @click.stop
                          placeholder="Write notes here... (Markdown supported)"
                        ></textarea>
                      </template>
                      <template v-else>
                        <div v-if="todo.notes && !todo.notes_sensitive" class="node-notes" v-html="renderCardMarkdown(todo.notes)" @click="onNotesClick"></div>
                        <div v-else-if="todo.notes_sensitive" class="node-notes sensitive">Sensitive content</div>
                      </template>
                    </div>
                  </foreignObject>
                </template>
              </g>
            </g>
          </g>
        </svg>
        <!-- Tooltip -->
        <div v-if="hoveredNode && !draggingNode" class="graph-tooltip" :style="tooltipStyle">
          <div class="tooltip-title">{{ hoveredNode.title }}</div>
          <div v-if="hoveredNode.project_name" class="tooltip-project">{{ hoveredNode.project_name }}</div>
          <div v-if="hoveredNode.end_date" class="tooltip-deadline">Due: {{ formatDeadline(hoveredNode.end_date) }}</div>
          <div v-if="hoveredNode.notes" class="tooltip-notes markdown-body" v-html="renderCardMarkdown(hoveredNode.notes)"></div>
        </div>
        <!-- Link Context Menu -->
        <div v-if="linkContextMenu" class="link-context-menu" :style="{ left: linkContextMenu.x + 'px', top: linkContextMenu.y + 'px' }" @click.stop>
          <button @click="insertNodeInLink">Insert Node</button>
          <button @click="removeLinkFromMenu">Remove Link</button>
          <button @click="linkContextMenu = null">Cancel</button>
        </div>
        <div class="graph-controls">
          <div class="control-group zoom-group">
            <button class="icon-btn" @click="graphZoom = Math.max(0.3, graphZoom - 0.1)" title="Zoom out">-</button>
            <span class="zoom-label">{{ Math.round(graphZoom * 100) }}%</span>
            <button class="icon-btn" @click="graphZoom = Math.min(3, graphZoom + 0.1)" title="Zoom in">+</button>
            <button class="icon-btn" @click="resetGraphView" title="Center view">O</button>
          </div>
          <div class="control-group layout-group">
            <select v-model="graphLayoutType" class="layout-select" @change="onLayoutTypeChange">
              <option value="force">Force</option>
              <option value="tree">Tree</option>
              <option value="grid">Grid</option>
            </select>
            <button :class="{ active: isSimulating }" @click="runLayout">{{ isSimulating ? 'Stop' : 'Run' }}</button>
          </div>
          <div class="control-group">
            <button :class="{ active: graphLinkMode }" @click="toggleGraphLinkMode">{{ graphLinkMode ? 'Cancel' : 'Link' }}</button>
            <button :class="{ active: showGraphSettings }" @click="showGraphSettings = !showGraphSettings" title="Settings">Cfg</button>
          </div>
          <span v-if="graphLinkMode" class="link-hint">{{ graphLinkSource ? `Link to "${graphLinkSource.title}"` : 'Select node' }}</span>
        </div>
        <div v-if="showGraphSettings" class="graph-settings">
          <div class="setting-row type-filter-row">
            <label class="type-label">Show:</label>
            <label class="radio-label"><input type="radio" v-model="graphTypeFilter" value="notes" @change="onGraphTypeFilterChange" /> Notes</label>
            <label class="radio-label"><input type="radio" v-model="graphTypeFilter" value="todos" @change="onGraphTypeFilterChange" /> Todos</label>
            <label class="radio-label"><input type="radio" v-model="graphTypeFilter" value="all" @change="onGraphTypeFilterChange" /> Both</label>
          </div>
          <div class="setting-row checkbox-row">
            <input id="show-persons" v-model="showPersonsInGraph" type="checkbox" @change="updateGraphData" />
            <label for="show-persons">Persons</label>
          </div>
          <div class="setting-row checkbox-row">
            <input id="orthogonal-edges" v-model="orthogonalEdges" type="checkbox" @change="saveOrthogonalSetting" />
            <label for="orthogonal-edges">Orthogonal</label>
          </div>
          <div v-if="graphLayoutType === 'force'" class="setting-row">
            <label>Repel</label>
            <input v-model.number="graphRepulsion" type="range" min="-1000" max="-50" step="50" @input="onGraphSettingChange" />
            <span>{{ Math.abs(graphRepulsion) }}</span>
          </div>
          <div class="setting-row">
            <label>Distance</label>
            <input v-model.number="graphEdgeLength" type="range" min="10" max="300" step="5" @input="onGraphSettingChange" />
            <span>{{ graphEdgeLength }}</span>
          </div>
          <button class="reset-settings-btn" @click="resetGraphSettings">Reset</button>
        </div>
      </div>
          </div>

          <div v-if="filteredTodos.length === 0 && activeTab !== 'stakeholders' && activeTab !== 'split' && currentFilter !== 'persons' && currentView !== 'kanban' && currentView !== 'timeline' && currentView !== 'graph'" class="empty-state">
            <p>{{ activeTab === 'notes' ? 'No notes yet.' : 'No todos yet.' }} Add one above.</p>
          </div>
        </div>
      </Transition>

      <!-- Bottom Bar with Card Size Slider - outside transition -->
      <div v-if="!selectedTodo && currentView === 'cards' && activeTab !== 'stakeholders'" class="bottom-bar">
        <div class="card-size-control">
          <label class="card-size-label">
            <span>Columns: {{ cardColumns }}</span>
            <input
              v-model.number="cardColumns"
              type="range"
              min="1"
              max="10"
              step="1"
              class="card-size-slider"
            />
          </label>
        </div>
      </div>
    </main>

    <!-- Detail Panel -->
    <DetailPanel
      :todo="selectedTodo"
      :projects="projects"
      :categories="categories"
      :statuses="statuses"
      :topics="selectedTodoTopics"
      :persons="persons"
      :subtasks="subtasks"
      :linked-todos="linkedTodos"
      :child-todos="childTodos"
      :assigned-persons="assignedPersons"
      :tags="todoTags"
      :all-tags="allTags"
      :active-tab="detailTab"
      :new-subtask-title="newSubtaskTitle"
      :link-query="linkQuery"
      :link-results="linkResults"
      :show-link-search="showLinkSearch"
      :show-person-picker="showPersonPicker"
      :notes-revealed="notesRevealed"
      :is-resizing="isResizing"
      :layout-preference="detailLayoutPreference"
      :is-vertical-layout="isVerticalLayout"
      :detail-width="detailWidth"
      :detail-height="detailHeight"
      :fullscreen="detailFullscreen"
      @close="closeDetail"
      @toggle-fullscreen="toggleDetailFullscreen"
      @detach="detachDetail"
      @toggle-layout="toggleDetailLayout"
      @resize-start="startResize"
      @toggle-complete="toggleSelectedComplete"
      @save="saveSelectedTodo"
      @update:title="updateSelectedField('title', $event)"
      @update:notes="updateSelectedField('notes', $event)"
      @update:notes-sensitive="updateSelectedField('notes_sensitive', $event)"
      @update:active-tab="detailTab = $event"
      @project-change="handleProjectChange"
      @category-change="handleCategoryChange"
      @status-change="handleStatusChange"
      @topic-change="handleTopicChange"
      @set-importance="setImportance"
      @update-start-date="updateStartDateFromPanel"
      @clear-start-date="clearStartDate"
      @update-end-date="updateEndDateFromPanel"
      @clear-end-date="clearEndDate"
      @update-due-date="updateDueDateFromPanel"
      @clear-due-date="clearDueDate"
      @update-recurrence-type="handleRecurrenceTypeChange"
      @update-recurrence-interval="handleRecurrenceIntervalChange"
      @update-recurrence-end-date="updateRecurrenceEndDateFromPanel"
      @clear-recurrence-end-date="clearRecurrenceEndDate"
      @toggle-subtask="toggleSubtask"
      @delete-subtask="deleteSubtask"
      @add-subtask="addSubtask"
      @reorder-subtasks="reorderSubtasks"
      @update-subtask-due-date="updateSubtaskDueDate"
      @update:new-subtask-title="newSubtaskTitle = $event"
      @select-linked="selectTodo"
      @unlink="unlinkFrom"
      @toggle-link-search="showLinkSearch = !showLinkSearch"
      @update:link-query="linkQuery = $event; searchForLinks()"
      @link-to="linkTo"
      @assign-person="assignPerson"
      @unassign-person="unassignPerson"
      @create-person="createAndAssignPerson"
      @toggle-person-picker="showPersonPicker = !showPersonPicker"
      @open-settings="openSettings"
      @open-person="openPersonDetails"
      @reveal-notes="revealNotes"
      @markdown-click="handleMarkdownClick"
      @update-milestone-date="updateMilestoneDate"
      @clear-milestone-date="clearMilestoneDate"
      @select-child="selectTodo"
      @add-tag="addTodoTag"
      @remove-tag="removeTodoTag"
    />
    </div>

    <!-- Global Search -->
    <GlobalSearch
      :visible="showGlobalSearch"
      @close="showGlobalSearch = false"
      @select-todo="onGlobalSearchSelectTodo"
      @select-person="onGlobalSearchSelectPerson"
      @select-project="onGlobalSearchSelectProject"
    />
  </div>
</template>

<script>
import { renderMarkdown, renderCardMarkdown, renderInlineMarkdown, marked } from './utils/markdown.js'
import mermaid from 'mermaid'
import * as d3Force from 'd3-force'
import draggable from 'vuedraggable'
import PersonsView from './PersonsView.vue'
import CalendarView from './components/CalendarView.vue'
import GlobalSearch from './components/GlobalSearch.vue'
import MainTabs from './components/MainTabs.vue'
import { AppSidebar, CardsView, CategoryModal, DetailPanel, KanbanView, StatusModal, ProjectModal, TableView } from './components/index.js'
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

// Validate and repair localStorage on startup
const SETTINGS_VERSION = 1
function validateLocalStorage() {
  try {
    const _storedVersion = parseInt(localStorage.getItem('settings-version') || '0')

    // Define valid values for enum-like settings
    const validViews = ['cards', 'table', 'kanban', 'timeline', 'calendar', 'graph', 'persons']
    const validSorts = ['manual', 'created', 'end_date', 'alpha', 'importance']
    const validThemes = ['dark', 'light']
    const validLayouts = ['auto', 'horizontal', 'vertical']

    // Validate current-view
    const currentView = localStorage.getItem('current-view')
    if (currentView && !validViews.includes(currentView)) {
      console.warn('Invalid current-view, resetting to cards')
      localStorage.setItem('current-view', 'cards')
    }

    // Validate sort-by
    const sortBy = localStorage.getItem('sort-by')
    if (sortBy && !validSorts.includes(sortBy)) {
      console.warn('Invalid sort-by, resetting to manual')
      localStorage.setItem('sort-by', 'manual')
    }

    // Validate theme
    const theme = localStorage.getItem('todo-theme')
    if (theme && !validThemes.includes(theme)) {
      console.warn('Invalid theme, resetting to dark')
      localStorage.setItem('todo-theme', 'dark')
    }

    // Validate detail-layout
    const layout = localStorage.getItem('detail-layout')
    if (layout && !validLayouts.includes(layout)) {
      console.warn('Invalid detail-layout, resetting to auto')
      localStorage.setItem('detail-layout', 'auto')
    }

    // Validate JSON settings
    const jsonSettings = ['card-sizes-v2', 'card-widths']
    for (const key of jsonSettings) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          JSON.parse(value)
        } catch {
          console.warn(`Invalid JSON in ${key}, resetting`)
          localStorage.removeItem(key)
        }
      }
    }

    // Validate numeric settings
    const cardColumns = localStorage.getItem('card-columns')
    if (cardColumns && (isNaN(parseInt(cardColumns)) || parseInt(cardColumns) < 1 || parseInt(cardColumns) > 10)) {
      console.warn('Invalid card-columns, resetting')
      localStorage.removeItem('card-columns')
    }

    // Update version
    localStorage.setItem('settings-version', String(SETTINGS_VERSION))
  } catch (e) {
    console.error('Error validating localStorage, clearing all settings:', e)
    // If something goes very wrong, clear problematic keys
    const keysToPreserve = [] // Could preserve some keys if needed
    const allKeys = Object.keys(localStorage)
    for (const key of allKeys) {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key)
      }
    }
  }
}

// Run validation before anything else
validateLocalStorage()

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
      secondaryColor: '#0d0d0d',
      tertiaryColor: '#1a1f2e',
      background: '#1a1a1a',
      mainBkg: '#0d0d0d',
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
    PersonsView,
    CalendarView,
    MainTabs,
    AppSidebar,
    CardsView,
    CategoryModal,
    DetailPanel,
    GlobalSearch,
    KanbanView,
    StatusModal,
    ProjectModal,
    TableView,
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
      tabViews: JSON.parse(localStorage.getItem('tab-views') || '{}'),
      activeTab: localStorage.getItem('active-tab') || 'todos',
      hideCompleted: localStorage.getItem('hide-completed') === 'true',
      kanbanGroupBy: 'status',
      newTodoTitle: '',
      newPersonName: '',
      splitNoteTitle: '',
      splitTodoTitle: '',
      splitNotesView: localStorage.getItem('split-notes-view') || 'list',
      splitTopicFilter: 'all',
      splitDropTarget: null,
      splitIsSelecting: false,
      splitSelectionStart: { x: 0, y: 0 },
      splitSelectionCurrent: { x: 0, y: 0 },
      splitExpandedTodos: new Set(),
      newProjectName: '',
      newCategoryName: '',
      newStatusName: '',
      showProjectInput: false,
      showCategoryInput: false,
      showStatusInput: false,
      editingProject: null,
      editingProjectTags: [],
      editingCategory: null,
      editingStatus: null,
      selectedTodo: null,
      selectedTodoIds: new Set(),
      detailFullscreen: localStorage.getItem('detail-fullscreen') === 'true',
      linkedTodos: [],
      childTodos: [],
      subtasks: [],
      milestoneRelations: {}, // { milestoneId: { todos: [], persons: [] } }
      allSubtasksMap: {},
      newSubtaskTitle: '',
      detailTab: 'edit',
      showLinkSearch: false,
      linkQuery: '',
      linkResults: [],
      assignedPersons: [],
      todoTags: [],
      allTags: [],
      showPersonPicker: false,
      showStakeholderPicker: false,
      saveTimeout: null,
      sortBy: localStorage.getItem('sort-by') || 'manual',
      groupByProject: localStorage.getItem('group-by-project') === 'true',
      cardColumns: parseInt(localStorage.getItem('card-columns')) || 3,
      cardSizes: JSON.parse(localStorage.getItem('card-sizes-v2') || '{}'),
      cardWidths: JSON.parse(localStorage.getItem('card-widths') || '{}'),
      justResizedCard: false,
      cardMouseDownHeight: null,
      gridLock: localStorage.getItem('grid-lock') === 'true',
      timezone: localStorage.getItem('timezone') || 'auto',
      gridSize: 100,
      filterProjectId: null,
      filterCategoryId: null,
      importanceFilterOp: 'none',
      importanceFilterValue: 3,
      timelineScale: 100,
      timelineMode: 'gantt',
      calendarDate: new Date(),
      timelineOffset: 0,
      ganttGroupBy: 'project',
      draggingBarId: null,
      draggingBarTodo: null,
      barDragStartX: 0,
      barDragStartY: 0,
      barDragMode: 'move',
      barDragOriginalDates: null,
      lastDeltaDays: 0,
      dropTargetRowId: null,
      graphLinkMode: false,
      graphLinkSource: null,
      editingNodeId: null,
      editingNodeNotes: '',
      editingNodeTitle: '',
      graphWidth: 1600,
      graphHeight: 1200,
      nodePositions: {},
      allLinks: [],
      graphZoom: 1,
      graphPan: { x: 0, y: 0 },
      draggingNode: null,
      wasDragging: false,
      creatingNodeFromId: null,
      linkingNodeId: null,
      altClickSourceId: null,
      dragOffset: { x: 0, y: 0 },
      selectedNodeIds: [],
      isPanning: false,
      lastMousePos: { x: 0, y: 0 },
      hoveredNode: null,
      linkContextMenu: null,
      hoveredLink: null,
      selectedLink: null,
      mousePos: { x: 0, y: 0 },
      isSimulating: false,
      // View transition properties
      viewTransitionDirection: 'forward',
      previousViewIndex: 0,
      projectTransitionDirection: 'forward',
      previousProjectFilter: null,
      tabTransitionDirection: 'forward',
      projectColors: [
        // Blues
        '#1a73e8', '#4285f4', '#0d47a1', '#039be5', '#00acc1',
        // Greens
        '#0f9d58', '#34a853', '#00897b', '#43a047', '#7cb342',
        // Reds & Pinks
        '#d93025', '#ea4335', '#c2185b', '#e91e63', '#f06292',
        // Oranges & Yellows
        '#f9a825', '#ff8f00', '#ef6c00', '#ff7043', '#ffb300',
        // Purples
        '#7b1fa2', '#9c27b0', '#673ab7', '#5e35b1', '#7e57c2',
        // Neutrals
        '#455a64', '#607d8b', '#78909c', '#546e7a', '#37474f'
      ],
      categorySymbols: [
        'Folder', 'Home', 'Briefcase', 'ShoppingCart', 'Heart', 'BookOpen', 'Target', 'Star',
        'Calendar', 'Clock', 'Tag', 'Flag', 'Bookmark', 'Zap', 'Coffee', 'Music',
        'Camera', 'Film', 'MessageCircle', 'Mail', 'Phone', 'Users', 'User', 'Settings',
        'Bell', 'Gift', 'Award', 'Trophy', 'Crown', 'AlertCircle', 'Info', 'HelpCircle'
      ],
      statusColors: [
        // Blues
        '#1a73e8', '#4285f4', '#0d47a1', '#039be5', '#00acc1',
        // Greens
        '#0f9d58', '#34a853', '#00897b', '#43a047', '#7cb342',
        // Reds & Pinks
        '#d93025', '#ea4335', '#c2185b', '#e91e63', '#f06292',
        // Oranges & Yellows
        '#f9a825', '#ff8f00', '#ef6c00', '#ff7043', '#ffb300',
        // Purples
        '#7b1fa2', '#9c27b0', '#673ab7', '#5e35b1', '#7e57c2',
        // Neutrals
        '#455a64', '#607d8b', '#78909c', '#546e7a', '#37474f'
      ],
      // Resize state
      isResizing: false,
      detailWidth: 600,
      detailHeight: 50,
      isVerticalLayout: false,
      detailLayoutPreference: localStorage.getItem('detail-layout') || 'auto', // 'auto', 'horizontal', 'vertical'
      // Graph layout parameters
      // d3-force parameters
      graphRepulsion: parseInt(localStorage.getItem('graph-repulsion')) || -800,
      graphEdgeLength: parseInt(localStorage.getItem('graph-edge-length')) || 200,
      graphLayoutType: localStorage.getItem('graph-layout-type') || 'force',
      showGraphSettings: false,
      showPersonsInGraph: localStorage.getItem('show-persons-in-graph') === 'true',
      graphTypeFilter: localStorage.getItem('graph-type-filter') || 'all',
      orthogonalEdges: localStorage.getItem('orthogonal-edges') === 'true',
      todoPersons: {},
      d3Simulation: null,
      // Theme
      theme: localStorage.getItem('todo-theme') || 'dark',
      openTodosInWindow: localStorage.getItem('todo-open-mode') === 'window',
      notesRevealed: false,
      // Sidebar visibility
      sidebarVisible: localStorage.getItem('sidebar-visible') !== 'false',
      sidebarPinned: localStorage.getItem('sidebar-pinned') === 'true',
      categoriesCollapsed: localStorage.getItem('categories-collapsed') === 'true',
      statusesCollapsed: localStorage.getItem('statuses-collapsed') === 'true',
      personsCollapsed: localStorage.getItem('persons-collapsed') !== 'false',
      settingsCollapsed: localStorage.getItem('settings-collapsed') !== 'false',
      // Trash
      trashCount: 0,
      // Keyboard navigation
      focusedTodoIndex: -1,
      // Global search
      showGlobalSearch: false,
      // Type filter
      typeFilter: localStorage.getItem('type-filter') || 'all',
      // Export/Import
      showImportDialog: false,
      databasePath: '',
      // Persons/Stakeholders
      persons: [],
      projectPersons: {},
      showProjectPersonPicker: false,
      pendingPersonEdit: null,
      // Project Topics (buckets)
      projectTopics: [],
      selectedTopicId: null,
      showTopicInput: false,
      newTopicName: '',
      editingTopic: null,
      topicsExpanded: true,
      dragOverTopicId: null,
      // History state
      historyState: {
        canUndo: false,
        canRedo: false,
        undoDescription: null,
        redoDescription: null
      },
      // Help modal
      showHelpModal: false,
      // ResizeObserver
      cardResizeObserver: null,
      resizeObserverTimeout: null
    }
  },
  computed: {
    currentView: {
      get() {
        const view = this.tabViews[this.activeTab]
        if (view && this.availableViews.includes(view)) {
          return view
        }
        return this.availableViews[0] || 'cards'
      },
      set(val) {
        this.tabViews[this.activeTab] = val
        localStorage.setItem('tab-views', JSON.stringify(this.tabViews))
      }
    },
    currentProjectColor() {
      if (this.currentFilter && this.currentFilter !== 'inbox' && this.currentFilter !== 'trash') {
        const project = this.projects.find(p => p.id === this.currentFilter)
        return project ? project.color : '#333'
      }
      return '#333'
    },
    isProjectSelected() {
      return typeof this.currentFilter === 'number'
    },
    effectiveKanbanGroupBy() {
      // When project is selected, allow category or status (not project)
      if (this.isProjectSelected && this.kanbanGroupBy === 'project') {
        return 'category'
      }
      return this.kanbanGroupBy
    },
    currentTitle() {
      if (this.currentFilter === null) return 'Todos'
      if (this.currentFilter === 'inbox') return 'Inbox'
      if (this.currentFilter === 'trash') return 'Trash'
      if (this.currentFilter === 'persons') return 'Persons'
      const project = this.projects.find(p => p.id === this.currentFilter)
      const projectName = project ? project.name : 'Todos'
      // Add topic name to breadcrumb when filtered
      if (this.selectedTopicId !== null) {
        const topic = this.projectTopics.find(t => t.id === this.selectedTopicId)
        if (topic) {
          return `${projectName} / ${topic.name}`
        }
      }
      return projectName
    },
    isTrashView() {
      return this.currentFilter === 'trash'
    },
    currentProjectName() {
      if (!this.isProjectSelected) return ''
      const project = this.projects.find(p => p.id === this.currentFilter)
      return project ? project.name : ''
    },
    currentTopicName() {
      if (this.selectedTopicId === null) return ''
      const topic = this.projectTopics.find(t => t.id === this.selectedTopicId)
      return topic ? topic.name : ''
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
    selectedProjectStakeholders() {
      if (!this.isProjectSelected) return []
      return this.projectPersons[this.currentFilter] || []
    },
    availableStakeholders() {
      if (!this.isProjectSelected) return this.persons
      const assigned = this.selectedProjectStakeholders.map(p => p.id)
      return this.persons.filter(p => !assigned.includes(p.id))
    },
    filteredAvailableStakeholders() {
      if (!this.newPersonName.trim()) return this.availableStakeholders
      const query = this.newPersonName.toLowerCase().trim()
      return this.availableStakeholders.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.role && p.role.toLowerCase().includes(query))
      )
    },
    hasExactStakeholderMatch() {
      if (!this.newPersonName.trim()) return false
      const query = this.newPersonName.toLowerCase().trim()
      return this.persons.some(p => p.name.toLowerCase() === query)
    },
    selectedTodoTopics() {
      // Return topics for the selected todo's project
      if (!this.selectedTodo?.project_id) return []
      // If viewing the same project, use cached topics
      if (this.selectedTodo.project_id === this.currentFilter) {
        return this.projectTopics
      }
      // Otherwise return empty - we'd need async load for different project
      return this.projectTopics
    },
    allCount() {
      return this.allTodos.length
    },
    inboxCount() {
      return this.allTodos.filter(t => !t.project_id).length
    },
    projectCounts() {
      const counts = {}
      for (const project of this.projects) {
        counts[project.id] = this.allTodos.filter(t => t.project_id === project.id).length
      }
      return counts
    },
    statusCounts() {
      const counts = {}
      for (const status of this.statuses) {
        counts[status.id] = this.allTodos.filter(t => t.status_id === status.id).length
      }
      return counts
    },
    categoryCounts() {
      const counts = {}
      for (const category of this.categories) {
        counts[category.id] = this.allTodos.filter(t => t.category_id === category.id).length
      }
      return counts
    },
    topicCounts() {
      const counts = {}
      for (const topic of this.projectTopics) {
        counts[topic.id] = this.todos.filter(t => t.topic_id === topic.id).length
      }
      return counts
    },
    // Tab-related computed properties
    notesCount() {
      const todos = this.isProjectSelected
        ? this.allTodos.filter(t => t.project_id === this.currentFilter)
        : this.allTodos
      return todos.filter(t => t.type === 'note' && !t.deleted_at).length
    },
    todosCount() {
      const todos = this.isProjectSelected
        ? this.allTodos.filter(t => t.project_id === this.currentFilter)
        : this.allTodos
      return todos.filter(t => (t.type === 'todo' || t.type === 'milestone') && !t.deleted_at).length
    },
    milestonesCount() {
      const todos = this.isProjectSelected
        ? this.allTodos.filter(t => t.project_id === this.currentFilter)
        : this.allTodos
      return todos.filter(t => t.type === 'milestone' && !t.deleted_at).length
    },
    stakeholdersCount() {
      if (this.isProjectSelected) {
        return this.selectedProjectStakeholders.length
      }
      return this.persons.length
    },
    availableViews() {
      const views = {
        notes: ['cards', 'graph'],
        todos: ['cards', 'table', 'kanban', 'timeline'],
        split: ['cards'],
        stakeholders: ['cards', 'table']
      }
      return views[this.activeTab] || ['cards']
    },
    currentViewIndex() {
      return this.availableViews.indexOf(this.currentView)
    },
    viewTransitionName() {
      return this.viewTransitionDirection === 'forward' ? 'cube' : 'cube-reverse'
    },
    projectTransitionName() {
      return this.projectTransitionDirection === 'forward' ? 'project-cube' : 'project-cube-reverse'
    },
    projectTransitionKey() {
      // Generate a key that changes when project changes
      return `project-${this.currentFilter}`
    },
    tabTransitionName() {
      return this.tabTransitionDirection === 'forward' ? 'tab-slide' : 'tab-slide-reverse'
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
      return renderMarkdown(this.selectedTodo.notes)
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
      if (this.sortBy === 'created') {
        sorted.sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at)
        })
      } else if (this.sortBy === 'end_date') {
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
      console.log('filteredTodos - activeTab:', this.activeTab, 'currentFilter:', this.currentFilter, 'allTodos count:', this.allTodos.length, 'todos count:', this.todos.length)
      console.log('Types in allTodos:', [...new Set(this.allTodos.map(t => t.type))])
      if (this.filterProjectId !== null) {
        todos = todos.filter(t => t.project_id === this.filterProjectId)
      }
      if (this.filterCategoryId !== null) {
        todos = todos.filter(t => t.category_id === this.filterCategoryId)
      }
      // Filter by selected topic
      if (this.selectedTopicId !== null) {
        todos = todos.filter(t => t.topic_id === this.selectedTopicId)
      }
      // Filter by active tab
      if (this.activeTab === 'notes') {
        todos = todos.filter(t => t.type === 'note')
        console.log('After notes filter:', todos.length)
      } else if (this.activeTab === 'todos') {
        todos = todos.filter(t => t.type === 'todo' || t.type === 'milestone')
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
    // Split view computed properties
    splitNotes() {
      let todos = this.currentFilter === null ? this.allTodos : this.todos
      todos = todos.filter(t => t.type === 'note')
      if (this.hideCompleted) {
        todos = todos.filter(t => !t.completed)
      }
      if (this.splitTopicFilter === 'none') {
        todos = todos.filter(t => !t.topic_id)
      } else if (this.splitTopicFilter !== 'all') {
        todos = todos.filter(t => t.topic_id === this.splitTopicFilter)
      }
      return todos
    },
    splitTodos() {
      let todos = this.currentFilter === null ? this.allTodos : this.todos
      todos = todos.filter(t => t.type === 'todo' || t.type === 'milestone')
      if (this.hideCompleted) {
        todos = todos.filter(t => !t.completed)
      }
      if (this.splitTopicFilter === 'none') {
        todos = todos.filter(t => !t.topic_id)
      } else if (this.splitTopicFilter !== 'all') {
        todos = todos.filter(t => t.topic_id === this.splitTopicFilter)
      }
      return todos
    },
    splitNoteTopicGroups() {
      if (!this.isProjectSelected || this.projectTopics.length === 0) return []
      const notes = this.splitNotes
      const groups = []
      // No topic group first
      const noTopic = notes.filter(n => !n.topic_id)
      groups.push({ id: null, name: 'No Topic', color: '#666', todos: noTopic })
      // Topic groups
      for (const topic of this.projectTopics) {
        const topicNotes = notes.filter(n => n.topic_id === topic.id)
        groups.push({ id: topic.id, name: topic.name, color: topic.color, todos: topicNotes })
      }
      return groups
    },
    splitHasTopics() {
      return this.isProjectSelected && this.projectTopics.length > 0
    },
    splitSelectionBoxStyle() {
      const left = Math.min(this.splitSelectionStart.x, this.splitSelectionCurrent.x)
      const top = Math.min(this.splitSelectionStart.y, this.splitSelectionCurrent.y)
      const width = Math.abs(this.splitSelectionCurrent.x - this.splitSelectionStart.x)
      const height = Math.abs(this.splitSelectionCurrent.y - this.splitSelectionStart.y)
      return {
        left: left + 'px',
        top: top + 'px',
        width: width + 'px',
        height: height + 'px'
      }
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
    calendarPeriodLabel() {
      const opts = { month: 'long', year: 'numeric' }
      if (this.timelineMode === 'day') {
        return this.calendarDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      } else if (this.timelineMode === 'week') {
        const start = this.getWeekStart(this.calendarDate)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      }
      return this.calendarDate.toLocaleDateString('en-US', opts)
    },
    calendarMonthDays() {
      const year = this.calendarDate.getFullYear()
      const month = this.calendarDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startPadding = firstDay.getDay()
      const days = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      for (let i = startPadding - 1; i >= 0; i--) {
        const date = new Date(year, month, -i)
        days.push({ date: this.formatDateKey(date), dayNumber: date.getDate(), isCurrentMonth: false, isToday: date.getTime() === today.getTime(), isWeekend: date.getDay() === 0 || date.getDay() === 6 })
      }
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d)
        days.push({ date: this.formatDateKey(date), dayNumber: d, isCurrentMonth: true, isToday: date.getTime() === today.getTime(), isWeekend: date.getDay() === 0 || date.getDay() === 6 })
      }
      const remaining = 42 - days.length
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i)
        days.push({ date: this.formatDateKey(date), dayNumber: i, isCurrentMonth: false, isToday: date.getTime() === today.getTime(), isWeekend: date.getDay() === 0 || date.getDay() === 6 })
      }
      return days
    },
    calendarWeekDays() {
      const start = this.getWeekStart(this.calendarDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const days = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        days.push({ date: this.formatDateKey(date), dayName: date.toLocaleDateString('en-US', { weekday: 'short' }), dayNumber: date.getDate(), isToday: date.getTime() === today.getTime(), isWeekend: date.getDay() === 0 || date.getDay() === 6 })
      }
      return days
    },
    calendarDayTodos() {
      return this.getTodosForCalendarDate(this.formatDateKey(this.calendarDate))
    },
    dateLabelInterval() {
      // Determine how many days to skip between labels based on zoom level
      if (this.timelineScale >= 80) return 1      // Show every day
      if (this.timelineScale >= 40) return 2      // Every 2 days
      if (this.timelineScale >= 25) return 7      // Weekly
      return 14                                    // Every 2 weeks
    },
    graphNodes() {
      // Use allTodos filtered by graphTypeFilter instead of tab-based filtering
      let todos = [...this.allTodos]

      // Apply type filter from graph settings
      if (this.graphTypeFilter === 'notes') {
        todos = todos.filter(t => t.type === 'note')
      } else if (this.graphTypeFilter === 'todos') {
        todos = todos.filter(t => t.type === 'todo' || t.type === 'milestone')
      }
      // 'all' shows both notes and todos

      // Apply project filter
      if (this.currentFilter === null || this.currentFilter === 'inbox') {
        todos = todos.filter(t => t.project_id === null)
      } else if (typeof this.currentFilter === 'number') {
        todos = todos.filter(t => t.project_id === this.currentFilter)
      }

      // Apply hideCompleted filter
      if (this.hideCompleted) {
        todos = todos.filter(t => !t.completed)
      }

      const nodes = [...todos]

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
      // Use graphNodes to get the actual visible todo IDs (respects project filtering)
      const todoIds = new Set(this.graphNodes.filter(n => n.type !== 'person').map(t => t.id))
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
      } else if (this.ganttGroupBy === 'milestone') {
        // Milestones are todos with type='milestone'
        const milestones = todos.filter(t => t.type === 'milestone')

        // Collect all todo IDs that are assigned to any milestone
        const assignedTodoIds = new Set()
        for (const milestone of milestones) {
          const rel = this.milestoneRelations[milestone.id]
          if (rel?.todos) {
            rel.todos.forEach(t => assignedTodoIds.add(t.id))
          }
        }

        // Unassigned todos (not milestones themselves, not linked to any milestone)
        const unassignedTodos = todos.filter(t => t.type !== 'milestone' && !assignedTodoIds.has(t.id))

        // Unassigned todos row
        if (unassignedTodos.length > 0) {
          const { todoLanes, laneCount } = assignLanes(unassignedTodos)
          rows.push({ id: 'unassigned', name: 'Unassigned', color: '#666', todos: unassignedTodos, todoLanes, laneCount })
        }

        // Milestone rows with their linked todos and persons
        for (const milestone of milestones) {
          const rel = this.milestoneRelations[milestone.id] || { todos: [], persons: [] }
          const linkedTodos = rel.todos || []
          const linkedPersons = rel.persons || []
          const milestoneTodos = [milestone, ...linkedTodos]
          if (milestoneTodos.length > 0) {
            const { todoLanes, laneCount } = assignLanes(milestoneTodos)
            rows.push({
              id: `milestone-${milestone.id}`,
              name: milestone.title,
              color: milestone.project_color || '#ffc107',
              todos: milestoneTodos,
              todoLanes,
              laneCount,
              isMilestone: true,
              milestone: milestone,
              persons: linkedPersons
            })
          }
        }
      }

      return rows
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
      // Determine transition direction based on view order
      const views = this.availableViews
      const oldIndex = views.indexOf(oldVal)
      const newIndex = views.indexOf(val)
      this.viewTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'
      this.previousViewIndex = oldIndex

      // Handle leaving graph view
      if (oldVal === 'graph') {
        this.stopForceLayout()
      }
      // Handle entering new view
      if (val === 'graph') {
        this.$nextTick(() => {
          this.updateGraphSize()
          this.initializeNodePositions()
        })
      } else if (val === 'cards') {
        this.$nextTick(() => {
          this.applyMasonryLayout()
        })
      } else if (val === 'timeline' && this.ganttGroupBy === 'milestone') {
        this.loadMilestoneRelations()
      }
    },
    activeTab(val, oldVal) {
      // Determine tab transition direction
      const tabOrder = ['todos', 'notes', 'stakeholders']
      const oldIndex = tabOrder.indexOf(oldVal)
      const newIndex = tabOrder.indexOf(val)
      this.tabTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'

      // Clear topic filter when switching tabs
      this.selectedTopicId = null
      // Load project stakeholders when switching to stakeholders tab
      if (val === 'stakeholders' && this.isProjectSelected) {
        this.loadProjectPersons(this.currentFilter)
      }
    },
    currentFilter(val, oldVal) {
      // Determine project transition direction
      const getFilterIndex = (filter) => {
        if (filter === null) return 0
        if (filter === 'inbox') return 1
        if (filter === 'trash') return 2
        if (filter === 'persons') return 3
        // For project IDs, find index in projects array
        const idx = this.projects.findIndex(p => p.id === filter)
        return idx >= 0 ? idx + 4 : 999
      }
      const oldIndex = getFilterIndex(oldVal)
      const newIndex = getFilterIndex(val)
      this.projectTransitionDirection = newIndex >= oldIndex ? 'forward' : 'reverse'
      this.previousProjectFilter = oldVal

      // Clear topic selection when project changes
      this.selectedTopicId = null
      // Load project topics when a project is selected
      if (typeof val === 'number') {
        this.loadProjectTopics(val)
      } else {
        this.projectTopics = []
      }
      // Load project stakeholders when project filter changes while in stakeholders tab
      if (this.activeTab === 'stakeholders' && typeof val === 'number') {
        this.loadProjectPersons(val)
      }
    },
    ganttGroupBy(val) {
      // Load milestone relations when grouping by milestone
      if (val === 'milestone' && this.currentView === 'timeline') {
        this.loadMilestoneRelations()
      }
    },
    sortedTodos() {
      if (this.currentView === 'cards') {
        this.applyMasonryLayout()
      }
    },
    groupedTodos() {
      if (this.currentView === 'cards') {
        this.applyMasonryLayout()
      }
    },
    sidebarVisible(val) {
      localStorage.setItem('sidebar-visible', val)
    },
    cardColumns(val) {
      localStorage.setItem('card-columns', val)
    },
    splitNotesView(val) {
      localStorage.setItem('split-notes-view', val)
    },
    isProjectSelected(val) {
      if (val && this.groupByProject) {
        this.groupByProject = false
      }
    },
    groupByProject(val) {
      localStorage.setItem('group-by-project', val)
    },
    sortBy(val) {
      localStorage.setItem('sort-by', val)
    },
    hoveredNode(val) {
      if (val && val.notes) {
        this.$nextTick(() => {
          this.renderTooltipMermaid()
        })
      }
    },
    detailTab(val) {
      if (val === 'preview' || val === 'split') {
        this.renderMermaid()
      }
    },
    renderedNotes() {
      if (this.detailTab === 'preview' || this.detailTab === 'split') {
        this.renderMermaid()
      }
    }
  },
  async mounted() {
    await this.loadProjects()
    await this.loadCategories()
    await this.loadStatuses()
    await this.loadPersons()
    await this.loadAllTags()
    await this.loadAllTodos()

    // Restore last used filter from localStorage
    const savedFilter = localStorage.getItem('current-filter')
    if (savedFilter) {
      try {
        const filter = JSON.parse(savedFilter)
        // Verify the filter is valid (project still exists if it's a number)
        if (filter === 'inbox' || filter === 'trash' || filter === 'persons') {
          this.currentFilter = filter
        } else if (typeof filter === 'number') {
          const projectExists = this.projects.some(p => p.id === filter)
          if (projectExists) {
            this.currentFilter = filter
          }
        }
      } catch (e) {
        console.warn('Failed to restore filter:', e)
      }
    }

    await this.loadTodos()
    await this.loadAllLinks()
    this.databasePath = await window.api.getDatabasePath()
    this.loadNodePositions()

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
      // Reapply masonry layout when todos are refreshed (e.g., after editing notes)
      if (this.currentView === 'cards') {
        this.applyMasonryLayout()
      }
    })

    // Close sidebar detail when opened in detached window
    window.api.onDetailOpenedInWindow((todoId) => {
      if (this.selectedTodo && this.selectedTodo.id === todoId) {
        this.selectedTodo = null
      }
    })

    // Open todo in embedded view when requested from detached window
    window.api.onEmbedTodo(async (todoId) => {
      await this.selectTodo(todoId)
    })

    // Check layout on mount and resize
    this.checkLayout()
    window.addEventListener('resize', this.checkLayout)
    window.addEventListener('resize', this.updateGraphSize)

    // Keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyDown)

    // Listen for history state changes (undo/redo)
    this.historyState = await window.api.getHistoryState()
    window.api.onHistoryChanged((state) => {
      this.historyState = state
    })

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

    // Set up ResizeObserver to watch for card size changes
    this.cardResizeObserver = new ResizeObserver((_entries) => {
      // Debounce the layout update
      if (this.resizeObserverTimeout) {
        clearTimeout(this.resizeObserverTimeout)
      }
      this.resizeObserverTimeout = setTimeout(() => {
        if (this.currentView === 'cards') {
          this.applyMasonryLayout()
        }
      }, 100)
    })

    // Start observing cards after initial render
    this.$nextTick(() => {
      this.observeCards()
    })
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkLayout)
    window.removeEventListener('resize', this.updateGraphSize)
    window.removeEventListener('keydown', this.handleKeyDown)
    this.stopForceLayout()
    if (this.cardResizeObserver) {
      this.cardResizeObserver.disconnect()
    }
  },
  methods: {
    renderCardMarkdown(text) {
      return renderCardMarkdown(text)
    },
    renderInlineMarkdown(text) {
      return renderInlineMarkdown(text)
    },
    onGroupByProjectChange() {
      if (this.currentView === 'cards') {
        this.$nextTick(() => {
          this.applyMasonryLayout()
        })
      }
    },
    revealNotes() {
      if (confirm('Are you sure you want to reveal the sensitive content?')) {
        this.notesRevealed = true
      }
    },
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
    toggleGridLock() {
      localStorage.setItem('grid-lock', this.gridLock.toString())
    },
    onGridLockChange(value) {
      this.gridLock = value
      localStorage.setItem('grid-lock', value.toString())
    },
    onTimezoneChange(value) {
      this.timezone = value
      localStorage.setItem('timezone', value)
    },
    onOpenTodosInWindowChange(value) {
      this.openTodosInWindow = value
      const mode = value ? 'window' : 'sidebar'
      localStorage.setItem('todo-open-mode', mode)
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
    // Project Topic methods
    async loadProjectTopics(projectId) {
      if (!projectId) {
        this.projectTopics = []
        return
      }
      this.projectTopics = await window.api.getProjectTopics(projectId)
    },
    selectTopic(topicId) {
      this.selectedTopicId = this.selectedTopicId === topicId ? null : topicId
    },
    getTopicCount(topicId) {
      return this.todos.filter(t => t.topic_id === topicId).length
    },
    async addTopic() {
      if (!this.newTopicName.trim() || !this.isProjectSelected) return
      const color = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProjectTopic(this.currentFilter, this.newTopicName.trim(), color)
      await this.loadProjectTopics(this.currentFilter)
      this.newTopicName = ''
      this.showTopicInput = false
    },
    async updateTopic(topic) {
      await window.api.updateProjectTopic(topic)
      await this.loadProjectTopics(this.currentFilter)
      this.editingTopic = null
    },
    async deleteTopic(topicId) {
      if (!confirm('Delete this topic? Items will be unassigned from it.')) return
      await window.api.deleteProjectTopic(topicId)
      if (this.selectedTopicId === topicId) {
        this.selectedTopicId = null
      }
      await this.loadProjectTopics(this.currentFilter)
      await this.loadTodos()
    },
    async addTopicFromSidebar(name) {
      if (!name.trim() || !this.isProjectSelected) return
      const color = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProjectTopic(this.currentFilter, name.trim(), color)
      await this.loadProjectTopics(this.currentFilter)
    },
    editTopic(topic) {
      // Simple rename dialog for now
      const newName = prompt('Rename topic:', topic.name)
      if (newName && newName.trim() !== topic.name) {
        this.updateTopic({ ...topic, name: newName.trim() })
      }
    },
    async dropOnTopic(event, topicId) {
      this.dragOverTopicId = null
      const todoId = parseInt(event.dataTransfer.getData('text/plain'))
      if (!todoId) return
      const todo = this.allTodos.find(t => t.id === todoId)
      if (!todo) return
      // Update the todo's topic_id
      await window.api.updateTodo({ ...todo, topic_id: topicId })
      await this.loadAllTodos()
    },
    async handleDropOnTopic(todoIds, topicId) {
      // Handle both single ID (legacy) and array of IDs
      const ids = Array.isArray(todoIds) ? todoIds : [todoIds]
      console.log('handleDropOnTopic called:', ids, topicId)

      for (const todoId of ids) {
        const todo = this.allTodos.find(t => t.id === todoId)
        if (!todo) {
          console.log('Todo not found:', todoId)
          continue
        }
        console.log('Updating todo:', todo.id, 'from topic', todo.topic_id, 'to', topicId)
        await window.api.updateTodo({ ...todo, topic_id: topicId })

        // Directly update local state for immediate reactivity
        const allTodoIndex = this.allTodos.findIndex(t => t.id === todoId)
        if (allTodoIndex !== -1) {
          this.allTodos[allTodoIndex] = { ...this.allTodos[allTodoIndex], topic_id: topicId }
        }
        const todoIndex = this.todos.findIndex(t => t.id === todoId)
        if (todoIndex !== -1) {
          this.todos[todoIndex] = { ...this.todos[todoIndex], topic_id: topicId }
        }
      }

      // Trigger reactivity by reassigning arrays
      this.allTodos = [...this.allTodos]
      this.todos = [...this.todos]

      // Clear multi-selection after drop
      this.selectedTodoIds.clear()
      this.selectedTodoIds = new Set()

      console.log('handleDropOnTopic completed for', ids.length, 'items')
    },
    async addTopicFromCards(name) {
      if (!name.trim() || !this.isProjectSelected) return
      const color = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProjectTopic(this.currentFilter, name.trim(), color)
      await this.loadProjectTopics(this.currentFilter)
    },
    async addTodoToTopic(topicId) {
      const projectId = this.isProjectSelected ? this.currentFilter : null
      const type = this.activeTab === 'notes' ? 'note' : 'todo'
      const todo = await window.api.createTodo('Untitled', projectId, type)
      if (todo && topicId !== null && topicId !== undefined) {
        await window.api.updateTodo({ ...todo, topic_id: topicId })
      }
      await this.loadAllTodos()
      await this.loadTodos()
      this.selectTodo(todo.id)
    },
    async loadAllTodos() {
      this.allTodos = await window.api.getTodos(null)
      // Debug: check if notes_sensitive is being loaded
      const sensitiveTodos = this.allTodos.filter(t => t.notes_sensitive)
      if (sensitiveTodos.length > 0) {
        console.log('Found', sensitiveTodos.length, 'sensitive todos:', sensitiveTodos.map(t => ({ id: t.id, title: t.title, notes_sensitive: t.notes_sensitive })))
      }
      this.trashCount = await window.api.getTrashCount()
      await this.loadAllSubtasks()
    },
    async loadAllSubtasks() {
      const subtasks = await window.api.getAllSubtasks()
      console.log('Loaded subtasks:', subtasks.length, subtasks)
      const map = {}
      for (const subtask of subtasks) {
        if (!map[subtask.todo_id]) {
          map[subtask.todo_id] = []
        }
        map[subtask.todo_id].push(subtask)
      }
      console.log('Subtasks map:', map)
      this.allSubtasksMap = map
    },
    async loadTodos() {
      this.todos = await window.api.getTodos(this.currentFilter)
    },
    async loadMilestoneRelations() {
      // Load todos and persons for all milestones
      const milestones = this.allTodos.filter(t => t.type === 'milestone')
      const relations = {}
      for (const milestone of milestones) {
        const [todos, persons] = await Promise.all([
          window.api.getMilestoneTodos(milestone.id),
          window.api.getMilestonePersons(milestone.id)
        ])
        relations[milestone.id] = { todos, persons }
      }
      this.milestoneRelations = relations
    },
    renderCardNotes(notes) {
      if (!notes) return ''
      // Strip mermaid code blocks and replace with placeholder (for performance)
      const processed = notes.replace(/```mermaid[\s\S]*?```/g, '[diagram]')
      // Render full notes - CSS handles overflow with scrolling for resizable cards
      return renderCardMarkdown(processed)
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
    updateProjectTodos(_projectId, _todos) {
      // Used by draggable for reactive updates
    },
    updateCategoryTodos(_categoryId, _todos) {
      // Used by draggable for reactive updates
    },
    updateStatusTodos(_statusId, _todos) {
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
    async onStackedKanbanDrop(event, projectId, statusId) {
      const todoId = event.item?.__draggable_context?.element?.id
      if (!todoId) return

      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo) {
        const todoData = this.toPlainTodo(todo)
        // Update status based on where it was dropped
        todoData.status_id = statusId
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async setFilter(filter) {
      this.currentFilter = filter
      // Save current filter to localStorage
      if (filter === null) {
        localStorage.removeItem('current-filter')
      } else {
        localStorage.setItem('current-filter', JSON.stringify(filter))
      }
      await this.loadTodos()
      // Load project-specific graph settings and positions
      this.loadGraphSettings()
      this.loadNodePositions()
      // Update graph person data when filter changes
      if (this.showPersonsInGraph) {
        await this.updateGraphData()
      }
      // Load stakeholders if in stakeholders view and a project is selected
      if (this.currentView === 'stakeholders' && typeof filter === 'number') {
        await this.loadProjectPersons(filter)
      }
    },
    async addTodo() {
      if (!this.newTodoTitle.trim()) return
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      // Type is determined by the active tab: notes = note, todos = todo
      const type = this.activeTab === 'notes' ? 'note' : 'todo'
      const todo = await window.api.createTodo(this.newTodoTitle.trim(), projectId, type)
      // If a topic is selected, assign the new todo to that topic
      if (todo && this.selectedTopicId !== null) {
        await window.api.updateTodo({ ...todo, topic_id: this.selectedTopicId })
      }
      this.newTodoTitle = ''
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async addMilestone() {
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      try {
        const milestone = await window.api.createTodo('New Milestone', projectId, 'milestone')
        await this.loadAllTodos()
        await this.loadTodos()
        if (milestone && milestone.id) this.selectTodo(milestone.id)
      } catch (e) {
        console.error('Failed to create milestone:', e)
      }
    },
    async addSplitNote() {
      if (!this.splitNoteTitle.trim()) return
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      await window.api.createTodo(this.splitNoteTitle.trim(), projectId, 'note')
      this.splitNoteTitle = ''
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async addSplitTodo() {
      if (!this.splitTodoTitle.trim()) return
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      await window.api.createTodo(this.splitTodoTitle.trim(), projectId, 'todo')
      this.splitTodoTitle = ''
      await this.loadAllTodos()
      await this.loadTodos()
    },
    toggleSplitExpand(todoId) {
      if (this.splitExpandedTodos.has(todoId)) {
        this.splitExpandedTodos.delete(todoId)
      } else {
        this.splitExpandedTodos.add(todoId)
        this.loadSubtasksForTodo(todoId)
      }
      this.splitExpandedTodos = new Set(this.splitExpandedTodos)
    },
    getSplitSubtasks(todoId) {
      return this.subtasksMap[todoId] || []
    },
    // Split view drag-drop handlers
    onSplitItemDragStart(event, item) {
      event.dataTransfer.setData('text/plain', JSON.stringify([item.id]))
      event.dataTransfer.effectAllowed = 'move'
    },
    onSplitDragEnter(target) {
      this.splitDropTarget = target
    },
    onSplitDragLeave(event) {
      // Only clear if leaving the panel entirely
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.splitDropTarget = null
      }
    },
    async onSplitDrop(event, targetType) {
      this.splitDropTarget = null
      try {
        const data = event.dataTransfer.getData('text/plain')
        const ids = JSON.parse(data)
        for (const id of ids) {
          const todo = this.allTodos.find(t => t.id === id)
          if (todo && todo.type !== targetType) {
            await window.api.updateTodo({ ...todo, type: targetType })
          }
        }
        await this.loadAllTodos()
        await this.loadTodos()
      } catch (e) {
        console.error('Split drop error:', e)
      }
    },
    async onSplitDragEnd(event, targetType) {
      const { from, to } = event
      // If moved between lists (from notes to todos or vice versa), change type
      if (from !== to) {
        // Get the dragged item from vuedraggable's context
        const draggedItem = event.item?.__draggable_context?.element
        if (draggedItem && draggedItem.type !== targetType) {
          await window.api.updateTodo({ ...draggedItem, type: targetType })
          await this.loadAllTodos()
          await this.loadTodos()
        }
      }
    },
    async onSplitTopicDragEnd(event, targetTopicId) {
      const { from, to } = event
      const draggedItem = event.item?.__draggable_context?.element
      if (!draggedItem) return

      // If moved to a different list (different topic or to todos panel)
      if (from !== to) {
        // Check if it was moved to the todos panel (type conversion)
        const toParent = to.parentElement?.closest('.split-todos')
        if (toParent) {
          // Converting note to todo
          await window.api.updateTodo({ ...draggedItem, type: 'todo', topic_id: null })
        } else {
          // Moving between topics - update topic_id
          await window.api.updateTodo({ ...draggedItem, topic_id: targetTopicId })
        }
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    // Split view lasso selection
    onSplitMouseDown(event) {
      const target = event.target
      const isInteractive = target.closest('.split-item, button, input, select, a, .split-add-row')
      if (isInteractive) return

      const container = this.$refs.splitPanelsRef
      if (!container) return
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left + container.scrollLeft
      const y = event.clientY - rect.top + container.scrollTop

      this.splitIsSelecting = true
      this.splitSelectionStart = { x, y }
      this.splitSelectionCurrent = { x, y }
      event.preventDefault()
    },
    onSplitMouseMove(event) {
      if (!this.splitIsSelecting) return

      const container = this.$refs.splitPanelsRef
      if (!container) return
      const rect = container.getBoundingClientRect()
      const x = event.clientX - rect.left + container.scrollLeft
      const y = event.clientY - rect.top + container.scrollTop

      this.splitSelectionCurrent = { x, y }
      this.updateSplitSelectionFromBox()
    },
    onSplitMouseUp() {
      if (!this.splitIsSelecting) return
      this.updateSplitSelectionFromBox()
      this.splitIsSelecting = false
    },
    updateSplitSelectionFromBox() {
      const container = this.$refs.splitPanelsRef
      if (!container) return

      const boxLeft = Math.min(this.splitSelectionStart.x, this.splitSelectionCurrent.x)
      const boxTop = Math.min(this.splitSelectionStart.y, this.splitSelectionCurrent.y)
      const boxRight = Math.max(this.splitSelectionStart.x, this.splitSelectionCurrent.x)
      const boxBottom = Math.max(this.splitSelectionStart.y, this.splitSelectionCurrent.y)

      // Skip if selection is too small
      if (boxRight - boxLeft < 10 && boxBottom - boxTop < 10) return

      const items = container.querySelectorAll('.split-item')
      const containerRect = container.getBoundingClientRect()
      const selectedIds = []

      items.forEach(item => {
        const itemRect = item.getBoundingClientRect()
        const itemLeft = itemRect.left - containerRect.left + container.scrollLeft
        const itemTop = itemRect.top - containerRect.top + container.scrollTop
        const itemRight = itemLeft + itemRect.width
        const itemBottom = itemTop + itemRect.height

        // Check if item intersects with selection box
        const intersects = !(itemRight < boxLeft || itemLeft > boxRight ||
                           itemBottom < boxTop || itemTop > boxBottom)
        if (intersects) {
          // Find the todo ID from the item's parent draggable context or data attribute
          const todoEl = item.closest('[data-id]') || item
          const todoId = parseInt(todoEl.dataset?.id)
          if (!todoId) {
            // Try to find ID from the click handler's todo reference
            const parentDraggable = item.parentElement?.closest('.split-draggable-list')
            if (parentDraggable) {
              const index = Array.from(parentDraggable.children).indexOf(item.parentElement || item)
              const allItems = [...this.splitTodos, ...this.splitNotes]
              if (index >= 0 && index < allItems.length) {
                // This is a rough approximation - proper implementation would need data-id
              }
            }
          }
          if (todoId) selectedIds.push(todoId)
        }
      })

      if (selectedIds.length > 0) {
        this.selectedTodoIds = new Set(selectedIds)
      }
    },
    async onSplitTopicDrop(event, topicId) {
      this.splitDropTarget = null
      try {
        const data = event.dataTransfer.getData('text/plain')
        const ids = JSON.parse(data)
        for (const id of ids) {
          const todo = this.allTodos.find(t => t.id === id)
          if (todo) {
            await window.api.updateTodo({ ...todo, topic_id: topicId })
          }
        }
        await this.loadAllTodos()
        await this.loadTodos()
      } catch (e) {
        console.error('Split topic drop error:', e)
      }
    },
    async createTodoOnDate(dateKey) {
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox'
        ? this.currentFilter
        : null
      try {
        const type = this.activeTab === 'notes' ? 'note' : 'todo'
        const todo = await window.api.createTodo('New Task', projectId, type)
        if (todo && todo.id) {
          await window.api.updateTodo({ id: todo.id, start_date: dateKey, end_date: dateKey })
          await this.loadAllTodos()
          await this.loadTodos()
          this.selectTodo(todo.id)
        }
      } catch (e) {
        console.error('Failed to create todo on date:', e)
      }
    },
    async addTodoToProject(projectId) {
      try {
        const type = this.activeTab === 'notes' ? 'note' : 'todo'
        const todo = await window.api.createTodo('Untitled', projectId, type)
        await this.loadAllTodos()
        await this.loadTodos()
        if (todo) this.selectTodo(todo)
      } catch (e) {
        console.error('Failed to create todo:', e)
      }
    },
    onTimelineChartDblClick(event) {
      // Only handle if clicked on empty area (not on a bar or row)
      if (event.target.closest('.gantt-bar') || event.target.closest('.gantt-row-bg')) {
        return // Let the row handler handle it
      }
      this.createTodoFromTimeline(event, null)
    },
    async createTodoFromTimeline(event, _row) {
      // Calculate date from click position
      const chartArea = this.$refs.ganttChartArea
      const rect = chartArea.getBoundingClientRect()
      const clickX = event.clientX - rect.left + this.timelineOffset
      const dayIndex = Math.floor(clickX / this.timelineScale)
      const startDate = new Date(this.timelineRange.start)
      startDate.setDate(startDate.getDate() + dayIndex)
      const dateStr = startDate.toISOString().split('T')[0]

      // Determine project ID - use current filter if it's a project
      const projectId = this.currentFilter !== null && this.currentFilter !== 'inbox' && this.currentFilter !== 'trash'
        ? this.currentFilter
        : null

      // Create todo and update with start date
      const type = this.activeTab === 'notes' ? 'note' : 'todo'
      const todo = await window.api.createTodo('New Todo', projectId, type)
      todo.start_date = dateStr
      const todoData = this.toPlainTodo(todo)
      await window.api.updateTodo(todoData)
      await this.loadAllTodos()
      await this.loadTodos()
      this.selectTodo(todo.id)
    },
    async addTodoToCategory(categoryId) {
      try {
        const projectId = this.isProjectSelected ? this.currentFilter : null
        const type = this.activeTab === 'notes' ? 'note' : 'todo'
        const todo = await window.api.createTodo('Untitled', projectId, type)
        if (categoryId !== null) {
          const todoData = this.toPlainTodo(todo)
          todoData.category_id = categoryId
          await window.api.updateTodo(todoData)
        }
        await this.loadAllTodos()
        await this.loadTodos()
        if (todo) this.selectTodo(todo)
      } catch (e) {
        console.error('Failed to create todo:', e)
      }
    },
    async addTodoToStatus(statusId) {
      try {
        const projectId = this.isProjectSelected ? this.currentFilter : null
        const type = this.activeTab === 'notes' ? 'note' : 'todo'
        const todo = await window.api.createTodo('Untitled', projectId, type)
        if (statusId !== null) {
          const todoData = this.toPlainTodo(todo)
          todoData.status_id = statusId
          await window.api.updateTodo(todoData)
        }
        await this.loadAllTodos()
        await this.loadTodos()
        if (todo) this.selectTodo(todo)
      } catch (e) {
        console.error('Failed to create todo:', e)
      }
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
    async deleteTodoFromGraph(id) {
      const todo = this.graphNodes.find(n => n.id === id)
      const title = todo?.title || 'this item'
      if (confirm(`Delete "${title}"?`)) {
        // Keep node position for undo - only remove on permanent delete
        await this.deleteTodo(id)
      }
    },
    async removePersonFromGraph(personNode) {
      const personId = personNode.personId
      const personName = personNode.title
      // Find all todos this person is connected to
      const connectedTodoIds = this.graphLinks
        .filter(l => l.type === 'person-todo' && l.source === personNode.id)
        .map(l => l.target)

      if (connectedTodoIds.length === 0) {
        // Not connected to anything, just hide by disabling persons in graph
        return
      }

      if (confirm(`Remove ${personName} from ${connectedTodoIds.length} item(s)?`)) {
        for (const todoId of connectedTodoIds) {
          await window.api.unlinkTodoPerson(todoId, personId)
        }
        await this.updateGraphData()
      }
    },
    handleNodeLinkClick(event) {
      // Check if clicked element is a link
      const link = event.target.closest('a')
      if (link && link.href) {
        event.preventDefault()
        event.stopPropagation()
        // Open link in default browser
        window.api.openExternal(link.href)
      }
    },
    handleNodeNotesClick(event, todo) {
      // Check if clicked element is a link
      const link = event.target.closest('a')
      if (link && link.href) {
        event.preventDefault()
        // Open link in default browser
        window.api.openExternal(link.href)
      } else {
        // Not a link - start editing
        this.startEditingNode(null, todo)
      }
    },
    async restoreTodo(id) {
      await window.api.restoreTodo(id)
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async permanentlyDeleteTodo(id) {
      await window.api.permanentlyDeleteTodo(id)
      // Remove node position on permanent delete (can't be undone)
      if (this.nodePositions[id]) {
        delete this.nodePositions[id]
        this.saveNodePositions()
      }
      if (this.selectedTodo?.id === id) {
        this.selectedTodo = null
      }
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async emptyTrash() {
      if (confirm('Are you sure you want to permanently delete all items in trash?')) {
        // Get trashed items before emptying to clean up positions
        const trashedIds = this.allTodos.filter(t => t.deleted).map(t => t.id)
        await window.api.emptyTrash()
        // Clean up node positions for permanently deleted items
        let positionsChanged = false
        trashedIds.forEach(id => {
          if (this.nodePositions[id]) {
            delete this.nodePositions[id]
            positionsChanged = true
          }
        })
        if (positionsChanged) {
          this.saveNodePositions()
        }
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
    async onGroupDragEnd(groupId, _event) {
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
      // Don't open detail if we just resized the card
      if (this.justResizedCard) {
        this.justResizedCard = false
        return
      }

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

      // Multi-select with Ctrl/Cmd+click
      if (event.ctrlKey || event.metaKey) {
        if (this.selectedTodoIds.has(id)) {
          this.selectedTodoIds.delete(id)
        } else {
          this.selectedTodoIds.add(id)
        }
        // Trigger reactivity
        this.selectedTodoIds = new Set(this.selectedTodoIds)
        return
      }

      // Normal click - clear multi-select and select single
      this.selectedTodoIds.clear()
      this.selectedTodoIds = new Set()
      this.selectTodo(id)
    },
    handleRowClick(event, id) {
      // Multi-select with Ctrl/Cmd+click
      if (event.ctrlKey || event.metaKey) {
        if (this.selectedTodoIds.has(id)) {
          this.selectedTodoIds.delete(id)
        } else {
          this.selectedTodoIds.add(id)
        }
        // Trigger reactivity
        this.selectedTodoIds = new Set(this.selectedTodoIds)
        return
      }

      // Normal click - clear multi-select and select single
      this.selectedTodoIds.clear()
      this.selectedTodoIds = new Set()
      this.selectTodo(id)
    },
    handleMarqueeSelect(ids) {
      // Set the selected IDs from marquee selection
      this.selectedTodoIds = new Set(ids)
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
      // Flush any pending saves before loading a new todo (skip history to avoid undo/redo issues)
      if (this.saveTimeout && this.selectedTodo) {
        clearTimeout(this.saveTimeout)
        const todoData = this.toPlainTodo(this.selectedTodo)
        await window.api.updateTodo(todoData, { skipHistory: true })
      }

      // Close any detached window for this todo
      await window.api.closeDetailWindow(id)

      this.selectedTodo = await window.api.getTodo(id)
      console.log('Loaded selectedTodo:', this.selectedTodo.id, 'type:', this.selectedTodo.type)
      this.linkedTodos = await window.api.getLinkedTodos(id)
      this.subtasks = await window.api.getSubtasks(id)
      this.assignedPersons = await window.api.getTodoPersons(id)
      this.todoTags = await window.api.getTodoTags(id)
      // Load child todos if this is a milestone
      if (this.selectedTodo.type === 'milestone') {
        this.childTodos = await window.api.getChildTodos(id)
      } else {
        this.childTodos = []
      }
      this.newSubtaskTitle = ''
      this.showLinkSearch = false
      this.showPersonPicker = false
      this.linkQuery = ''
      this.linkResults = []
      // Show preview if todo has notes, otherwise edit
      this.detailTab = this.selectedTodo.notes && this.selectedTodo.notes.trim() ? 'preview' : 'edit'
    },
    async closeDetail() {
      // Flush any pending saves before closing
      if (this.saveTimeout && this.selectedTodo) {
        clearTimeout(this.saveTimeout)
        const todoData = this.toPlainTodo(this.selectedTodo)
        await window.api.updateTodo(todoData, { skipHistory: true })
      }

      this.selectedTodo = null
      this.linkedTodos = []
      this.childTodos = []
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
    toggleDetailFullscreen() {
      this.detailFullscreen = !this.detailFullscreen
      localStorage.setItem('detail-fullscreen', this.detailFullscreen)
    },
    updateSelectedField(field, value) {
      if (!this.selectedTodo) return
      // Update selectedTodo
      this.selectedTodo[field] = value
      // Also update the item in todos/allTodos arrays for immediate UI sync
      const todoInList = this.todos.find(t => t.id === this.selectedTodo.id)
      if (todoInList) todoInList[field] = value
      const todoInAll = this.allTodos.find(t => t.id === this.selectedTodo.id)
      if (todoInAll) todoInAll[field] = value
      // Trigger save
      this.saveSelectedTodo()
    },
    async saveSelectedTodo() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }

      this.saveTimeout = setTimeout(async () => {
        const todoData = this.toPlainTodo(this.selectedTodo)
        console.log('Saving todo with type:', todoData.type, 'id:', todoData.id)
        await window.api.updateTodo(todoData, { skipHistory: true })
        await this.loadAllTodos()
        await this.loadTodos()
      }, 300)
    },
    toPlainTodo(todo) {
      return {
        id: todo.id,
        title: todo.title,
        notes: todo.notes,
        notes_sensitive: todo.notes_sensitive,
        end_date: todo.end_date,
        start_date: todo.start_date,
        completed: todo.completed,
        importance: todo.importance,
        project_id: todo.project_id,
        category_id: todo.category_id,
        status_id: todo.status_id,
        sort_order: todo.sort_order,
        type: todo.type,
        parent_id: todo.parent_id,
        milestone_date: todo.milestone_date,
        topic_id: todo.topic_id
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
    async loadAllTags() {
      this.allTags = await window.api.getAllTags()
    },
    async loadTodoTags() {
      if (this.selectedTodo) {
        this.todoTags = await window.api.getTodoTags(this.selectedTodo.id)
      } else {
        this.todoTags = []
      }
    },
    async addTodoTag(tagName) {
      if (!this.selectedTodo || !tagName.trim()) return
      await window.api.addTodoTag(this.selectedTodo.id, tagName.trim())
      await this.loadTodoTags()
      await this.loadAllTags()
    },
    async removeTodoTag(tagId) {
      if (!this.selectedTodo) return
      await window.api.removeTodoTag(this.selectedTodo.id, tagId)
      await this.loadTodoTags()
    },
    async createAndAssignPerson(name) {
      if (!this.selectedTodo || !name.trim()) return
      try {
        // Create the new person
        const person = await window.api.createPerson({
          name: name.trim(),
          color: this.getRandomPersonColor()
        })
        await this.loadPersons()
        // Assign to current todo
        await window.api.linkTodoPerson(this.selectedTodo.id, person.id)
        this.assignedPersons = await window.api.getTodoPersons(this.selectedTodo.id)
        this.showPersonPicker = false
      } catch (error) {
        console.error('Failed to create and assign person:', error)
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
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async toggleSubtask(subtask) {
      await window.api.updateSubtask({
        id: subtask.id,
        title: subtask.title,
        completed: !subtask.completed
      })
      await this.loadSubtasks()
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async deleteSubtask(id) {
      await window.api.deleteSubtask(id)
      await this.loadSubtasks()
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async deleteSubtaskFromTable(id) {
      await window.api.deleteSubtask(id)
      await this.loadAllSubtasks()
      await this.loadSubtasks()
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async addSubtaskFromTable({ todoId, title }) {
      await window.api.createSubtask(todoId, title)
      await this.loadAllSubtasks()
      await this.loadSubtasks()
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateSubtaskFromTable({ id, title }) {
      await window.api.updateSubtask({ id, title })
      await this.loadAllSubtasks()
      await this.loadSubtasks()
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async reorderSubtasks(ids) {
      await window.api.reorderSubtasks(ids)
      await this.loadSubtasks()
    },
    async updateSubtaskDueDate({ id, due_date }) {
      await window.api.updateSubtask({ id, due_date })
      await this.loadSubtasks()
      await this.loadAllSubtasks()
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
    async addProjectFromSidebar(name) {
      if (!name.trim()) return
      const randomColor = this.projectColors[Math.floor(Math.random() * this.projectColors.length)]
      await window.api.createProject(name.trim(), randomColor)
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
        this.editingProjectTags = await window.api.getProjectTags(project.id)
      } else {
        this.editingProjectTags = []
      }
    },
    cancelEditProject() {
      this.editingProject = null
      this.editingProjectTags = []
      this.showProjectPersonPicker = false
    },
    async addProjectTag(tagName) {
      if (!this.editingProject?.id || !tagName.trim()) return
      await window.api.addProjectTag(this.editingProject.id, tagName.trim())
      this.editingProjectTags = await window.api.getProjectTags(this.editingProject.id)
      await this.loadAllTags()
    },
    async removeProjectTag(tagId) {
      if (!this.editingProject?.id) return
      await window.api.removeProjectTag(this.editingProject.id, tagId)
      this.editingProjectTags = await window.api.getProjectTags(this.editingProject.id)
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
    async saveProjectFromModal(projectData) {
      this.editingProject = projectData
      await this.saveProject()
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
    async addCategoryFromSidebar(name) {
      if (!name.trim()) return
      const randomSymbol = this.categorySymbols[Math.floor(Math.random() * this.categorySymbols.length)]
      await window.api.createCategory(name.trim(), randomSymbol)
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
    async saveCategoryFromModal(categoryData) {
      this.editingCategory = categoryData
      await this.saveCategory()
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
    async addStatusFromSidebar(name) {
      if (!name.trim()) return
      const randomColor = this.statusColors[Math.floor(Math.random() * this.statusColors.length)]
      await window.api.createStatus(name.trim(), randomColor)
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
    async saveStatusFromModal(statusData) {
      this.editingStatus = statusData
      await this.saveStatus()
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
    // DetailPanel wrapper methods
    async handleProjectChange(projectId) {
      this.selectedTodo.project_id = projectId
      await this.saveProjectChange()
    },
    async handleCategoryChange(categoryId) {
      this.selectedTodo.category_id = categoryId
      await this.saveCategoryChange()
    },
    async handleStatusChange(statusId) {
      this.selectedTodo.status_id = statusId
      await this.saveStatusChange()
    },
    async handleTopicChange(topicId) {
      this.selectedTodo.topic_id = topicId
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateStartDateFromPanel(value) {
      this.selectedTodo.start_date = value || null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateEndDateFromPanel(value) {
      this.selectedTodo.end_date = value || null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateDueDateFromPanel(value) {
      this.selectedTodo.due_date = value || null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async clearDueDate() {
      this.selectedTodo.due_date = null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async updateMilestoneDate(value) {
      this.selectedTodo.milestone_date = value || null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    async clearMilestoneDate() {
      this.selectedTodo.milestone_date = null
      const todoData = this.toPlainTodo(this.selectedTodo)
      const updated = await window.api.updateTodo(todoData)
      this.selectedTodo = updated
      await this.loadAllTodos()
      await this.loadTodos()
    },
    handleRecurrenceTypeChange(type) {
      this.selectedTodo.recurrence_type = type
      if (!this.selectedTodo.recurrence_interval) {
        this.selectedTodo.recurrence_interval = 1
      }
      this.saveSelectedTodo()
    },
    handleRecurrenceIntervalChange(interval) {
      this.selectedTodo.recurrence_interval = interval
      this.saveSelectedTodo()
    },
    updateRecurrenceEndDateFromPanel(value) {
      this.selectedTodo.recurrence_end_date = value || null
      this.saveSelectedTodo()
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
    // Calendar methods
    formatDateKey(date) {
      return date.toISOString().split('T')[0]
    },
    getWeekStart(date) {
      const d = new Date(date)
      const day = d.getDay()
      d.setDate(d.getDate() - day)
      d.setHours(0, 0, 0, 0)
      return d
    },
    navigateCalendar(direction) {
      const d = new Date(this.calendarDate)
      if (this.timelineMode === 'month') {
        d.setMonth(d.getMonth() + direction)
      } else if (this.timelineMode === 'week') {
        d.setDate(d.getDate() + direction * 7)
      } else {
        d.setDate(d.getDate() + direction)
      }
      this.calendarDate = d
    },
    goToToday() {
      this.calendarDate = new Date()
    },
    getTodosForCalendarDate(dateKey) {
      return this.sortedTodos.filter(t => {
        if (!t.start_date && !t.end_date) return false
        const start = t.start_date || t.end_date
        const end = t.end_date || t.start_date
        return dateKey >= start && dateKey <= end
      })
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
    observeCards() {
      if (!this.cardResizeObserver) return
      // Disconnect existing observations
      this.cardResizeObserver.disconnect()
      // Observe all cards
      const cards = document.querySelectorAll('.todo-card')
      cards.forEach(card => {
        this.cardResizeObserver.observe(card)
      })
    },
    applyMasonryLayout() {
      // Apply masonry layout to all card grids
      this.$nextTick(() => {
        setTimeout(() => {
          const grids = document.querySelectorAll('.cards-grid')
          grids.forEach(grid => {
            const cards = grid.querySelectorAll('.todo-card')

            cards.forEach((card) => {
              const height = card.getBoundingClientRect().height
              const rowSpan = Math.ceil(height / 17) + 1
              card.style.gridRowEnd = `span ${rowSpan}`
            })
          })

          // Apply again after a short delay to catch any late-rendering content
          setTimeout(() => {
            const grids = document.querySelectorAll('.cards-grid')
            grids.forEach(grid => {
              const cards = grid.querySelectorAll('.todo-card')

              cards.forEach((card) => {
                const height = card.getBoundingClientRect().height
                const rowSpan = Math.ceil(height / 17) + 1
                card.style.gridRowEnd = `span ${rowSpan}`
              })
            })
            // Re-observe cards in case new ones were added
            this.observeCards()
          }, 200)
        }, 150)
      })
    },
    onCardMouseDown(event, _todoId) {
      // Store the initial height when mouse goes down
      const card = event.currentTarget
      if (card) {
        this.cardMouseDownHeight = card.offsetHeight
      }
    },
    onCardResize(event, todoId) {
      const card = event.currentTarget
      if (!card) return

      const currentHeight = card.offsetHeight

      // Check if size changed compared to mousedown height
      if (this.cardMouseDownHeight !== null && Math.abs(currentHeight - this.cardMouseDownHeight) > 5) {
        // Size changed - this was a resize, set flag immediately before click fires
        this.justResizedCard = true
        setTimeout(() => {
          this.justResizedCard = false
        }, 300)
      }

      // Use requestAnimationFrame to ensure browser has updated the height after resize
      requestAnimationFrame(() => {
        let height = card.offsetHeight

        // Snap to grid if grid lock is enabled
        if (this.gridLock) {
          height = Math.round(height / this.gridSize) * this.gridSize
        }

        const defaultMinHeight = Math.round(this.cardSize * 0.6)

        // Only save if height differs from default min-height
        if (height > defaultMinHeight + 10) {
          this.cardSizes[todoId] = { height }
          this.saveCardSizes()
          // Reapply masonry layout after resize
          this.applyMasonryLayout()
        } else {
          // Card was made smaller than threshold, remove custom size
          delete this.cardSizes[todoId]
          this.saveCardSizes()
          this.applyMasonryLayout()
        }

        // Reset mousedown height
        this.cardMouseDownHeight = null
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
      // Don't allow dragging milestones to other rows
      if (todo.type === 'milestone') mode = 'move'
      this.draggingBarId = todo.id
      this.draggingBarTodo = todo
      this.barDragStartX = e.clientX
      this.barDragStartY = e.clientY
      this.barDragMode = mode // 'move', 'resize-start', or 'resize-end'
      this.barDragOriginalDates = {
        start_date: todo.start_date,
        end_date: todo.end_date,
        parent_id: todo.parent_id
      }
      this.lastDeltaDays = 0
      this.dropTargetRowId = null
      document.addEventListener('mousemove', this.onBarDrag)
      document.addEventListener('mouseup', this.stopBarDrag)
      e.preventDefault()
    },
    onBarDrag(e) {
      if (!this.draggingBarTodo) return
      const deltaX = e.clientX - this.barDragStartX
      const deltaDays = Math.round(deltaX / this.timelineScale)

      const todo = this.draggingBarTodo
      const mode = this.barDragMode

      // Detect drop target row when grouped by milestone
      if (this.ganttGroupBy === 'milestone' && todo.type !== 'milestone') {
        const ganttRows = this.$refs.ganttChartArea?.querySelectorAll('.gantt-row')
        if (ganttRows) {
          let foundRow = null
          ganttRows.forEach((rowEl, index) => {
            const rect = rowEl.getBoundingClientRect()
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
              const row = this.ganttRows[index]
              if (row && row.isMilestone && row.milestone?.id !== todo.id) {
                foundRow = row.id
              } else if (row && row.id === 'unassigned') {
                foundRow = 'unassigned'
              }
            }
          })
          this.dropTargetRowId = foundRow
        }
      }

      // Skip date updates if same as last update
      if (deltaDays === this.lastDeltaDays) return
      this.lastDeltaDays = deltaDays

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
        // Change start date
        const origStart = this.barDragOriginalDates.start_date || this.barDragOriginalDates.end_date
        if (origStart) {
          const newStart = new Date(origStart)
          newStart.setDate(newStart.getDate() + deltaDays)
          // Ensure start doesn't go past end
          const endDate = this.barDragOriginalDates.end_date ? new Date(this.barDragOriginalDates.end_date) : null
          if (!endDate || newStart <= endDate) {
            todo.start_date = newStart.toISOString().split('T')[0]
          }
        }
      } else if (mode === 'resize-end') {
        // Change end date
        const origEnd = this.barDragOriginalDates.end_date || this.barDragOriginalDates.start_date
        if (origEnd) {
          const newEnd = new Date(origEnd)
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
        const todoData = this.toPlainTodo(this.draggingBarTodo)
        const todoId = this.draggingBarTodo.id

        // Handle milestone assignment when dropping on a milestone row
        if (this.dropTargetRowId && this.ganttGroupBy === 'milestone') {
          // First unlink from all current milestones
          const milestones = this.allTodos.filter(t => t.type === 'milestone')
          for (const m of milestones) {
            const rel = this.milestoneRelations[m.id]
            if (rel?.todos?.some(t => t.id === todoId)) {
              await window.api.unlinkMilestoneTodo(m.id, todoId)
            }
          }

          if (this.dropTargetRowId !== 'unassigned') {
            // Extract milestone id from row id (format: 'milestone-{id}')
            const match = this.dropTargetRowId.match(/^milestone-(\d+)$/)
            if (match) {
              const milestoneId = parseInt(match[1], 10)
              await window.api.linkMilestoneTodo(milestoneId, todoId)
            }
          }
        }

        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
        if (this.ganttGroupBy === 'milestone') {
          await this.loadMilestoneRelations()
        }
      }

      this.draggingBarId = null
      this.draggingBarTodo = null
      this.barDragMode = 'move'
      this.barDragOriginalDates = null
      this.lastDeltaDays = 0
      this.dropTargetRowId = null
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
    isPersonLink(link) {
      const sourceNode = this.graphNodes.find(n => n.id === link.source)
      const targetNode = this.graphNodes.find(n => n.id === link.target)
      return sourceNode?.type === 'person' || targetNode?.type === 'person'
    },
    getLinkColor(link) {
      const sourceNode = this.graphNodes.find(n => n.id === link.source)
      const targetNode = this.graphNodes.find(n => n.id === link.target)

      // For person-todo links, use the person's color
      if (sourceNode?.type === 'person' && sourceNode.color) {
        return sourceNode.color
      }
      if (targetNode?.type === 'person' && targetNode.color) {
        return targetNode.color
      }

      // Use the source node's project color for the link
      if (sourceNode?.project_color) {
        return sourceNode.project_color
      }
      // Fallback to target node's color
      if (targetNode?.project_color) {
        return targetNode.project_color
      }
      // Default color
      return '#0f4c75'
    },
    getEdgePath(link, index) {
      const x1 = this.getNodeX(link.source)
      const y1 = this.getNodeY(link.source)
      const x2 = this.getNodeX(link.target)
      const y2 = this.getNodeY(link.target)

      if (!this.orthogonalEdges) {
        return `M ${x1} ${y1} L ${x2} ${y2}`
      }

      // Check if this is a person link
      const isPersonLink = link.type === 'person-todo'

      // Calculate offset to avoid overlapping edges
      const linkIndex = this.graphLinks.indexOf(link)
      const offset = (linkIndex % 7) * 6 - 18

      if (isPersonLink) {
        // Person links: source is person (right), target is todo (left)
        // Route: person -> left -> up/down -> todo
        const midX = x2 + (x1 - x2) * 0.7 + offset
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
      }

      // Regular tree links: source is parent (left), target is child (right)
      if (x2 > x1) {
        // Parent -> Child (left to right)
        const midX = x1 + (x2 - x1) * 0.5 + offset
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
      } else {
        // Child -> Parent or same level connection
        const midX = Math.max(x1, x2) + 40 + Math.abs(offset)
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
      }
    },
    saveOrthogonalSetting() {
      localStorage.setItem('orthogonal-edges', this.orthogonalEdges)
    },
    calculateNodePosition(todoId) {
      const nodes = this.graphNodes
      const index = nodes.findIndex(t => t.id === todoId)
      const width = this.graphWidth || 800
      const height = this.graphHeight || 600
      const padding = 100
      const cols = Math.ceil(Math.sqrt(nodes.length * (width / height)))
      const rows = Math.ceil(nodes.length / cols)
      const col = index % cols
      const row = Math.floor(index / cols)
      const cellWidth = (width - padding * 2) / Math.max(cols, 1)
      const cellHeight = (height - padding * 2) / Math.max(rows, 1)
      return {
        x: padding + col * cellWidth + cellWidth / 2,
        y: padding + row * cellHeight + cellHeight / 2
      }
    },
    async onGraphNodeClick(todo) {
      this.selectedLink = null
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
      // Use fixed viewBox dimensions so layout doesn't shift when detail panel opens
      // The SVG will scale to fit the container via CSS
      // Only set initial size if not already set
      if (!this.graphWidth) this.graphWidth = 1600
      if (!this.graphHeight) this.graphHeight = 1200
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
    onNodeContentMouseDown(event, todo) {
      // Handle modifier key actions for foreignObject content
      if (event.altKey) {
        event.preventDefault()
        event.stopPropagation()
        this.linkingNodeId = todo.id
        setTimeout(() => { this.linkingNodeId = null }, 500)
        // Option-click linking: first click sets source, second click creates link
        if (this.altClickSourceId && this.altClickSourceId !== todo.id) {
          window.api.linkTodos(this.altClickSourceId, todo.id)
            .then(() => {
              this.loadAllLinks()
              this.altClickSourceId = null
            })
            .catch(e => console.error('Failed to link:', e))
        } else {
          // Set this node as the source for linking
          this.altClickSourceId = todo.id
        }
        return
      }
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault()
        event.stopPropagation()
        this.creatingNodeFromId = todo.id
        setTimeout(() => { this.creatingNodeFromId = null }, 500)
        this.createConnectedNode(event, todo)
        return
      }
    },
    onNodeMouseDown(event, todo) {
      if (this.graphLinkMode) {
        // In link mode, handle as click
        this.onGraphNodeClick(todo)
        return
      }

      // Cmd/Ctrl+click creates a new connected node
      if (event.metaKey || event.ctrlKey) {
        this.creatingNodeFromId = todo.id
        setTimeout(() => { this.creatingNodeFromId = null }, 500)
        this.createConnectedNode(event, todo)
        return
      }

      // Option/Alt+click to link nodes
      if (event.altKey) {
        event.preventDefault()
        event.stopPropagation()
        // Option-click linking: first click sets source, second click creates link
        if (this.altClickSourceId && this.altClickSourceId !== todo.id) {
          window.api.linkTodos(this.altClickSourceId, todo.id)
            .then(() => {
              this.loadAllLinks()
              this.altClickSourceId = null
            })
            .catch(e => console.error('Failed to link:', e))
        } else {
          // Set this node as the source for linking
          this.altClickSourceId = todo.id
        }
        return
      }

      // Clear multi-select if clicking without modifier
      if (this.selectedNodeIds.length > 0) {
        this.selectedNodeIds = []
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
      // If simulation is running, fix this node's position
      if (this.d3Simulation) {
        const simNode = this.d3Simulation.nodes().find(n => n.id === todo.id)
        if (simNode) {
          simNode.fx = nodePos.x
          simNode.fy = nodePos.y
        }
        this.d3Simulation.alphaTarget(0.3).restart()
      }
    },
    onGraphMouseDown(event) {
      // Close context menu if open
      if (this.linkContextMenu) {
        this.linkContextMenu = null
        return
      }
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
        // Update simulation node if running
        if (this.d3Simulation) {
          const simNode = this.d3Simulation.nodes().find(n => n.id === this.draggingNode.id)
          if (simNode) {
            simNode.fx = x
            simNode.fy = y
          }
        }
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
        if (dx >= 5 || dy >= 5) {
          // Was actually dragging - set flag to prevent click handler from opening edit
          this.wasDragging = true
          setTimeout(() => { this.wasDragging = false }, 100)
        }
        // Release fixed position in simulation
        if (this.d3Simulation) {
          const simNode = this.d3Simulation.nodes().find(n => n.id === this.draggingNode.id)
          if (simNode) {
            simNode.fx = null
            simNode.fy = null
          }
          this.d3Simulation.alphaTarget(0)
        }
      }
      this.draggingNode = null
      this.isPanning = false
      this.saveNodePositions()
    },
    startEditingNode(event, todo) {
      // Don't open edit if we just finished dragging or if this is the parent node of a new node being created
      if (this.wasDragging) return
      if (this.creatingNodeFromId === todo.id) return
      if (this.linkingNodeId === todo.id) return
      // Don't edit if link mode is active
      if (this.graphLinkMode) return
      // Don't edit if modifier keys are held (used for linking/creating)
      if (event && (event.altKey || event.metaKey || event.ctrlKey)) return
      // Don't edit person nodes
      if (todo.type === 'person') return
      this.editingNodeId = todo.id
      this.editingNodeNotes = todo.notes || ''
      // Don't show 'Untitled' or 'New Node' in the input - show blank instead
      this.editingNodeTitle = (todo.title === 'Untitled' || todo.title === 'New Node') ? '' : (todo.title || '')
      // Focus textarea after DOM update
      this.$nextTick(() => {
        const editor = this.$refs.nodeNotesEditor
        if (editor) {
          // Handle both single element and array (from v-for)
          const el = Array.isArray(editor) ? editor[0] : editor
          if (el && el.focus) {
            el.focus()
            this.autoResizeNodeEditor()
          }
        }
      })
    },
    onNodeTitleClick(event, todo) {
      // If clicking on a link, open in system browser
      if (event.target.tagName === 'A' && event.target.href) {
        event.preventDefault()
        window.api.openExternal(event.target.href)
        return
      }
      // Otherwise start editing
      this.startEditingNode(event, todo)
    },
    onNotesClick(event) {
      // If clicking on a link in notes, open in system browser
      if (event.target.tagName === 'A' && event.target.href) {
        event.preventDefault()
        event.stopPropagation()
        window.api.openExternal(event.target.href)
      }
    },
    autoResizeNodeEditor() {
      const editor = this.$refs.nodeNotesEditor
      if (editor) {
        const el = Array.isArray(editor) ? editor[0] : editor
        if (el && el.style) {
          el.style.height = 'auto'
          el.style.height = Math.min(el.scrollHeight, 300) + 'px'
        }
      }
      // Auto-save with debounce
      this.debouncedSaveNode()
    },
    focusNotesEditor() {
      const editor = this.$refs.nodeNotesEditor
      if (editor) {
        const el = Array.isArray(editor) ? editor[0] : editor
        if (el && el.focus) el.focus()
      }
    },
    debouncedSaveNode() {
      clearTimeout(this.nodeSaveTimeout)
      this.nodeSaveTimeout = setTimeout(() => {
        if (this.editingNodeId) {
          const todo = this.todos.find(t => t.id === this.editingNodeId)
          if (todo) {
            this.saveNodeNotesQuiet(todo)
          }
        }
      }, 500)
    },
    async saveNodeNotesQuiet(todo) {
      // Save without closing edit mode
      const notesChanged = this.editingNodeNotes !== (todo.notes || '')
      const titleChanged = this.editingNodeTitle !== (todo.title || '')
      if (notesChanged || titleChanged) {
        const updatedTodo = {
          ...todo,
          notes: this.editingNodeNotes,
          title: this.editingNodeTitle || 'Untitled'
        }
        await window.api.updateTodo(updatedTodo)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async saveNodeContent(todo) {
      if (this.editingNodeId !== todo.id) return
      // Clear pending debounced save
      clearTimeout(this.nodeSaveTimeout)
      const notesChanged = this.editingNodeNotes !== (todo.notes || '')
      const titleChanged = this.editingNodeTitle !== (todo.title || '')
      // Save if anything changed
      if (notesChanged || titleChanged) {
        const updatedTodo = {
          ...todo,
          notes: this.editingNodeNotes,
          title: this.editingNodeTitle || 'Untitled'
        }
        await window.api.updateTodo(updatedTodo)
        await this.loadAllTodos()
        await this.loadTodos()
      }
    },
    async saveAndCloseNode(todo) {
      await this.saveNodeContent(todo)
      this.editingNodeId = null
      this.editingNodeNotes = ''
      this.editingNodeTitle = ''
    },
    onNodeBlur(event, todo) {
      // Check if focus is moving to another element within the same node
      const relatedTarget = event.relatedTarget
      const wrapper = event.target.closest('.node-content-wrapper')
      if (wrapper && relatedTarget && wrapper.contains(relatedTarget)) {
        // Focus is staying within the node, just save without closing
        this.saveNodeContent(todo)
        return
      }
      // Focus left the node, save and close
      this.saveAndCloseNode(todo)
    },
    onNodeNotesBlur(event, todo) {
      this.onNodeBlur(event, todo)
    },
    onNodeTitleBlur(event, todo) {
      this.onNodeBlur(event, todo)
    },
    async saveNodeNotes(todo) {
      // Legacy method - now calls saveAndCloseNode
      await this.saveAndCloseNode(todo)
    },
    cancelEditingNode() {
      this.editingNodeId = null
      this.editingNodeNotes = ''
      this.editingNodeTitle = ''
      // Also close detail view if open
      if (this.selectedTodo) {
        this.closeDetail()
      }
    },
    async closeEverything() {
      // Save any pending edits before closing
      if (this.editingNodeId) {
        clearTimeout(this.nodeSaveTimeout)
        const todo = this.todos.find(t => t.id === this.editingNodeId)
        if (todo) {
          const notesChanged = this.editingNodeNotes !== (todo.notes || '')
          const titleChanged = this.editingNodeTitle !== (todo.title || '') &&
            !(this.editingNodeTitle === '' && (todo.title === 'Untitled' || todo.title === 'New Node'))
          if (notesChanged || titleChanged) {
            const updatedTodo = {
              ...todo,
              notes: this.editingNodeNotes,
              title: this.editingNodeTitle || 'Untitled'
            }
            await window.api.updateTodo(updatedTodo)
            await this.loadAllTodos()
            await this.loadTodos()
          }
        }
      }
      // Close all open views: editing, detail panel, fullscreen, detached windows
      this.editingNodeId = null
      this.editingNodeNotes = ''
      this.editingNodeTitle = ''
      if (this.detailFullscreen) {
        this.detailFullscreen = false
        localStorage.setItem('detail-fullscreen', 'false')
      }
      if (this.selectedTodo) {
        this.closeDetail()
      }
      this.focusedTodoIndex = -1
      window.api.closeAllDetailWindows()
    },
    onGraphCanvasClick(event) {
      // Clear selected link when clicking on canvas
      this.selectedLink = null
      // Close editing if clicking outside nodes (on the canvas background)
      if (event.target.classList.contains('graph-svg') || event.target.tagName === 'svg') {
        if (this.editingNodeId) {
          // Find the todo being edited and save
          const todo = this.todos.find(t => t.id === this.editingNodeId)
          if (todo) {
            this.saveNodeNotes(todo)
          } else {
            this.cancelEditingNode()
          }
        }
      }
    },
    async createConnectedNode(event, parentTodo) {
      // Get position offset from parent node
      const parentPos = this.nodePositions[parentTodo.id] || { x: 400, y: 300 }

      // Use the same project as the parent todo
      const projectId = parentTodo.project_id
      const type = this.activeTab === 'notes' ? 'note' : 'todo'

      try {
        const todo = await window.api.createTodo('Untitled', projectId, type)
        await this.loadAllTodos()
        await this.loadTodos()

        if (todo) {
          // Initial position close to parent (will be optimized by layout)
          this.nodePositions[todo.id] = {
            x: parentPos.x + 120,
            y: parentPos.y + 80
          }
          this.nodePositions = { ...this.nodePositions }

          // Link to parent
          await window.api.linkTodos(parentTodo.id, todo.id)
          await this.loadAllLinks()

          // Run quick layout optimization for new node, then start editing
          this.$nextTick(() => {
            this.optimizeNewNodePosition(todo.id)
            this.$nextTick(() => {
              const newTodo = this.todos.find(t => t.id === todo.id)
              if (newTodo) this.startEditingNode(null, newTodo)
            })
          })
        }
      } catch (e) {
        console.error('Failed to create connected node:', e)
      }
    },
    optimizeNewNodePosition(newNodeId) {
      // Run a quick force simulation to find optimal position for new node
      const nodes = this.graphNodes.map(n => ({
        id: n.id,
        x: this.nodePositions[n.id]?.x || this.graphWidth / 2,
        y: this.nodePositions[n.id]?.y || this.graphHeight / 2,
        // Fix all nodes except the new one
        fx: n.id === newNodeId ? null : this.nodePositions[n.id]?.x,
        fy: n.id === newNodeId ? null : this.nodePositions[n.id]?.y
      }))

      const links = this.graphLinks.map(l => ({
        source: l.source,
        target: l.target
      }))

      const getNodeRadius = (nodeId) => {
        const todo = this.graphNodes.find(n => n.id === nodeId)
        if (!todo) return 80
        const titleLength = todo.title?.length || 0
        const notesLength = todo.notes?.length || 0
        const estimatedWidth = Math.min(280, 120 + titleLength * 4 + (notesLength > 0 ? 60 : 0))
        const notesLines = notesLength > 0 ? Math.ceil(notesLength / 35) : 0
        const estimatedHeight = 50 + notesLines * 18
        const diagonal = Math.sqrt(estimatedWidth * estimatedWidth + estimatedHeight * estimatedHeight)
        return diagonal / 2 + 20
      }

      const simulation = d3Force.forceSimulation(nodes)
        .force('link', d3Force.forceLink(links)
          .id(d => d.id)
          .distance(this.graphEdgeLength * 2)
          .strength(1))
        .force('charge', d3Force.forceManyBody()
          .strength(this.graphRepulsion))
        .force('collision', d3Force.forceCollide()
          .radius(d => getNodeRadius(d.id))
          .strength(1))
        .alphaDecay(0.1)
        .on('end', () => {
          const newNode = nodes.find(n => n.id === newNodeId)
          if (newNode) {
            // Keep within bounds
            const padding = 150
            const x = Math.max(padding, Math.min(this.graphWidth - padding, newNode.x))
            const y = Math.max(padding, Math.min(this.graphHeight - padding, newNode.y))
            this.nodePositions[newNodeId] = { x, y }
            this.nodePositions = { ...this.nodePositions }
            this.saveNodePositions()
          }
        })

      // Run simulation quickly
      simulation.tick(50)
      simulation.stop()

      const newNode = nodes.find(n => n.id === newNodeId)
      if (newNode) {
        const padding = 150
        const x = Math.max(padding, Math.min(this.graphWidth - padding, newNode.x))
        const y = Math.max(padding, Math.min(this.graphHeight - padding, newNode.y))
        this.nodePositions[newNodeId] = { x, y }
        this.nodePositions = { ...this.nodePositions }
        this.saveNodePositions()
      }
    },
    async onGraphDblClick(event) {
      // Don't create if clicking on a node
      if (event.target.closest('.graph-node')) return

      // Get position in graph coordinates
      const coords = this.screenToSvgCoords(event)

      // Determine project ID - use current filter if it's a project
      const projectId = this.isProjectSelected ? this.currentFilter : null
      const type = this.activeTab === 'notes' ? 'note' : 'todo'

      // Remember selected node to link to
      const linkToNodeId = this.selectedTodo?.id

      try {
        const todo = await window.api.createTodo('Untitled', projectId, type)
        await this.loadAllTodos()
        await this.loadTodos()

        // Set position for the new node
        if (todo) {
          this.nodePositions[todo.id] = { x: coords.x, y: coords.y }
          this.nodePositions = { ...this.nodePositions }
          this.saveNodePositions()

          // Link to previously selected node if one existed
          if (linkToNodeId) {
            await window.api.linkTodos(linkToNodeId, todo.id)
            await this.loadAllLinks()
          }

          // Start editing the new node
          const newTodo = this.todos.find(t => t.id === todo.id)
          if (newTodo) this.startEditingNode(null, newTodo)
        }
      } catch (e) {
        console.error('Failed to create todo:', e)
      }
    },
    onGraphWheel(event) {
      // Smoother zoom using exponential scaling
      const zoomSpeed = 0.002
      const zoomFactor = Math.exp(-event.deltaY * zoomSpeed)
      const newZoom = Math.max(0.2, Math.min(4, this.graphZoom * zoomFactor))

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
      // Ensure node positions exist for all nodes
      this.graphNodes.forEach(node => {
        if (!this.nodePositions[node.id]) {
          this.nodePositions[node.id] = this.calculateNodePosition(node.id)
        }
      })

      // Only consider positions for nodes currently in the graph
      const nodeIds = new Set(this.graphNodes.map(n => n.id))
      const positions = Object.entries(this.nodePositions)
        .filter(([id]) => nodeIds.has(Number(id)))
        .map(([, pos]) => pos)

      if (positions.length === 0) {
        this.graphZoom = 1
        this.graphPan = { x: 0, y: 0 }
        return
      }

      // Calculate bounding box of all nodes (with padding for node size)
      const nodeWidth = 300
      const nodeHeight = 200
      const padding = 50

      const xs = positions.map(p => p.x)
      const ys = positions.map(p => p.y)
      const minX = Math.min(...xs) - nodeWidth / 2 - padding
      const maxX = Math.max(...xs) + nodeWidth / 2 + padding
      const minY = Math.min(...ys) - nodeHeight / 2 - padding
      const maxY = Math.max(...ys) + nodeHeight / 2 + padding

      const boundingWidth = maxX - minX
      const boundingHeight = maxY - minY
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      // Get SVG container size
      const svg = this.$refs.graphSvg
      if (svg) {
        const rect = svg.getBoundingClientRect()
        // Scale viewBox dimensions to screen
        const scaleX = this.graphWidth / rect.width
        const scaleY = this.graphHeight / rect.height
        const viewWidth = rect.width * scaleX
        const viewHeight = rect.height * scaleY

        // Calculate zoom to fit all nodes
        const zoomX = viewWidth / boundingWidth
        const zoomY = viewHeight / boundingHeight
        const fitZoom = Math.min(zoomX, zoomY, 2) // Cap at 2x zoom
        this.graphZoom = Math.max(0.3, fitZoom * 0.9) // 90% to add margin, min 0.3

        // Center the view
        this.graphPan = {
          x: viewWidth / 2 - centerX * this.graphZoom,
          y: viewHeight / 2 - centerY * this.graphZoom
        }
      }
    },
    onLinkRightClick(event, link) {
      // Show context menu at mouse position
      this.linkContextMenu = {
        x: event.clientX,
        y: event.clientY,
        link: link
      }
    },
    onLinkClick(event, link) {
      event.stopPropagation()
      // Option/Alt-click to remove link directly
      if (event.altKey) {
        event.preventDefault()
        this.removeLink(link)
        return
      }
      // Toggle selection - click to show buttons, click again to hide
      this.selectedLink = (this.selectedLink === link) ? null : link
    },
    removeLink(link) {
      window.api.unlinkTodos(link.source, link.target)
        .then(() => this.loadAllLinks())
        .catch(e => console.error('Failed to unlink:', e))
    },
    async removeLinkFromMenu() {
      if (this.linkContextMenu?.link) {
        const { source, target } = this.linkContextMenu.link
        await window.api.unlinkTodos(source, target)
        await this.loadAllLinks()
      }
      this.linkContextMenu = null
    },
    async insertNodeInLink() {
      if (!this.linkContextMenu?.link) return
      const { source, target } = this.linkContextMenu.link
      const sourceNode = this.graphNodes.find(n => n.id === source)

      // Calculate midpoint position
      const sourcePos = this.nodePositions[source] || { x: 400, y: 300 }
      const targetPos = this.nodePositions[target] || { x: 500, y: 300 }
      const midX = (sourcePos.x + targetPos.x) / 2
      const midY = (sourcePos.y + targetPos.y) / 2

      // Use project from source node
      const projectId = sourceNode?.project_id || null
      const type = this.activeTab === 'notes' ? 'note' : 'todo'

      try {
        // Create new node
        const todo = await window.api.createTodo('Untitled', projectId, type)

        // Position at midpoint
        this.nodePositions[todo.id] = { x: midX, y: midY }
        this.saveNodePositions()

        // Remove old link
        await window.api.unlinkTodos(source, target)

        // Create new links: source -> new -> target
        await window.api.linkTodos(source, todo.id)
        await window.api.linkTodos(todo.id, target)

        // Reload data
        await this.loadTodos()
        await this.loadAllLinks()

        // Select the new node for editing
        this.selectedTodo = this.todos.find(t => t.id === todo.id)
      } catch (e) {
        console.error('Failed to insert node:', e)
      }

      this.linkContextMenu = null
    },
    async insertNodeInLinkDirect(link) {
      const { source, target } = link
      const sourceNode = this.graphNodes.find(n => n.id === source)

      // Calculate midpoint position
      const sourcePos = this.nodePositions[source] || { x: 400, y: 300 }
      const targetPos = this.nodePositions[target] || { x: 500, y: 300 }
      const midX = (sourcePos.x + targetPos.x) / 2
      const midY = (sourcePos.y + targetPos.y) / 2

      // Use project from source node
      const projectId = sourceNode?.project_id || null
      const type = this.activeTab === 'notes' ? 'note' : 'todo'

      try {
        // Create new node
        const todo = await window.api.createTodo('Untitled', projectId, type)

        // Position at midpoint
        this.nodePositions[todo.id] = { x: midX, y: midY }
        this.saveNodePositions()

        // Remove old link
        await window.api.unlinkTodos(source, target)

        // Create new links: source -> new -> target
        await window.api.linkTodos(source, todo.id)
        await window.api.linkTodos(todo.id, target)

        // Reload data
        await this.loadTodos()
        await this.loadAllLinks()

        // Start editing the new node
        const newTodo = this.todos.find(t => t.id === todo.id)
        if (newTodo) this.startEditingNode(null, newTodo)
      } catch (e) {
        console.error('Failed to insert node:', e)
      }
      this.hoveredLink = null
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
    onLayoutTypeChange() {
      localStorage.setItem('graph-layout-type', this.graphLayoutType)
    },
    runLayout() {
      // Stop any running force simulation first
      if (this.d3Simulation) {
        this.stopForceLayout()
      }
      switch (this.graphLayoutType) {
        case 'force':
          this.runForceLayout()
          break
        case 'tree':
          this.runTreeLayout()
          break
        case 'grid':
          this.runGridLayout()
          break
        default:
          this.runForceLayout()
      }
    },
    runGridLayout() {
      const nodes = this.graphNodes
      if (nodes.length === 0) return

      const newPositions = {}

      // Separate person nodes from todo nodes
      const todoNodes = nodes.filter(n => n.type !== 'person')
      const personNodes = nodes.filter(n => n.type === 'person')

      // Grid settings - distance slider controls spacing
      // Base node size + gap based on edge length setting
      const baseWidth = 200
      const baseHeight = 120
      const gap = this.graphEdgeLength
      const cellWidth = baseWidth + gap
      const cellHeight = baseHeight + gap * 0.6
      const startX = 150
      const startY = 100

      // Calculate columns based on number of nodes (aim for roughly square grid)
      const totalTodos = todoNodes.length
      const cols = Math.max(1, Math.ceil(Math.sqrt(totalTodos * 1.2)))

      // Position todo nodes in grid
      todoNodes.forEach((node, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        newPositions[node.id] = {
          x: startX + col * cellWidth,
          y: startY + row * cellHeight
        }
      })

      // Position person nodes in a row below the todo grid
      const todoRows = Math.ceil(totalTodos / cols)
      const personStartY = startY + todoRows * cellHeight + 60
      const personCellWidth = 160 + gap * 0.5

      personNodes.forEach((person, idx) => {
        newPositions[person.id] = {
          x: startX + idx * personCellWidth,
          y: personStartY
        }
      })

      this.nodePositions = newPositions
      this.saveNodePositions()
    },
    runTreeLayout() {
      // Auto-enable orthogonal edges for tree layout
      this.orthogonalEdges = true
      this.saveOrthogonalSetting()

      const nodes = this.graphNodes.filter(n => n.type !== 'person')
      const links = this.graphLinks.filter(l => l.type !== 'person-todo')

      // Build adjacency list
      const children = {}
      const hasParent = new Set()
      links.forEach(link => {
        if (!children[link.source]) children[link.source] = []
        children[link.source].push(link.target)
        hasParent.add(link.target)
      })

      // Find root nodes (nodes with no incoming links)
      const roots = nodes.filter(n => !hasParent.has(n.id))
      if (roots.length === 0 && nodes.length > 0) {
        roots.push(nodes[0])
      }

      const newPositions = {}
      // Spacing based on edge length setting
      const nodeWidth = 160
      const nodeHeight = 60
      const hGap = Math.max(40, this.graphEdgeLength * 0.5)
      const vGap = Math.max(20, this.graphEdgeLength * 0.3)
      const levelSpacing = nodeWidth + hGap
      const nodeSpacing = nodeHeight + vGap

      // Assign levels to all nodes using BFS
      const nodeLevel = {}
      const visited = new Set()

      const assignLevels = (rootId) => {
        const queue = [{ id: rootId, level: 0 }]
        while (queue.length > 0) {
          const { id, level } = queue.shift()
          if (visited.has(id)) continue
          visited.add(id)
          nodeLevel[id] = level
          const nodeChildren = children[id] || []
          nodeChildren.forEach(childId => {
            if (!visited.has(childId)) {
              queue.push({ id: childId, level: level + 1 })
            }
          })
        }
      }

      roots.forEach(root => assignLevels(root.id))
      // Assign disconnected nodes
      nodes.forEach(n => {
        if (!visited.has(n.id)) {
          assignLevels(n.id)
        }
      })

      // Group nodes by level
      const levelNodes = {}
      let maxLevel = 0
      nodes.forEach(n => {
        const level = nodeLevel[n.id] || 0
        if (!levelNodes[level]) levelNodes[level] = []
        levelNodes[level].push(n)
        maxLevel = Math.max(maxLevel, level)
      })

      // Position nodes level by level, left to right
      const startX = 80
      const startY = 50

      for (let level = 0; level <= maxLevel; level++) {
        const nodesAtLevel = levelNodes[level] || []
        nodesAtLevel.forEach((node, idx) => {
          newPositions[node.id] = {
            x: startX + level * levelSpacing,
            y: startY + idx * nodeSpacing
          }
        })
      }

      // Refine: center parents among their children
      for (let level = maxLevel - 1; level >= 0; level--) {
        const nodesAtLevel = levelNodes[level] || []
        nodesAtLevel.forEach(node => {
          const nodeChildren = children[node.id] || []
          if (nodeChildren.length > 0) {
            const childYs = nodeChildren
              .filter(cid => newPositions[cid])
              .map(cid => newPositions[cid].y)
            if (childYs.length > 0) {
              const minY = Math.min(...childYs)
              const maxY = Math.max(...childYs)
              newPositions[node.id].y = (minY + maxY) / 2
            }
          }
        })
      }

      // Resolve overlaps within each level
      for (let level = 0; level <= maxLevel; level++) {
        const nodesAtLevel = levelNodes[level] || []
        // Sort by Y position
        nodesAtLevel.sort((a, b) => (newPositions[a.id]?.y || 0) - (newPositions[b.id]?.y || 0))
        // Ensure minimum spacing
        for (let i = 1; i < nodesAtLevel.length; i++) {
          const prev = newPositions[nodesAtLevel[i - 1].id]
          const curr = newPositions[nodesAtLevel[i].id]
          if (curr && prev && curr.y - prev.y < nodeSpacing) {
            curr.y = prev.y + nodeSpacing
          }
        }
      }

      // Position person nodes in a column on the right
      const personNodes = this.graphNodes.filter(n => n.type === 'person')
      const personLinks = this.graphLinks.filter(l => l.type === 'person-todo')

      // Find the rightmost todo X position
      let maxTodoX = startX
      Object.values(newPositions).forEach(pos => {
        maxTodoX = Math.max(maxTodoX, pos.x)
      })

      // Person column is to the right of all todos
      const personColumnX = maxTodoX + levelSpacing

      // Sort person nodes by average Y of connected todos
      const personAvgY = {}
      personNodes.forEach(person => {
        const connectedTodoIds = personLinks
          .filter(l => l.source === person.id)
          .map(l => l.target)

        if (connectedTodoIds.length > 0) {
          let sumY = 0, count = 0
          connectedTodoIds.forEach(todoId => {
            if (newPositions[todoId]) {
              sumY += newPositions[todoId].y
              count++
            }
          })
          personAvgY[person.id] = count > 0 ? sumY / count : startY
        } else {
          personAvgY[person.id] = startY + Object.keys(personAvgY).length * nodeSpacing
        }
      })

      // Sort persons by their average Y
      personNodes.sort((a, b) => (personAvgY[a.id] || 0) - (personAvgY[b.id] || 0))

      // Position person nodes with minimum spacing
      let lastPersonY = -nodeSpacing
      personNodes.forEach(person => {
        const targetY = personAvgY[person.id] || startY
        const personY = Math.max(targetY, lastPersonY + nodeSpacing)
        newPositions[person.id] = { x: personColumnX, y: personY }
        lastPersonY = personY
      })

      this.nodePositions = newPositions
      this.saveNodePositions()
    },
    runForceLayout() {
      if (this.isSimulating) {
        this.stopForceLayout()
        return
      }

      this.isSimulating = true
      this.initializeNodePositions()

      // Check if all nodes already have positions (re-running on relaxed graph)
      const allNodesPositioned = this.graphNodes.every(n => this.nodePositions[n.id])

      // Create d3-force simulation with improved parameters
      const nodes = this.graphNodes.map(n => ({
        id: n.id,
        x: this.nodePositions[n.id]?.x || this.graphWidth / 2 + (Math.random() - 0.5) * 400,
        y: this.nodePositions[n.id]?.y || this.graphHeight / 2 + (Math.random() - 0.5) * 400
      }))

      const links = this.graphLinks.map(l => ({
        source: l.source,
        target: l.target,
        type: l.type
      }))

      // Calculate collision radius based on actual node size
      const getNodeRadius = (nodeId) => {
        const todo = this.graphNodes.find(n => n.id === nodeId)
        if (!todo) return 80

        // Person nodes are smaller
        if (todo.type === 'person') return 40

        // Estimate node dimensions based on content (matching CSS min/max-width)
        const titleLength = todo.title?.length || 0
        const notesLength = todo.notes?.length || 0

        // Width: min 120px, max 280px based on content
        const baseWidth = 120
        const maxWidth = 280
        const estimatedWidth = Math.min(maxWidth, baseWidth + titleLength * 4 + (notesLength > 0 ? 60 : 0))

        // Height: base ~50px for title, plus ~18px per line of notes
        const baseHeight = 50
        const notesLines = notesLength > 0 ? Math.ceil(notesLength / 35) : 0
        const estimatedHeight = baseHeight + notesLines * 18

        // Return radius as half the diagonal (to encompass rectangular node)
        const diagonal = Math.sqrt(estimatedWidth * estimatedWidth + estimatedHeight * estimatedHeight)
        return diagonal / 2 + 20 // Add padding
      }

      this.d3Simulation = d3Force.forceSimulation(nodes)
        .force('link', d3Force.forceLink(links)
          .id(d => d.id)
          .distance(d => {
            // Shorter distance for person-todo links
            if (d.type === 'person-todo') {
              return this.graphEdgeLength * 0.5
            }
            return this.graphEdgeLength * 2
          })
          .strength(d => {
            // Stronger pull for person links to keep them closer
            if (d.type === 'person-todo') {
              return 0.9
            }
            return 0.5
          }))
        .force('charge', d3Force.forceManyBody()
          .strength(this.graphRepulsion)
          .distanceMin(100)
          .distanceMax(800))
        .force('center', d3Force.forceCenter(this.graphWidth / 2, this.graphHeight / 2))
        .force('collision', d3Force.forceCollide()
          .radius(d => getNodeRadius(d.id))
          .strength(0.8))
        // Keep nodes within bounds
        .force('x', d3Force.forceX(this.graphWidth / 2).strength(0.02))
        .force('y', d3Force.forceY(this.graphHeight / 2).strength(0.02))
        .velocityDecay(0.4)
        .alphaDecay(0.02)
        // Start with low alpha if nodes are already positioned (prevents jumping)
        .alpha(allNodesPositioned ? 0.1 : 1)
        .on('tick', () => {
          const newPositions = {}
          const padding = 150
          nodes.forEach(node => {
            // Keep nodes within bounds
            node.x = Math.max(padding, Math.min(this.graphWidth - padding, node.x))
            node.y = Math.max(padding, Math.min(this.graphHeight - padding, node.y))
            newPositions[node.id] = { x: node.x, y: node.y }
          })
          this.nodePositions = newPositions
        })
        .on('end', () => {
          this.isSimulating = false
          this.saveNodePositions()
        })
    },
    stopForceLayout() {
      this.isSimulating = false
      if (this.d3Simulation) {
        this.d3Simulation.stop()
        this.d3Simulation = null
      }
    },
    getGraphStorageKey() {
      // Use project-specific key, or 'all' for no project filter
      const projectId = this.isProjectSelected ? this.currentFilter : 'all'
      return `graph-${projectId}`
    },
    saveNodePositions() {
      const key = this.getGraphStorageKey()
      localStorage.setItem(`${key}-positions`, JSON.stringify(this.nodePositions))
    },
    loadNodePositions() {
      try {
        const key = this.getGraphStorageKey()
        const saved = localStorage.getItem(`${key}-positions`)
        if (saved) {
          this.nodePositions = JSON.parse(saved)
        } else {
          this.nodePositions = {}
        }
      } catch (e) {
        console.error('Failed to load node positions:', e)
        this.nodePositions = {}
      }
    },
    saveGraphSettings() {
      const key = this.getGraphStorageKey()
      localStorage.setItem(`${key}-settings`, JSON.stringify({
        layoutType: this.graphLayoutType,
        edgeLength: this.graphEdgeLength,
        repulsion: this.graphRepulsion,
        orthogonal: this.orthogonalEdges,
        showPersons: this.showPersonsInGraph
      }))
      // Also save as defaults
      localStorage.setItem('graph-repulsion', this.graphRepulsion)
      localStorage.setItem('graph-edge-length', this.graphEdgeLength)
    },
    loadGraphSettings() {
      try {
        const key = this.getGraphStorageKey()
        const saved = localStorage.getItem(`${key}-settings`)
        if (saved) {
          const settings = JSON.parse(saved)
          this.graphLayoutType = settings.layoutType || 'force'
          this.graphEdgeLength = settings.edgeLength || 100
          this.graphRepulsion = settings.repulsion || -300
          this.orthogonalEdges = settings.orthogonal || false
          this.showPersonsInGraph = settings.showPersons || false
        }
      } catch (e) {
        console.error('Failed to load graph settings:', e)
      }
    },
    onGraphSettingChange() {
      this.saveGraphSettings()
      // For tree/grid layout, re-run layout immediately
      if (this.graphLayoutType === 'tree') {
        this.runTreeLayout()
        return
      }
      if (this.graphLayoutType === 'grid') {
        this.runGridLayout()
        return
      }
      // For force layout, only update if simulation is already running
      if (this.d3Simulation) {
        this.d3Simulation
          .force('charge', d3Force.forceManyBody().strength(this.graphRepulsion))
          .force('link', d3Force.forceLink(this.d3Simulation.force('link').links())
            .id(d => d.id)
            .distance(this.graphEdgeLength))
        this.d3Simulation.alpha(0.3).restart()
      }
      // Don't auto-start simulation - user must click "Auto Layout"
    },
    resetGraphSettings() {
      this.graphRepulsion = -400
      this.graphEdgeLength = 100
      this.onGraphSettingChange()
    },
    onGraphTypeFilterChange() {
      localStorage.setItem('graph-type-filter', this.graphTypeFilter)
      this.updateGraphData()
    },
    // Keyboard shortcuts
    handleKeyDown(e) {
      // Ignore if typing in input/textarea
      const target = e.target
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Global Search: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        this.showGlobalSearch = true
        return
      }

      // Escape closes everything: search, inline editing, fullscreen, detail panel, detached windows
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()

        if (this.showGlobalSearch) {
          this.showGlobalSearch = false
          return
        }
        // Close inline node editing in graph
        if (this.editingNodeId) {
          this.editingNodeId = null
          this.editingNodeNotes = ''
          this.editingNodeTitle = ''
        }
        // Close detail view (also exits fullscreen)
        if (this.selectedTodo) {
          if (this.detailFullscreen) {
            this.detailFullscreen = false
            localStorage.setItem('detail-fullscreen', 'false')
          }
          this.closeDetail()
          this.focusedTodoIndex = -1
        }
        // Also close any detached detail windows
        window.api.closeAllDetailWindows()
        return
      }

      // If global search is open, let it handle its own navigation
      if (this.showGlobalSearch) {
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
          this.showGlobalSearch = true
          return
        case '?': // Show help
          e.preventDefault()
          this.showHelpModal = true
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
    setTab(tab) {
      this.activeTab = tab
      localStorage.setItem('active-tab', tab)
      // currentView computed property will automatically get the saved view for this tab
    },
    setView(view) {
      this.currentView = view
      // Saved automatically by the computed setter
    },
    async onGlobalSearchSelectTodo(todoId) {
      // Find the todo to get its project and type
      const todo = this.allTodos.find(t => t.id === todoId)
      if (todo) {
        // Switch to correct tab based on type
        if (todo.type === 'note') {
          this.setTab('notes')
        } else if (todo.type === 'person') {
          this.setTab('stakeholders')
        } else {
          this.setTab('todos')
        }
        // Navigate to correct project
        if (todo.project_id) {
          await this.setFilter(todo.project_id)
        } else {
          await this.setFilter('inbox')
        }
        this.$nextTick(() => {
          const index = this.todos.findIndex(t => t.id === todoId)
          if (index >= 0) {
            this.focusedTodoIndex = index
          }
          this.selectTodo(todoId)
        })
      } else {
        // Fallback: just try to select the todo
        this.selectTodo(todoId)
      }
    },
    async onGlobalSearchSelectPerson(person) {
      // Switch to stakeholders tab
      this.setTab('stakeholders')
      // Select the person in PersonsView
      this.pendingPersonEdit = person
    },
    async onGlobalSearchSelectProject(project) {
      // Switch to todos tab and navigate to project
      this.setTab('todos')
      await this.setFilter(project.id)
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
    toggleSidebarPin() {
      this.sidebarPinned = !this.sidebarPinned
      localStorage.setItem('sidebar-pinned', this.sidebarPinned)
      if (this.sidebarPinned) {
        this.sidebarVisible = true
      }
    },
    onSidebarMouseLeave() {
      if (!this.sidebarPinned) {
        this.sidebarVisible = false
      }
    },
    async undo() {
      if (!this.historyState.canUndo) return
      await window.api.undo()
      await this.loadTodos()
      await this.loadAllTodos()
      await this.loadAllLinks()
    },
    async redo() {
      if (!this.historyState.canRedo) return
      await window.api.redo()
      await this.loadTodos()
      await this.loadAllTodos()
      await this.loadAllLinks()
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
      this.setFilter('persons')
    },
    openPersonDetails(person) {
      this.pendingPersonEdit = person
      this.setFilter('persons')
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
            this.todoPersons[todo.id] = persons
          }
        }
      } else {
        this.todoPersons = {}
      }
    },
    async loadProjectPersons(projectId) {
      const persons = await window.api.getProjectPersons(projectId)
      this.projectPersons[projectId] = persons
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
    getRandomPersonColor() {
      const colors = [
        '#d93025', '#ea4335', '#ef5350', '#ff5252', '#ff1744',
        '#c2185b', '#e91e63', '#f06292',
        '#ef6c00', '#ff7043', '#ff9800', '#ff8f00',
        '#f9a825', '#ffb300', '#ffc107', '#ffca28',
        '#0f9d58', '#34a853', '#43a047', '#4caf50', '#7cb342', '#81c784',
        '#009688', '#00897b', '#26a69a', '#4db6ac', '#00bfa5', '#1de9b6', '#64ffda',
        '#00bcd4', '#00acc1',
        '#0288d1', '#039be5', '#03a9f4', '#29b6f6', '#4285f4', '#1a73e8', '#0d47a1',
        '#673ab7', '#5e35b1', '#7b1fa2', '#9c27b0', '#7e57c2', '#ab47bc', '#ba68c8', '#9575cd',
        '#263238', '#37474f', '#455a64', '#546e7a', '#607d8b', '#78909c', '#90a4ae', '#b0bec5'
      ]
      return colors[Math.floor(Math.random() * colors.length)]
    },
    async addPersonFromHeader() {
      if (!this.newPersonName.trim()) return
      try {
        const person = await window.api.createPerson({
          name: this.newPersonName.trim(),
          color: this.getRandomPersonColor()
        })
        this.newPersonName = ''
        await this.loadPersons()
        // If in stakeholders view with a project selected, also link the person
        if (this.isProjectSelected) {
          await window.api.linkProjectPerson(this.currentFilter, person.id)
          await this.loadProjectPersons(this.currentFilter)
        }
      } catch (error) {
        console.error('Failed to create person:', error)
      }
    },
    async loadProjectStakeholders() {
      await this.loadPersons()
      if (this.isProjectSelected) {
        await this.loadProjectPersons(this.currentFilter)
      }
    },
    async assignStakeholder(person) {
      if (!this.isProjectSelected) return
      const stakeholders = this.projectPersons[this.currentFilter] || []
      if (stakeholders.some(p => p.id === person.id)) return
      await window.api.linkProjectPerson(this.currentFilter, person.id)
      await this.loadProjectPersons(this.currentFilter)
    },
    onStakeholderInputBlur() {
      setTimeout(() => {
        this.showStakeholderPicker = false
      }, 150)
    },
    async assignStakeholderFromPicker(person) {
      await this.assignStakeholder(person)
      this.newPersonName = ''
      this.showStakeholderPicker = false
    },
    async unassignStakeholder(person) {
      if (!this.isProjectSelected) return
      await window.api.unlinkProjectPerson(this.currentFilter, person.id)
      await this.loadProjectPersons(this.currentFilter)
    },
    async updateStakeholder(personId, data) {
      if (!this.isProjectSelected) return
      await window.api.updateProjectPersonStakeholder(this.currentFilter, personId, data)
      await this.loadProjectPersons(this.currentFilter)
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
      console.log('handleImport called with mode:', mode)
      try {
        this.showImportDialog = false
        console.log('Calling window.api.importData...')
        const result = await window.api.importData(mode)
        console.log('Import result:', result)
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
    },
    async renderTooltipMermaid() {
      await this.$nextTick()
      try {
        await mermaid.run({
          querySelector: '.graph-tooltip .tooltip-notes pre.mermaid:not([data-processed]), .node-notes pre.mermaid:not([data-processed])'
        })
        document.querySelectorAll('.graph-tooltip .tooltip-notes pre.mermaid, .node-notes pre.mermaid').forEach(el => {
          el.setAttribute('data-processed', 'true')
        })
      } catch {
        // Silently ignore - tooltip may have disappeared
      }
    }
  }
}
</script>
