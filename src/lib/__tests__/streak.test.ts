import { describe, expect, it } from 'vitest'
import { computeStreak, dayKeyInTz, previousDayKey, rewardForDay } from '../streak'

describe('previousDayKey', () => {
  it('handles month and year boundaries', () => {
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28')
    expect(previousDayKey('2027-01-01')).toBe('2026-12-31')
  })
})

describe('dayKeyInTz', () => {
  it('uses the local calendar day', () => {
    // 20:00 UTC on Nov 19 is already Nov 20 in India
    expect(dayKeyInTz(new Date('2026-11-19T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-11-20')
    expect(dayKeyInTz(new Date('2026-11-19T20:00:00Z'), 'UTC')).toBe('2026-11-19')
  })
})

describe('computeStreak', () => {
  const today = '2026-11-20'
  it('starts at day 1 with no history', () => {
    expect(computeStreak(null, today)).toEqual({ claimedToday: false, currentStreak: 0, nextDay: 1 })
  })
  it('continues from yesterday', () => {
    expect(computeStreak({ dayKey: '2026-11-19', streakDay: 3 }, today)).toEqual({ claimedToday: false, currentStreak: 3, nextDay: 4 })
  })
  it('reports today as claimed', () => {
    expect(computeStreak({ dayKey: today, streakDay: 4 }, today)).toEqual({ claimedToday: true, currentStreak: 4, nextDay: 5 })
  })
  it('resets after a missed day', () => {
    expect(computeStreak({ dayKey: '2026-11-17', streakDay: 6 }, today)).toEqual({ claimedToday: false, currentStreak: 0, nextDay: 1 })
  })
})

describe('rewardForDay', () => {
  it('repeats the last amount', () => {
    const r = [100, 200, 500]
    expect(rewardForDay(r, 1)).toBe(100)
    expect(rewardForDay(r, 3)).toBe(500)
    expect(rewardForDay(r, 10)).toBe(500)
  })
  it('returns 0 when nothing is configured', () => {
    expect(rewardForDay([], 1)).toBe(0)
  })
})
