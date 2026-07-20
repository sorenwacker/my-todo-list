// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KanbanCard from '../src/renderer/components/KanbanCard.vue'

function makeTodo(overrides = {}) {
  return {
    id: 1,
    title: 'Test todo',
    notes: '',
    notes_sensitive: 0,
    completed: 0,
    end_date: null,
    created_at: '2026-07-20T10:00:00',
    subtask_count: 0,
    ...overrides
  }
}

// A card must expand before its notes render, so tests click it first.
function expand(wrapper) {
  return wrapper.get('.kanban-card').trigger('click')
}

describe('KanbanCard', () => {
  it('renders the todo title', () => {
    const wrapper = mount(KanbanCard, { props: { todo: makeTodo() } })
    expect(wrapper.text()).toContain('Test todo')
  })

  it('hides notes flagged sensitive and shows the placeholder', async () => {
    const wrapper = mount(KanbanCard, {
      props: { todo: makeTodo({ notes: 'my secret plans', notes_sensitive: 1 }) }
    })
    await expand(wrapper)
    expect(wrapper.text()).toContain('Sensitive content hidden')
    expect(wrapper.html()).not.toContain('my secret plans')
  })

  it('renders non-sensitive notes as markdown', async () => {
    const wrapper = mount(KanbanCard, {
      props: { todo: makeTodo({ notes: 'plain note text' }) }
    })
    await expand(wrapper)
    expect(wrapper.html()).toContain('plain note text')
    expect(wrapper.text()).not.toContain('Sensitive content hidden')
  })

  it('emits toggle-complete when the checkbox is clicked', async () => {
    const wrapper = mount(KanbanCard, { props: { todo: makeTodo() } })
    await wrapper.get('input[type="checkbox"]').trigger('click')
    expect(wrapper.emitted('toggle-complete')).toHaveLength(1)
  })

  it('emits select when the card body is clicked', async () => {
    const wrapper = mount(KanbanCard, { props: { todo: makeTodo() } })
    await expand(wrapper)
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('marks an overdue card and formats the due date relatively', () => {
    const wrapper = mount(KanbanCard, {
      props: {
        todo: makeTodo({ end_date: '2020-01-01', project_name: 'Work', project_color: '#f00' })
      }
    })
    const deadline = wrapper.get('.card-deadline')
    expect(deadline.classes()).toContain('overdue')
  })

  it('shows a subtask progress bar when subtasks exist', () => {
    const wrapper = mount(KanbanCard, {
      props: { todo: makeTodo({ subtask_count: 4, subtask_completed: 2 }) }
    })
    expect(wrapper.find('.subtask-bar').exists()).toBe(true)
    expect(wrapper.text()).toContain('2/4')
  })
})
