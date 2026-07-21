// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EntityModal from '../src/renderer/components/EntityModal.vue'

// The modal component stays mounted and only its content toggles on `entity`,
// so focusing must happen when `entity` becomes set — not in mounted().
describe('EntityModal', () => {
  it('is hidden and renders no input while entity is null', () => {
    const wrapper = mount(EntityModal, { props: { entity: null, entityType: 'project' } })
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('focuses the name input when the modal opens', async () => {
    const wrapper = mount(EntityModal, {
      props: { entity: null, entityType: 'project' },
      attachTo: document.body
    })

    await wrapper.setProps({ entity: { name: 'Work' } })
    await wrapper.vm.$nextTick()

    const input = wrapper.find('input').element
    expect(document.activeElement).toBe(input)

    wrapper.unmount()
  })
})
