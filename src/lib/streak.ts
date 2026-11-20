/** Pure helpers for the daily check-in streak (unit-tested; no I/O). */

/** YYYY-MM-DD for `date` in the given IANA timezone. */
export function dayKeyInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** The calendar day before `dayKey` (YYYY-MM-DD). */
export function previousDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}

export interface StreakState {
  claimedToday: boolean
  /** Streak length including today if claimed, otherwise the streak that is still alive (0 if broken). */
  currentStreak: number
  /** Streak day that the next claim would be (today if not claimed yet, otherwise tomorrow). */
  nextDay: number
}

export function computeStreak(last: { dayKey: string; streakDay: number } | null | undefined, todayKey: string): StreakState {
  if (!last) return { claimedToday: false, currentStreak: 0, nextDay: 1 }
  if (last.dayKey === todayKey) return { claimedToday: true, currentStreak: last.streakDay, nextDay: last.streakDay + 1 }
  if (last.dayKey === previousDayKey(todayKey)) return { claimedToday: false, currentStreak: last.streakDay, nextDay: last.streakDay + 1 }
  return { claimedToday: false, currentStreak: 0, nextDay: 1 }
}

/** Reward for a streak day; after the configured days run out, the last amount repeats. */
export function rewardForDay(rewards: readonly number[], day: number): number {
  if (!rewards.length || day < 1) return 0
  return rewards[Math.min(day, rewards.length) - 1]
}
