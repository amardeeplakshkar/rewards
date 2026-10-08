import { randomInt } from 'node:crypto'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

type WingoColor = 'red' | 'green' | 'violet'
type WingoSize = 'big' | 'small'
type WingoBetType = 'NUMBER' | 'COLOR' | 'SIZE'

type WingoBet =
  | { type: 'NUMBER'; value: number }
  | { type: 'COLOR'; value: WingoColor }
  | { type: 'SIZE'; value: WingoSize }

interface WingoClientState {
  kind: 'WINGO'
  numbers: number[]
  colors: Array<{ value: WingoColor; label: string; multiplier: number }>
  sizes: Array<{ value: WingoSize; label: string; multiplier: number }>
  baseReward: number
}

interface WingoServerState {
  kind: 'WINGO'
  winningNumber: number
  baseReward: number
}

function getMultiplierForColor(value: WingoColor, winningNumber: number): number | null {
  if (value === 'red') {
    if (winningNumber === 0) return 1.5
    if ([2, 4, 6, 8].includes(winningNumber)) return 2
    return null
  }

  if (value === 'green') {
    if (winningNumber === 5) return 1.5
    if ([1, 3, 7, 9].includes(winningNumber)) return 2
    return null
  }

  if (value === 'violet') {
    if ([0, 5].includes(winningNumber)) return 4.5
    return null
  }

  return null
}

function getMultiplierForSize(value: WingoSize, winningNumber: number): number | null {
  if (value === 'big' && winningNumber >= 5) return 2
  if (value === 'small' && winningNumber <= 4) return 2
  return null
}

function parseBet(payload: unknown): WingoBet | null {
  const bet = payload as { type?: string; value?: string | number | null } | undefined
  if (!bet || typeof bet.type !== 'string') return null

  if (bet.type === 'NUMBER') {
    const value = typeof bet.value === 'number' ? bet.value : Number(bet.value)
    if (!Number.isInteger(value) || value < 0 || value > 9) return null
    return { type: 'NUMBER', value }
  }

  if (bet.type === 'COLOR') {
    const value = String(bet.value ?? '').toLowerCase()
    if (value === 'red' || value === 'green' || value === 'violet') {
      return { type: 'COLOR', value }
    }
    return null
  }

  if (bet.type === 'SIZE') {
    const value = String(bet.value ?? '').toLowerCase()
    if (value === 'big' || value === 'small') {
      return { type: 'SIZE', value }
    }
    return null
  }

  return null
}

export const wingoEngine: GameEngine = {
  type: 'WINGO',
  async start(_payload, game) {
    const baseReward = Number(game.reward?.amount ?? 100)
    const winningNumber = randomInt(10)

    return {
      client: {
        kind: 'WINGO',
        numbers: Array.from({ length: 10 }, (_, index) => index),
        colors: [
          { value: 'red', label: 'Red', multiplier: 2 },
          { value: 'green', label: 'Green', multiplier: 2 },
          { value: 'violet', label: 'Violet', multiplier: 4.5 },
        ],
        sizes: [
          { value: 'big', label: 'Big', multiplier: 2 },
          { value: 'small', label: 'Small', multiplier: 2 },
        ],
        baseReward,
      } satisfies WingoClientState,
      server: {
        kind: 'WINGO',
        winningNumber,
        baseReward,
      } satisfies WingoServerState,
      maxScore: 1,
    }
  },
  async submit(_payload, game, input: SubmitInput): Promise<SubmitResult> {
    const server = input.server as unknown as WingoServerState
    const bet = parseBet(input.payload)
    const baseReward = Number(game.reward?.amount ?? server.baseReward ?? 100)

    if (!bet) {
      return {
        score: 0,
        maxScore: 1,
        rounds: { winningNumber: server.winningNumber, bet: input.payload ?? null },
        rejectionReason: 'Choose a valid number, color, or big/small bet.',
      }
    }

    let multiplier: number | null = null
    if (bet.type === 'NUMBER') {
      multiplier = bet.value === server.winningNumber ? 9 : null
    }
    if (bet.type === 'COLOR') {
      multiplier = getMultiplierForColor(bet.value, server.winningNumber)
    }
    if (bet.type === 'SIZE') {
      multiplier = getMultiplierForSize(bet.value, server.winningNumber)
    }

    const won = multiplier !== null
    const rewardOverride = won && multiplier !== null ? Math.round(baseReward * multiplier) : 0

    return {
      score: won ? 1 : 0,
      maxScore: 1,
      rounds: {
        bet,
        winningNumber: server.winningNumber,
        won,
        multiplier,
      },
      rewardOverride,
    }
  },
}
