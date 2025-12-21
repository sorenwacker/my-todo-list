import logger from './logger.js'

const log = logger.child({ module: 'history' })

class ActionHistory {
  constructor(maxSize = 50) {
    this.undoStack = []
    this.redoStack = []
    this.maxSize = maxSize
  }

  /**
   * Push an action onto the history stack
   * @param {Object} action - { type, undo: fn, redo: fn, description }
   */
  push(action) {
    if (!action.undo || !action.redo) {
      log.warn('Invalid action: missing undo or redo function', { type: action.type })
      return
    }

    this.undoStack.push(action)
    this.redoStack = [] // Clear redo stack on new action

    // Limit stack size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }

    log.info('Action recorded', { type: action.type, description: action.description })
  }

  /**
   * Undo the last action
   * @returns {Object|null} The undone action or null if stack is empty
   */
  async undo() {
    if (this.undoStack.length === 0) {
      log.info('Nothing to undo')
      return null
    }

    const action = this.undoStack.pop()
    try {
      await action.undo()
      this.redoStack.push(action)
      log.info('Action undone', { type: action.type, description: action.description })
      return action
    } catch (error) {
      log.error('Failed to undo action', { type: action.type, error: error.message })
      // Put it back on the stack
      this.undoStack.push(action)
      throw error
    }
  }

  /**
   * Redo the last undone action
   * @returns {Object|null} The redone action or null if stack is empty
   */
  async redo() {
    if (this.redoStack.length === 0) {
      log.info('Nothing to redo')
      return null
    }

    const action = this.redoStack.pop()
    try {
      await action.redo()
      this.undoStack.push(action)
      log.info('Action redone', { type: action.type, description: action.description })
      return action
    } catch (error) {
      log.error('Failed to redo action', { type: action.type, error: error.message })
      // Put it back on the stack
      this.redoStack.push(action)
      throw error
    }
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  getUndoDescription() {
    if (this.undoStack.length === 0) return null
    return this.undoStack[this.undoStack.length - 1].description
  }

  getRedoDescription() {
    if (this.redoStack.length === 0) return null
    return this.redoStack[this.redoStack.length - 1].description
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    log.info('History cleared')
  }

  getState() {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDescription: this.getUndoDescription(),
      redoDescription: this.getRedoDescription(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    }
  }
}

// Singleton instance
const history = new ActionHistory()

export default history
