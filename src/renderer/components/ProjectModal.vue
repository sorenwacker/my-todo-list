<template>
  <EntityModal
    :entity="project"
    entity-type="project"
    title="Edit Project"
    :show-color-picker="true"
    :colors="colors"
    @save="$emit('save', $event)"
    @cancel="$emit('cancel')"
    @delete="$emit('delete')"
  />
</template>

<script>
import EntityModal from './EntityModal.vue'
import { projectColors } from '../utils/helpers.js'

export default {
  name: 'ProjectModal',
  components: {
    EntityModal
  },
  props: {
    project: {
      type: Object,
      default: null
    },
    colors: {
      type: Array,
      default: () => projectColors
    }
  },
  emits: ['save', 'cancel', 'delete']
}
</script>
