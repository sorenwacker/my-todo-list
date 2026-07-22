# Reset Database

Recovers from an unusable database file, for example a schema that no
supported migration path can repair. Resetting replaces the database with a
freshly created one; the previous file is kept as a backup.

## Location

Sidebar, Settings section, below Export and Import. The button is labeled
"Reset Database" and styled as a destructive action.

## Confirmation flow

1. Clicking "Reset Database" opens a modal that states what will happen:
   all projects, todos, notes, tags, and statuses are removed from the
   active database, and the current file is kept as a backup.
2. The confirm button stays disabled until the user types `yes`
   (case-insensitive, surrounding whitespace ignored) into a text field.
3. Cancel or clicking outside the modal closes it without changes.

## Behavior on confirm

1. The main process closes the database connection.
2. The current database file is renamed to `<name>-backup-YYMMDD-HHMMSS.db`
   in the same directory (for the default `todos.db` this yields, e.g.,
   `todos-backup-260722-141503.db`). SQLite `-wal` and `-shm` sidecar files
   are renamed alongside it when present.
3. A new database is created at the original path with the current schema
   and the default statuses.
4. Undo/redo history is cleared; its entries reference rows that no longer
   exist.
5. The modal switches to a result view showing the full backup path, so the
   user knows where the previous data went. Closing it reloads the app
   state.

If any step fails, the modal shows the error message and the database is
left as it was.

## Restoring a backup

Quit the app, remove the new database file, rename the backup file back to
its original name, and start the app again.

## Error visibility

Database failures during common operations (such as adding a todo) surface
as a dismissable error banner in the main window instead of failing
silently. This makes schema problems diagnosable without opening the
developer console.
