// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { isWindowUnfocused } from '../src/renderer/utils/windowFocus.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isWindowUnfocused', () => {
  it('is false while the application window holds focus', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    expect(isWindowUnfocused()).toBe(false)
  })

  it('is true once the window has lost focus to another application', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    expect(isWindowUnfocused()).toBe(true)
  })
})
