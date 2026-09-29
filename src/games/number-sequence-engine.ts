import { randomInt } from 'node:crypto'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

type SeqKind = 'ARITHMETIC' | 'GEOMETRIC' | 'FIBONACCI_LIKE'

function makeSequence(difficulty: string): { sequence: number[]; answer: number; kind: SeqKind } {
  const length = difficulty === 'EASY' ? 5 : difficulty === 'MEDIUM' ? 6 : difficulty === 'HARD' ? 7 : 8
  const kinds: SeqKind[] = ['ARITHMETIC', 'GEOMETRIC', 'FIBONACCI_LIKE']
  const kind = kinds[randomInt(kinds.length)]!
  const start = randomInt(1, 10)
  const seq: number[] = []
  if (kind === 'ARITHMETIC') {
    const step = randomInt(2, difficulty === 'EASY' ? 6 : 12)
    for (let i = 0; i < length; i++) seq.push(start + step * i)
  } else if (kind === 'GEOMETRIC') {
    const ratio = randomInt(2, 3)
    let v = start
    for (let i = 0; i < length; i++) {
      seq.push(v)
      v *= ratio
    }
  } else {
    let a = start
    let b = start + randomInt(1, 5)
    seq.push(a, b)
    for (let i = 2; i < length; i++) {
      const c = a + b
      seq.push(c)
      a = b
      b = c
    }
  }
  return { sequence: seq.slice(0, -1), answer: seq[seq.length - 1]!, kind }
}

/** Number Sequence: user finds the next number in each of N sequences. */
export const numberSequenceEngine: GameEngine = {
  type: 'NUMBER_SEQUENCE',
  async start(_payload, game) {
    const count = game.config?.questionCount ?? 5
    const rounds = Array.from({ length: count }, () => makeSequence(game.difficulty))
    return {
      client: { kind: 'NUMBER_SEQUENCE', rounds: rounds.map((r) => ({ sequence: r.sequence })), secondsPerQuestion: game.config?.secondsPerQuestion ?? 20 },
      server: { kind: 'NUMBER_SEQUENCE', answers: rounds.map((r) => r.answer) },
      maxScore: count,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { answers: number[] }
    const given = (input.payload as { answers?: (number | null)[] })?.answers ?? []
    let score = 0
    const rounds = server.answers.map((ans, i) => {
      const correct = given[i] === ans
      if (correct) score++
      return { index: i, correct }
    })
    return { score, maxScore: server.answers.length, rounds }
  },
}
