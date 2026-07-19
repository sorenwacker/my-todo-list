<template>
  <div class="project-modal" @click.self="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>Import Backup</h3>
      <p>Choose how to import the backup:</p>
      <div class="modal-actions">
        <button class="primary" @click.stop="$emit('import', 'merge')">Merge with Existing</button>
        <button class="delete-btn" @click.stop="$emit('import', 'replace')">
          Replace All Data
        </button>
        <button @click.stop="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'ImportDialog',
    emits: ['close', 'import']
  }
</script>
