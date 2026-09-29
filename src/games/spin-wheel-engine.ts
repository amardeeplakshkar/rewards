import { randomInt } from 'node:crypto'
import { AppError } from '@/lib/errors'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

interface WheelSegment {
  label: string
  amount: number
  weight: number
  color?: string | null
}

/** Picks an index with probability proportional to each segment's weight, using a CSPRNG. */
function weightedPick(segments: WheelSegment[]): number {
  const total = segments.reduce((s, seg) => s + Math.max(0, seg.weight), 0)
  if (total <= 0) return randomInt(segments.length)
  // Scale to an integer range for randomInt (which requires integer bounds).
  const scale = 1_000_000
  const target = randomInt(Math.round(total * scale))
  let acc = 0
  for (let i = 0; i < segments.length; i++) {
    acc += Math.max(0, segments[i]!.weight) * scale
    if (target < acc) return i
  }
  return segments.length - 1
}

/**
 * A single spin of a prize wheel. There is no player skill/input — the server picks the winning slice at
 * start() time (so the client can animate the wheel precisely to that slice) and credits its amount
 * unconditionally on submit(), bypassing the game's generic score-based reward group entirely.
 */
export const spinWheelEngine: GameEngine = {
  type: 'SPIN_WHEEL',
  async start(_payload, game) {
    const segments = (game.config?.segments ?? []) as WheelSegment[]
    if (segments.length < 2) throw new AppError('NOT_AVAILABLE', 'This wheel is not configured yet.')

    const winningIndex = weightedPick(segments)
    const amount = Math.max(0, segments[winningIndex]!.amount)

    return {
      client: {
        kind: 'SPIN_WHEEL',
        segments: segments.map((s) => ({ label: s.label, color: s.color ?? undefined })),
        winningIndex,
      },
      server: { kind: 'SPIN_WHEEL', winningIndex, amount },
      maxScore: 1,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { winningIndex: number; amount: number }
    const won = server.amount > 0
    return {
      score: won ? 1 : 0,
      maxScore: 1,
      rounds: { winningIndex: server.winningIndex, amount: server.amount },
      rewardOverride: server.amount,
    }
  },
}