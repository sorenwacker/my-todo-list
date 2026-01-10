<template>
  <EntityModal
    :entity="status"
    entity-type="status"
    title="Edit Status"
    :show-color-picker="true"
    :colors="colors"
    @save="$emit('save', $event)"
    @cancel="$emit('cancel')"
    @delete="$emit('delete')"
  />
</template>

<script>
import EntityModal from './EntityModal.vue'
import { statusColors } from '../utils/helpers.js'

export default {
  name: 'StatusModal',
  components: {
    EntityModal
  },
  props: {
    status: {
      type: Object,
      default: null
    },
    colors: {
      type: Array,
      default: () => statusColors
    }
  },
  emits: ['save', 'cancel', 'delete']
}
</script>
