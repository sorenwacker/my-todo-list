# Notes: rendering and editing

Notes exist on todos (cards and kanban cards) and on projects (the project notes pane). All three surfaces share the same markdown pipeline (`src/renderer/utils/markdown.js`) and the same CodeMirror editor (`NotesEditor.vue`).

## Markdown rendering

- GitHub-flavored markdown with `breaks: true`: a single newline inside a paragraph renders as a line break.
- List indentation is normalized so 2-space nesting renders as nested lists (see `preprocessMarkdown`).
- Blank lines are preserved line for line: every blank line in the editor renders as one empty line in the preview, so the vertical spacing the user typed is never collapsed. This intentionally departs from standard markdown, which collapses any run of blank lines into a single paragraph break. Blank lines inside fenced code blocks are untouched (code blocks already preserve them verbatim), and trailing blank lines at the end of a note are dropped.
- Output is sanitized with DOMPurify against an element allowlist.

## View / edit switching

The rendered view is the resting state on every surface. Clicking anywhere on the rendered notes switches that surface to the editor, and the editor receives keyboard focus immediately, so the user can type without a second click. Leaving the editor (blur) saves the notes and returns to the rendered view.

Surfaces:

- Project notes pane: click the rendered notes to edit (the Edit/View buttons also switch modes); blur saves and returns to the view.
- Card notes (cards view) and kanban card notes: click the rendered notes to edit; blur saves and returns to the view.
