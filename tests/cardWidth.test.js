// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CARD_MIN_WIDTHS,
  DEFAULT_CARD_WIDTH,
  cardMinWidth,
  normalizeCardWidth
} from '../src/renderer/utils/cardWidth.js'
import { validateLocalStorage } from '../src/renderer/utils/localStorageValidation.js'

describe('card width settings', () => {
  it('offers three sizes with increasing minimum widths', () => {
    expect(Object.keys(CARD_MIN_WIDTHS)).toEqual(['s', 'm', 'l'])
    const widths = Object.values(CARD_MIN_WIDTHS).map((w) => parseInt(w))
    expect(widths).toEqual([...widths].sort((a, b) => a - b))
  })

  it('defaults to the medium size', () => {
    expect(DEFAULT_CARD_WIDTH).toBe('m')
    expect(normalizeCardWidth(null)).toBe('m')
    expect(normalizeCardWidth('xl')).toBe('m')
  })

  it('resolves a size to the CSS minimum width the grid uses', () => {
    expect(cardMinWidth('s')).toBe(CARD_MIN_WIDTHS.s)
    expect(cardMinWidth('l')).toBe(CARD_MIN_WIDTHS.l)
    expect(cardMinWidth('nonsense')).toBe(CARD_MIN_WIDTHS.m)
  })
})

describe('card-width localStorage validation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps a recognized size', () => {
    localStorage.setItem('card-width', 'l')
    validateLocalStorage()
    expect(localStorage.getItem('card-width')).toBe('l')
  })

  it('drops an unrecognized size so the default applies', () => {
    localStorage.setItem('card-width', 'enormous')
    validateLocalStorage()
    expect(localStorage.getItem('card-width')).toBeNull()
  })
})

// The width setting only reaches the user through this one grid rule, so the
// rule is gated rather than left to review.
describe('card grid stylesheet', () => {
  const css = readFileSync(resolve(import.meta.dirname, '../src/renderer/styles/views.css'), 'utf8')

  it('sizes the card-mode auto-fill grid from --card-min-width', () => {
    expect(css).toContain('minmax(var(--card-min-width, ')
  })

  it('falls back to the default size when the variable is missing', () => {
    const fallback = css.match(/minmax\(var\(--card-min-width, ([^)]+)\)/)[1]
    expect(fallback).toBe(CARD_MIN_WIDTHS[DEFAULT_CARD_WIDTH])
  })
})
