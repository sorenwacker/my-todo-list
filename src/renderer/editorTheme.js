import { EditorView } from '@codemirror/view'

export const darkEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      fontSize: '13px'
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit'
    },
    '.cm-content': {
      padding: '8px',
      caretColor: '#3b82f6'
    },
    '.cm-line': {
      padding: '0 4px'
    },
    '&.cm-focused': {
      outline: 'none'
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.3) !important'
    },
    '.cm-cursor': {
      borderLeftColor: '#3b82f6',
      borderLeftWidth: '2px'
    },
    '.cm-gutters': {
      backgroundColor: '#1a1a1a',
      color: '#666',
      border: 'none'
    }
  },
  { dark: true }
)
