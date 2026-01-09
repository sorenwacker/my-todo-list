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
      :open-todos-in-window="openTodosInWindow"
      :grid-lock="gridLock"
      :database-path="databasePath"
      @set-filter="setFilter"
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
      @export="handleExport"
      @show-import="showImportDialog = true"
      @manage-persons="openSettings"
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
      @save="saveProjectFromModal"
      @cancel="cancelEditProject"
      @delete="deleteProjectConfirm"
      @assign-person="assignProjectPerson"
      @unassign-person="unassignProjectPerson"
      @open-register="openStakeholderRegister"
    />

    <div class="main-wrapper" :class="{ 'detail-fullscreen': detailFullscreen && selectedTodo }">
    <main class="main-content" :class="{ 'with-detail': selectedTodo }">
      <header class="main-header">
        <div class="header-title-row">
          <h1 class="header-title">{{ currentTitle }}</h1>
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
        <div v-if="currentFilter !== 'persons'" class="header-controls">
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
            <button :class="{ active: currentView === 'cards' }" @click="currentView = 'cards'">Cards</button>
            <button :class="{ active: currentView === 'table' }" @click="currentView = 'table'">Table</button>
            <button :class="{ active: currentView === 'kanban' }" :disabled="isTrashView" @click="currentView = 'kanban'">Kanban</button>
            <button :class="{ active: currentView === 'timeline' }" :disabled="isTrashView" @click="currentView = 'timeline'">Timeline</button>
            <button :class="{ active: currentView === 'graph' }" :disabled="isTrashView" @click="currentView = 'graph'">Graph</button>
          </div>
          <button v-if="isTrashView && trashCount > 0" class="empty-trash-btn" @click="emptyTrash">Empty Trash</button>
        </div>
        <div v-if="!isTrashView && currentFilter !== 'persons'" class="add-todo">
          <input
            ref="newTodoInput"
            v-model="newTodoTitle"
            placeholder="Add a new todo... (press 'n')"
            type="text"
            @keyup.enter="addTodo"
          />
          <button @click="addTodo">Add</button>
        </div>
      </header>

      <!-- Persons View -->
      <PersonsView
        v-if="currentFilter === 'persons'"
        :persons="persons"
        :theme="theme"
        :pending-edit="pendingPersonEdit"
        @refresh="loadPersons"
        @edit-opened="pendingPersonEdit = null"
      />

      <!-- Cards View -->
      <CardsView
        v-if="currentFilter !== 'persons' && currentView === 'cards'"
        :sorted-todos="sortedTodos"
        :grouped-todos="groupedTodos"
        :group-by-project="groupByProject"
        :selected-todo-id="selectedTodo?.id"
        :focused-todo-id="focusedTodo?.id"
        :is-trash-view="isTrashView"
        :card-size="cardSize"
        :sort-by="sortBy"
        :current-filter="currentFilter"
        :card-widths="cardWidths"
        :grid-lock="gridLock"
        @card-click="handleCardClick"
        @card-mousedown="onCardMouseDown"
        @card-resize="onCardResize"
        @toggle-complete="toggleComplete"
        @delete-todo="deleteTodo"
        @restore-todo="restoreTodo"
        @permanent-delete-todo="permanentlyDeleteTodo"
        @update-sorted-todos="updateSortedTodos"
        @drag-end="onDragEnd"
        @update-group-todos="updateGroupTodos"
        @group-drag-end="onGroupDragEnd"
      />

      <!-- Table View -->
      <TableView
        v-if="currentFilter !== 'persons' && currentView === 'table'"
        :sorted-todos="sortedTodos"
        :grouped-todos="groupedTodos"
        :group-by-project="groupByProject"
        :selected-todo-id="selectedTodo?.id"
        :focused-todo-id="focusedTodo?.id"
        :is-trash-view="isTrashView"
        @select-todo="selectTodo"
        @toggle-complete="toggleComplete"
        @delete-todo="deleteTodo"
        @restore-todo="restoreTodo"
        @permanent-delete-todo="permanentlyDeleteTodo"
      />

      <!-- Kanban View -->
      <KanbanView
        v-if="currentFilter !== 'persons' && currentView === 'kanban'"
        :kanban-group-by="kanbanGroupBy"
        :effective-kanban-group-by="effectiveKanbanGroupBy"
        :is-project-selected="isProjectSelected"
        :projects="projects"
        :categories="categories"
        :statuses="statuses"
        :inbox-todos="inboxTodos"
        :uncategorized-todos="uncategorizedTodos"
        :no-status-todos="noStatusTodos"
        :selected-todo-id="selectedTodo?.id"
        :all-todos="filteredTodos"
        @update:kanban-group-by="kanbanGroupBy = $event"
        @select-todo="selectTodo"
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
      />

      <!-- Gantt/Timeline View -->
      <div v-if="currentFilter !== 'persons' && currentView === 'timeline'" class="gantt-view">
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
          <button class="reset-btn" @click="timelineOffset = 0; timelineScale = 100">Reset</button>
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
                    :class="{ completed: todo.completed, selected: selectedTodo?.id === todo.id, dragging: draggingBarId === todo.id, resizing: draggingBarId === todo.id && barDragMode !== 'move' }"
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
      <div
v-if="currentFilter !== 'persons' && currentView === 'graph'" ref="graphContainer" class="graph-view"
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
                v-for="todo in graphNodes"
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
          <button :class="{ active: showGraphSettings }" @click="showGraphSettings = !showGraphSettings">Settings</button>
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
              <input v-model="showPersonsInGraph" type="checkbox" @change="updateGraphData" />
              Show Persons
            </label>
          </div>
          <div class="setting-row">
            <label>Repulsion:</label>
            <input v-model.number="graphRepulsion" type="range" min="-1000" max="-50" step="50" @input="onGraphSettingChange" />
            <span>{{ Math.abs(graphRepulsion) }}</span>
          </div>
          <div class="setting-row">
            <label>Link Distance:</label>
            <input v-model.number="graphEdgeLength" type="range" min="30" max="300" step="10" @input="onGraphSettingChange" />
            <span>{{ graphEdgeLength }}px</span>
          </div>
          <button class="reset-settings-btn" @click="resetGraphSettings">Reset Defaults</button>
        </div>
      </div>

      <div v-if="todos.length === 0 && currentFilter !== 'persons' && currentView !== 'kanban' && currentView !== 'timeline' && currentView !== 'graph'" class="empty-state">
        <p>No todos yet. Add one above.</p>
      </div>

      <!-- Bottom Bar with Card Size Slider -->
      <div v-if="!selectedTodo" class="bottom-bar">
        <div class="card-size-control">
          <label class="card-size-label">
            <span>Card Size</span>
            <input
              v-model.number="cardSize"
              type="range"
              min="200"
              max="600"
              step="50"
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
      :persons="persons"
      :subtasks="subtasks"
      :linked-todos="linkedTodos"
      :assigned-persons="assignedPersons"
      :active-tab="activeTab"
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
      @update:title="selectedTodo.title = $event; saveSelectedTodo()"
      @update:notes="selectedTodo.notes = $event; saveSelectedTodo()"
      @update:notes-sensitive="selectedTodo.notes_sensitive = $event; saveSelectedTodo()"
      @update:active-tab="activeTab = $event"
      @project-change="handleProjectChange"
      @category-change="handleCategoryChange"
      @status-change="handleStatusChange"
      @set-importance="setImportance"
      @update-start-date="updateStartDateFromPanel"
      @clear-start-date="clearStartDate"
      @update-end-date="updateEndDateFromPanel"
      @clear-end-date="clearEndDate"
      @update-recurrence-type="handleRecurrenceTypeChange"
      @update-recurrence-interval="handleRecurrenceIntervalChange"
      @update-recurrence-end-date="updateRecurrenceEndDateFromPanel"
      @clear-recurrence-end-date="clearRecurrenceEndDate"
      @toggle-subtask="toggleSubtask"
      @delete-subtask="deleteSubtask"
      @add-subtask="addSubtask"
      @reorder-subtasks="reorderSubtasks"
      @update:new-subtask-title="newSubtaskTitle = $event"
      @select-linked="selectTodo"
      @unlink="unlinkFrom"
      @toggle-link-search="showLinkSearch = !showLinkSearch"
      @update:link-query="linkQuery = $event; searchForLinks()"
      @link-to="linkTo"
      @assign-person="assignPerson"
      @unassign-person="unassignPerson"
      @toggle-person-picker="showPersonPicker = !showPersonPicker"
      @open-settings="openSettings"
      @open-person="openPersonDetails"
      @reveal-notes="revealNotes"
      @markdown-click="handleMarkdownClick"
    />
    </div>

    <!-- Command Palette / Global Search -->
    <div v-if="showCommandPalette" class="command-palette-overlay" @click.self="closeCommandPalette">
      <div class="command-palette">
        <div class="command-palette-header">
          <input
            ref="searchInput"
            v-model="searchQuery"
            placeholder="Search todos and persons... (Esc to close)"
            class="command-palette-input"
            autofocus
            @input="onSearchInput"
            @keydown.esc="closeCommandPalette"
          />
        </div>
        <div v-if="searchResults.length > 0" class="command-palette-results">
          <div
            v-for="result in searchResults"
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
        <div v-else-if="searchQuery && searchQuery.length > 0" class="command-palette-empty">
          <p>No results found</p>
        </div>
        <div v-else class="command-palette-hint">
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
import { renderMarkdown, renderCardMarkdown, marked } from './utils/markdown.js'
import mermaid from 'mermaid'
import * as d3Force from 'd3-force'
import PersonsView from './PersonsView.vue'
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
    const validViews = ['cards', 'table', 'kanban', 'timeline', 'graph', 'persons']
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
    const cardSize = localStorage.getItem('card-size')
    if (cardSize && (isNaN(parseInt(cardSize)) || parseInt(cardSize) < 100 || parseInt(cardSize) > 1000)) {
      console.warn('Invalid card-size, resetting')
      localStorage.removeItem('card-size')
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
    PersonsView,
    AppSidebar,
    CardsView,
    CategoryModal,
    DetailPanel,
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
      detailFullscreen: localStorage.getItem('detail-fullscreen') === 'true',
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
      cardWidths: JSON.parse(localStorage.getItem('card-widths') || '{}'),
      justResizedCard: false,
      cardMouseDownHeight: null,
      gridLock: localStorage.getItem('grid-lock') === 'true',
      gridSize: 100,
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
      lastDeltaDays: 0,
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
      graphRepulsion: parseInt(localStorage.getItem('graph-repulsion')) || -400,
      graphEdgeLength: parseInt(localStorage.getItem('graph-edge-length')) || 100,
      showGraphSettings: false,
      showPersonsInGraph: localStorage.getItem('show-persons-in-graph') === 'true',
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
      showProjectPersonPicker: false,
      pendingPersonEdit: null,
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
      if (this.currentFilter === 'persons') return 'Persons'
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
      } else if (val === 'cards') {
        this.$nextTick(() => {
          this.applyMasonryLayout()
        })
      }
      localStorage.setItem('current-view', val)
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
    cardSize(val) {
      localStorage.setItem('card-size', val)
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
    async loadAllTodos() {
      this.allTodos = await window.api.getTodos(null)
      // Debug: check if notes_sensitive is being loaded
      const sensitiveTodos = this.allTodos.filter(t => t.notes_sensitive)
      if (sensitiveTodos.length > 0) {
        console.log('Found', sensitiveTodos.length, 'sensitive todos:', sensitiveTodos.map(t => ({ id: t.id, title: t.title, notes_sensitive: t.notes_sensitive })))
      }
      this.trashCount = await window.api.getTrashCount()
    },
    async loadTodos() {
      this.todos = await window.api.getTodos(this.currentFilter)
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
      const todo = await window.api.createTodo('New Todo', projectId)
      todo.start_date = dateStr
      const todoData = this.toPlainTodo(todo)
      await window.api.updateTodo(todoData)
      await this.loadAllTodos()
      await this.loadTodos()
      this.selectTodo(todo.id)
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
      // Show preview if todo has notes, otherwise edit
      this.activeTab = this.selectedTodo.notes && this.selectedTodo.notes.trim() ? 'preview' : 'edit'
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
    toggleDetailFullscreen() {
      this.detailFullscreen = !this.detailFullscreen
      localStorage.setItem('detail-fullscreen', this.detailFullscreen)
    },
    async saveSelectedTodo() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }

      this.saveTimeout = setTimeout(async () => {
        const todoData = this.toPlainTodo(this.selectedTodo)
        await window.api.updateTodo(todoData)
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
    async reorderSubtasks(ids) {
      await window.api.reorderSubtasks(ids)
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
      this.draggingBarId = todo.id
      this.draggingBarTodo = todo
      this.barDragStartX = e.clientX
      this.barDragMode = mode // 'move', 'resize-start', or 'resize-end'
      this.barDragOriginalDates = {
        start_date: todo.start_date,
        end_date: todo.end_date
      }
      this.lastDeltaDays = 0
      document.addEventListener('mousemove', this.onBarDrag)
      document.addEventListener('mouseup', this.stopBarDrag)
      e.preventDefault()
    },
    onBarDrag(e) {
      if (!this.draggingBarTodo) return
      const deltaX = e.clientX - this.barDragStartX
      const deltaDays = Math.round(deltaX / this.timelineScale)

      // Skip if same as last update
      if (deltaDays === this.lastDeltaDays) return
      this.lastDeltaDays = deltaDays

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
        // Save the updated dates
        const todoData = this.toPlainTodo(this.draggingBarTodo)
        await window.api.updateTodo(todoData)
        await this.loadAllTodos()
        await this.loadTodos()
      }

      this.draggingBarId = null
      this.draggingBarTodo = null
      this.barDragMode = 'move'
      this.barDragOriginalDates = null
      this.lastDeltaDays = 0
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
    async selectSearchResult(result) {
      if (result.type === 'person') {
        // Navigate to persons view
        await this.setFilter('persons')
        this.closeCommandPalette()
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
    },
    async redo() {
      if (!this.historyState.canRedo) return
      await window.api.redo()
      await this.loadTodos()
      await this.loadAllTodos()
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
    }
  }
}
</script>
