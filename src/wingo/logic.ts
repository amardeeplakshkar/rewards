export const WINGO_MODES = {
  '30s': 30,
  '1m': 60,
  '3m': 180,
  '5m': 300,
} as const

export type WingoMode = keyof typeof WINGO_MODES
export type WingoBetType = 'number' | 'color' | 'size'
export type WingoColor = 'Red' | 'Green' | 'Violet'
export type WingoSize = 'Big' | 'Small'
export type WingoSelection = number | WingoColor | WingoSize

export function parseMode(value: unknown): WingoMode {
  if (typeof value === 'string' && value in WINGO_MODES) return value as WingoMode
  throw new Error('Invalid Wingo mode.')
}

export function getRoundWindow(nowMs: number, mode: WingoMode) {
  const durationMs = WINGO_MODES[mode] * 1000
  const startMs = Math.floor(nowMs / durationMs) * durationMs
  const endMs = startMs + durationMs
  return {
    periodKey: `${mode}-${startMs}`,
    startAt: new Date(startMs).toISOString(),
    bettingClosesAt: new Date(endMs).toISOString(),
    endsAt: new Date(endMs).toISOString(),
    remainingSeconds: Math.max(0, Math.ceil((endMs - nowMs) / 1000)),
  }
}

export function getNumberTraits(number: number): { size: WingoSize; colors: WingoColor[] } {
  if (!Number.isInteger(number) || number < 0 || number > 9) throw new Error('Winning number must be between 0 and 9.')
  return {
    size: number >= 5 ? 'Big' : 'Small',
    colors: number === 0 ? ['Red', 'Violet'] : number === 5 ? ['Green', 'Violet'] : number % 2 ? ['Green'] : ['Red'],
  }
}

export function validateBet(input: { type: unknown; selection: unknown; amount: unknown }) {
  const amount = Number(input.amount)
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000) throw new Error('Stake must be a whole number from 1 to 100,000 rupees.')
  if (input.type === 'number') {
    const n = Number(input.selection)
    if (!Number.isInteger(n) || n < 0 || n > 9) throw new Error('Choose a number from 0 to 9.')
    return { type: 'number' as const, selection: String(n), amount }
  }
  if (input.type === 'color' && ['Red', 'Green', 'Violet'].includes(String(input.selection))) {
    return { type: 'color' as const, selection: String(input.selection), amount }
  }
  if (input.type === 'size' && ['Big', 'Small'].includes(String(input.selection))) {
    return { type: 'size' as const, selection: String(input.selection), amount }
  }
  throw new Error('Choose a valid number, color, or size bet.')
}

export function payoutForBet(bet: { type: WingoBetType; selection: string; amount: number }, winningNumber: number): number {
  const traits = getNumberTraits(winningNumber)
  let multiplier = 0
  if (bet.type === 'number' && Number(bet.selection) === winningNumber) multiplier = 9
  if (bet.type === 'color' && traits.colors.includes(bet.selection as WingoColor)) {
    multiplier = bet.selection === 'Violet' ? 4.5 : (winningNumber === 0 || winningNumber === 5) ? 1.5 : 2
  }
  if (bet.type === 'size' && bet.selection === traits.size) multiplier = 2
  return multiplier ? Math.floor(bet.amount * multiplier) : 0
}
