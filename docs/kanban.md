# Kanban view

The kanban view has two layouts. Which one renders depends on the sidebar selection and the "Group by project" toggle.

## Status board (default)

Active when a single project is selected, or when "Group by project" is off. One board, one column per status, plus a leading "No Status" column for todos with no `status_id`.

Dragging a card between columns writes the target column's status to the card's `status_id`. The project is not touched.

## Grouped board

Active in "All" (no project selected) with "Group by project" on. One board per project section, stacked vertically, each with the same column set. An "Inbox" section holds todos with no `project_id`.

Dragging a card writes **both** fields from the drop target:

- `status_id` comes from the column the card was dropped into (`null` for "No Status").
- `project_id` comes from the project section that column belongs to (`null` for Inbox).

So a card can be moved to another status within its own section, or to another project's section, in a single drag. All sections share one drag group; there is no restriction on cross-section drops.

## Resolving the drop target

Both layouts read the destination from `event.to.dataset` on the SortableJS `end` event, never from the source list's own identity. SortableJS dispatches `end` on the sortable instance the drag *started* in, so a handler that closes over its own column's project and status would write the card's original position back and the card would appear not to move.

Each `draggable` list therefore carries the identity of its own drop zone as data attributes:

| Layout | Attributes on the list | Empty string means |
| --- | --- | --- |
| Status board | `data-status-id` | no status |
| Grouped board | `data-project-id`, `data-status-id` | inbox / no status |

`onKanbanDropStatus` and `onStackedKanbanDrop` in `src/renderer/mixins/todoActionsMixin.js` parse those attributes, persist the change with `window.api.updateTodo`, and reload so the derived column lists re-filter.
