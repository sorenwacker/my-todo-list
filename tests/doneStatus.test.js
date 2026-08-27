// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  findDoneStatus,
  statusForCompletion,
  completionForStatus
} from '../src/renderer/utils/doneStatus.js'
import { useTodos } from '../src/renderer/composables/useTodos.js'

const WITH_DONE = [
  { id: 10, name: 'Todo' },
  { id: 20, name: 'In Progress' },
  { id: 30, name: ' done ' }
]

const WITHOUT_DONE = [
  { id: 10, name: 'Todo' },
  { id: 20, name: 'In Progress' }
]

describe('findDoneStatus', () => {
  it('matches the status named Done regardless of case and padding', () => {
    expect(findDoneStatus(WITH_DONE)).toMatchObject({ id: 30 })
  })

  it('returns null when no status is named Done', () => {
    expect(findDoneStatus(WITHOUT_DONE)).toBeNull()
    expect(findDoneStatus([])).toBeNull()
    expect(findDoneStatus(undefined)).toBeNull()
  })

  it('does not match names that merely contain done', () => {
    expect(findDoneStatus([{ id: 1, name: 'Almost done' }])).toBeNull()
  })
})

describe('statusForCompletion', () => {
  it('moves a completed todo into the Done column', () => {
    expect(statusForCompletion(10, true, WITH_DONE)).toBe(30)
    expect(statusForCompletion(null, true, WITH_DONE)).toBe(30)
  })

  it('moves an un-completed todo out of the Done column', () => {
    expect(statusForCompletion(30, false, WITH_DONE)).toBeNull()
  })

  it('leaves the column alone when un-completing outside the Done column', () => {
    expect(statusForCompletion(20, false, WITH_DONE)).toBe(20)
  })

  it('leaves the column alone when there is no Done column', () => {
    expect(statusForCompletion(10, true, WITHOUT_DONE)).toBe(10)
    expect(statusForCompletion(10, false, WITHOUT_DONE)).toBe(10)
  })
})

describe('completionForStatus', () => {
  it('completes a todo dropped into the Done column', () => {
    expect(completionForStatus(10, 30, false, WITH_DONE)).toBe(true)
  })

  it('un-completes a todo dragged out of the Done column', () => {
    expect(completionForStatus(30, 10, true, WITH_DONE)).toBe(false)
    expect(completionForStatus(30, null, true, WITH_DONE)).toBe(false)
  })

  it('leaves completion alone between two other columns', () => {
    expect(completionForStatus(10, 20, true, WITH_DONE)).toBe(true)
    expect(completionForStatus(10, 20, false, WITH_DONE)).toBe(false)
  })

  it('leaves completion alone when there is no Done column', () => {
    expect(completionForStatus(10, 20, false, WITHOUT_DONE)).toBe(false)
  })
})

describe('useTodos completion and status sync', () => {
  let api
  let todos

  function makeTodo(overrides = {}) {
    return { id: 1, title: 'Card', completed: false, status_id: 10, end_date: null, ...overrides }
  }

  beforeEach(() => {
    api = {
      updateTodo: vi.fn().mockResolvedValue(undefined),
      getTodos: vi.fn().mockResolvedValue([]),
      createNextRecurrence: vi.fn().mockResolvedValue(undefined)
    }
    window.api = api
    todos = useTodos()
  })

  it('moves a card into the Done column when its box is ticked', async () => {
    await todos.toggleComplete(makeTodo(), WITH_DONE)

    expect(api.updateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, completed: true, status_id: 30 })
    )
  })

  it('moves a ticked-off card out of the Done column to No Status', async () => {
    await todos.toggleComplete(makeTodo({ completed: true, status_id: 30 }), WITH_DONE)

    expect(api.updateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, completed: false, status_id: null })
    )
  })

  it('keeps the column when no status is named Done', async () => {
    await todos.toggleComplete(makeTodo(), WITHOUT_DONE)

    expect(api.updateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ completed: true, status_id: 10 })
    )
  })

  it('ticks the box when a card is moved into the Done column', async () => {
    await todos.moveTodoTo(makeTodo(), { statusId: 30 }, WITH_DONE)

    expect(api.updateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ status_id: 30, completed: true })
    )
  })

  it('sets a due date when a move into Done completes an undated card', async () => {
    await todos.moveTodoTo(makeTodo(), { statusId: 30 }, WITH_DONE)

    const written = api.updateTodo.mock.calls[0][0]
    expect(written.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('creates the next occurrence when a move into Done completes a recurring card', async () => {
    await todos.moveTodoTo(makeTodo({ recurrence_type: 'daily' }), { statusId: 30 }, WITH_DONE)

    expect(api.createNextRecurrence).toHaveBeenCalledWith(1)
  })

  it('unticks the box when a card is moved out of the Done column', async () => {
    await todos.moveTodoTo(
      makeTodo({ completed: true, status_id: 30, end_date: '2026-08-01' }),
      { statusId: 10 },
      WITH_DONE
    )

    expect(api.updateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ status_id: 10, completed: false, end_date: '2026-08-01' })
    )
  })

  it('leaves completion alone on a move between two other columns', async () => {
    await todos.moveTodoTo(makeTodo({ completed: true }), { statusId: 20 }, WITH_DONE)

    expect(api.updateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ status_id: 20, completed: true })
    )
    expect(api.createNextRecurrence).not.toHaveBeenCalled()
  })

  it('writes the project alongside the status when one is given', async () => {
    await todos.moveTodoTo(makeTodo({ project_id: 5 }), { statusId: 20, projectId: 7 }, WITH_DONE)

    expect(api.updateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 7, status_id: 20 })
    )
  })
})
