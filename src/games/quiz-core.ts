import type { Payload, Where } from 'payload'
import type { Game } from '@/payload-types'
import type { GameEngine, SubmitInput, SubmitResult } from './types'

interface ServerQuestion {
  id: number
  correctIndex: number
  points: number
}

async function pickQuestions(payload: Payload, game: Game) {
  const count = game.config?.questionCount ?? 5
  const diffMap: Record<string, string> = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD', EXPERT: 'HARD' }
  const where: Record<string, { equals: string | boolean }> = { isActive: { equals: true }, difficulty: { equals: diffMap[game.difficulty] ?? 'EASY' } }
  if (game.config?.category) where.category = { equals: game.config.category }

  let pool = await payload.find({ collection: 'quiz-questions', where: where as Where, limit: 200, depth: 0, overrideAccess: true })
  if (pool.docs.length < count) pool = await payload.find({ collection: 'quiz-questions', where: { isActive: { equals: true } }, limit: 200, depth: 0, overrideAccess: true })

  const shuffled = [...pool.docs].sort(() => Math.random() - 0.5).slice(0, count)
  return shuffled.map((q) => {
    const correctIndex = Math.max(0, q.options.findIndex((o) => o.isCorrect))
    return {
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options.map((o) => o.text),
      timeLimitSeconds: q.timeLimitSeconds ?? game.config?.secondsPerQuestion ?? 20,
      points: q.points,
      correctIndex,
    }
  })
}

export const quizEngine: GameEngine = {
  type: 'QUIZ',
  async start(payload, game) {
    const questions = await pickQuestions(payload, game)
    const maxScore = questions.reduce((s, q) => s + q.points, 0)
    return {
      client: { kind: 'QUIZ', questions: questions.map(({ correctIndex: _c, ...rest }) => rest) },
      server: { kind: 'QUIZ', questions: questions.map((q): ServerQuestion => ({ id: q.id, correctIndex: q.correctIndex, points: q.points })) },
      maxScore,
    }
  },
  async submit(_payload, _game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { questions: ServerQuestion[] }
    const answers = (input.payload as { answers?: Record<string, number> })?.answers ?? {}
    let score = 0
    const rounds = server.questions.map((q) => {
      const given = answers[String(q.id)]
      const correct = given === q.correctIndex
      if (correct) score += q.points
      return { id: q.id, given, correct }
    })
    const maxScore = server.questions.reduce((s, q) => s + q.points, 0)
    return { score, maxScore, rounds }
  },
}
