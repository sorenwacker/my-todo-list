const SETTINGS_VERSION = 1

/**
 * Validate and repair localStorage settings on startup.
 *
 * Enum-like settings are reset to their defaults when they hold unknown
 * values, malformed JSON settings are removed, and out-of-range numeric
 * settings are removed. If validation itself fails, all keys are cleared.
 */
export function validateLocalStorage() {
  try {
    const _storedVersion = parseInt(localStorage.getItem('settings-version') || '0')

    // Define valid values for enum-like settings
    const validViews = ['cards', 'kanban', 'calendar']
    // Keep in sync with the sort modes supported by sortTodos in useTodos.js
    const validSorts = ['manual', 'created', 'alpha', 'due']
    const validThemes = ['dark', 'light']

    // Validate current-view
    const currentView = localStorage.getItem('current-view')
    if (currentView && !validViews.includes(currentView)) {
      localStorage.setItem('current-view', 'cards')
    }

    // Validate sort-by
    const sortBy = localStorage.getItem('sort-by')
    if (sortBy && !validSorts.includes(sortBy)) {
      localStorage.setItem('sort-by', 'manual')
    }

    // Validate theme
    const theme = localStorage.getItem('todo-theme')
    if (theme && !validThemes.includes(theme)) {
      localStorage.setItem('todo-theme', 'dark')
    }

    // Validate JSON settings
    const jsonSettings = ['card-widths']
    for (const key of jsonSettings) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          JSON.parse(value)
        } catch {
          localStorage.removeItem(key)
        }
      }
    }

    // Validate numeric settings
    const cardColumns = localStorage.getItem('card-columns')
    if (
      cardColumns &&
      (isNaN(parseInt(cardColumns)) || parseInt(cardColumns) < 1 || parseInt(cardColumns) > 10)
    ) {
      localStorage.removeItem('card-columns')
    }

    // Update version
    localStorage.setItem('settings-version', String(SETTINGS_VERSION))
  } catch {
    // If validation fails, clear problematic keys
    const keysToPreserve = [] // Could preserve some keys if needed
    const allKeys = Object.keys(localStorage)
    for (const key of allKeys) {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key)
      }
    }
  }
}
