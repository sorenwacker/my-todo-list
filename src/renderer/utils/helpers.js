/**
 * Shared color palettes and the debounce helper used across components.
 */

/**
 * Default project colors for color picker.
 */
export const projectColors = [
  '#e74c3c',
  '#e91e63',
  '#9c27b0',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#03a9f4',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#8bc34a',
  '#cddc39',
  '#ffeb3b',
  '#ffc107',
  '#ff9800',
  '#ff5722',
  '#795548',
  '#607d8b',
  '#9e9e9e',
  '#0f4c75'
]

/**
 * Default status colors for color picker.
 */
export const statusColors = [
  '#d93025',
  '#ef6c00',
  '#0f9d58',
  '#1a73e8',
  '#9c27b0',
  '#673ab7',
  '#00bcd4',
  '#607d8b',
  '#795548',
  '#212121'
]

/**
 * Palette for auto-assigning and picking a color for a new project or status.
 * Shared by useProjects and useStatuses so the two stay identical.
 */
export const entityColorPalette = [
  // Blues
  '#1a73e8',
  '#4285f4',
  '#0d47a1',
  '#039be5',
  '#00acc1',
  // Greens
  '#0f9d58',
  '#34a853',
  '#00897b',
  '#43a047',
  '#7cb342',
  // Reds & Pinks
  '#d93025',
  '#ea4335',
  '#c2185b',
  '#e91e63',
  '#f06292',
  // Oranges & Yellows
  '#f9a825',
  '#ff8f00',
  '#ef6c00',
  '#ff7043',
  '#ffb300',
  // Purples
  '#7b1fa2',
  '#9c27b0',
  '#673ab7',
  '#5e35b1',
  '#7e57c2',
  // Neutrals
  '#455a64',
  '#607d8b',
  '#78909c',
  '#546e7a',
  '#37474f'
]

/**
 * Debounce function for input handling.
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}
