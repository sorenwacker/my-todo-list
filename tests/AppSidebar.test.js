// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppSidebar from '../src/renderer/components/AppSidebar.vue'

// The add-project and add-status inputs discard their text on blur. Switching
// to another application must not count as leaving them (see docs/editing.md).
describe('AppSidebar add inputs across an application switch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps a half-typed project name when the window loses focus', async () => {
    const wrapper = mount(AppSidebar, { attachTo: document.body })
    await wrapper.get('.add-project button').trigger('click')
    const input = wrapper.get('.add-project input')
    await input.setValue('New project')

    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    await input.trigger('blur')
    expect(wrapper.find('.add-project input').exists()).toBe(true)
    expect(wrapper.get('.add-project input').element.value).toBe('New project')

    hasFocus.mockReturnValue(true)
    await wrapper.get('.add-project input').trigger('blur')
    expect(wrapper.find('.add-project input').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps a half-typed status name when the window loses focus', async () => {
    const wrapper = mount(AppSidebar, { attachTo: document.body })
    await wrapper.get('.add-status button').trigger('click')
    const input = wrapper.get('.add-status input')
    await input.setValue('Blocked')

    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    await input.trigger('blur')
    expect(wrapper.get('.add-status input').element.value).toBe('Blocked')
    wrapper.unmount()
  })
})
