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

// The width control changes how wide cards get in the card grid; row mode is a
// single full-width column, so the control has nothing to do there.
describe('AppHeader card width switcher', () => {
  function mountHeader(props) {
    return mount(AppHeader, {
      props: { currentView: 'cards', cardLayout: 'card', cardWidth: 'm', ...props }
    })
  }

  it('offers the three sizes in card mode and marks the active one', () => {
    const wrapper = mountHeader({ cardWidth: 'l' })
    const buttons = wrapper.findAll('.card-width-switcher button')
    expect(buttons.map((b) => b.text())).toEqual(['S', 'M', 'L'])
    expect(buttons.find((b) => b.classes().includes('active')).text()).toBe('L')
  })

  it('is hidden in row mode', () => {
    const wrapper = mountHeader({ cardLayout: 'row' })
    expect(wrapper.find('.card-width-switcher').exists()).toBe(false)
  })

  it('is hidden outside the cards view', () => {
    const wrapper = mountHeader({ currentView: 'kanban' })
    expect(wrapper.find('.card-width-switcher').exists()).toBe(false)
  })

  it('emits set-card-width with the chosen size', async () => {
    const wrapper = mountHeader()
    const large = wrapper.findAll('.card-width-switcher button').find((b) => b.text() === 'L')
    await large.trigger('click')
    expect(wrapper.emitted('set-card-width')[0]).toEqual(['l'])
  })
})
