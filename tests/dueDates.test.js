import { describe, it, expect } from 'vitest'
import {
  formatLocalDate,
  presetDueDate,
  isOverdue,
  formatDeadline,
  formatCreatedDate
} from '../src/renderer/utils/dueDates.js'

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

describe('isOverdue', () => {
  it('is true for a date before today', () => {
    expect(isOverdue('2026-07-18', '2026-07-19')).toBe(true)
  })

  it('is false for a date due today, regardless of timezone', () => {
    // Compares date strings directly: a UTC-parsed Date would mark a
    // due-today todo overdue for users west of UTC.
    expect(isOverdue('2026-07-19', '2026-07-19')).toBe(false)
  })

  it('is false for a future date', () => {
    expect(isOverdue('2026-07-20', '2026-07-19')).toBe(false)
  })

  it('ignores a time component on the stored date', () => {
    expect(isOverdue('2026-07-19T08:00:00', '2026-07-19')).toBe(false)
  })

  it('is false for an empty date', () => {
    expect(isOverdue('', '2026-07-19')).toBe(false)
    expect(isOverdue(null, '2026-07-19')).toBe(false)
  })
})

describe('formatDeadline', () => {
  const now = new Date(2026, 6, 19, 15, 30) // 2026-07-19, mid-afternoon

  it('formats today as Today even late in the day', () => {
    expect(formatDeadline('2026-07-19', now)).toBe('Today')
  })

  it('formats adjacent days as Tomorrow and Yesterday', () => {
    expect(formatDeadline('2026-07-20', now)).toBe('Tomorrow')
    expect(formatDeadline('2026-07-18', now)).toBe('Yesterday')
  })

  it('formats dates within a week as day counts', () => {
    expect(formatDeadline('2026-07-22', now)).toBe('3d')
    expect(formatDeadline('2026-07-26', now)).toBe('7d')
  })

  it('formats farther dates as short month and day', () => {
    expect(formatDeadline('2026-08-30', now)).toBe('Aug 30')
  })

  it('returns empty string for missing input', () => {
    expect(formatDeadline('', now)).toBe('')
  })
})

describe('formatCreatedDate', () => {
  it('formats an ISO timestamp as a short date', () => {
    expect(formatCreatedDate('2026-07-19T10:00:00')).toBe('Jul 19, 26')
  })

  it('returns empty string for missing input', () => {
    expect(formatCreatedDate('')).toBe('')
  })
})
