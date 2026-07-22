// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResetDatabaseModal from '../src/renderer/components/ResetDatabaseModal.vue'

describe('ResetDatabaseModal', () => {
  it('disables the confirm button until the user types yes', async () => {
    const wrapper = mount(ResetDatabaseModal)
    const confirm = wrapper.find('button.delete-btn')

    expect(confirm.attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('no')
    expect(confirm.attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('yes')
    expect(confirm.attributes('disabled')).toBeUndefined()
  })

  it('accepts yes regardless of case and surrounding whitespace', async () => {
    const wrapper = mount(ResetDatabaseModal)

    await wrapper.find('input').setValue('  YES ')
    expect(wrapper.find('button.delete-btn').attributes('disabled')).toBeUndefined()
  })

  it('emits confirm when the confirmed button is clicked', async () => {
    const wrapper = mount(ResetDatabaseModal)

    await wrapper.find('input').setValue('yes')
    await wrapper.find('button.delete-btn').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('does not emit confirm without the confirmation phrase', async () => {
    const wrapper = mount(ResetDatabaseModal)

    await wrapper.find('button.delete-btn').trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('emits close on cancel', async () => {
    const wrapper = mount(ResetDatabaseModal)

    const cancel = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancel.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows the backup path instead of the form once the result is set', async () => {
    const wrapper = mount(ResetDatabaseModal, {
      props: { result: { success: true, backupPath: '/data/todos-backup-260722-141503.db' } }
    })

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain('/data/todos-backup-260722-141503.db')
  })

  it('shows the error message when the reset failed', () => {
    const wrapper = mount(ResetDatabaseModal, {
      props: { result: { success: false, error: 'rename failed' } }
    })

    expect(wrapper.text()).toContain('rename failed')
  })
})
