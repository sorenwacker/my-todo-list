import { ref, nextTick } from 'vue'

/**
 * Composable for managing add input states across different entity types.
 * Provides a reusable pattern for show/add/cancel operations.
 *
 * @param {string} entityType - The type of entity (e.g., 'project', 'status')
 * @param {Function} emit - The component's emit function
 * @returns {Object} Methods and refs for managing the add input
 */
export function useAddInput(entityType, emit) {
  const showInput = ref(false)
  const inputValue = ref('')
  const inputRef = ref(null)

  const showAdd = () => {
    showInput.value = true
    nextTick(() => inputRef.value?.focus())
  }

  const add = () => {
    if (inputValue.value.trim()) {
      emit(`add-${entityType}`, inputValue.value.trim())
    }
    cancel()
  }

  const cancel = () => {
    inputValue.value = ''
    showInput.value = false
  }

  return {
    showInput,
    inputValue,
    inputRef,
    showAdd,
    add,
    cancel
  }
}
