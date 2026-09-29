import { randomInt } from 'node:crypto'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

/**
 * Reaction: N rounds, each with a server-chosen delay before the "go" signal. The client reports its
 * reaction time per round; we score rounds under a generous ceiling to filter out bot/instant responses.
 */
const MIN_PLAUSIBLE_MS = 120
const MAX_COUNTED_MS = 1500

export const reactionEngine: GameEngine = {
  type: 'REACTION',
  async start(_payload, game) {
    const rounds = game.config?.rounds ?? 5
    const minDelay = game.config?.minDelayMs ?? 1200
    const maxDelay = game.config?.maxDelayMs ?? 4000
    const delays = Array.from({ length: rounds }, () => randomInt(minDelay, maxDelay + 1))
    return {
      client: { kind: 'REACTION', rounds, delaysMs: delays },
      server: { kind: 'REACTION', delaysMs: delays },
      maxScore: rounds,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { delaysMs: number[] }
    const times = (input.payload as { reactionTimesMs?: (number | null)[] })?.reactionTimesMs ?? []
    let score = 0
    const rounds = server.delaysMs.map((_, i) => {
      const t = times[i]
      const valid = typeof t === 'number' && t >= MIN_PLAUSIBLE_MS && t <= MAX_COUNTED_MS
      if (valid) score++
      return { index: i, reactionMs: t ?? null, counted: valid }
    })
    return { score, maxScore: server.delaysMs.length, rounds }
  },
}
