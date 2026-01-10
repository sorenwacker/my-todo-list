/**
 * Settings composable for managing application settings.
 * Provides reactive settings state that syncs with the database.
 */

import { reactive, readonly, toRefs } from 'vue'

/**
 * Default settings values.
 */
const defaultSettings = {
  markdown_mode: 'markdown',
  theme: 'dark',
  default_view: 'cards',
  card_size: 280,
  hide_completed: false
}

/**
 * Reactive settings state (private).
 */
const state = reactive({
  ...defaultSettings,
  _initialized: false,
  _loading: false
})

/**
 * Load settings from database.
 * Only loads once unless force is true.
 * @param {boolean} force - Force reload even if already initialized
 */
async function loadSettings(force = false) {
  if (state._initialized && !force) return
  if (state._loading) return

  state._loading = true
  try {
    const settings = await window.api.getAllSettings()
    // Merge loaded settings with defaults
    Object.keys(defaultSettings).forEach(key => {
      if (settings[key] !== undefined) {
        state[key] = settings[key]
      }
    })
    state._initialized = true
  } catch (error) {
    console.error('Failed to load settings:', error)
  } finally {
    state._loading = false
  }
}

/**
 * Update a single setting.
 * Updates both local state and database.
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 */
async function updateSetting(key, value) {
  if (!(key in defaultSettings)) {
    console.warn(`Unknown setting key: ${key}`)
    return
  }

  const oldValue = state[key]
  state[key] = value

  try {
    await window.api.setSetting(key, value)
  } catch (error) {
    // Revert on failure
    state[key] = oldValue
    console.error(`Failed to update setting ${key}:`, error)
    throw error
  }
}

/**
 * Reset all settings to defaults.
 */
async function resetSettings() {
  for (const [key, value] of Object.entries(defaultSettings)) {
    await updateSetting(key, value)
  }
}

/**
 * Settings composable hook.
 * @returns {Object} Settings state and methods
 */
export function useSettings() {
  return {
    // Reactive refs for individual settings
    ...toRefs(state),

    // Computed/derived
    settings: readonly(state),

    // Methods
    loadSettings,
    updateSetting,
    resetSettings,

    // State flags
    isInitialized: () => state._initialized,
    isLoading: () => state._loading
  }
}

/**
 * Get current markdown mode.
 * @returns {string} 'markdown' or 'plain'
 */
export function getMarkdownMode() {
  return state.markdown_mode
}

/**
 * Check if markdown mode is enabled.
 * @returns {boolean} True if markdown mode is enabled
 */
export function isMarkdownEnabled() {
  return state.markdown_mode === 'markdown'
}

export default useSettings
