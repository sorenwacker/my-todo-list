/**
 * Input validation utilities for IPC handlers
 */

import { MAX_LENGTH, MAX_ARRAY_SIZE, DEFAULT_COLORS } from '../config/constants.js'

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate that value is a positive integer
 */
function validateId(value, fieldName = 'id') {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`)
  }
  const num = Number(value)
  if (!Number.isInteger(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`)
  }
  return num
}

/**
 * Validate that value is an optional positive integer or null
 */
function validateOptionalId(value, fieldName = 'id') {
  if (value === null || value === undefined) {
    return null
  }
  return validateId(value, fieldName)
}

/**
 * Validate that value is a non-empty string
 */
function validateString(value, fieldName = 'value', maxLength = MAX_LENGTH.GENERIC_STRING) {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }
  if (value.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`)
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength}`)
  }
  return value
}

/**
 * Validate that value is a string (can be empty)
 */
function validateOptionalString(
  value,
  fieldName = 'value',
  maxLength = MAX_LENGTH.OPTIONAL_STRING
) {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength}`)
  }
  return value
}

/**
 * Validate hex color string
 */
function validateColor(value, fieldName = 'color') {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid hex color (e.g., #ffffff)`)
  }
  return value.toLowerCase()
}

/**
 * Validate optional hex color
 */
function validateOptionalColor(value, fieldName = 'color', defaultValue = DEFAULT_COLORS.PROJECT) {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }
  return validateColor(value, fieldName)
}

/**
 * Validate array of IDs
 */
function validateIdArray(value, fieldName = 'ids') {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`)
  }
  if (value.length === 0) {
    return []
  }
  if (value.length > MAX_ARRAY_SIZE.IDS) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${MAX_ARRAY_SIZE.IDS}`)
  }
  return value.map((id, i) => validateId(id, `${fieldName}[${i}]`))
}

/**
 * Validate date string (YYYY-MM-DD format)
 */
function validateOptionalDate(value, fieldName = 'date') {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${fieldName} must be in YYYY-MM-DD format`)
  }
  return value
}

/**
 * Validate importance level (1-5 or null)
 */
function validateOptionalImportance(value) {
  if (value === null || value === undefined) {
    return null
  }
  const num = Number(value)
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw new ValidationError('importance must be between 1 and 5')
  }
  return num
}

/**
 * Validate boolean
 */
function validateBoolean(value, fieldName = 'value', defaultValue = false) {
  if (value === null || value === undefined) {
    return defaultValue
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (value === 0 || value === 1) {
    return Boolean(value)
  }
  throw new ValidationError(`${fieldName} must be a boolean`)
}

/**
 * Validate todo object
 */
function validateTodo(todo) {
  if (!todo || typeof todo !== 'object') {
    throw new ValidationError('todo must be an object')
  }

  return {
    id: validateId(todo.id, 'todo.id'),
    title: validateString(todo.title, 'todo.title', MAX_LENGTH.TODO_TITLE),
    notes: validateOptionalString(todo.notes, 'todo.notes', MAX_LENGTH.TODO_NOTES),
    start_date: validateOptionalDate(todo.start_date, 'todo.start_date'),
    end_date: validateOptionalDate(todo.end_date, 'todo.end_date'),
    completed: validateBoolean(todo.completed, 'todo.completed'),
    project_id: validateOptionalId(todo.project_id, 'todo.project_id'),
    status_id: validateOptionalId(todo.status_id, 'todo.status_id'),
    importance: validateOptionalImportance(todo.importance),
    recurrence_type: validateOptionalRecurrenceType(todo.recurrence_type),
    recurrence_interval: validateOptionalPositiveInt(
      todo.recurrence_interval,
      'todo.recurrence_interval',
      MAX_ARRAY_SIZE.RECURRENCE_INTERVAL
    ),
    recurrence_end_date: validateOptionalDate(todo.recurrence_end_date, 'todo.recurrence_end_date'),
    notes_sensitive: validateBoolean(todo.notes_sensitive, 'todo.notes_sensitive'),
    type: validateTodoType(todo.type),
    parent_id: validateOptionalId(todo.parent_id, 'todo.parent_id'),
    milestone_date: validateOptionalDate(todo.milestone_date, 'todo.milestone_date'),
    topic_id: validateOptionalId(todo.topic_id, 'todo.topic_id')
  }
}

/**
 * Validate recurrence type
 */
function validateOptionalRecurrenceType(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const validTypes = ['daily', 'weekly', 'monthly', 'yearly']
  if (!validTypes.includes(value)) {
    throw new ValidationError(`recurrence_type must be one of: ${validTypes.join(', ')}`)
  }
  return value
}

/**
 * Validate optional positive integer
 */
function validateOptionalPositiveInt(
  value,
  fieldName = 'value',
  max = MAX_ARRAY_SIZE.POSITIVE_INT
) {
  if (value === null || value === undefined) {
    return 1
  }
  const num = Number(value)
  if (!Number.isInteger(num) || num < 1 || num > max) {
    throw new ValidationError(`${fieldName} must be a positive integer up to ${max}`)
  }
  return num
}

/**
 * Validate project object
 */
function validateProject(project) {
  if (!project || typeof project !== 'object') {
    throw new ValidationError('project must be an object')
  }

  return {
    id: validateId(project.id, 'project.id'),
    name: validateString(project.name, 'project.name', MAX_LENGTH.PROJECT_NAME),
    color: validateOptionalColor(project.color, 'project.color')
  }
}

/**
 * Validate status object
 */
function validateStatus(status) {
  if (!status || typeof status !== 'object') {
    throw new ValidationError('status must be an object')
  }

  return {
    id: validateId(status.id, 'status.id'),
    name: validateString(status.name, 'status.name', MAX_LENGTH.STATUS_NAME),
    color: validateOptionalColor(status.color, 'status.color')
  }
}

/**
 * Validate search query
 */
function validateSearchQuery(query) {
  if (typeof query !== 'string') {
    throw new ValidationError('query must be a string')
  }
  if (query.length > MAX_LENGTH.SEARCH_QUERY) {
    throw new ValidationError(`query exceeds maximum length of ${MAX_LENGTH.SEARCH_QUERY}`)
  }
  return query
}

/**
 * Validate import mode
 */
function validateImportMode(mode) {
  const validModes = ['merge', 'replace']
  if (!validModes.includes(mode)) {
    return 'merge'
  }
  return mode
}

/**
 * Validate URL for external opening
 */
function validateUrl(url) {
  if (typeof url !== 'string') {
    throw new ValidationError('url must be a string')
  }
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ValidationError('url must use http or https protocol')
    }
    return url
  } catch {
    throw new ValidationError('url must be a valid URL')
  }
}

/**
 * Validate todo type
 */
function validateTodoType(value) {
  if (value === null || value === undefined || value === '') {
    return 'todo'
  }
  if (typeof value !== 'string') {
    throw new ValidationError('type must be a string')
  }
  const validTypes = ['todo', 'note']
  if (!validTypes.includes(value)) {
    throw new ValidationError(`type must be one of: ${validTypes.join(', ')}`)
  }
  return value
}

/**
 * Valid setting keys
 */
const VALID_SETTING_KEYS = ['markdown_mode', 'theme', 'default_view', 'card_size', 'hide_completed']

/**
 * Validate setting key
 */
function validateSettingKey(key) {
  if (key === null || key === undefined || key === '') {
    throw new ValidationError('setting key is required')
  }
  if (typeof key !== 'string') {
    throw new ValidationError('setting key must be a string')
  }
  if (!VALID_SETTING_KEYS.includes(key)) {
    throw new ValidationError(
      `Invalid setting key: ${key}. Valid keys are: ${VALID_SETTING_KEYS.join(', ')}`
    )
  }
  return key
}

/**
 * Validate setting value based on key
 */
function validateSettingValue(key, value) {
  switch (key) {
    case 'markdown_mode': {
      const validModes = ['markdown', 'plain']
      if (!validModes.includes(value)) {
        throw new ValidationError(`markdown_mode must be one of: ${validModes.join(', ')}`)
      }
      return value
    }
    case 'theme': {
      const validThemes = ['dark', 'light']
      if (!validThemes.includes(value)) {
        throw new ValidationError(`theme must be one of: ${validThemes.join(', ')}`)
      }
      return value
    }
    case 'default_view': {
      const validViews = ['cards', 'table', 'kanban', 'timeline', 'graph']
      if (!validViews.includes(value)) {
        throw new ValidationError(`default_view must be one of: ${validViews.join(', ')}`)
      }
      return value
    }
    case 'card_size': {
      const num = Number(value)
      if (!Number.isInteger(num) || num <= 0) {
        throw new ValidationError('card_size must be a positive integer')
      }
      return num
    }
    case 'hide_completed': {
      if (typeof value !== 'boolean') {
        throw new ValidationError('hide_completed must be a boolean')
      }
      return value
    }
    default:
      return value
  }
}

export {
  ValidationError,
  validateId,
  validateOptionalId,
  validateString,
  validateOptionalString,
  validateColor,
  validateOptionalColor,
  validateIdArray,
  validateOptionalDate,
  validateOptionalImportance,
  validateBoolean,
  validateTodo,
  validateProject,
  validateStatus,
  validateSearchQuery,
  validateImportMode,
  validateUrl,
  validateTodoType,
  validateSettingKey,
  validateSettingValue
}
