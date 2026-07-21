# Code Hygiene and Security Audit

Date: 260719
Scope: 57 files — Electron main process, preload, Vue 3 renderer, styles, tests, build scripts, repo root.
Method: objective baseline gates, then a multi-agent per-module review (11 groups) with an
adversarial verification pass: every high/medium finding was challenged by an independent
verifier that could refute it or correct its severity.
Raw findings: 114. Confirmed: 61. Refuted: 3. Unverified lower-confidence notes: 50 (appendix).

This replaces the 260615 review. Since then the gates have improved substantially: tests went
from 49 failing to all passing, lint from 67 errors to 0, format from 32 unformatted files to 1.

## Baseline gates

| Gate | Command | Result | Detail |
|------|---------|--------|--------|
| Tests | `npm test` (vitest) | PASS | 139 of 139 passing |
| Lint | `npm run lint` (eslint) | WARN | 0 errors, 3 warnings (`vue/no-v-html` in CardItem, ItemPreview, KanbanCard) |
| Format | `npm run format:check` (prettier) | FAIL | `src/main/index.js` not formatted |
| Dependency audit | `npm audit` | FAIL | 5 vulnerabilities: 2 high (`undici`), 2 moderate (`js-yaml` + 1), 1 low; all transitive, `npm audit fix` resolves them |
| File size (<= 1000 LOC) | style rule | FAIL | `App.vue` 2672, `database.js` 1367, `styles.css` 9007 |
| Repo hygiene | manual | FAIL | live user DB `todo.db` tracked in git; vestigial `main.py`, `pyproject.toml`, `uv.lock` |

Note: the lint/format gates cover only `src/` and `tests/`. `scripts/afterSign.cjs` has 7 eslint
errors when linted with the same config (CommonJS globals not declared for `.cjs`).

## Summary

Confirmed findings by severity: 7 high, 18 medium, 36 low.

Recurring themes:

1. **Electron security posture.** Context isolation and input validation are done well, but the
   app registers no navigation or window-open restrictions, the CSP allows inline scripts, one
   view bypasses the sensitive-notes guard, and the markdown sanitization pipeline (the app's
   only XSS barrier) has configuration inconsistencies and no tests.
2. **Export/import correctness.** The backup round-trip silently drops fields and whole tables,
   and the import completion path calls a method that does not exist.
3. **Dead code at scale.** An unreachable ~700-line timeline/calendar subsystem in App.vue, an
   entire unused component and composable, unused npm dependencies, vestigial Python
   scaffolding, and several thousand lines of unreferenced CSS.
4. **Duplication.** KanbanCard vs CardItem (~150 lines), composable logic reimplemented in
   App.vue, duplicated color palettes, copy-pasted migration blocks.
5. **File-size violations** driven by the same root cause: App.vue absorbing responsibilities
   that belong in components/composables that already exist.

## Remediation status (260719)

All high and medium findings were fixed the same day, except the two deferred file-size splits:

- Fixed high: H1 (navigation/window-open restrictions plus production CSP without
  `'unsafe-inline'` for scripts), H2 (version 2.0 export/import covering all ten user-data
  tables and all todo columns, tolerant of version 1.0 payloads), H3 (real `loadData()`),
  H5 (Kanban sensitive-notes guard), H6 (indent-unit-aware `preprocessMarkdown`), H7
  (stylesheet brace restored; the second orphaned block near line 1807 was removed too).
- Fixed medium: M1, M3-M15, M17, M18. Dead-code removal (M3, M7, M8, M13) shrank App.vue
  from 2673 to 1754 lines. Card logic is shared via `cardInteractionsMixin.js` (M9) with
  date helpers in `utils/dueDates.js` (M10) and `renderCardNotes` in `utils/markdown.js`.
  New test files: `tests/markdown.test.js` (sanitization pipeline, jsdom environment) and
  `tests/exportImport.test.js` (round-trip); `tests/dueDates.test.js` extended.
- Also fixed: `npm audit` clean, prettier clean, `todo.db` untracked and gitignored, test
  count 139 -> 177.

A second remediation pass the same day closed the remaining scope:

- Low-severity dead code removed: vestigial Python scaffolding (`main.py`, `pyproject.toml`,
  `uv.lock`, `scripts/generate-dmg-bg.py`), unused dependencies `d3-force` and `sql.js`,
  19 IPC bridge methods with no renderer caller (and their main-process handlers), the
  `tags_json` subquery, the symbol-picker feature, unused component props and composable
  exports, `renderInlineMarkdown`, and the dead stylesheet clusters (detail-window,
  stakeholder, inline links/persons, slide transitions). The DOMPurify config lost its
  SVG/`style` allowances (mermaid bypasses the sanitizer) and its contradictory
  FORBID entries.
- File-size gate now passes everywhere (H4, M2, M16 closed): migrations and backup logic
  split out of `database.js` (921 lines, plus `schema.js` and `importExport.js`, which
  also collapsed the 15 copy-pasted migration blocks); `styles.css` split byte-identically
  into 12 ordered slices under `src/renderer/styles/`; App.vue (972 lines) split into
  `AppHeader`, `HomeLanding`, `HelpModal`, `ImportDialog` components, keyboard/todo-action
  mixins, a masonry composable, and mermaid/localStorage utilities.
A third pass closed the documented follow-ups:

- Removed the stylesheets for views unreachable from the UI (`availableViews` is fixed to
  cards/kanban): `timeline.css` deleted, the graph-view rules cut from the graph slice, and
  the dead timeline/graph light-theme rules removed (~1790 lines). The surviving item-preview
  tooltip and settings-sidebar rules were kept and the slice renamed `tooltip-settings.css`.
- Resolved the light-theme conflict: `.light-theme .subtask-count` set `color` in two slices;
  the later slice already won, so the overridden `color: #999` was removed (no visual change).
  The other apparent duplicates were legitimate `@media` breakpoint overrides, left in place.
- Added Vue component tests (`@vue/test-utils` + jsdom): `KanbanCard`, `CardItem`,
  `GlobalSearch`, and the dialogs — covering the sensitive-notes guard, context menus, search
  keyboard navigation, and dialog emits. Suite is now 203 tests.

- Still open: nothing from the confirmed findings. Candidate for a future pass: the table-view
  CSS (the table view is likewise unreachable, but its rules are spread across several slices
  and share generic `table` selectors with live markdown-table styling, so it needs careful
  per-selector verification).

## Re-triage (260721)

A fresh correctness review plus a re-verification of every H1-L18 finding against the current
code. Every high and medium finding remains fixed; five low-severity findings were still open
(L2, L9, L12, L14, L16). Changes made this pass:

- New correctness fixes (not in the original audit):
  - `recurrence_end_date` was dropped on any generic edit (`toPlainTodo` omitted it, `updateTodo`
    nulled it), so an imported recurring todo would recur forever. `toPlainTodo` now carries the
    field and `updateTodo` preserves it when omitted, mirroring `parent_id`/`milestone_date`.
  - Undo/redo history was never cleared on import, so post-import undo ran against replaced rows;
    `import-data` now calls `history.clear()`.
  - Removed a dead `category_id` reference in `toPlainTodo` (the `categories` table was dropped).
  - Empty `catch {}` blocks in `todoActionsMixin` (todo creation) now log instead of swallowing.
- Dead code removed: orphaned `getMilestoneTodos`/`unlinkMilestoneTodo`/`getAllMilestones`/
  `assignToMilestone`/`unassignFromMilestone`/`getChildTodos`, and `searchByTag`/`deleteTag`
  (zero callers). `linkMilestoneTodo` kept (export/import round-trip test seeds `milestone_todos`).
- L9 fixed: `show-completed` is now persisted to localStorage.
- L12 fixed: `EntityModal` focuses its name input from the `entity` watcher, not `mounted()`.
- L16 fixed: `ItemPreview` no longer renders `company`/`role`/`description` (fields no item has).
- L21 fixed: the identical 30-color project/status palettes are now one `entityColorPalette` in
  `helpers.js`, imported by both composables.

Deliberately left:

- L14 (project-tags): `ProjectModal` receives `project-tags`/`all-tags`/`add-tag`/`remove-tag`
  that it drops, because the project-tag feature has a complete, tested backend (DB methods, IPC,
  composable) but no UI was ever built. Removing it is a product decision (build the UI or delete
  the feature), not a mechanical cleanup, so it is left for an explicit call.
- L2 (import size): `MAX_IMPORT_FILE_SIZE` is checked after `readFileSync` and counts UTF-16
  units. Low impact (local, user-chosen file). Would use `statSync().size` before reading.
- `update-todo` history guard (`index.js`): the `JSON.stringify(oldTodo) !== JSON.stringify(result)`
  guard is effectively always true because `updated_at` advances; only the "actual change" comment
  is inaccurate. No data impact (extra undo entries for no-op saves).

## Confirmed findings

### High

#### H1. No navigation or window-open restrictions on the main window

`src/main/index.js:80` — design

createMainWindow() sets contextIsolation:true and nodeIntegration:false, but the app registers no 'will-navigate' handler and no webContents.setWindowOpenHandler. The renderer displays user-authored markdown via v-html; if any anchor or script ever triggers a navigation or window.open, the window can load a remote page. Critically, the preload script (and therefore the entire window.api IPC surface: full DB read/write, export, shell.openExternal) is attached to the window, so a navigated-to remote page would inherit that API. CSP mitigates but is weakened by 'unsafe-inline' (see separate finding).

**Fix:** In app.whenReady, add app.on('web-contents-created', (_, contents) => { contents.on('will-navigate', (e, url) => { if (!isAllowed(url)) e.preventDefault() }); contents.setWindowOpenHandler(({ url }) => { shell.openExternal(validateUrl(url)); return { action: 'deny' } }) }) allowing only the dev server URL / local file.

#### H2. Export/import round-trip silently drops todo fields and whole tables

`src/main/database.js:1314` — correctness

exportData (line 1249) exports todos via SELECT *, but importData re-inserts only 15 columns, omitting type, topic_id, notes_sensitive, parent_id, milestone_date, completed_at, and archived_at. A backup restored via import turns every milestone/note into type 'todo', loses milestone hierarchy and dates, un-archives archived todos, and drops the sensitive-notes flag. Additionally, tags, todo_tags, project_tags, project_topics, milestone_todos, settings, and projects.notes are neither exported nor imported, so the feature named 'exportData' does not export the database's data.

**Fix:** Export and import all user-data tables and all todo columns; version the payload (the 'version: 1.0' field exists but the shape was never updated as columns were added).

#### H3. handleImport calls this.loadData(), which does not exist

`src/renderer/App.vue:2624` — correctness

In handleImport: `await this.loadData()` after a successful import. No method named loadData is defined anywhere in App.vue, its composables, or the rest of the source tree (grep: the only occurrence in the repo is this call site). At runtime this throws `TypeError: this.loadData is not a function`, which is caught by the surrounding try/catch, so a SUCCESSFUL import shows the alert 'Failed to import backup: this.loadData is not a function' and the UI never reloads the imported data until app restart.

**Fix:** Replace with the reload sequence used elsewhere: `await this.loadProjects(); await this.loadStatuses(); await this.loadAllTodos(); await this.loadTodos()` (or extract that into a real loadData() method used by both mounted() and handleImport).

#### H4. File is 2673 lines, violating the 1000-line project limit

`src/renderer/App.vue` — design

App.vue is 2673 lines, more than 2.5x the project's hard limit of 1000 lines per file. A large portion is dead timeline/calendar code (see separate finding), but even after removing it the file remains a god-component mixing keyboard handling, drag-and-drop, masonry layout, notes persistence, import/export, and view orchestration.

**Fix:** Delete the dead subsystems first, then extract remaining concerns (keyboard shortcuts, masonry layout, project-notes draft handling) into composables to get under 1000 lines.

#### H5. Kanban cards render notes flagged notes_sensitive, bypassing the sensitive-content guard

`src/renderer/components/KanbanCard.vue:101` — correctness

KanbanCard renders notes with `<div v-html="renderCardNotes(todo.notes)"></div>` (line 101) with no check of `todo.notes_sensitive`. Its sibling CardItem.vue (line 166) and ItemPreview.vue both gate on `todo.notes_sensitive` and show a 'Sensitive content hidden' placeholder instead. The field exists end-to-end (database.js migration line 252, validators.js line 184, useTodos.js line 33), so a note the user explicitly marked sensitive is hidden in Cards view but fully displayed in Kanban view. This defeats the privacy feature.

**Fix:** Add the same `v-if="todo.notes_sensitive"` placeholder branch used in CardItem.vue before the v-html sink in KanbanCard.vue.

#### H6. preprocessMarkdown breaks correctly 4-space-indented nested lists

`src/renderer/utils/markdown.js:29` — correctness

`'    '.repeat(Math.ceil(spaces.length / 2))` doubles ALL existing indentation, assuming input always uses 2-space indents. Standard 4-space input is mangled: '- parent\n    - child' becomes '- parent\n        - child', which marked 14.1.3 renders as `<ul><li>parent<br>  - child</li></ul>` (verified) — the nested list is destroyed and shown as literal text. Deeper 2-space nesting is also over-indented (6 spaces -> 12 instead of the intended proportional mapping).

**Fix:** Normalize indentation instead of doubling it, e.g. treat the smallest observed indent unit as one level, or only rewrite when the document consistently uses 2-space indents. Add unit tests for 2-space, 4-space, and mixed inputs.

#### H7. Missing closing brace in .register-btn:hover swallows the last ~600 lines of the stylesheet

`src/renderer/styles.css:8410` — correctness

The rule at lines 8410-8411 is never closed:

.register-btn:hover {
  background: #8e44ad;

/* Apply improved readability colors */
input, textarea, select {

Per CSS error recovery, every subsequent top-level rule (each `selector { ... }` is one component value with no terminating semicolon) is consumed as part of a single invalid declaration inside the unclosed block, all the way to EOF. Everything from line 8413 to 9007 is therefore dropped by the parser. This includes styles that ARE live in the app: `.sensitive-notes-card` (used in CardItem.vue), `.sensitive-notes-overlay`/`.reveal-btn`, `.topic-box*` and `.bottom-bar` (used in App.vue), plus the `body:not(.light-theme)` dark-mode readability overrides and the global input/select color rules.

**Fix:** Add the missing `}` after `background: #8e44ad;` on line 8411 (and delete the dead `.register-btn`/`.stakeholder-register-link` rules entirely, since no component references them — but the brace must be balanced either way).

### Medium

#### M1. Updater holds stale window reference; destroyed-window check missing for dialog

`src/main/updater.js:63` — correctness

initAutoUpdater captures the window once into module-level mainWindow. On macOS, closing the window does not quit the app (index.js window-all-closed), and the 'activate' handler in index.js:798 calls createMainWindow() without re-calling initAutoUpdater, so the updater keeps pointing at the destroyed window forever: update status events silently go nowhere (sendStatusToWindow checks isDestroyed) and, worse, the 'update-downloaded' branch guards only with `if (mainWindow)` — dialog.showMessageBox(destroyedWindow, ...) throws, and the error is only swallowed by the global uncaughtException logger.

**Fix:** Guard the dialog with `mainWindow && !mainWindow.isDestroyed()`, and either export a setWindow(win) called from createMainWindow, or resolve the target window lazily via BrowserWindow.getAllWindows()[0].

#### M2. database.js is 1367 lines, exceeding the 1000-line project limit

`src/main/database.js` — design

The project hygiene gate states no file may exceed 1000 lines. `wc -l` reports 1367 lines. The file mixes schema/migrations (~360 lines), project/status/todo CRUD, milestones, links, tags, settings, search, and export/import in one class.

**Fix:** Split into modules (e.g. migrations.js, and per-domain repository files or mixins: todos, projects, tags, settings, importExport) composed by the Database class.

#### M3. Entire timeline/calendar/gantt/milestone subsystem is unreachable (~700 lines)

`src/renderer/App.vue:918` — dead-code

availableViews is hard-coded to `['cards', 'kanban']` and the template renders only CardsView/KanbanView, so currentView can never be 'timeline' or 'calendar'. Grep across src/ and tests/ confirms none of the following are referenced outside App.vue, and none are used in App.vue's own template: computeds timelineTodos, timelineRange, timelineDates, todayPosition, calendarPeriodLabel, calendarMonthDays, calendarWeekDays, calendarDayTodos, dateLabelInterval, ganttRows; methods loadMilestoneRelations, addMilestone, createTodoOnDate, onTimelineChartDblClick, createTodoFromTimeline, formatTimelineDate, getWeekdayName, getWeekStart, navigateCalendar, goToToday, getTodosForCalendarDate, isToday, isWeekend, shouldShowDateLabel, getTimelinePosition, getGanttBarStyle, getRowHeight, getImportanceColor, startBarDrag, onBarDrag, stopBarDrag, onTimelineWheel; data milestoneRelations, timelineScale, timelineMode, calendarDate, timelineOffset, ganttGroupBy, draggingBarId, draggingBarTodo, barDragStartX/Y, barDragMode, barDragOriginalDates, lastDeltaDays, dropTargetRowId; the `val === 'timeline'` branch of the currentView watcher and the entire ganttGroupBy watcher. Calendar logic is additionally duplicated in src/renderer/components/CalendarView.vue.

**Fix:** Delete the whole timeline/calendar/gantt/milestone block from App.vue (data, computeds, watchers, methods). If a timeline view is planned, reintroduce it as a dedicated component when it is actually wired up.

#### M4. validateLocalStorage rejects the valid 'due' sort option

`src/renderer/App.vue:551` — correctness

The sort <select> offers `manual`, `created`, `due`, `alpha` (template line 299-304), but validateLocalStorage defines `const validSorts = ['manual', 'created', 'alpha']`. A user who sorts by due date has their preference silently reset to 'manual' on every app launch because the startup validator considers 'due' invalid and rewrites the 'sort-by' key.

**Fix:** Add 'due' to validSorts. Consider deriving the valid lists from the same constants the UI uses so they cannot drift.

#### M5. Custom marked code renderer interpolates token.text and token.lang without HTML escaping

`src/renderer/App.vue:652` — correctness

mermaidExtension's code renderer returns `<pre class="mermaid">${token.text}</pre>` and `<pre><code class="language-${token.lang || ''}">${token.text}</code></pre>` with raw, unescaped content, whereas marked's default code renderer HTML-escapes it. Because `marked.use(mermaidExtension)` mutates the shared instance from utils/markdown.js, this affects every markdown render in the app. Consequences: (1) any HTML written inside a fenced code block is parsed as markup instead of displayed literally — DOMPurify then strips/keeps it per purifyConfig, so code content is corrupted; (2) since purifyConfig allows tags like <img> with src, a code block that should render as literal text can inject real elements (e.g. remote image loads) into notes previews; (3) token.lang (the fence info string) can break out of the class attribute pre-sanitization. Script execution is prevented only by the downstream DOMPurify pass — the renderer itself is unsafe.

**Fix:** HTML-escape token.text and token.lang in both branches (e.g. a small escapeHtml helper, or fall back to marked's default renderer for the non-mermaid case). For the mermaid branch, escape entities as mermaid decodes them itself.

#### M6. selectTodo is an empty stub, so documented keyboard shortcuts do nothing

`src/renderer/App.vue:1889` — correctness

`async selectTodo(_id) { // TODO: Will be implemented with popover editor }` is a no-op, yet it is called from 15 sites (keyboard navigation, global search selection, card click, todo creation flows). The in-app help modal advertises 'Enter / e — Open/Edit todo', which silently does nothing. The name promises selection behavior that does not exist (aspirational naming), and downstream helpers like addToRecentItems that would feed off selection are never invoked.

**Fix:** Either implement the popover editor or remove selectTodo and its call sites plus the misleading 'Open/Edit todo' entries from the help modal until the feature exists.

#### M7. Roughly thirty additional dead methods, computeds, and data fields

`src/renderer/App.vue` — dead-code

Grep across src/ and tests/ shows each of these App.vue members appears exactly once (its definition) and is never referenced from App.vue's template or any other file: methods onGroupByProjectChange, getInitials, getStatusCount, getStatusTodos, getProjectCount, renderCardNotes, renderCardMarkdown/renderInlineMarkdown wrappers, formatDeadline, formatShortDate, isOverdue, showAddProject, addProject, showAddStatus, addStatus, formatCreatedDate, getCardStyle, resetCardSize (and with it saveCardSizes and the cardSizes data field), toggleProjectFilter (leaving filterProjectId permanently null, making the filter branch in filteredTodos unreachable), handleRowClick, addToRecentItems (so recentItems is loaded from localStorage but never updated at runtime), navigateToProject, toggleStatusesCollapsed, toggleSettingsCollapsed (and the statusesCollapsed/settingsCollapsed data fields, which are not passed to AppSidebar — AppSidebar manages its own), handleMarkdownClick, renderTooltipMermaid, onInboxDragEnd; computeds currentTitle, itemsCount, currentViewIndex, viewTransitionName, projectTransitionName, projectTransitionKey, tabTransitionName (the template's only Transition uses fixed name="fade", so the whole transition-direction machinery — viewTransitionDirection, projectTransitionDirection, tabTransitionDirection, previousViewIndex, previousProjectFilter and the activeTab watcher — is dead); data gridSize, importanceFilterOp, importanceFilterValue, typeFilter, saveTimeout, and altKeyHeld (written by handleKeyDown/handleKeyUp but never read).

**Fix:** Delete all listed members. Where a child component already owns the logic (see duplication finding), the App.vue copy is the one to remove.

#### M8. CalendarView.vue is an unused component; App.vue reimplements the calendar inline

`src/renderer/components/CalendarView.vue` — dead-code

grep for 'CalendarView' across src/ and tests/ finds only the component's own 'name: CalendarView' declaration (line 152). It is never imported, registered, or rendered. App.vue instead contains its own duplicate calendar implementation (calendarPeriodLabel at ~1063, calendarMonthDays at ~1080, calendarWeekDays at ~1122, getTodosForCalendarDate at ~2056, plus getWeekStart/formatDateKey/navigation), which mirrors this component's computeds and methods almost line for line. This is 844 lines of dead code that also violates the no-duplicated-logic rule, and it will silently drift from the live calendar in App.vue.

**Fix:** Either delete CalendarView.vue, or (preferably) wire it into App.vue and delete the inline calendar logic there so the calendar exists in exactly one place.

#### M9. KanbanCard duplicates ~150 lines of logic from CardItem

`src/renderer/components/KanbanCard.vue` — consistency

formatDeadline, isOverdue, formatCreatedDate, renderCardNotes (including the identical mermaid-stripping regex `/`{3,}\s*mermaid\b[\s\S]*?`{3,}/gi`), startEdit/saveTitle/cancelEdit, startNotesEdit/saveNotes, dueDateValue, and the entire context-menu implementation (showContextMenu, clampContextMenu, hideContextMenu, dueDatePreset, openDatePicker, setDueDateFromMenu, the 'close-card-menus' listener lifecycle) are copy-pasted between KanbanCard.vue and CardItem.vue. The notes_sensitive divergence reported above is a direct consequence of this duplication. The project rules explicitly forbid duplicated logic across files.

**Fix:** Extract the shared date-formatting/markdown helpers into src/renderer/utils/ and the edit-state plus context-menu behavior into a composable (e.g. useCardContextMenu / useCardEditing) consumed by both components.

#### M10. isOverdue marks todos due today as overdue for users west of UTC

`src/renderer/components/CardItem.vue:293` — correctness

isOverdue does `new Date(dateString)` where end_date is a plain 'YYYY-MM-DD' string (per dueDates.js: 'interpreted in the user's local timezone'). The JS Date parser treats date-only strings as UTC midnight, so in any timezone behind UTC the parsed instant falls on the previous local day and `date < now` (local midnight) is true for a todo due today. The card then shows 'Due: Today' from formatDeadline while simultaneously getting the .overdue style. The same bug is duplicated in KanbanCard.vue line 188. This also contradicts dueDates.js, which deliberately avoids UTC shifting when writing dates.

**Fix:** Compare date strings directly (e.g. `dateString.split('T')[0] < formatLocalDate(new Date())`) or parse with explicit local components, and put the helper in utils/dueDates.js shared by both card components.

#### M11. Tag search results emit 'select-tag' that no parent handles

`src/renderer/components/GlobalSearch.vue:309` — correctness

GlobalSearch renders a Tags result group and selectResult() emits 'select-tag' (line 309: `this.$emit('select-tag', item)`), but App.vue mounts <GlobalSearch> (App.vue:515-521) listening only to @close, @select-todo, and @select-project. Clicking or pressing Enter on a tag result closes the search overlay and silently does nothing — the user's navigation intent is dropped with no feedback.

**Fix:** Either wire an @select-tag handler in App.vue that filters by the chosen tag, or stop returning/rendering the Tags group in GlobalSearch until tag navigation exists.

#### M12. Keyboard navigation is dead in the Recent items list

`src/renderer/components/GlobalSearch.vue:275` — correctness

When the query is empty, the Recent list is rendered and highlights rows via `hoverIndex === index`, but moveSelection() and selectCurrentItem() operate exclusively on flatResults, which is computed from this.results and is empty without a query. So ArrowUp/ArrowDown return early (`if (this.flatResults.length === 0) return`) and Enter does nothing, even though the UI shows a selected-row highlight implying keyboard operability. hoveredItem() already special-cases the recent list, so half the code paths know about it and half do not.

**Fix:** Make moveSelection/selectCurrentItem fall back to recentItems when query is empty (mirroring the special case in hoveredItem), e.g. clamp hoverIndex to recentItems.length and emit select-todo for the highlighted recent item on Enter.

#### M13. Entire useSettings composable is dead code

`src/renderer/composables/useSettings.js` — dead-code

useSettings.js (112 lines: defaultSettings, loadSettings, updateSetting, resetSettings, isInitialized, isLoading) is never imported anywhere. Grep across src/ and tests/ finds no occurrence of 'useSettings' or 'composables/useSettings' outside the file itself; App.vue imports only useTodos, useProjects, and useStatuses (App.vue lines 539-541). The whole settings-persistence module, including its optimistic-update/revert logic, is unreachable.

**Fix:** Either wire App.vue's settings handling through this composable or delete the file. The project owner's gate explicitly requires removing dead code.

#### M14. saveProject swallows all errors with an empty catch

`src/renderer/composables/useProjects.js:134` — correctness

saveProject wraps the whole body in 'try { ... } catch { // Project save failed }'. On any IPC/database failure the error is silently discarded: nothing is logged, state.editingProject stays set, and the caller gets a resolved promise, so the UI shows no failure and the edit modal state is left inconsistent. The sibling composable handles the same operation properly: useStatuses.saveStatus (lines 151-154) logs via console.error and rethrows. This is both a swallowed-exception bug and a pattern divergence between siblings.

**Fix:** Match useStatuses: log the error and rethrow (or surface it to the caller) instead of the empty catch.

#### M15. preprocessMarkdown rewrites lines inside fenced code blocks

`src/renderer/utils/markdown.js:23` — correctness

The per-line loop applies `line.match(/^( +)([-*]|\d+\.) (.*)$/)` to every line without tracking fenced code blocks, so list-looking lines inside ``` fences get their indentation rewritten. Verified with the installed marked 14.1.3: input 'text\n```\n  - item in code\n```' is preprocessed to '    - item in code' inside the fence, so the user's code content is silently altered before rendering.

**Fix:** Track fence state (``` / ~~~) while iterating and pass through lines inside fenced code blocks unchanged. Same applies to 4-space indented code blocks if those are meant to be supported.

#### M16. File is 9,007 lines, violating the 1000-line-per-file project gate

`src/renderer/styles.css` — design

styles.css is a monolithic 9,007-line stylesheet (project rule: no file over 1000 lines). It mixes base/reset, sidebar, modals, cards, table, kanban, gantt, calendar, graph, command palette, persons/stakeholders, sensitive notes, topic boxes, and a full parallel `.light-theme` override set. The size directly caused the two syntax errors found (lines 1807 and 8411) going unnoticed, and there is already a `src/renderer/styles/` directory holding cube-transition.css that the file could be split into.

**Fix:** Split into feature-scoped files under src/renderer/styles/ (e.g. base.css, sidebar.css, cards.css, kanban.css, gantt.css, calendar.css, graph.css, light-theme.css) and import them from main.js. Run a CSS linter (stylelint) in the pre-commit hook to catch unbalanced braces.

#### M17. .card-size-control defined twice in the same file with conflicting layouts

`src/renderer/styles.css:1082` — consistency

Line 1082 defines `.card-size-control` as a plain inline flex row (padding: 0; margin: 0). Line 1172 re-defines the same selector as a fixed overlay (`position: fixed; bottom: 20px; right: 20px; padding: 12px 16px; background: rgba(10,14,23,0.95); z-index: 100`), silently overriding the first. A third override, `.bottom-bar .card-size-control` (line 8858), tries to neutralize the fixed variant but is currently dead because of the unclosed-brace bug at line 8411 — so the control renders as a fixed bottom-right overlay regardless of the .bottom-bar markup in App.vue.

**Fix:** Keep a single `.card-size-control` definition matching the actual bottom-bar placement and delete the fixed-position duplicate at lines 1172-1185.

#### M18. No tests for the markdown sanitization pipeline (the app's XSS sink)

`src/renderer/utils/markdown.js` — design

tests/ contains no coverage of src/renderer/utils/markdown.js (188 lines) — the DOMPurify + marked/mermaid path feeding every v-html sink. Grep across tests/ shows zero references. Given the project's TDD mandate and the security review priority on v-html/XSS, the sanitizer config (stripping event handlers, javascript: URLs, allowed tags) is exactly the behavior that should be pinned by tests so a future config change cannot silently reopen XSS. src/renderer/utils/helpers.js is similarly untested.

**Fix:** Add tests/markdown.test.js (vitest environment 'jsdom' or happy-dom for this file) asserting that rendered output strips <script>, on* attributes, and javascript:/data: URLs, and that mermaid/marked output passes through sanitization.

### Low

#### L1. CSP allows script-src 'unsafe-inline'

`src/main/index.js:119` — design

The injected Content-Security-Policy contains "script-src 'self' 'unsafe-inline'". For an app that renders untrusted markdown through v-html, 'unsafe-inline' for scripts removes the CSP's main XSS backstop: if DOMPurify is ever misconfigured or bypassed, injected inline <script> or event-handler payloads execute. A production Vue build loads only bundled external scripts and does not need inline script permission ('unsafe-inline' is typically only needed for style-src).

**Fix:** Drop 'unsafe-inline' from script-src (keep it for style-src if required). If the dev server needs it, branch the CSP on NODE_ENV.

#### L2. Import size limit checked after the whole file is already read

`src/main/index.js:723` — correctness

In the 'import-data' handler, readFileSync(importPath, 'utf-8') loads the entire file into memory, and only afterwards is fileContent.length compared to MAX_IMPORT_FILE_SIZE with the comment 'Limit file size to prevent memory issues'. The check cannot prevent the memory issue it claims to prevent: a multi-GB file is fully read (and can OOM the main process) before the limit applies. Also fileContent.length counts UTF-16 code units, not bytes.

**Fix:** Check statSync(importPath).size against MAX_IMPORT_FILE_SIZE before calling readFileSync.

#### L3. update-todo-sync duplicates update-todo and uses a different change-detection basis

`src/main/index.js:377` — consistency

The 'update-todo-sync' ipcMain.on handler re-implements the 'update-todo' handler's body (validate, fetch oldTodo, update, history.push, history-changed notify) instead of sharing it. It also diverges subtly: 'update-todo' compares JSON.stringify(oldTodo) !== JSON.stringify(result) (the DB row after update), while the sync variant compares against validatedTodo (the raw input). Because the input object need not match the stored row shape (DB-computed/normalized fields), the sync path can push history entries for no-op saves, producing undo steps that do nothing.

**Fix:** Extract a shared applyTodoUpdate(todo, options) helper used by both handlers, comparing oldTodo against the database result in both cases.

#### L4. Duplicate milestone channels; several milestone IPC channels have no renderer callers

`src/main/index.js:541` — dead-code

There are two 'Milestone operations' sections (lines 223 and 540). 'get-all-milestones' (line 242) and 'get-milestones' (line 547) are two channels calling the same database.getAllMilestones with near-identical null handling. Grep across src/renderer/ shows the preload wrappers getMilestones, getAllMilestones, getChildTodos, assignToMilestone, and unassignFromMilestone are never called by any renderer code, and tests/ contains no IPC-level tests for them — so the channels 'get-milestones', 'get-all-milestones', 'get-child-todos', 'assign-to-milestone', and 'unassign-from-milestone' are currently dead IPC surface (the renderer uses getMilestoneTodos/linkMilestoneTodo/unlinkMilestoneTodo instead).

**Fix:** Remove the unused channels (and their preload wrappers), keeping at most one milestone-list channel, and merge the two 'Milestone operations' sections.

#### L5. importData 'replace' mode leaves stale rows in tables it does not clear

`src/main/database.js:1277` — correctness

Replace mode deletes only todo_links, todos, statuses, and projects. todo_tags, project_tags, tags, milestone_todos, and project_topics are untouched, and with foreign keys not enabled (see pragma finding) nothing cascades. After a replace import, the database retains orphaned tag associations, milestone links, and topics referencing deleted rows, and getAllTags still returns the old tag set.

**Fix:** In replace mode, also delete milestone_todos, todo_tags, project_tags, project_topics, and tags inside the same transaction.

#### L6. tags_json subquery is computed but never consumed anywhere

`src/main/database.js:481` — dead-code

The all-todos and inbox branches of getAllTodos compute `(SELECT json_group_array(...)) as tags_json` per row. Grep across src/renderer, src/main, and tests finds zero readers of `tags_json` — the renderer fetches tags via the separate getTodoTags IPC channel. It is also inconsistently present: the project, trash, and archive branches omit it, so it cannot be relied on even if a consumer were added. It adds a correlated subquery per row for nothing.

**Fix:** Remove the tags_json subquery from both branches, or if inline tags are wanted, add it to all branches and actually consume it in the renderer.

#### L7. Fifteen copy-pasted ALTER TABLE migration blocks duplicate identical error handling

`src/main/database.js:119` — consistency

Lines 119-362 repeat the same try/exec/catch block (checking 'duplicate column' / 'already exists', then log.warn) fifteen times, differing only in the SQL string and log label. This violates the project's no-duplicated-logic rule and makes each new migration another copy-paste.

**Fix:** Extract a helper, e.g. `addColumnIfMissing(table, columnDef)` or a small migration runner iterating over a declarative list of column additions.

#### L8. Nine exposed IPC API methods have no renderer caller (unused attack surface)

`src/preload/index.js:31` — dead-code

Grepped src/renderer and tests: the following contextBridge exposures are never called anywhere: updateTodoSync (line 31), getChildTodos (43), getMilestones (44), assignToMilestone (45-46), unassignFromMilestone (47), getAllMilestones (55), notifyTodoUpdated (100), checkForUpdates (103), onUpdateStatus (104-108). Each carries a live main-process handler (e.g. ipcMain.on('update-todo-sync') at src/main/index.js:377, ipcMain.on('todo-updated') at :750), so this is dead code on both sides of the bridge and unnecessary IPC attack surface. The block at lines 42-47 is even labelled 'legacy'. Additionally 'get-milestones' and 'get-all-milestones' both resolve to database.getAllMilestones (src/main/index.js:245 and :551-553), i.e. duplicated channel logic. Note: onRefreshTodos IS live (App.vue:1405, fed by undo/redo handlers), only its notifyTodoUpdated trigger is dead.

**Fix:** Remove the unused preload exposures and their corresponding ipcMain handlers ('update-todo-sync', 'todo-updated', 'get-child-todos', 'get-milestones', 'assign-to-milestone', 'unassign-from-milestone', 'get-all-milestones', 'check-for-updates') in one atomic change, or wire up the update-status UI if it is intended to exist. Keep only channels the renderer actually invokes.

#### L9. 'Show done' preference is read from localStorage but never written

`src/renderer/App.vue:306` — correctness

data() initializes `showCompleted: localStorage.getItem('show-completed') === 'true'`, but the checkbox is a plain `v-model="showCompleted"` with no change handler, there is no `showCompleted` watcher, and the persisting method toggleShowCompleted (line 1493) is never called from anywhere (grep: single occurrence, its definition). The setting therefore always reverts to its last externally-written value (or false) on restart, and toggleShowCompleted is dead code.

**Fix:** Add a `showCompleted(val)` watcher that persists to localStorage (matching the sidebarVisible/groupByProject/sortBy pattern) and delete toggleShowCompleted.

#### L10. Verbatim duplicates of child-component helpers

`src/renderer/App.vue:1529` — consistency

App.vue defines renderCardNotes, formatDeadline, isOverdue, formatCreatedDate, getStatusCount, getStatusTodos, getProjectCount, and getCardStyle even though the same helpers already exist and are actually used in KanbanCard.vue, CardItem.vue, AppSidebar.vue, KanbanView.vue, and CardsView.vue respectively (confirmed by grep). The App.vue copies are unused (see dead-code finding), so this is duplicated logic across files, which the project rules explicitly forbid — and the duplicates can drift (e.g. renderCardNotes' mermaid-stripping regex must stay in sync).

**Fix:** Delete the App.vue copies; if any helper is needed in multiple components, move it to a shared util/composable instead of duplicating.

#### L11. isProjectView prop is declared and passed but never used

`src/renderer/components/CardsView.vue:161` — dead-code

CardsView declares `isProjectView: { type: Boolean, default: false }` (line 161) and App.vue binds it (`:is-project-view="isProjectSelected"`, App.vue line 433), but the prop is never referenced in CardsView's template or script. grep across src/ and tests/ confirms no other usage. Dead plumbing that misleads readers into thinking the view branches on project mode.

**Fix:** Remove the prop from CardsView.vue and the binding from App.vue.

#### L12. Autofocus in mounted() never fires because the modal mounts hidden

`src/renderer/components/EntityModal.vue:117` — correctness

EntityModal focuses the name input in mounted(), but StatusModal/ProjectModal are rendered unconditionally in App.vue (lines 101, 109, no v-if), so EntityModal mounts once at app startup with entity=null, when `v-if="entity"` hides the template and this.$refs.nameInput does not exist. When the user later opens the modal (entity becomes non-null) mounted() does not re-run, so the input is never focused. The mounted hook is effectively dead code and its comment ('Focus the name input when modal opens') is inaccurate.

**Fix:** Move the focus logic into the existing `entity` watcher: when val becomes truthy, $nextTick(() => this.$refs.nameInput?.focus()). Delete the mounted() hook.

#### L13. ItemPreview rendered twice, producing two stacked overlapping previews

`src/renderer/components/GlobalSearch.vue:133` — correctness

The same `<ItemPreview v-if="hoveredItem" :item="hoveredItem.item" class="search-preview" />` appears at line 4 (outside the overlay, commented 'Preview outside overlay so it appears in main window') and again at line 133 inside the overlay ('Preview Panel'). Both share the identical condition and the fixed position `.search-preview { position: fixed; right: 16px; top: 80px }`, so whenever a result is hovered two identical previews render on top of each other (one above the overlay backdrop, one below).

**Fix:** Keep exactly one instance (the one whose stacking relative to .search-overlay z-index 1100 is intended) and delete the other.

#### L14. App.vue passes project-tags/all-tags and @add-tag that ProjectModal silently drops

`src/renderer/components/ProjectModal.vue:23` — correctness

App.vue (line ~109) binds `:project-tags="editingProjectTags"`, `:all-tags="allTags"`, and `@add-tag="addProjectTag"` on <ProjectModal>, but ProjectModal declares only `project` and `colors` props and only save/cancel/delete emits, and renders no tag UI. The tag props fall through as unused attrs on EntityModal and `add-tag` can never fire, so addProjectTag in App.vue is unreachable via this modal. Either the caller carries dead wiring or the modal is missing an intended feature.

**Fix:** Decide which side is authoritative: remove the three tag bindings from App.vue (plus the now-unreachable handler/state), or implement the tag editor in ProjectModal via EntityModal's extra-content slot.

#### L15. Symbol picker feature is dead: no consumer ever enables it

`src/renderer/components/EntityModal.vue:26` — dead-code

`showSymbolPicker` defaults to false and grep shows no component ever passes show-symbol-picker/symbols; StatusModal and ProjectModal (the only consumers) enable only the color picker. Consequently the symbol-picker template block (lines 26-36), the `symbols` prop, the `getIconComponent` method, the import of getIconComponent/availableIcons from helpers.js, and the .symbol-picker/.symbol-option CSS (lines 210-237) are all unreachable. The extra-content slot is likewise unused and its comment (line 38: 'e.g., stakeholders in ProjectModal') references the stakeholder feature removed in commit 65d6bab, so the comment is stale.

**Fix:** Remove the symbol-picker block, symbols prop, getIconComponent method/import, and related CSS; either remove the extra-content slot or update its stale comment if it is being kept for the tag editor.

#### L16. Template branches for company, role, and description reference fields that no item has

`src/renderer/components/ItemPreview.vue:5` — dead-code

Lines 5-6 render `item.company` and `item.role`, and line 16 renders `item.description`, but grep of src/main/database.js and the renderer composables shows no company, role, or description columns/fields anywhere in the schema or search results — these are leftovers from the removed stakeholder register (commit 65d6bab 'Remove stakeholder register'). The branches can never render.

**Fix:** Delete the three dead template branches and the .tooltip-meta CSS that exists only to style them.

#### L17. All five defineExpose'd methods are called by no consumer

`src/renderer/components/NotesEditor.vue:185` — dead-code

`defineExpose({ getSelection, replaceSelection, getScrollElement, getScrollInfo, setScrollTop })` exposes five methods, but grep across the whole src tree finds no external call to any of them (consumers App.vue, CardItem.vue, KanbanCard.vue only use v-model/@blur). Roughly 40 lines of dead public API, and the comment 'Expose methods for selection handling' describes functionality nothing uses.

**Fix:** Delete the five functions and the defineExpose call, or wire up the feature (e.g. scroll-sync/selection formatting) that they were written for.

#### L18. Props visible, inboxCount, and isProjectSelected are declared and passed but never used

`src/renderer/components/AppSidebar.vue:204` — dead-code

AppSidebar declares `visible` (line 204), `inboxCount` (line 213), and `isProjectSelected` (line 218); App.vue dutifully binds all three (:visible, :inbox-count, :is-project-selected), yet nothing in AppSidebar's template, computed, watch, or methods references any of them. They are dead API surface that misleads readers into thinking the sidebar handles its own visibility and an inbox count.

**Fix:** Remove the three props from AppSidebar and the corresponding bindings in App.vue (and inboxCount plumbing if it has no other consumer).

#### L19. Computed exports currentProjectName, currentProjectColor, isProjectSelected are unused and duplicated in App.vue

`src/renderer/composables/useProjects.js:231` — dead-code

The composable exports currentProjectName (line 231), currentProjectColor (line 239), and isProjectSelected (line 249) as computeds returning functions, but no file ever accesses them: grep finds no 'projectsComposable.currentProjectName/currentProjectColor/isProjectSelected' anywhere. Instead App.vue reimplements the identical logic as its own computed properties (App.vue lines 858-883: currentProjectColor, isProjectSelected, currentProjectName). This is simultaneously dead code in the composable and duplicated logic in App.vue. Note also the computed-returning-a-function pattern defeats Vue's computed caching, so even if used they would provide no memoization benefit.

**Fix:** Delete the three unused computeds from useProjects, or (better) have App.vue consume them and delete its duplicate implementations. If kept, make them plain functions or computeds keyed on real reactive filter state rather than computeds that return functions.

#### L20. focusedTodo computed is unused; App.vue duplicates the identical logic

`src/renderer/composables/useTodos.js:320` — dead-code

useTodos exports a focusedTodo computed (lines 320-325), but grep finds no 'todosComposable.focusedTodo' access anywhere. App.vue defines its own focusedTodo computed with the exact same body (App.vue lines 945-950: 'if (this.focusedTodoIndex >= 0 && this.focusedTodoIndex < this.todos.length) return this.todos[this.focusedTodoIndex]'). Dead export in the composable plus duplicated logic in the consumer.

**Fix:** Remove the composable's focusedTodo computed, or have App.vue use it and delete the duplicate.

#### L21. PROJECT_COLORS and STATUS_COLORS are identical 30-entry palettes duplicated across two files

`src/renderer/composables/useProjects.js:11` — consistency

PROJECT_COLORS in useProjects.js (lines 11-48) and STATUS_COLORS in useStatuses.js (lines 11-48) are byte-for-byte the same 30 hex colors with the same grouping comments. This violates the project's no-duplicated-logic rule; any palette change must be made twice. Additionally the exposure is inconsistent: useProjects exports it wrapped in readonly() (line 266) while useStatuses exports the raw mutable array (line 226).

**Fix:** Extract a single shared palette constant (e.g. src/renderer/constants/colors.js) imported by both composables, and expose it the same way (readonly) in both.

#### L22. showAddStatus is never called; add-input state in useProjects/useStatuses is vestigial, superseded by useAddInput

`src/renderer/composables/useStatuses.js:103` — dead-code

The add-input UI now lives in AppSidebar.vue via useAddInput('project'/'status') (AppSidebar lines 239-240), which emits add-project/add-status handled by App.vue's addProjectFromSidebar/addStatusFromSidebar. The composables' parallel add-input machinery is orphaned: useStatuses.showAddStatus (line 103) is never invoked anywhere (App.vue's own showAddStatus method at line 1970 is itself unbound in any template and assigns to a getter-only computed, which is a no-op). The state fields newStatusName/showStatusInput (useStatuses lines 56-57) and newProjectName/showProjectInput (useProjects lines 57-58) are only read by App.vue proxy computeds whose sole consumers are App.vue methods (addProject line 1918, addStatus line 1976, showAddProject line 1912, showAddStatus line 1970) that no template references. Two competing implementations of the same feature exist, one of them dead.

**Fix:** Remove showAddStatus, newStatusName, showStatusInput from useStatuses and newProjectName, showProjectInput from useProjects (and the corresponding dead App.vue methods/computeds), keeping useAddInput as the single add-input mechanism. cancelAddProject/cancelAddStatus can then shrink to no-ops or be removed if only the state resets remain.

#### L23. SVG tags incl. foreignObject allowed in sanitizer for a path that bypasses DOMPurify

`src/renderer/utils/markdown.js:87` — correctness

ALLOWED_TAGS admits 'svg','g','path','line','rect','circle','text','polygon','polyline','marker','defs','style','foreignObject' with the comment 'for mermaid diagrams'. But mermaid output never passes through DOMPurify: App.vue's marked extension emits `<pre class="mermaid">` (which survives sanitization as plain pre/text) and `mermaid.run()` later injects the SVG directly into the live DOM. So these entries do nothing for mermaid and instead allow user-authored raw SVG in any note/preview to pass sanitization. 'foreignObject' in particular is forbidden by DOMPurify's defaults because it is a known mXSS/namespace-confusion vector; allowing it materially widens the XSS surface of every v-html sink that uses renderMarkdown/renderCardMarkdown.

**Fix:** Remove all SVG-related tags and attributes (viewBox, d, transform, marker-end, etc.) from purifyConfig; keep the sanitizer scoped to the HTML that markdown actually produces. Mermaid's own securityLevel governs its injected SVG.

#### L24. 'style' is in both ALLOWED_TAGS and FORBID_TAGS

`src/renderer/utils/markdown.js:134` — consistency

ALLOWED_TAGS includes 'style' (line 86) while FORBID_TAGS includes 'style' (line 134). In DOMPurify, FORBID_TAGS takes precedence, so `<style>` elements are always stripped — the ALLOWED_TAGS entry is dead config and the surrounding 'for mermaid' comment is misleading about what the sanitizer actually permits.

**Fix:** Remove 'style' from ALLOWED_TAGS (stripping it is the correct behavior) so the config states one intent.

#### L25. Live user database todo.db is tracked in git; .gitignore has no rule for it or uv.lock

`.gitignore` — consistency

`git ls-files` shows `todo.db` is committed to the repository. It is the app's live SQLite database path (user data), which does not belong in version control and risks committing personal todo content on any future change. Additionally `uv.lock` sits untracked (`?? uv.lock` in git status) with no ignore rule, and the `dist/` / `build/` ignores are grouped under the misleading comment `# Python-generated files` although they actually cover electron-builder/vite output.

**Fix:** Run `git rm --cached todo.db`, add `todo.db` (or `*.db`) to .gitignore. Either remove uv.lock along with the Python scaffolding (see main.py finding) or add it to .gitignore. Re-label the dist/build ignore section as build output rather than Python-generated.

#### L26. Vestigial Python project scaffolding in a JavaScript-only project

`main.py` — dead-code

`main.py` is a hello-world stub (`print("Hello from todo!")`) that nothing references. Together with `pyproject.toml`, the tracked `.python-version`, the untracked `uv.lock`, and the local `.venv/`, this is leftover `uv init` scaffolding in an Electron/Node project. The only real Python file, `scripts/generate-dmg-bg.py`, is stdlib-only and does not need a Python project definition. Verified via grep: no file in src/, tests/, scripts/, Makefile, or package.json references main.py or the pyproject.

**Fix:** Delete main.py, pyproject.toml, .python-version, and uv.lock (git rm the tracked ones). scripts/generate-dmg-bg.py runs standalone with `python3` if it is kept.

#### L27. Unused dependencies: d3-force (runtime) and sql.js (dev)

`package.json:58` — dead-code

Grep across src/, tests/, and scripts/ finds zero references to `d3-force` (no `d3` import, no `forceSimulation`) and zero references to `sql.js` (no `initSqlJs`, `sqljs`, or `sql-wasm`). `d3-force` is declared in `dependencies` (line 58) and `sql.js` in `devDependencies` (line 46). sql.js looks like a leftover from before the better-sqlite3 native module was adopted for tests (tests now rebuild better-sqlite3 via `pretest`).

**Fix:** Remove both entries and run `npm install` to update package-lock.json.

#### L28. Orphaned script: nothing invokes it and its output is not used by the build

`scripts/generate-dmg-bg.py` — dead-code

No reference to `generate-dmg-bg` exists in Makefile, package.json, or any other script (grep verified). Its outputs `resources/dmg-background.svg`/`.png` do not exist in resources/, and the electron-builder `dmg` config in package.json has no `background` key, so even regenerated output would never be consumed. The script is fully disconnected from the DMG pipeline it claims to serve.

**Fix:** Either wire it up (Makefile target + `"background": "resources/dmg-background.png"` in the dmg build config) or delete it.

#### L29. Orphaned declaration block with missing selector (lost `.person-picker-empty {`)

`src/renderer/styles.css:1807` — correctness

Lines 1807-1810 contain declarations with no selector, immediately after `.person-picker-list { ... }` closes:

  text-align: center;
  padding: 16px;
  color: #ccc;
}

The opening line (evidently `.person-picker-empty {`, given the following `.person-picker-empty p` rule) was deleted, leaving invalid CSS that the parser discards, plus a stray unmatched `}` at line 1810.

**Fix:** Delete lines 1807-1810 outright — `.person-picker-empty`, `.person-picker-list`, and `.person-picker-popup` are referenced nowhere in any .vue/.js/.html source, so the whole person-picker popup block (lines 1795-1828) is dead and should be removed rather than repaired.

#### L30. cube-transition.css contains no cube transition; the transitions App.vue computes have no CSS at all

`src/renderer/styles/cube-transition.css` — naming

The file (header comment '/* View transitions */') defines only `fade`, `slide`, and `slide-reverse` transition classes — no cube transition, so the filename is aspirational. Meanwhile App.vue's computeds `viewTransitionName` ('cube'/'cube-reverse'), `projectTransitionName` ('project-cube'/'project-cube-reverse'), and `tabTransitionName` ('tab-slide'/'tab-slide-reverse') reference transition names that have no CSS anywhere in the repo, and no <Transition> element binds them (the sole <Transition> in App.vue hardcodes name="fade"). Those view/project/tab transitions are silent no-ops.

**Fix:** Rename the file to view-transitions.css (updating the import in src/renderer/main.js), and either implement the cube/tab-slide classes and bind the computeds, or delete the dead computeds from App.vue.

#### L31. .slide-* and .slide-reverse-* transition classes are unused, and slide-reverse lacks its -active rules

`src/renderer/styles/cube-transition.css:33` — dead-code

Grep across all .vue/.js sources finds no <Transition name="slide"> or name="slide-reverse"; the only transition used is `fade` (App.vue line 406). Lines 32-56 are dead. Additionally, `.slide-reverse-enter-from`/`.slide-reverse-leave-to` (lines 48-56) have no matching `.slide-reverse-enter-active`/`.slide-reverse-leave-active` transition rules, so even if the name were used it would snap without animating — evidence the block was never exercised.

**Fix:** Delete lines 32-56, or wire the classes to actual <Transition> usage with complete -active rules.

#### L32. Detached detail-window styles (.detail-app) are dead — no component or entry point uses the class

`src/renderer/styles.css:7657` — dead-code

`.detail-app` appears only in styles.css (lines 1413-1422 '/* Detail App Styles */', the '/* Detail App Light Theme */' block at 7657-7776, and line 8615 `.detail-app { border-left: 4px solid #444; }`). Grep across src/ (all .vue/.js/.html, including src/renderer/index.html) finds no element with class detail-app; the app uses the in-window `.detail-panel` instead. This looks like a removed separate detail-window feature whose ~140 lines of styles were left behind.

**Fix:** Delete the .detail-app rule blocks (lines 1413-1422, 7657-7776, 8614-8617).

#### L33. Entire stakeholder UI style cluster is unreferenced

`src/renderer/styles.css:8279` — dead-code

None of these classes appear in any .vue/.js/.html source: `.stakeholders-section` (8279-8298), `.picker-toggle-btn` (8300-8312), `.stakeholder-picker` (8315-8344), `.assigned-stakeholders` (8346), `.stakeholder-badge` (8353), `.stakeholder-remove` (8365-8380), `.no-stakeholders` (8382-8390), `.stakeholder-register-link`/`.register-btn` (8393-8411), and also `.stakeholder-picker-dropdown` with all its child rules (1254-1323) and `.stakeholder-add-wrapper` (1250-1252). Roughly 200 lines of styles for a removed stakeholder feature.

**Fix:** Delete the stakeholder style blocks; this also removes the rule containing the unclosed-brace bug at line 8411.

#### L34. Inline links/persons and person-assignment style clusters are unreferenced

`src/renderer/styles.css:1673` — dead-code

Verified unused in all .vue/.js/.html sources: `.inline-links` (1673-1678), `.link-chip`/`.chip-x` (1680-1714), `.add-link-btn` cluster is adjacent, `.add-person-btn` (1780-1793), `.person-picker-popup`/`-list`/`-empty` (1795-1828), `.person-option` (8141-8162 plus light-theme variants), `.assigned-persons`/`.assigned-person` (8194-8254 plus light-theme variants), `.tabs-row`/`.tabs-spacer` (8828-8843), `.sensitive-checkbox` (defined twice, 8626-8645 and 8791-8825, with conflicting styles), `.checkbox-lg` (72-81), and `.persons-inline`/`.add-person-inline`/`.person-search-inline`/`.search-results-inline` (8513-8598 plus light-theme variants at 8476-8510). These are leftovers from removed person-assignment UI iterations.

**Fix:** Remove each verified-dead cluster; re-grep before deleting in case of dynamically constructed class strings (none were found for these names).

#### L35. TestDatabase duplicates production Database logic instead of using the real class

`tests/history.test.js:9` — consistency

history.test.js defines a 60-line hand-rolled `class TestDatabase` (its own CREATE TABLE, getTodo, createTodo, updateTodo, deleteTodo, restoreTodo) that re-implements a subset of src/main/database.js. The sibling file database.test.js explicitly demonstrates the real production `Database` class runs fine under vitest when given a db path ('Passing a db path keeps electron's `app` import out of the code path'). The 'History with Database Integration' suite therefore validates undo/redo against a fake schema, not the real one (no updated_at trigger behavior, no project/tag/link columns), so integration regressions in the real soft-delete/restore path would go undetected. This also violates the project gate 'No duplicated logic across files.'

**Fix:** Delete TestDatabase and import { Database } from '../src/main/database.js' in the integration describe block, as database.test.js already does.

#### L36. Three exported validators are untested: validateStatus, validateOptionalRecurrenceType, validateOptionalPositiveInt

`tests/validators.test.js:2` — consistency

validators.js exports validateStatus (line 242), validateOptionalRecurrenceType (line 195), and validateOptionalPositiveInt (line 209), but validators.test.js neither imports nor tests them, while every other validator in the module has a dedicated describe block. These validators guard IPC inputs (status CRUD, recurrence fields), which is the app's security boundary per SECURITY.md posture, so the gap is not merely cosmetic.

**Fix:** Add describe blocks for validateStatus, validateOptionalRecurrenceType, and validateOptionalPositiveInt mirroring the existing accept/reject test pattern.

## Refuted findings

Reported by reviewers, refuted by the verification pass (not defects):

- src/main/database.js:17 SQLite foreign key enforcement is never enabled, making all FK clauses inert
- src/main/database.js:582 updateTodo silently clears topic_id when the caller omits it, unlike parent_id/milestone_date
- src/renderer/styles.css:5763 .person-node-remove:hover repositions the button under the cursor

## Appendix: unverified lower-confidence notes

These were reported by reviewers but not adversarially verified. Treat as leads, not confirmed defects.

- `src/main/index.js:741` (consistency) **get-database-path re-derives the DB path instead of asking Database.** The handler returns join(app.getPath('userData'), 'todos.db'), duplicating the path logic in src/main/database.js:14.
- `src/main/index.js:709` (consistency) **import-data validates input outside handleWithValidation.** 'import-data' calls validateImportMode(mode) directly in a bare ipcMain.handle callback instead of using the handleWithValidation wrapper every other validating handler uses.
- `src/main/index.js:814` (correctness) **uncaughtException handler logs and continues silently.** process.on('uncaughtException', ...) only logs the error.
- `src/main/logger.js:55` (correctness) **error() mutates the caller's context object.** In error(), `context.stack = context.error.stack; context.errorMessage = ...; delete context.error` mutate the object passed by the caller.
- `src/main/logger.js:85` (dead-code) **LOG_LEVELS exported but never used outside logger.js.** Grep across src/ and tests/ shows LOG_LEVELS is referenced only inside logger.js; the export on line 85 has no consumers.
- `src/main/database.js:1033` (correctness) **setSetting stores raw strings but getSetting JSON-parses, corrupting string values.** `const stringValue = typeof value === 'string' ? value : JSON.stringify(value)` stores strings un-encoded, while getSetting/getAllSettings run JSON.parse on every value.
- `src/main/database.js:730` (consistency) **getCompletedTodoIds and archiveCompletedTodos duplicate the same WHERE-clause builder.** Both methods (lines 730-744 and 746-758) build the identical `completed = 1 AND archived_at IS NULL AND deleted_at IS NULL` filter with the same inbox/number branching on projectId.
- `src/main/database.js:861` (consistency) **reorderTodos/reorderProjects/reorderStatuses triplicate identical transaction logic.** Lines 861-892 contain three methods that differ only in table name; each prepares `UPDATE <table> SET sort_order = ? WHERE id = ?` and loops ids in a transaction.
- `src/main/database.js:37` (dead-code) **Fresh databases still create the legacy 'deadline' column that no code writes or reads.** The CREATE TABLE todos statement declares `deadline TEXT`, but grep shows the only DB-level references are the schema itself and the one-time migration copying deadline into end_date (line 156); all reads/writes use end_date.
- `src/preload/index.js:96` (consistency) **onRefreshTodos passes the raw IpcRendererEvent to the renderer callback.** onRefreshTodos registers the caller's callback directly: `ipcRenderer.on('refresh-todos', callback)`, so the callback's first argument is the IpcRendererEvent, which leaks across the context bridge.
- `src/main/validators.js:288` (correctness) **validateUrl's protocol-specific error message is unreachable.** The ValidationError('url must use http or https protocol') is thrown inside the try block and immediately caught by the enclosing `catch`, which rethrows a generic ValidationError('url must be a valid URL').
- `src/main/validators.js:270` (naming) **validateImportMode silently coerces invalid input instead of throwing.** Every other validator in this module throws ValidationError on invalid input; validateImportMode instead returns the fallback 'merge' for any invalid value (`if (!validModes.includes(mode)) { return 'merge' }`).
- `src/main/validators.js:209` (consistency) **validateOptionalPositiveInt returns 1 for absent values, unlike other Optional validators.** validateOptionalId, validateOptionalDate, validateOptionalImportance, and validateOptionalRecurrenceType all return null (or '' for validateOptionalString) when the value is absent, but validateOptionalPositiveInt returns the hardcoded default 1.
- `src/main/validators.js:376` (correctness) **validateSettingValue default case passes values through unvalidated.** The switch in validateSettingValue ends with `default: return value`.
- `src/config/constants.js:25` (naming) **MAX_ARRAY_SIZE groups scalar value caps that are not array sizes.** Of the three entries in MAX_ARRAY_SIZE, only IDS (10000) is an array-length limit.
- `src/renderer/App.vue:663` (consistency) **marked.use(mermaidExtension) mutates the shared marked instance from another module as a side effect of loading App.vue.** utils/markdown.js owns marked configuration (setOptions, DOMPurify config) and exports renderers used by CardItem/KanbanCard, but App.vue registers a renderer-overriding extension on that same shared instance at module scope (`marked.use(mermaidExtension)`).
- `src/renderer/App.vue:2417` (dead-code) **Escape handler references editingNodeId/editingNodeNotes/editingNodeTitle, which are not declared in data().** In handleKeyDown's Escape branch: `if (this.editingNodeId) { this.editingNodeId = null; this.editingNodeNotes = ''; this.editingNodeTitle = '' }`.
- `src/renderer/App.vue:547` (dead-code) **validateLocalStorage checks keys the app never uses and parses a version it never reads.** `const _storedVersion = parseInt(...)` is computed and never used — SETTINGS_VERSION is written back but no migration logic exists.
- `src/renderer/App.vue:596` (correctness) **validateLocalStorage catch-all wipes every localStorage key on any unexpected error.** The catch block iterates all localStorage keys and removes each one (keysToPreserve is empty), so a single unexpected exception during validation silently destroys all user preferences (theme, recent items, per-project settings, sidebar state).
- `src/renderer/App.vue:1694` (correctness) **Inbox drag state is never cleared on cancelled drags because onInboxDragEnd is not wired up.** onInboxDragStart sets draggingInboxTodo, but the CardItem in the inbox landing binds only @dragstart (template line 396) — onInboxDragEnd exists (line 1699) yet no template or component emits dragend to it (grep: definition only).
- `src/renderer/App.vue:2152` (consistency) **applyMasonryLayout duplicates its own layout loop verbatim.** The method contains the identical grid/card row-span loop twice, once at 150ms and again nested at +200ms, differing only by the trailing observeCards() call.
- `src/renderer/App.vue:986` (design) **Computed properties mutate composable state as a side effect.** filteredTodos calls setCurrentFilter/setSearchQuery/setShowCompleted on the todos composable, and sortedTodos calls setSortBy, inside computed getters.
- `src/renderer/components/CardItem.vue:342` (dead-code) **cancelNotesEdit is never called.** `cancelNotesEdit()` (line 342) is not referenced in the template (NotesEditor only wires @blur to saveNotes and @update:model-value), nor anywhere else in the source tree or tests (grep confirms only the definition).
- `src/renderer/components/KanbanView.vue:100` (consistency) **No-Status column uses a prop while sibling status columns derive from allTodos.** In the status-based kanban, the No Status column binds `:model-value="noStatusTodos"` (a prop computed in App.vue), while every other column binds `:model-value="getStatusTodos(status.id)"` which locally filters `allTodos` and applies its own `!t.deleted` predicate.
- `src/renderer/components/CardItem.vue:357` (docstring) **Comment claims context menu is teleported to <body>, but the Teleport target is .app.** Both CardItem.vue (line 357: '// Fixed (viewport) coordinates: the menu is teleported to <body>.') and KanbanCard.vue (line 246, same comment) contradict the actual template, which uses `<Teleport to=".app">` — a choice the template comment itself explains ('teleported to .app ...
- `src/renderer/components/CardsView.vue:210` (dead-code) **getCardStyle ignores its todoId parameter.** `getCardStyle(todoId, projectColor)` never uses `todoId`; both call sites pass `element.id` for nothing.
- `src/renderer/components/ItemPreview.vue:30` (dead-code) **position prop and positionStyle computed are never exercised.** The only consumer of ItemPreview is GlobalSearch.vue, which passes just :item and positions the preview via the .search-preview class; the `position` prop (line 30) is never bound, so `positionStyle` always returns {} and `:style="positionStyle"` is a no-op.
- `src/renderer/components/ItemPreview.vue:2` (naming) **Root class 'graph-tooltip' misrepresents the component and couples it to global CSS.** The component is named ItemPreview and is used as a search preview panel, yet its root element carries class `graph-tooltip` with all core styling (.graph-tooltip, .tooltip-title, .tooltip-project, .tooltip-deadline, .tooltip-notes) living in the global styles.css rather than the component's scoped style block — a leftover identity from a graph-view tooltip.
- `src/renderer/components/index.js:4` (consistency) **Barrel file is incomplete and exports KanbanCard which nothing imports from it.** index.js exports KanbanCard, but KanbanView.vue imports KanbanCard directly from './KanbanCard.vue' and no file imports it via the barrel — a dead export.
- `src/renderer/components/EntityModal.vue:63` (dead-code) **entityType validator accepts 'category' and 'person' which exist nowhere.** The validator `['project', 'status', 'category', 'person'].includes(val)` and the matching namePlaceholder entries (lines 101-102) cover entity types no component ever passes — grep finds only entity-type="project" and entity-type="status".
- `src/renderer/components/AppSidebar.vue:340` (dead-code) **CSS rules for elements not present in the template.** `.collapse-indicator` (line 340, plus light-theme variant at line 577) and `.checkbox-label` (line 510, plus light-theme variant at line 647) style class names that appear nowhere in the template — the collapse indicator was replaced by ChevronRight/ChevronDown icons and no checkbox exists in the settings section.
- `src/renderer/components/GlobalSearch.vue:466` (dead-code) **Dead .search-container CSS rule.** The scoped style defines `.search-container` (lines 466-472) but no element in the template uses that class; the layout it describes (flex row of modal + preview) was superseded by the fixed-position .search-preview approach.
- `src/renderer/components/NotesEditor.vue:14` (consistency) **Editor hardcodes darkEditorTheme while the app supports a light theme.** The app propagates a theme ('dark'/'light') through components (AppSidebar receives a theme prop and has full light-theme styling), but NotesEditor unconditionally applies `darkEditorTheme` with no theme prop or light variant, so the CodeMirror editor stays dark inside a light-themed app.
- `src/renderer/composables/useStatuses.js:53` (consistency) **useStatuses uses ref(object) + manual computed wrappers while sibling composables use reactive + toRefs.** useProjects, useTodos, and useSettings all use 'const state = reactive({...})' and spread '...toRefs(state)' in the hook return.
- `src/renderer/composables/useProjects.js:164` (consistency) **deleteProjectConfirm dereferences state.editingProject without a null guard.** deleteProjectConfirm immediately reads state.editingProject.name inside confirm() (line 164) and state.editingProject.id (line 165).
- `src/renderer/composables/useTodos.js:276` (docstring) **setSortBy docstring omits the supported 'due' sort mode.** setSortBy's docstring says "@param {string} sortBy - Sort criteria ('created', 'alpha', or 'manual')" (line 276), but sortTodos (lines 63-78) also implements 'due', and the App.vue sort dropdown offers value="due" (App.vue line 302).
- `src/renderer/composables/useTodos.js:116` (correctness) **addTodo returns the stale pre-update todo when extra updates were applied.** addTodo creates the todo, then if 'updates' is non-empty sends '{ ...todo, ...updates }' to updateTodo, but still 'return todo' (line 116) — the object without the applied updates.
- `src/renderer/utils/markdown.js:135` (consistency) **Redundant FORBID_ATTR blocklist and redundant ADD_ATTR.** FORBID_ATTR lists six on* handlers ('onerror','onclick','onload','onmouseover','onfocus','onblur'), but ALLOWED_ATTR is an explicit allowlist that already excludes every event-handler attribute — the blocklist is a no-op and its incompleteness (dozens of other on* attributes exist) falsely suggests a blocklist-based defense.
- `src/renderer/utils/markdown.js:188` (dead-code) **DOMPurify re-export is unused.** `export { marked, DOMPurify }` — grep across src/ and tests/ shows no file imports DOMPurify from this module (the only DOMPurify references are inside markdown.js itself).
- `src/renderer/utils/markdown.js:166` (docstring) **renderCardMarkdown docstring claims the detail panel uses renderMarkdown, but nothing does.** The docstring states 'The full note is shown in the detail panel, which uses {@link renderMarkdown} directly.' Grep across src/ and tests/ shows no file imports renderMarkdown; every consumer (App.vue, KanbanCard.vue, CardItem.vue, ItemPreview.vue) uses renderCardMarkdown or renderInlineMarkdown.
- `src/renderer/utils/helpers.js:38` (dead-code) **iconMap is exported but never imported elsewhere.** `export const iconMap = {...}` — grep across src/ and tests/ shows no external references to iconMap; consumers use getIconComponent and availableIcons instead (EntityModal.vue).
- `pyproject.toml:4` (docstring) **Placeholder metadata never filled in.** `description = "Add your description here"` and `version = "0.1.0"` (the app itself is at 0.4.1) confirm this file is untouched template output and describes nothing real.
- `Makefile:4` (dead-code) **DMG variable is defined but never used.** `DMG = $(wildcard dist/Todo-*-arm64.dmg)` is referenced by no target; the `install` target instead recomputes the newest DMG at run time with `ls -t` (correctly so, since a parse-time wildcard would be stale before `dist` runs).
- `scripts/install.sh:10` (consistency) **Duplicates the build+package pipeline instead of reusing npm scripts.** install.sh runs `npm run build` then `npx electron-builder --mac` directly, duplicating the pipeline that package.json already defines as `dist:mac` (which additionally deletes `dist/mac-arm64/*.app` after packaging).
- `package.json:24` (consistency) **Lint and format scripts never cover scripts/ or root config files.** `"lint": "eslint src tests"` (and the prettier globs on lines 26-27) exclude scripts/ and the root .js config files, so scripts/afterSign.cjs is never linted.
- `src/renderer/styles.css:797` (consistency) **Duplicate .main-header h1 .breadcrumb-link rules and a dead .breadcrumb-separator twin of .breadcrumb-sep.** `.main-header h1 .breadcrumb-link` is defined at 654-657 (`color: #4fc3f7`) and again at 797-806 (opacity-based styling), with both :hover variants; the second silently layers over the first.
- `src/renderer/styles.css:6225` (dead-code) **Empty rulesets and commented-out-code remnants.** `.settings-section { }` (6225-6226) is an empty ruleset.
- `src/renderer/styles.css:8225` (consistency) **Duplicated light-theme rules with conflicting values.** `.light-theme .linked-item/.linked-title/.linked-title:hover/.linked-project` are defined twice: var()-based at 6875-6889 and hard-coded (#f0f0f0/#333/#0288d1/#ccc) at 8225-8239 — the later hard-coded set wins, defeating the theme variables.
- `tests/history.test.js:347` (consistency) **Shared describe-scoped testDbPath diverges from per-test unique path pattern.** `const testDbPath = join(tmpdir(), `test-history-${Date.now()}.db`)` is evaluated once at describe scope, so every test in the file reuses the same file path; database.test.js instead generates a fresh path with a random suffix inside beforeEach.
- `tests/history.test.js:319` (consistency) **Test enshrines inconsistent getState return types (undefined vs null descriptions).** The assertion expects `undoDescription: undefined, redoDescription: null` from the same getState() call.
