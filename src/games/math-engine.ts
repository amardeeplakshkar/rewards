import { randomInt } from 'node:crypto'
import type { MathOperation } from '@/constants'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

interface MathQuestion {
  text: string
  answer: number
}

function makeQuestion(op: MathOperation, difficulty: string): MathQuestion {
  const range = difficulty === 'EASY' ? 20 : difficulty === 'MEDIUM' ? 50 : difficulty === 'HARD' ? 100 : 500
  const a = randomInt(1, range)
  const b = randomInt(1, range)
  switch (op) {
    case 'ADDITION':
      return { text: `${a} + ${b}`, answer: a + b }
    case 'SUBTRACTION':
      return { text: `${Math.max(a, b)} - ${Math.min(a, b)}`, answer: Math.abs(a - b) }
    case 'MULTIPLICATION': {
      const small = randomInt(2, difficulty === 'EASY' ? 12 : 20)
      const small2 = randomInt(2, difficulty === 'EASY' ? 12 : 20)
      return { text: `${small} × ${small2}`, answer: small * small2 }
    }
    case 'DIVISION': {
      const divisor = randomInt(2, 12)
      const quotient = randomInt(2, 20)
      return { text: `${divisor * quotient} ÷ ${divisor}`, answer: quotient }
    }
    case 'PERCENTAGE': {
      const pct = [5, 10, 15, 20, 25, 50][randomInt(6)]!
      const base = randomInt(2, 20) * 10
      return { text: `${pct}% of ${base}`, answer: Math.round((pct / 100) * base) }
    }
    default: {
      const ops: MathOperation[] = ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION', 'PERCENTAGE']
      return makeQuestion(ops[randomInt(ops.length)]!, difficulty)
    }
  }
}

export const mathEngine: GameEngine = {
  type: 'MATH',
  async start(_payload, game) {
    const count = game.config?.questionCount ?? 8
    const ops = (game.config?.mathOperations?.length ? game.config.mathOperations : ['MIXED']) as MathOperation[]
    const questions = Array.from({ length: count }, () => makeQuestion(ops[randomInt(ops.length)]!, game.difficulty))
    return {
      client: { kind: 'MATH', questions: questions.map((q) => ({ text: q.text })), secondsPerQuestion: game.config?.secondsPerQuestion ?? 15 },
      server: { kind: 'MATH', answers: questions.map((q) => q.answer) },
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
