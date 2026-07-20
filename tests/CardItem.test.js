// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CardItem from '../src/renderer/components/CardItem.vue'

function makeTodo(overrides = {}) {
  return {
    id: 1,
    title: 'Test todo',
    notes: '',
    notes_sensitive: 0,
    completed: 0,
    end_date: null,
    created_at: '2026-07-20T10:00:00',
    ...overrides
  }
}

// Cards start collapsed; notes only render once expanded by a click on the card.

describe('CardItem', () => {
  it('renders the todo title', () => {
    const wrapper = mount(CardItem, { props: { todo: makeTodo() } })
    expect(wrapper.text()).toContain('Test todo')
  })

  it('hides notes flagged sensitive and shows the placeholder', async () => {
    const wrapper = mount(CardItem, {
      props: { todo: makeTodo({ notes: 'my secret plans', notes_sensitive: 1 }) }
    })
    await wrapper.trigger('click')
    expect(wrapper.text()).toContain('Sensitive content hidden')
    expect(wrapper.html()).not.toContain('my secret plans')
  })

  it('renders non-sensitive notes as markdown', async () => {
    const wrapper = mount(CardItem, {
      props: { todo: makeTodo({ notes: 'plain note text' }) }
    })
    await wrapper.trigger('click')
    expect(wrapper.html()).toContain('plain note text')
    expect(wrapper.text()).not.toContain('Sensitive content hidden')
  })

  it('emits toggle-complete when the checkbox is clicked', async () => {
    const wrapper = mount(CardItem, { props: { todo: makeTodo() } })
    await wrapper.get('input[type="checkbox"]').trigger('click')
    expect(wrapper.emitted('toggle-complete')).toHaveLength(1)
  })

  it('emits update-title with the edited value', async () => {
    const wrapper = mount(CardItem, { props: { todo: makeTodo() } })
    await wrapper.get('.card-title').trigger('dblclick')
    const input = wrapper.get('.card-title-input')
    await input.setValue('Renamed todo')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('update-title')[0]).toEqual(['Renamed todo'])
  })

  it('does not emit update-title when the title is unchanged', async () => {
    const wrapper = mount(CardItem, { props: { todo: makeTodo({ title: 'Same' }) } })
    await wrapper.get('.card-title').trigger('dblclick')
    await wrapper.get('.card-title-input').trigger('keydown.enter')
    expect(wrapper.emitted('update-title')).toBeUndefined()
  })

  // The context menu is teleported to `.app`; stub Teleport so it renders inline.
  const teleportStub = { global: { stubs: { teleport: true } } }

  it('opens a context menu on right-click', async () => {
    const wrapper = mount(CardItem, { props: { todo: makeTodo() }, ...teleportStub })
    expect(wrapper.find('.card-context-menu').exists()).toBe(false)
    await wrapper.trigger('contextmenu')
    expect(wrapper.find('.card-context-menu').exists()).toBe(true)
  })

  it('emits set-due-date from the context menu Today preset', async () => {
    const wrapper = mount(CardItem, { props: { todo: makeTodo() }, ...teleportStub })
    await wrapper.trigger('contextmenu')
    const today = wrapper.findAll('.context-menu-item').find((n) => n.text() === 'Today')
    await today.trigger('click')
    expect(wrapper.emitted('set-due-date')).toHaveLength(1)
    expect(wrapper.emitted('set-due-date')[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
