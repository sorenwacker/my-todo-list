import { CARD_MIN_WIDTHS } from './cardWidth.js'

const SETTINGS_VERSION = 1

/**
 * Validate and repair localStorage settings on startup.
 *
 * Enum-like settings are reset to their defaults or removed when they hold
 * unknown values. If validation itself fails, all keys are cleared.
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

    // Validate card-width: an unknown size falls back to the default
    const cardWidth = localStorage.getItem('card-width')
    if (cardWidth && !Object.hasOwn(CARD_MIN_WIDTHS, cardWidth)) {
      localStorage.removeItem('card-width')
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
