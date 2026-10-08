export const GAME_MODES = [
  { id: '30s', label: 'Win Go 30s', seconds: 30 },
  { id: '1m', label: 'Win Go 1Min', seconds: 60 },
  { id: '3m', label: 'Win Go 3Min', seconds: 180 },
  { id: '5m', label: 'Win Go 5Min', seconds: 300 },
] as const

export type GameMode = (typeof GAME_MODES)[number]['id']
export type BetType = 'number' | 'color' | 'size'
export type GameColor = 'Green' | 'Red' | 'Violet'
export type GameSize = 'Big' | 'Small'

export interface GameBet {
  id: string
  period: string
  mode: GameMode
  type: BetType
  selection: string
  amount: number
  placedAt: number
}

export interface GameResult {
  period: string
  mode: GameMode
  number: number
  size: GameSize
  colors: GameColor[]
  createdAt: number
}

export interface Settlement {
  betId: string
  resultNumber: number
  won: boolean
  payout: number
}

export interface PeriodInfo {
  period: string
  remainingSeconds: number
  roundIndex: number
}

const pad2 = (value: number) => String(value).padStart(2, '0')

export function modeSeconds(mode: GameMode): number {
  return GAME_MODES.find((item) => item.id === mode)?.seconds ?? 30
}

export function getPeriodInfo(nowMs: number, mode: GameMode): PeriodInfo {
  const date = new Date(nowMs)
  const secondsSinceUtcMidnight =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds()
  const interval = modeSeconds(mode)
  const roundIndex = Math.floor(secondsSinceUtcMidnight / interval)
  const remainingSeconds = interval - (secondsSinceUtcMidnight % interval)
  const sequence = String(50001 + roundIndex).padStart(5, '0')
  const period = `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}1000${sequence}`

  return { period, remainingSeconds, roundIndex }
}

export function getNumberTraits(number: number): {
  size: GameSize
  colors: GameColor[]
} {
  const size: GameSize = number >= 5 ? 'Big' : 'Small'
  const colors: GameColor[] =
    number === 0 ? ['Red', 'Violet'] : number === 5 ? ['Green', 'Violet'] : number % 2 === 1 ? ['Green'] : ['Red']

  return { size, colors }
}

export function createResult(
  period: string,
  mode: GameMode,
  number: number,
  createdAt: number,
): GameResult {
  return {
    period,
    mode,
    number,
    ...getNumberTraits(number),
    createdAt,
  }
}

export function createDemoResult(
  period: string,
  mode: GameMode,
  createdAt: number,
): GameResult {
  let hash = 2166136261
  for (let index = 0; index < period.length; index += 1) {
    hash = Math.imul(hash ^ period.charCodeAt(index), 16777619)
  }
  const number = Math.abs(hash) % 10
  return createResult(period, mode, number, createdAt)
}

export function calculatePayout(
  bet: Pick<GameBet, 'type' | 'selection' | 'amount'>,
  result: Pick<GameResult, 'number' | 'size' | 'colors'>,
): number {
  const won =
    (bet.type === 'number' && Number(bet.selection) === result.number) ||
    (bet.type === 'size' && bet.selection === result.size) ||
    (bet.type === 'color' && result.colors.includes(bet.selection as GameColor))

  if (!won) return 0

  let multiplier = 2
  if (bet.type === 'number') multiplier = 9
  if (bet.type === 'color' && bet.selection === 'Violet') multiplier = 4.5
  if (bet.type === 'color' && bet.selection === 'Green' && result.number === 5) {
    multiplier = 1.5
  }
  if (bet.type === 'color' && bet.selection === 'Red' && result.number === 0) {
    multiplier = 1.5
  }

  return Math.round(bet.amount * 0.98 * multiplier * 100) / 100
}

export function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${pad2(minutes)}:${pad2(remainder)}`
}
