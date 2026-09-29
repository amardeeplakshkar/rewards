import { randomInt } from 'node:crypto'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/** Memory Match: N pairs of symbols placed on a rows×cols board. Client sends the sequence of flip pairs it made. */
export const memoryEngine: GameEngine = {
  type: 'MEMORY',
  async start(_payload, game) {
    const rows = game.config?.rows ?? 4
    const cols = game.config?.cols ?? 4
    const cells = rows * cols
    const pairs = cells / 2
    const symbolIds = Array.from({ length: pairs }, (_, i) => i)
    const board = shuffle([...symbolIds, ...symbolIds])
    return {
      // The board is sent to the client so it can render real matches during play. This is a deliberate
      // trade-off for a casual, capped-reward game: server still re-validates the moves against its own
      // copy on submit, and per-play rewards are small and rate/daily-limited, so knowing the layout
      // in advance isn't a money-security issue — only a minor gameplay-integrity one.
      client: { kind: 'MEMORY', rows, cols, cellCount: cells, board },
      server: { kind: 'MEMORY', board },
      maxScore: pairs,
    }
  },
  async submit(_payload, game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { board: number[] }
    const minSolveSeconds = game.config?.minSolveSeconds ?? 0
    const moves = (input.payload as { moves?: [number, number][] })?.moves ?? []
    const pairs = server.board.length / 2

    if (minSolveSeconds && input.elapsedSeconds < minSolveSeconds) return { score: 0, maxScore: pairs, rounds: null, rejectionReason: 'Submitted implausibly fast.' }
    if (!Array.isArray(moves) || moves.length > pairs * 3) return { score: 0, maxScore: pairs, rounds: null, rejectionReason: 'Malformed submission.' }

    const matched = new Set<number>()
    let score = 0
    for (const move of moves) {
      const [a, b] = move
      if (typeof a !== 'number' || typeof b !== 'number' || a === b) continue
      if (a < 0 || a >= server.board.length || b < 0 || b >= server.board.length) continue
      if (matched.has(a) || matched.has(b)) continue
      if (server.board[a] === server.board[b]) {
        matched.add(a)
        matched.add(b)
        score++
      }
    }
    return { score, maxScore: pairs, rounds: { matchedPairs: score, totalMoves: moves.length } }
  },
}
