// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NotesEditor from '../src/renderer/components/NotesEditor.vue'

// The editor mounts CodeMirror in onMounted -> nextTick, so tests must flush
// two ticks before the editor DOM exists.
async function mountEditor(props = {}) {
  const wrapper = mount(NotesEditor, { props, attachTo: document.body })
  await nextTick()
  await nextTick()
  return wrapper
}

let wrapper

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('NotesEditor', () => {
  it('focuses the editor on mount when autofocus is set', async () => {
    wrapper = await mountEditor({ modelValue: 'hello', autofocus: true })
    expect(wrapper.element.contains(document.activeElement)).toBe(true)
  })

  it('does not take focus on mount without autofocus', async () => {
    wrapper = await mountEditor({ modelValue: 'hello' })
    expect(wrapper.element.contains(document.activeElement)).toBe(false)
  })

  it('exposes a focus() method that focuses the editor', async () => {
    wrapper = await mountEditor({ modelValue: 'hello' })
    wrapper.vm.focus()
    expect(wrapper.element.contains(document.activeElement)).toBe(true)
  })
})
