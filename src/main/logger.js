/**
 * Simple logging utility for the main process
 * Can be extended to write to files if needed
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

// Default log level - can be set via environment variable
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO

/**
 * Format a log message with timestamp and level
 */
function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString()
  const contextStr = Object.keys(context).length > 0
    ? ` ${JSON.stringify(context)}`
    : ''
  return `[${timestamp}] [${level}] ${message}${contextStr}`
}

/**
 * Log a debug message
 */
function debug(message, context = {}) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.debug(formatMessage('DEBUG', message, context))
  }
}

/**
 * Log an info message
 */
function info(message, context = {}) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.info(formatMessage('INFO', message, context))
  }
}

/**
 * Log a warning message
 */
function warn(message, context = {}) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(formatMessage('WARN', message, context))
  }
}

/**
 * Log an error message
 */
function error(message, context = {}) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    // Include stack trace if error object is provided
    if (context.error instanceof Error) {
      context.stack = context.error.stack
      context.errorMessage = context.error.message
      delete context.error
    }
    console.error(formatMessage('ERROR', message, context))
  }
}

/**
 * Create a child logger with preset context
 */
function child(defaultContext) {
  return {
    debug: (message, context = {}) => debug(message, { ...defaultContext, ...context }),
    info: (message, context = {}) => info(message, { ...defaultContext, ...context }),
    warn: (message, context = {}) => warn(message, { ...defaultContext, ...context }),
    error: (message, context = {}) => error(message, { ...defaultContext, ...context })
  }
}

export default {
  debug,
  info,
  warn,
  error,
  child,
  LOG_LEVELS
}
