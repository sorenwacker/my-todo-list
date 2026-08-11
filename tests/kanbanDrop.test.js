// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import KanbanView from '../src/renderer/components/KanbanView.vue'
import todoActionsMixin from '../src/renderer/mixins/todoActionsMixin.js'

const STATUSES = [
  { id: 10, name: 'Todo', color: '#aaa' },
  { id: 20, name: 'Doing', color: '#bbb' }
]

function makeTodo(overrides = {}) {
  return {
    id: 1,
    title: 'Test todo',
    project_id: 5,
    status_id: 10,
    deleted: 0,
    ...overrides
  }
}

// A stand-in for the SortableJS `end` event. `to` is the destination list, and
// `item` carries the vuedraggable context vuedraggable attaches to the element.
function endEvent(todo, toDataset) {
  const to = document.createElement('div')
  Object.assign(to.dataset, toDataset)
  const item = document.createElement('div')
  item.__draggable_context = { element: todo }
  return { item, to }
}

// The mixin only needs these members from its host component.
function makeHost(allTodos) {
  return {
    ...todoActionsMixin.methods,
    allTodos,
    toPlainTodo: (t) => ({ ...t }),
    loadAllTodos: vi.fn(),
    loadTodos: vi.fn()
  }
}

describe('KanbanView drop zones', () => {
  it('labels each grouped-board list with its project and status', () => {
    const wrapper = mount(KanbanView, {
      props: {
        groupByProject: true,
        isProjectSelected: false,
        statuses: STATUSES,
        groupedTodos: [
          { id: 'inbox', name: 'Inbox', color: '#666', todos: [] },
          { id: 5, name: 'Work', color: '#f00', todos: [] }
        ],
        allTodos: []
      },
      // The stub keeps the fallthrough attrs under test; the lists are empty,
      // so the item slot is never needed.
      global: { stubs: { draggable: { template: '<div />' } } }
    })

    const zones = wrapper.findAll('.kanban-cards').map((el) => ({
      project: el.attributes('data-project-id'),
      status: el.attributes('data-status-id')
    }))

    expect(zones).toEqual([
      { project: '', status: '' },
      { project: '', status: '10' },
      { project: '', status: '20' },
      { project: '5', status: '' },
      { project: '5', status: '10' },
      { project: '5', status: '20' }
    ])
  })
})

describe('onStackedKanbanDrop', () => {
  let updateTodo

  beforeEach(() => {
    updateTodo = vi.fn().mockResolvedValue(undefined)
    window.api = { updateTodo }
  })

  it('moves the card to the status of the column it was dropped into', async () => {
    const todo = makeTodo({ project_id: 5, status_id: 10 })
    const host = makeHost([todo])

    await host.onStackedKanbanDrop(endEvent(todo, { projectId: '5', statusId: '20' }))

    expect(updateTodo).toHaveBeenCalledWith(expect.objectContaining({ id: 1, status_id: 20 }))
  })

  it('clears the status when dropped into the No Status column', async () => {
    const todo = makeTodo({ project_id: 5, status_id: 10 })
    const host = makeHost([todo])

    await host.onStackedKanbanDrop(endEvent(todo, { projectId: '5', statusId: '' }))

    expect(updateTodo).toHaveBeenCalledWith(expect.objectContaining({ id: 1, status_id: null }))
  })

  it('moves the card to the project section it was dropped into', async () => {
    const todo = makeTodo({ project_id: 5, status_id: 10 })
    const host = makeHost([todo])

    await host.onStackedKanbanDrop(endEvent(todo, { projectId: '7', statusId: '20' }))

    expect(updateTodo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, project_id: 7, status_id: 20 })
    )
  })

  it('clears the project when dropped into the Inbox section', async () => {
    const todo = makeTodo({ project_id: 5, status_id: 10 })
    const host = makeHost([todo])

    await host.onStackedKanbanDrop(endEvent(todo, { projectId: '', statusId: '10' }))

    expect(updateTodo).toHaveBeenCalledWith(expect.objectContaining({ id: 1, project_id: null }))
  })

  it('ignores an event with no draggable context', async () => {
    const host = makeHost([makeTodo()])

    await host.onStackedKanbanDrop({ item: document.createElement('div'), to: null })

    expect(updateTodo).not.toHaveBeenCalled()
  })
})
