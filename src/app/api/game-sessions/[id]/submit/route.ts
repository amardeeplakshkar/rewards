import { withApi, ok } from '@/lib/api/handler'
import { submitGameSession } from '@/services/game'

export const POST = withApi(async ({ payload, req, user }, request, { params }: { params: Promise<{ id: string }> }) => {
  const { id: sessionId } = await params
  const answer = await request.json().catch(() => ({}))
  const session = await submitGameSession({ payload, req, user: user!, sessionId, answer })
  return ok({ score: session.score, maxScore: session.maxScore, scorePercent: session.scorePercent, result: session.result, rewardAmount: session.rewardAmount, rounds: session.rounds, rejectionReason: session.rejectionReason })
})
