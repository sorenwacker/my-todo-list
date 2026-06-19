import { describe, it, expect } from 'vitest'
import { formatLocalDate, presetDueDate } from '../src/renderer/utils/dueDates.js'

describe('formatLocalDate', () => {
  it('formats a date as local YYYY-MM-DD', () => {
    expect(formatLocalDate(new Date(2026, 5, 19))).toBe('2026-06-19')
  })

  it('zero-pads single-digit months and days', () => {
    expect(formatLocalDate(new Date(2026, 0, 3))).toBe('2026-01-03')
  })

  it('uses local calendar components, not the UTC boundary', () => {
    // Late local time would roll over to the next UTC day with toISOString().
    const lateEvening = new Date(2026, 5, 19, 23, 30)
    expect(formatLocalDate(lateEvening)).toBe('2026-06-19')
  })
})

describe('presetDueDate', () => {
  const base = new Date(2026, 5, 19) // 2026-06-19

  it('returns the base date for an offset of 0 (today)', () => {
    expect(presetDueDate(0, base)).toBe('2026-06-19')
  })

  it('returns the next day for an offset of 1 (tomorrow)', () => {
    expect(presetDueDate(1, base)).toBe('2026-06-20')
  })

  it('returns a date one week out for an offset of 7 (next week)', () => {
    expect(presetDueDate(7, base)).toBe('2026-06-26')
  })

  it('rolls over month boundaries', () => {
    expect(presetDueDate(15, base)).toBe('2026-07-04')
  })

  it('ignores the time of day on the base date', () => {
    const baseWithTime = new Date(2026, 5, 19, 18, 45)
    expect(presetDueDate(1, baseWithTime)).toBe('2026-06-20')
  })
})
