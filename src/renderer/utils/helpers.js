/**
 * Shared icon map, color palettes, and the debounce helper used across
 * components.
 */

// Icon imports
import {
  Folder,
  Home,
  Briefcase,
  Star,
  Heart,
  Bookmark,
  Flag,
  Tag,
  Circle,
  Square,
  Triangle,
  Zap,
  Coffee,
  Music,
  Camera,
  Book,
  Bell,
  Gift,
  Sun,
  Moon,
  Cloud,
  Flame,
  Leaf,
  Droplet
} from 'lucide-vue-next'

/**
 * Map of icon names to icon components.
 * Used for entity icon selection.
 */
export const iconMap = {
  Folder,
  Home,
  Briefcase,
  Star,
  Heart,
  Bookmark,
  Flag,
  Tag,
  Circle,
  Square,
  Triangle,
  Zap,
  Coffee,
  Music,
  Camera,
  Book,
  Bell,
  Gift,
  Sun,
  Moon,
  Cloud,
  Flame,
  Leaf,
  Droplet
}

/**
 * Get icon component by name.
 * @param {string} name - Icon name
 * @returns {Component|null} Vue component or null if not found
 */
export function getIconComponent(name) {
  return iconMap[name] || null
}

/**
 * List of available icon names for selection UI.
 */
export const availableIcons = Object.keys(iconMap)

/**
 * Default project colors for color picker.
 */
export const projectColors = [
  '#e74c3c', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548', '#607d8b', '#9e9e9e', '#0f4c75'
]

/**
 * Default status colors for color picker.
 */
export const statusColors = [
  '#d93025', '#ef6c00', '#0f9d58', '#1a73e8', '#9c27b0',
  '#673ab7', '#00bcd4', '#607d8b', '#795548', '#212121'
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
