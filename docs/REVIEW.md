# Codebase Review

Date: 2026-06-15
Scope: 51 source files under `src/` (Electron main, preload, Vue 3 renderer) plus `tests/`.
Method: objective baseline gates, then a multi-agent per-module review with an adversarial
verification pass. Every high/medium finding was challenged by an independent verifier that
could refute it or correct its severity. 81 raw findings -> 45 confirmed, 0 refuted, 36
lower-confidence notes (appendix).

## Baseline gates

These are the project's own definition of "passing", run from the configured npm scripts.

| Gate | Command | Result | Detail |
|------|---------|--------|--------|
| Lint | `npm run lint` (eslint) | FAIL | 67 errors, 11 warnings |
| Format | `npm run format:check` (prettier) | FAIL | 32 files not formatted |
| Tests | `npm test` (vitest) | FAIL | 49 of 104 failing |
| File size (<= 1000 LOC) | style rule | FAIL | `App.vue` 4106, `database.js` 1143 |
| Dead files | manual | WARN | `src/renderer/styles.css.backup` (101 KB), empty tracked `todo.db` |

### Test failures, root-caused

- 47 of 49 failures are a single environment problem: `better-sqlite3` is built for Electron's
  ABI (`NODE_MODULE_VERSION 140`) but the vitest runner uses node's ABI (`141`). This is not a
  code defect; rebuild for the test runtime (e.g. `npm rebuild better-sqlite3`) before trusting
  the DB/history suites. Note that even once it loads, those suites exercise *copies* of the
  production classes, not the real ones (see findings below).
- 2 failures are a real defect: `validators.test.js` imports and tests `validatePerson`, which is
  never defined or exported in `src/main/validators.js`.

### Lint failures, by type

`no-unused-vars` 39, `no-undef` 17 (incl. 13x `d3Force`, plus `categoryIcons`, `validLayouts`,
`cancelAnimationFrame`), `vue/no-v-html` 4, `vue/no-unused-components` 4,
`vue/require-explicit-emits` 3, `vue/no-dupe-keys` 3, `vue/attributes-order` 3,
`vue/require-prop-types` 1, `vue/no-reserved-component-names` 1 (component named `Search`).

## Summary

| Corrected severity | Count |
|--------------------|-------|
| High | 3 |
| Medium | 21 |
| Low | 21 |
| **Confirmed total** | **45** |

By category: dead-code 22, correctness 16, consistency 5, design 1, naming 1.

### Recurring themes

1. **Large abandoned view subsystems in `App.vue`.** Graph, timeline/gantt, calendar, category,
   subtask, and stakeholder-person features are present but unreachable (`availableViews` is
   hardcoded to `['cards', 'kanban']`). They carry undefined references (`d3Force`,
   `categoryIcons`, `loadData`, `loadProjectPersons`, `loadSubtasks`) that would throw if reached.
   This is the bulk of the 4106-line file and most of the dead-code count.
2. **Persistence gaps in the DB layer.** `updateTodo` and `createNextRecurrence` omit columns the
   validator accepts (`parent_id`, `milestone_date`, `type`, `topic_id`, `notes_sensitive`), and
   `due_date` is migrated and read but never written.
3. **Tests assert against divergent copies, not production code.** Both `database.test.js` and
   `history.test.js` re-implement the class under test, so the shipping `Database` and
   `ActionHistory` are uncovered, and some assertions would fail against the real classes.
4. **Helper duplication and drift.** `helpers.js` claims to consolidate shared logic, but most
   exports are re-implemented inline in components with divergent behavior (importance colors,
   `getInitials`, date formatting), producing user-visible inconsistencies between views.
5. **IPC preload listener leaks.** `onUpdateStatus`/`onHistoryChanged` register a wrapper but
   unsubscribe the bare callback, so listeners accumulate on every re-subscription.

---

## Confirmed findings

### HIGH

#### 1. IPC listener leak: `onUpdateStatus` unsubscribe is a no-op
`src/preload/index.js:106` (correctness)
`ipcRenderer.on('update-status', (_, data) => callback(data))` registers an anonymous wrapper,
but the returned cleanup calls `removeListener('update-status', callback)` with the bare
`callback`. Different references, so removeListener does nothing; listeners stack on every
re-subscribe (component remount), multiplying handler calls and leaking memory. `onRefreshTodos`
does this correctly for contrast. `onHistoryChanged` has the identical defect (see medium #11).
**Fix:** capture the wrapper in a variable and remove that same reference.

#### 2. `App.vue` is 4106 lines, ~4x the 1000-LOC cap
`src/renderer/App.vue` (design)
Most of the excess is dead view subsystems (graph, timeline/gantt, calendar, categories,
subtasks) plus a large `data()` carrying their state.
**Fix:** remove the dead subsystems (findings below), then extract remaining cohesive concerns
(cards masonry, kanban handlers) into composables/components to get under 1000 LOC.

#### 3. Project-person functions call non-existent `window.api` methods
`src/renderer/composables/useProjects.js:174` (correctness)
`loadProjectPersons`/`assignProjectPerson`/`unassignProjectPerson` call
`window.api.getProjectPersons`/`linkProjectPerson`/`unlinkProjectPerson`, none of which exist in
the preload bridge or as IPC handlers — invoking them throws `TypeError`. Worse, the composable's
`editProject` calls `loadProjectPersons`, and `App.vue`'s `@edit-project` delegates to it, so
**editing any existing project throws at runtime**.
**Fix:** remove the person sub-system (state, methods, the `App.vue:1722` call) unless it is being
completed, in which case add the preload methods + IPC handlers + validators and wire it in.

### MEDIUM

#### 4. `createNextRecurrence` drops `type`, `topic_id`, `notes_sensitive`, `parent_id`, `milestone_date`
`src/main/database.js:521` (correctness)
The INSERT for the next recurrence omits those columns, so a recurring note/milestone becomes a
plain `todo`, a recurring subtask is detached from its parent, and a sensitive item loses its
`notes_sensitive` flag (a privacy regression) and topic. Reachable on completing a recurring todo.
**Fix:** carry those columns forward into the INSERT.

#### 5. `due_date` column is migrated and read but never written
`src/main/database.js:255` (dead-code)
`ALTER TABLE todos ADD COLUMN due_date` plus reads in `CalendarView`/`TableView`, but no INSERT or
UPDATE writes it; the renderer write path calls `window.api.updateSubtask`, which does not exist
(no preload method, no IPC handler, no DB method).
**Fix:** remove the column/migration, or add the missing `updateSubtask` chain and a write
statement. Decide whether `due_date` or `end_date` is the intended field.

#### 6. Importance migration nulls legitimate `importance = 3` rows every startup
`src/main/database.js:202` (correctness)
`UPDATE todos SET importance = NULL WHERE importance = 3 AND title NOT LIKE '%importance%'` runs on
every `init()` with no version guard. Importance 3 ("Medium") is a valid user value, so any Medium
task whose title lacks the literal word "importance" is silently nulled on each launch.
**Fix:** replace with a one-time versioned migration keyed on a schema-version/settings flag, not a
title-substring heuristic; if the distinction is unrecoverable, document it instead of mutating.

#### 7. DB tests exercise a divergent `TestDatabase`, not the real `Database`
`tests/database.test.js` (consistency)
The test defines its own `TestDatabase` that has diverged: it uses a `deadline` column and a
`persons` table, defines `getTodosByType`, and lacks soft-delete/archive/recurrence/milestone/
topic/tag/importance logic. The real class is untested; some assertions would fail against it.
**Fix:** decouple `Database` from the top-level `import { app } from 'electron'` (inject the db
path) so the real class can be imported and tested; delete the copy.

#### 8. `archive-completed-todos` IPC handler does not validate `projectId`
`src/main/index.js:389` (consistency)
Every sibling ID-bearing handler validates first; this one passes the raw value to the DB. The DB
defensively filters only for `'inbox'` or numeric ids, so a malformed value adds **no** project
filter and would archive completed todos across all projects. Not exploitable today (renderer is
the only caller) but breaks the validation idiom.
**Fix:** validate consistently (accept `null|'inbox'|<id>`, `validateId` the numeric case).

#### 9. `history.test.js` re-implements `ActionHistory` instead of importing it
`tests/history.test.js:8` (correctness)
The test copies the class "without logger dependency". The copy's `getState()` returns 4 fields;
the real one also returns `undoDescription`/`redoDescription`, so the `toEqual` assertion would
fail against production. Shipping `history.js` is uncovered.
**Fix:** import the real class (mock/inject the logger) and update the `getState` assertions.

#### 10. (was high) `d3Force` is used but never imported
`src/renderer/App.vue:3166` (correctness)
Graph-layout methods call `d3Force.forceSimulation(...)` etc., but there is no `import * as d3Force
from 'd3-force'` (the dep exists in `package.json`). Any call throws `ReferenceError`. Currently
unreachable (no graph view), so downgraded to medium, but it is broken code.
**Fix:** remove the graph code (dead, see #16), or add the import.

#### 11. IPC listener leak: `onHistoryChanged` unsubscribe is a no-op
`src/preload/index.js:115` (correctness)
Same defect as #1. **Fix:** capture the wrapper and remove that reference.

#### 12. (was high) `handleImport` calls undefined `this.loadData()`
`src/renderer/App.vue:4061` (correctness)
Reachable from the Import dialog. After a successful import it calls `this.loadData()`, which does
not exist, throwing `TypeError`; the catch surfaces "Failed to import backup..." even though the
import succeeded, and in-memory data stays stale until restart.
**Fix:** replace with the real reload sequence (`loadProjects`/`loadStatuses`/`loadAllTags`/
`loadAllTodos`/`loadTodos`/`loadAllLinks`).

#### 13. Category feature is entirely dead and references undefined state/methods
`src/renderer/App.vue:1454` (dead-code)
`isIconName`/`getIconComponent`/`getCategoryCount`/`add|edit|save|deleteCategory*`/
`toggleCategoryFilter` use undefined `this.categorySymbols`/`this.categories`/`categoryIcons`/
`this.filterCategoryId` and call undefined `this.loadCategories()`/`window.api.createCategory`.
Unreachable from the template.
**Fix:** delete the category feature and its `ganttRows` category branch.

#### 14. Entire graph view implementation is dead code
`src/renderer/App.vue:2598` (dead-code)
~1200 lines (computeds `graphNodes`/`graphLinks`, the force/tree/grid layout machinery, node
persistence, link context menus) are unreachable (`availableViews` has no `graph`; no `graphSvg`
ref in the template) and reference the missing `d3Force`. `loadAllLinks` still runs in `mounted`
but its output only feeds dead computeds.
**Fix:** remove the graph view code and the `allLinks`/`loadAllLinks` plumbing.

#### 15. Timeline/Gantt and Calendar code is dead
`src/renderer/App.vue:943` (dead-code)
~10 computeds and ~20 methods for timeline/gantt/calendar are unreachable because `currentView`
is normalized through `availableViews` (`['cards','kanban']`), so it can never be `timeline`/
`calendar`/`graph`. Associated watcher branches are dead too.
**Fix:** remove the timeline and calendar subsystems (or restore them to `availableViews`).

#### 16. `assignProjectPerson`/`unassignProjectPerson`/`currentProjectPersons` never consumed
`src/renderer/composables/useProjects.js:183` (dead-code)
Exported but never imported anywhere; combined with the missing `window.api` backing (#3), this is
unreachable, non-functional code.
**Fix:** remove these exports and their state, or complete and wire the feature.

#### 17. Trailing commas violate `.prettierrc` (`trailingComma: none`)
`src/renderer/editorTheme.js` (consistency)
Object literals use trailing commas throughout; `prettier --check` fails on this file.
**Fix:** run `npm run format`.

#### 18. `getSubtaskProgress` is never used
`src/renderer/utils/helpers.js:220` (dead-code)
Exported, zero references; the same logic is duplicated inline in `KanbanCard.vue`.
**Fix:** remove it, or wire it into `KanbanCard`.

#### 19. Most `helpers.js` exports are duplicated as local component methods
`src/renderer/utils/helpers.js` (consistency)
The file claims to consolidate shared code, but only `iconMap`/`getIconComponent`/`availableIcons`/
`projectColors`/`statusColors`/`debounce` are imported. `getImportanceColor`, `getInitials`,
`formatShortDate`, `isToday`, `isOverdue`, `isWeekend`, `formatDeadline` are re-implemented inline
with divergent behavior — e.g. importance level 1 renders gray in `App.vue` but blue elsewhere;
`getInitials` differs in casing and empty-name fallback; `formatShortDate` differs in timezone
handling.
**Fix:** import the helpers and delete the local copies, or remove the unused exports so the file
is honest.

#### 20. `CalendarView.vue` is an unused (dead) file
`src/renderer/components/CalendarView.vue` (dead-code)
Never imported/registered; not in `components/index.js`. `App.vue` reimplements the calendar
inline. ~815 lines of duplicated, divergent dead code.
**Fix:** delete it, or refactor `App.vue`'s inline calendar to use it.

#### 21. `KanbanCard` renders sensitive notes without honoring `notes_sensitive`
`src/renderer/components/KanbanCard.vue:50` (correctness)
Unlike `TodoCard`/`CardItem`/`ItemPreview`, `KanbanCard` `v-html`s the notes with no
`notes_sensitive` gate, so flagged-sensitive notes show in plain text once a card is expanded.
**Fix:** add a `v-if="todo.notes_sensitive"` masked-placeholder branch.

#### 22. Unused imports `iconMap` and `statusColors`
`src/renderer/components/EntityModal.vue:51` (dead-code)
Both are imported but never referenced; eslint `no-unused-vars` (error) fails.
**Fix:** reduce the import to the three used symbols.

#### 23. `select-tag` is emitted but no consumer handles it
`src/renderer/components/GlobalSearch.vue:311` (correctness)
Tag results are rendered, clickable, and keyboard-reachable, but `App.vue` binds only
`@select-todo`/`@select-project`, so selecting a tag just closes the overlay — a visible no-op.
**Fix:** add an `@select-tag` handler that filters by tag, or remove tag rendering/emission.

### LOW

These are confirmed but low-impact (mostly dead code, duplicate keys, or naming/contract drift
with no current functional consequence).

- **`updateTodo` drops `parent_id`/`milestone_date`** — `database.js:511`. Validated but not
  persisted; `parent_id` is saved via a separate IPC path and `milestone_date` has no UI producer,
  so latent rather than active data loss.
- **`isUpdateDownloaded()` is dead** — `updater.js:105`. Also `quitAndInstall()` (medium #... not
  listed; tracked separately at `updater.js:93`) is exported but unused.
- **`validateLocalStorage` references undefined `validLayouts`** — `App.vue:441`. Would throw and
  wipe all localStorage via an empty-preserve-list catch, but the `detail-layout` key is never
  written, so unreachable in normal flow.
- **Duplicate computed `currentProjectName`/`currentTopicName`** — `App.vue:821`. Identical bodies,
  later shadows earlier (`vue/no-dupe-keys`).
- **`focusedTodo` defined twice** (composable delegate + local computed) — `App.vue:887`. Same
  resolved value; duplicate-key/dead code.
- **Watchers on undeclared properties never fire** (`showLinkSearch`, `detailTab`,
  `renderedNotes`) — `App.vue:1223`.
- **Unused imports: `renderMarkdown` + ~35 lucide icons; registered-but-unused components**
  (`draggable`/`Inbox`/`Archive`/`Trash2`) — `App.vue:399`.
- **`getMarkdownMode`/`isMarkdownEnabled` unused** — `useSettings.js:115`.
- **`renderCardMarkdown` does not truncate** despite name/docstring promising it — `markdown.js:101`
  (aspirational naming; body identical to `renderMarkdown`).
- **`hexToRgba`/`getContrastColor`/`truncateText` unused** — `helpers.js:231/245/276`.
- **`kanbanGroupBy` prop required but unused; `update:kanban-group-by` never emitted** —
  `KanbanView.vue:347`.
- **`onKanbanDrop` method + `kanban-drop` emit never wired** — `KanbanView.vue:476`.
- **`edit` event emitted but not declared in emits** — `CardItem.vue:9`.
- **`toggle-subtask` re-emitted by `CardsView` but never produced by `CardItem`** —
  `CardsView.vue:89`.
- **`current-filter` passed to `CardItem` which has no such prop** — `CardsView.vue:47`.
- **`TodoCard.vue` is never used by any consumer** — overlaps `CardItem`; confirm intent before
  deleting.
- **Duplicate `ItemPreview` render inside the overlay** — `GlobalSearch.vue:137`.
- **`MainTabs.vue` is an orphaned, unused component** — delete or wire up.
- **Topic feature declared in `AppSidebar.vue` but never rendered** — `AppSidebar.vue:196`; props/
  emits/state/CSS all orphaned.

---

## Appendix: unverified lower-confidence notes (36)

These were reported by reviewers but not put through the adversarial verifier (low severity / out
of the high-medium verification budget). Treat as leads, not confirmed defects.

**Main process / DB**
- `createTodo` computes `sort_order` from the global MIN, ignoring project scope — `database.js:478`.
- Public `Database` class and methods lack JSDoc (non-obvious sentinels `inbox`/`archive`/`trash`,
  import id-remapping) — `database.js:7`.
- Duplicate milestone-list handlers `get-milestones` vs `get-all-milestones` with divergent
  validation — `index.js:438`.
- `update-todo` and `update-todo-sync` duplicate history-recording logic — `index.js:280`.
- Unused `MAX_LENGTH` constants `SYMBOL`/`GITHUB_NAME`/`NOTES` — `constants.js:18`.
- `validateOptionalPositiveInt` is misnamed (returns `1`, never null) and its default `max`
  (`POSITIVE_INT` = 1,000,000) is never exercised — `validators.js:201`.

**App.vue dead code**
- `setFilter` stakeholders branch calls undefined `loadProjectPersons` — `App.vue:1721`.
- Subtask methods dead; `addSubtaskFromTable` calls undefined `loadSubtasks` — `App.vue:2086`.
- `onOpenTodosInWindowChange`/`saveOpenModePreference`/`toggleCategoriesCollapsed` mutate
  undeclared state — `App.vue:1475`.
- `selectTodo` is an async no-op (`// TODO: popover editor`) yet is the core selection action —
  `App.vue:2066`.
- `loadAllSubtasks` empty stub called only by dead subtask methods — `App.vue:1602`.
- `onKanbanDrop` self-described legacy no-op — `App.vue:2010`.

**Composables**
- `resetSettings` exported but never called — `useSettings.js:82`.
- `useStatuses` uses `ref({...})` while siblings use `reactive({...})` — `useStatuses.js:29`.
- `saveProject` swallows errors with an empty catch (siblings log/rethrow) — `useProjects.js:115`.

**Renderer utils**
- `importanceColors` export unused if the duplicate helpers are removed — `helpers.js:82`.

**Kanban view**
- `update-inbox-todos` emitted but undeclared — `KanbanView.vue:437`.
- Leftover `console.log` in `onKanbanDropProject` — `KanbanView.vue:470`.
- Large unreachable project/category/stacked-kanban branches and props — `KanbanView.vue`.
- Stray blank attribute lines + inconsistent draggable scroll config — `KanbanView.vue:30`.

**Table / cards**
- `select-todo` declared in emits but never emitted — `TableView.vue:236`.
- Unused prop `isProjectView` — `CardsView.vue:163`.
- Unused method `cancelNotesEdit` (no discard-on-escape path) — `CardItem.vue:250`.
- Leftover debug `console.log` in `onDragStart` — `CardItem.vue:183`.
- `getCardStyle` has an unused `todoId` parameter — `CardsView.vue:213`.
- `TableView.vue` appears unused across the app — `TableView.vue`.
- Empty `computed: {}` block — `CardItem.vue:174`.

**Cards / rows**
- `resize-end` emit declared but never emitted — `TodoCard.vue:110`.
- Importance color mapping disagrees with `TodoCard` — `TableRow.vue:142`.
- Mermaid-strip regex and date helpers duplicated across all four card components —
  `ItemPreview.vue`.

**Modals / layout**
- Unused CSS class `.search-container` — `GlobalSearch.vue:468`.
- Exposed `NotesEditor` methods (`getSelection`/`replaceSelection`/scroll helpers) never called —
  `NotesEditor.vue:173`.
- `getIconComponent` + most of `iconMap` unused in `AppSidebar` — `AppSidebar.vue:269`.
- Unused props `inboxCount`/`openTodosInWindow` — `AppSidebar.vue:191`.
- Unused prop `visible` and undeclared/unemitted mouse events — `AppSidebar.vue:182`.
</content>
</invoke>
