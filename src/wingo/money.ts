import { DEFAULT_CURRENCY, MINOR_UNITS_PER_MAJOR } from '@/constants'
import { AppError } from '@/lib/errors'
import { formatMoney } from '@/lib/money'

export function toMinorWingoAmount(value: number | string): number {
  const raw = typeof value === 'number' ? value : String(value).trim()
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) throw new AppError('VALIDATION_ERROR', 'Wingo amount must be a non-negative rupee value.')
    return Math.round(raw * MINOR_UNITS_PER_MAJOR)
  }
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new AppError('VALIDATION_ERROR', 'Wingo amount must be a valid rupee value.')
  const [whole, frac = ''] = raw.split('.')
  const minor = Number(whole) * MINOR_UNITS_PER_MAJOR + Number((frac + '00').slice(0, 2))
  return minor
}

export function formatWingoMoney(minor: number): string {
  return formatMoney(minor, DEFAULT_CURRENCY)
}
