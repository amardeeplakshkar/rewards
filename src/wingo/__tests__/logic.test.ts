import { describe, expect, it } from 'vitest'
import { getNumberTraits, getRoundWindow, payoutForBet, validateBet } from '../logic'

describe('Wingo round logic', () => {
  it('aligns each supported mode to its interval', () => {
    expect(getRoundWindow(31_000, '30s').periodKey).toBe('30s-30000')
    expect(getRoundWindow(61_000, '1m').periodKey).toBe('1m-60000')
    expect(getRoundWindow(181_000, '3m').periodKey).toBe('3m-180000')
    expect(getRoundWindow(301_000, '5m').periodKey).toBe('5m-300000')
  })
  it('maps zero and five to the dual-color outcomes', () => {
    expect(getNumberTraits(0)).toEqual({ size: 'Small', colors: ['Red', 'Violet'] })
    expect(getNumberTraits(5)).toEqual({ size: 'Big', colors: ['Green', 'Violet'] })
  })
  it('validates a number bet and rejects invalid amounts/selections', () => {
    expect(validateBet({ type: 'number', selection: '7', amount: 10 })).toEqual({ type: 'number', selection: '7', amount: 10 })
    expect(() => validateBet({ type: 'number', selection: 10, amount: 10 })).toThrow()
    expect(() => validateBet({ type: 'color', selection: 'Blue', amount: 10 })).toThrow()
    expect(() => validateBet({ type: 'size', selection: 'Big', amount: 0 })).toThrow()
  })
  it('calculates reference multipliers for number, color, and size bets', () => {
    expect(payoutForBet({ type: 'number', selection: '7', amount: 100 }, 7)).toBe(900)
    expect(payoutForBet({ type: 'color', selection: 'Green', amount: 100 }, 5)).toBe(150)
    expect(payoutForBet({ type: 'color', selection: 'Violet', amount: 100 }, 0)).toBe(450)
    expect(payoutForBet({ type: 'size', selection: 'Big', amount: 100 }, 8)).toBe(200)
    expect(payoutForBet({ type: 'number', selection: '2', amount: 100 }, 3)).toBe(0)
  })
})
