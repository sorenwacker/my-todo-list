// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GlobalSearch from '../src/renderer/components/GlobalSearch.vue'

const mountOpts = {
  props: { visible: true, recentItems: [] },
  global: { stubs: { ItemPreview: true } }
}

beforeEach(() => {
  window.api = { globalSearch: async () => ({ todos: [], projects: [], tags: [] }) }
})

describe('GlobalSearch', () => {
  it('emits close on Escape', async () => {
    const wrapper = mount(GlobalSearch, mountOpts)
    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('lists recent items when there is no query', () => {
    const wrapper = mount(GlobalSearch, {
      ...mountOpts,
      props: { visible: true, recentItems: [{ id: 7, title: 'Recent one' }] }
    })
    expect(wrapper.text()).toContain('Recent')
    expect(wrapper.text()).toContain('Recent one')
  })

  it('navigates recent items by keyboard and selects with Enter', async () => {
    const wrapper = mount(GlobalSearch, {
      ...mountOpts,
      props: {
        visible: true,
        recentItems: [
          { id: 7, title: 'First' },
          { id: 9, title: 'Second' }
        ]
      }
    })
    const input = wrapper.get('input')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select-todo')[0]).toEqual([9])
  })

  it('never renders a tags result group', async () => {
    const wrapper = mount(GlobalSearch, mountOpts)
    wrapper.vm.query = 'x'
    wrapper.vm.results = { todos: [], projects: [], tags: [{ id: 1, name: 'urgent' }] }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tag-item').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('urgent')
  })

  it('emits select-todo when a todo result is clicked', async () => {
    const wrapper = mount(GlobalSearch, mountOpts)
    wrapper.vm.query = 'x'
    wrapper.vm.results = { todos: [{ id: 3, title: 'Found todo' }], projects: [], tags: [] }
    await wrapper.vm.$nextTick()
    await wrapper.get('.result-item').trigger('click')
    expect(wrapper.emitted('select-todo')[0]).toEqual([3])
  })
})
