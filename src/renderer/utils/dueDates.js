/**
 * Helpers for computing due dates used by the card context menu.
 *
 * Due dates are stored in the todo `end_date` field as `YYYY-MM-DD` strings
 * interpreted in the user's local timezone.
 */

/**
 * Format a Date as a local `YYYY-MM-DD` string.
 *
 * Uses local calendar components rather than `toISOString()` so the date does
 * not shift across the UTC boundary for users in non-UTC timezones.
 *
 * @param {Date} date - The date to format.
 * @returns {string} The date formatted as `YYYY-MM-DD`.
 */
export function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Compute a preset due date offset from a base date.
 *
 * @param {number} offsetDays - Number of days to add to the base date.
 * @param {Date} [baseDate=new Date()] - The reference date; defaults to now.
 * @returns {string} The resulting date as a `YYYY-MM-DD` string.
 */
export function presetDueDate(offsetDays, baseDate = new Date()) {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  date.setDate(date.getDate() + offsetDays)
  return formatLocalDate(date)
}
