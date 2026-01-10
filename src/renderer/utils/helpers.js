/**
 * Shared utility functions for the todo-list application.
 * Consolidates duplicated code from various components.
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
 * Used for category symbols and other icon selections.
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
 * Importance level colors (index 0 is unused, 1-5 are levels).
 */
export const importanceColors = [
  '#666',     // Unused (index 0)
  '#3498db',  // Level 1 - Low
  '#2ecc71',  // Level 2 - Low-Medium
  '#f1c40f',  // Level 3 - Medium
  '#e67e22',  // Level 4 - Medium-High
  '#e74c3c'   // Level 5 - High
]

/**
 * Get color for importance level.
 * @param {number|null} level - Importance level (1-5) or null
 * @returns {string} Hex color string
 */
export function getImportanceColor(level) {
  if (level === null || level === undefined || level < 1 || level > 5) {
    return importanceColors[0]
  }
  return importanceColors[level]
}

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
 * Format date to YYYY-MM-DD.
 * @param {Date|string} date - Date object or string
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

/**
 * Format date for display (shorter format for deadlines).
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date for display
 */
export function formatDeadline(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00')
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (targetDate.getTime() === today.getTime()) {
    return 'Today'
  }
  if (targetDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow'
  }

  const options = { month: 'short', day: 'numeric' }
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric'
  }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Format date with short month name (e.g., "Jan 15").
 * @param {string} dateString - Date string
 * @returns {string} Formatted short date
 */
export function formatShortDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00')
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Check if a date is today.
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  if (!date) return false
  const d = date instanceof Date ? date : new Date(date)
  const today = new Date()
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear()
}

/**
 * Check if a date is in the past (overdue).
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is before today
 */
export function isOverdue(dateString) {
  if (!dateString) return false
  const date = new Date(dateString + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return date < now
}

/**
 * Check if a date falls on a weekend.
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is Saturday or Sunday
 */
export function isWeekend(date) {
  if (!date) return false
  const d = date instanceof Date ? date : new Date(date)
  const day = d.getDay()
  return day === 0 || day === 6
}

/**
 * Calculate subtask completion percentage.
 * @param {number} completed - Number of completed subtasks
 * @param {number} total - Total number of subtasks
 * @returns {number} Percentage (0-100)
 */
export function getSubtaskProgress(completed, total) {
  if (!total || total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * Convert hex color to rgba.
 * @param {string} hex - Hex color string
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
export function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Get contrast color (black or white) for a given background.
 * @param {string} hexColor - Background hex color
 * @returns {string} '#000000' or '#ffffff'
 */
export function getContrastColor(hexColor) {
  if (!hexColor) return '#ffffff'
  const cleanHex = hexColor.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

/**
 * Get initials from a name.
 * @param {string} name - Full name
 * @returns {string} Initials (up to 2 characters)
 */
export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Truncate text to a maximum length with ellipsis.
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

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
