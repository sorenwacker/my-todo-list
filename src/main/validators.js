/**
 * Input validation utilities for IPC handlers
 */

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
function validateString(value, fieldName = 'value', maxLength = 1000) {
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
function validateOptionalString(value, fieldName = 'value', maxLength = 50000) {
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
function validateOptionalColor(value, fieldName = 'color', defaultValue = '#0f4c75') {
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
  if (value.length > 10000) {
    throw new ValidationError(`${fieldName} exceeds maximum length of 10000`)
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
    title: validateString(todo.title, 'todo.title', 500),
    notes: validateOptionalString(todo.notes, 'todo.notes', 100000),
    start_date: validateOptionalDate(todo.start_date, 'todo.start_date'),
    end_date: validateOptionalDate(todo.end_date, 'todo.end_date'),
    completed: validateBoolean(todo.completed, 'todo.completed'),
    project_id: validateOptionalId(todo.project_id, 'todo.project_id'),
    category_id: validateOptionalId(todo.category_id, 'todo.category_id'),
    status_id: validateOptionalId(todo.status_id, 'todo.status_id'),
    importance: validateOptionalImportance(todo.importance),
    recurrence_type: validateOptionalRecurrenceType(todo.recurrence_type),
    recurrence_interval: validateOptionalPositiveInt(todo.recurrence_interval, 'todo.recurrence_interval', 365),
    recurrence_end_date: validateOptionalDate(todo.recurrence_end_date, 'todo.recurrence_end_date'),
    notes_sensitive: validateBoolean(todo.notes_sensitive, 'todo.notes_sensitive')
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
function validateOptionalPositiveInt(value, fieldName = 'value', max = 1000000) {
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
    name: validateString(project.name, 'project.name', 200),
    color: validateOptionalColor(project.color, 'project.color')
  }
}

/**
 * Validate category object
 */
function validateCategory(category) {
  if (!category || typeof category !== 'object') {
    throw new ValidationError('category must be an object')
  }

  return {
    id: validateId(category.id, 'category.id'),
    name: validateString(category.name, 'category.name', 100),
    color: validateOptionalColor(category.color, 'category.color'),
    symbol: validateOptionalString(category.symbol, 'category.symbol', 10)
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
    name: validateString(status.name, 'status.name', 100),
    color: validateOptionalColor(status.color, 'status.color')
  }
}

/**
 * Validate person object
 */
function validatePerson(person) {
  if (!person || typeof person !== 'object') {
    throw new ValidationError('person must be an object')
  }

  const result = {
    name: validateString(person.name, 'person.name', 200),
    email: validateOptionalString(person.email, 'person.email', 320),
    phone: validateOptionalString(person.phone, 'person.phone', 50),
    role: validateOptionalString(person.role, 'person.role', 200),
    notes: validateOptionalString(person.notes, 'person.notes', 10000),
    color: validateOptionalColor(person.color, 'person.color', '#6b7280'),
    github_name: validateOptionalString(person.github_name, 'person.github_name', 100)
  }

  // Include id if present (for updates)
  if (person.id !== undefined) {
    result.id = validateId(person.id, 'person.id')
  }

  return result
}

/**
 * Validate subtask object
 */
function validateSubtask(subtask) {
  if (!subtask || typeof subtask !== 'object') {
    throw new ValidationError('subtask must be an object')
  }

  return {
    id: validateId(subtask.id, 'subtask.id'),
    title: validateString(subtask.title, 'subtask.title', 500),
    completed: validateBoolean(subtask.completed, 'subtask.completed')
  }
}

/**
 * Validate stakeholder data
 */
function validateStakeholderData(data) {
  if (!data || typeof data !== 'object') {
    return {}
  }

  const result = {}

  if (data.influence_level !== undefined) {
    const num = Number(data.influence_level)
    if (!Number.isInteger(num) || num < 1 || num > 5) {
      throw new ValidationError('influence_level must be between 1 and 5')
    }
    result.influence_level = num
  }

  if (data.interest_level !== undefined) {
    const num = Number(data.interest_level)
    if (!Number.isInteger(num) || num < 1 || num > 5) {
      throw new ValidationError('interest_level must be between 1 and 5')
    }
    result.interest_level = num
  }

  if (data.stakeholder_type !== undefined) {
    result.stakeholder_type = validateOptionalString(data.stakeholder_type, 'stakeholder_type', 100)
  }

  if (data.engagement_strategy !== undefined) {
    result.engagement_strategy = validateOptionalString(data.engagement_strategy, 'engagement_strategy', 200)
  }

  if (data.notes !== undefined) {
    result.notes = validateOptionalString(data.notes, 'notes', 10000)
  }

  return result
}

/**
 * Validate search query
 */
function validateSearchQuery(query) {
  if (typeof query !== 'string') {
    throw new ValidationError('query must be a string')
  }
  if (query.length > 500) {
    throw new ValidationError('query exceeds maximum length of 500')
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
  validateCategory,
  validateStatus,
  validatePerson,
  validateSubtask,
  validateStakeholderData,
  validateSearchQuery,
  validateImportMode,
  validateUrl
}
