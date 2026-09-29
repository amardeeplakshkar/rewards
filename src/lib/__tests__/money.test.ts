import { describe, expect, it } from 'vitest'
import { assertMinor, assertPositiveMinor, formatMoney, minorToDecimalString, mulDivFloor, parseMajorToMinor } from '../money'
import { AppError } from '../errors'

describe('parseMajorToMinor', () => {
  it('parses whole rupees', () => {
    expect(parseMajorToMinor('100')).toBe(10000)
  })
  it('parses two decimal places', () => {
    expect(parseMajorToMinor('25.50')).toBe(2550)
    expect(parseMajorToMinor('0.05')).toBe(5)
  })
  it('pads a single decimal place', () => {
    expect(parseMajorToMinor('10.5')).toBe(1050)
  })
  it('rejects more than two decimal places', () => {
    expect(() => parseMajorToMinor('10.505')).toThrow(AppError)
  })
  it('rejects negative and malformed input', () => {
    expect(() => parseMajorToMinor('-10')).toThrow(AppError)
    expect(() => parseMajorToMinor('abc')).toThrow(AppError)
    expect(() => parseMajorToMinor('')).toThrow(AppError)
  })
})

describe('minorToDecimalString', () => {
  it('round-trips against parseMajorToMinor', () => {
    for (const s of ['0.00', '1.00', '25.50', '999999.99']) {
      expect(minorToDecimalString(parseMajorToMinor(s))).toBe(s)
    }
  })
  it('handles negative amounts', () => {
    expect(minorToDecimalString(-2550)).toBe('-25.50')
  })
  it('pads fractional paise', () => {
    expect(minorToDecimalString(5)).toBe('0.05')
  })
})

describe('formatMoney', () => {
  it('formats INR with grouping and symbol', () => {
    expect(formatMoney(150000)).toBe('₹1,500.00')
  })
  it('shows a plus sign for signed positive amounts when requested', () => {
    expect(formatMoney(500, 'INR', { signed: true })).toBe('+₹5.00')
  })
  it('shows a minus sign for negative amounts', () => {
    expect(formatMoney(-500)).toBe('−₹5.00')
  })
})

describe('mulDivFloor', () => {
  it('computes proportional rewards without floats', () => {
    expect(mulDivFloor(100, 60, 100)).toBe(60)
    expect(mulDivFloor(99, 1, 3)).toBe(33)
    expect(mulDivFloor(10, 1, 3)).toBe(3) // floors, never rounds up
  })
  it('throws on division by zero', () => {
    expect(() => mulDivFloor(10, 1, 0)).toThrow(AppError)
  })
})

describe('assertMinor / assertPositiveMinor', () => {
  it('accepts safe integers', () => {
    expect(() => assertMinor(100)).not.toThrow()
  })
  it('rejects floats, NaN and non-numbers', () => {
    expect(() => assertMinor(1.5)).toThrow(AppError)
    expect(() => assertMinor(Number.NaN)).toThrow(AppError)
    expect(() => assertMinor('100')).toThrow(AppError)
  })
  it('assertPositiveMinor rejects zero and negative', () => {
    expect(() => assertPositiveMinor(0)).toThrow(AppError)
    expect(() => assertPositiveMinor(-1)).toThrow(AppError)
    expect(() => assertPositiveMinor(1)).not.toThrow()
  })
})
