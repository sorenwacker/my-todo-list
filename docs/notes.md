# Notes: rendering and editing

Notes exist on todos (cards and kanban cards) and on projects (the project notes pane). All three surfaces share the same markdown pipeline (`src/renderer/utils/markdown.js`) and the same CodeMirror editor (`NotesEditor.vue`).

## Markdown rendering

- GitHub-flavored markdown with `breaks: true`: a single newline inside a paragraph renders as a line break.
- List indentation is normalized so 2-space nesting renders as nested lists (see `preprocessMarkdown`).
- Blank lines are preserved: one blank line separates paragraphs as usual; each additional consecutive blank line renders as one empty line of vertical space in the preview, so the spacing the user typed in the editor is not collapsed. Blank lines inside fenced code blocks are untouched (code blocks already preserve them verbatim).
- Output is sanitized with DOMPurify against an element allowlist.

## Preview / edit switching

The rendered preview is the resting state on every surface. Clicking anywhere on the rendered preview switches that surface to the editor, and the editor receives keyboard focus immediately, so the user can type without a second click. Leaving the editor (blur) saves the notes and returns to the preview.

Surfaces:

- Project notes pane: click preview to edit (the Edit/Preview buttons also switch modes); blur saves and returns to preview.
- Card notes (cards view) and kanban card notes: click the rendered notes to edit; blur saves and returns to preview.
