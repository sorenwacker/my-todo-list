<template>
  <EntityModal
    :entity="category"
    entity-type="category"
    title="Edit Category"
    :show-symbol-picker="true"
    @save="$emit('save', $event)"
    @cancel="$emit('cancel')"
    @delete="$emit('delete')"
  />
</template>

<script>
import EntityModal from './EntityModal.vue'

export default {
  name: 'CategoryModal',
  components: {
    EntityModal
  },
  props: {
    category: {
      type: Object,
      default: null
    }
  },
  emits: ['save', 'cancel', 'delete']
}
</script>
