<template>
  <div class="project-modal" @click.self="$emit('close')">
    <div class="modal-content help-modal" @click.stop>
      <h3>Keyboard Shortcuts</h3>
      <div class="shortcuts-grid">
        <div class="shortcut-section">
          <h4>Navigation</h4>
          <div class="shortcut-item"><kbd>j</kbd> / <kbd>↓</kbd><span>Move down</span></div>
          <div class="shortcut-item"><kbd>k</kbd> / <kbd>↑</kbd><span>Move up</span></div>
          <div class="shortcut-item">
            <kbd>Enter</kbd> / <kbd>e</kbd><span>Highlight todo</span>
          </div>
          <div class="shortcut-item"><kbd>Esc</kbd><span>Close detail / Clear selection</span></div>
        </div>
        <div class="shortcut-section">
          <h4>Actions</h4>
          <div class="shortcut-item"><kbd>n</kbd><span>New todo</span></div>
          <div class="shortcut-item">
            <kbd>x</kbd> / <kbd>Space</kbd><span>Toggle complete</span>
          </div>
          <div class="shortcut-item"><kbd>Delete</kbd><span>Delete todo</span></div>
          <div class="shortcut-item"><kbd>/</kbd><span>Open search</span></div>
        </div>
        <div class="shortcut-section">
          <h4>Global</h4>
          <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>K</kbd><span>Command palette</span></div>
          <div class="shortcut-item"><kbd>Cmd</kbd>+<kbd>Z</kbd><span>Undo</span></div>
          <div class="shortcut-item">
            <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd><span>Redo</span>
          </div>
          <div class="shortcut-item"><kbd>?</kbd><span>Show this help</span></div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="primary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'HelpModal',
    emits: ['close']
  }
</script>
