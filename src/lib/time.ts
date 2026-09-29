import { DEFAULT_TIMEZONE } from '@/constants'

/** All persisted timestamps are UTC. These helpers only convert for boundaries / display. */

export const utcNow = () => new Date()

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function safeTimezone(tz?: string | null): string {
  return tz && isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
}

/** Offset (ms) of `tz` from UTC at instant `date`. */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** UTC instant for local midnight of the calendar day containing `date` in `tz`. */
export function startOfDayInTz(date: Date, tz: string): Date {
  const zone = safeTimezone(tz)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  const [y, m, d] = parts.split('-').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const offset = tzOffsetMs(guess, zone)
  let result = new Date(guess.getTime() - offset)
  const offset2 = tzOffsetMs(result, zone)
  if (offset2 !== offset) result = new Date(guess.getTime() - offset2)
  return result
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

/** [start, end) of the local day in tz. */
export function dayBounds(date: Date, tz: string): { start: Date; end: Date } {
  const start = startOfDayInTz(date, tz)
  const end = startOfDayInTz(new Date(start.getTime() + 36 * 3_600_000), tz)
  return { start, end }
}

export function inWindow(now: Date, start?: string | Date | null, end?: string | Date | null): boolean {
  if (start && now < new Date(start)) return false
  if (end && now >= new Date(end)) return false
  return true
}

export function formatInTz(
  date: string | Date | null | undefined,
  tz: string,
  opts: { seconds?: boolean; dateOnly?: boolean; withZone?: boolean } = {},
): string {
  if (!date) return '—'
  const d = new Date(date)
  const zone = safeTimezone(tz)
  const base: Intl.DateTimeFormatOptions = { timeZone: zone, day: '2-digit', month: 'short', year: 'numeric' }
  if (!opts.dateOnly) {
    base.hour = '2-digit'
    base.minute = '2-digit'
    base.hourCycle = 'h23'
    if (opts.seconds) base.second = '2-digit'
  }
  const s = new Intl.DateTimeFormat('en-GB', base).format(d).replace(',', '')
  return opts.withZone ? `${s} ${zone}` : s
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}
