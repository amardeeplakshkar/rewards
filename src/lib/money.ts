import { DEFAULT_CURRENCY, MINOR_UNITS_PER_MAJOR } from '@/constants'
import { AppError } from './errors'

/** All money is stored as integer minor units (paise). No floating-point arithmetic on balances. */

export function assertMinor(value: unknown, label = 'amount'): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new AppError('BAD_REQUEST', `${label} must be an integer number of minor units`)
  }
}

export function assertPositiveMinor(value: unknown, label = 'amount'): asserts value is number {
  assertMinor(value, label)
  if (value <= 0) throw new AppError('BAD_REQUEST', `${label} must be greater than zero`)
}

/**
 * Convert a decimal string ("100.50") to minor units (10050) using string parsing only,
 * so no float rounding can ever creep in.
 */
export function parseMajorToMinor(input: string): number {
  const s = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new AppError('VALIDATION_ERROR', 'Enter a valid amount with at most 2 decimals')
  const [whole, frac = ''] = s.split('.')
  const minor = Number(whole) * MINOR_UNITS_PER_MAJOR + Number(frac.padEnd(2, '0'))
  if (!Number.isSafeInteger(minor)) throw new AppError('VALIDATION_ERROR', 'Amount is too large')
  return minor
}

/** 10050 -> "100.50" (string based, no float division). */
export function minorToDecimalString(minor: number): string {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  const whole = Math.floor(abs / MINOR_UNITS_PER_MAJOR)
  const frac = String(abs % MINOR_UNITS_PER_MAJOR).padStart(2, '0')
  return `${sign}${whole}.${frac}`
}

const CURRENCY_LOCALE: Record<string, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' }
const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

/** Presentation only — never feed the result back into calculations. */
export function formatMoney(minor: number, currency: string = DEFAULT_CURRENCY, opts: { signed?: boolean } = {}): string {
  const major = minorToDecimalString(Math.abs(minor))
  const [whole, frac] = major.split('.')
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-IN').format(Number(whole))
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `
  const sign = minor < 0 ? '−' : opts.signed && minor > 0 ? '+' : ''
  return `${sign}${symbol}${formatted}.${frac}`
}

/** floor(amount * numerator / denominator) using integer math only. */
export function mulDivFloor(amount: number, numerator: number, denominator: number): number {
  if (denominator === 0) throw new AppError('BAD_REQUEST', 'Division by zero')
  return Math.floor((amount * numerator) / denominator)
}
