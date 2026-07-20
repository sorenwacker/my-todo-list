// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ImportDialog from '../src/renderer/components/ImportDialog.vue'
import HelpModal from '../src/renderer/components/HelpModal.vue'

describe('ImportDialog', () => {
  it('emits import with "merge"', async () => {
    const wrapper = mount(ImportDialog)
    await wrapper.get('.primary').trigger('click')
    expect(wrapper.emitted('import')[0]).toEqual(['merge'])
  })

  it('emits import with "replace"', async () => {
    const wrapper = mount(ImportDialog)
    await wrapper.get('.delete-btn').trigger('click')
    expect(wrapper.emitted('import')[0]).toEqual(['replace'])
  })

  it('emits close from the Cancel button', async () => {
    const wrapper = mount(ImportDialog)
    const cancel = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancel.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the backdrop is clicked', async () => {
    const wrapper = mount(ImportDialog)
    await wrapper.trigger('click') // outer .project-modal is the backdrop
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('HelpModal', () => {
  it('renders the shortcut list with the honest highlight label', () => {
    const wrapper = mount(HelpModal)
    expect(wrapper.text()).toContain('Keyboard Shortcuts')
    // The selectTodo fix relabeled this from "Open/Edit todo" to "Highlight todo".
    expect(wrapper.text()).toContain('Highlight todo')
    expect(wrapper.text()).not.toContain('Open/Edit todo')
  })

  it('emits close from the backdrop', async () => {
    const wrapper = mount(HelpModal)
    await wrapper.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
