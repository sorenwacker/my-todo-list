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

/**
 * Whether a due date lies strictly before today.
 *
 * Compares the `YYYY-MM-DD` part of the stored string against today's local
 * date string. Parsing with `new Date('YYYY-MM-DD')` would interpret the date
 * as UTC midnight and mark due-today todos overdue for users west of UTC.
 *
 * @param {string} dateString - Due date as `YYYY-MM-DD` (time part ignored).
 * @param {string} [today] - Today as local `YYYY-MM-DD`; defaults to now.
 * @returns {boolean} True if the date is before today.
 */
export function isOverdue(dateString, today = formatLocalDate(new Date())) {
  if (!dateString) return false
  return dateString.slice(0, 10) < today
}

/**
 * Format a due date relative to now: Today, Tomorrow, Yesterday, `Nd` for
 * dates up to a week out, otherwise a short month-day form.
 *
 * @param {string} dateString - Due date as `YYYY-MM-DD` (time part ignored).
 * @param {Date} [now] - Reference time; defaults to now.
 * @returns {string} Human-readable relative label.
 */
export function formatDeadline(dateString, now = new Date()) {
  if (!dateString) return ''
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((date - todayMidnight) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 0 && diffDays <= 7) return `${diffDays}d`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format a creation/completion timestamp as a short date, e.g. `Jul 19, 26`.
 *
 * @param {string} dateString - Any string `new Date` can parse.
 * @returns {string} Short localized date.
 */
export function formatCreatedDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' })
}
