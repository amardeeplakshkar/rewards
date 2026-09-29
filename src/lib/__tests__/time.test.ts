import { describe, expect, it } from 'vitest'
import { addDays, dayBounds, formatDuration, inWindow, isValidTimezone, safeTimezone, startOfDayInTz } from '../time'

describe('isValidTimezone / safeTimezone', () => {
  it('accepts a real IANA zone', () => {
    expect(isValidTimezone('Asia/Kolkata')).toBe(true)
  })
  it('rejects garbage', () => {
    expect(isValidTimezone('Not/AZone')).toBe(false)
  })
  it('falls back to the default for missing/invalid input', () => {
    expect(safeTimezone(undefined)).toBe('Asia/Kolkata')
    expect(safeTimezone('nonsense')).toBe('Asia/Kolkata')
    expect(safeTimezone('Europe/London')).toBe('Europe/London')
  })
})

describe('startOfDayInTz', () => {
  it('returns local midnight as a UTC instant for IST (UTC+5:30)', () => {
    // 2025-06-15T10:00:00Z is 2025-06-15T15:30 IST -> local midnight was 2025-06-14T18:30:00Z
    const d = new Date('2025-06-15T10:00:00Z')
    const start = startOfDayInTz(d, 'Asia/Kolkata')
    expect(start.toISOString()).toBe('2025-06-14T18:30:00.000Z')
  })
  it('matches UTC midnight for the UTC zone', () => {
    const d = new Date('2025-06-15T10:00:00Z')
    const start = startOfDayInTz(d, 'UTC')
    expect(start.toISOString()).toBe('2025-06-15T00:00:00.000Z')
  })
})

describe('dayBounds', () => {
  it('produces a 24 hour [start, end) window', () => {
    const { start, end } = dayBounds(new Date('2025-06-15T10:00:00Z'), 'Asia/Kolkata')
    expect(end.getTime() - start.getTime()).toBe(24 * 3_600_000)
  })
})

describe('addDays', () => {
  it('adds whole days', () => {
    const d = new Date('2025-01-01T00:00:00Z')
    expect(addDays(d, 5).toISOString()).toBe('2025-01-06T00:00:00.000Z')
    expect(addDays(d, -1).toISOString()).toBe('2024-12-31T00:00:00.000Z')
  })
})

describe('inWindow', () => {
  const now = new Date('2025-06-15T12:00:00Z')
  it('is true with no bounds', () => {
    expect(inWindow(now)).toBe(true)
  })
  it('respects a start bound', () => {
    expect(inWindow(now, '2025-06-16T00:00:00Z')).toBe(false)
    expect(inWindow(now, '2025-06-01T00:00:00Z')).toBe(true)
  })
  it('respects an end bound (exclusive)', () => {
    expect(inWindow(now, undefined, '2025-06-15T12:00:00Z')).toBe(false)
    expect(inWindow(now, undefined, '2025-06-15T12:00:01Z')).toBe(true)
  })
})

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(125)).toBe('2m 05s')
    expect(formatDuration(3725)).toBe('1h 2m')
  })
})
