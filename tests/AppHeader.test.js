// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppHeader from '../src/renderer/components/AppHeader.vue'

// The theme toggle must render a real vector icon rather than a bare emoji.
// Emoji fall back to monochrome text presentation on some macOS versions,
// taking the inherited text color and blending into the header background.
describe('AppHeader theme toggle', () => {
  it('renders a visible SVG icon in dark mode, not an emoji', () => {
    const wrapper = mount(AppHeader, { props: { theme: 'dark' } })
    const toggle = wrapper.get('button.theme-toggle')
    expect(toggle.find('svg').exists()).toBe(true)
    expect(toggle.text()).not.toContain('☀️')
    expect(toggle.text()).not.toContain('🌙')
  })

  it('renders a visible SVG icon in light mode, not an emoji', () => {
    const wrapper = mount(AppHeader, { props: { theme: 'light' } })
    const toggle = wrapper.get('button.theme-toggle')
    expect(toggle.find('svg').exists()).toBe(true)
    expect(toggle.text()).not.toContain('☀️')
    expect(toggle.text()).not.toContain('🌙')
  })

  it('emits toggle-theme when clicked', async () => {
    const wrapper = mount(AppHeader, { props: { theme: 'dark' } })
    await wrapper.get('button.theme-toggle').trigger('click')
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1)
  })
})
