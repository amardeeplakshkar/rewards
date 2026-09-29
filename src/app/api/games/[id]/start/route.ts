import { withApi, ok } from '@/lib/api/handler'
import { startGameSession } from '@/services/game'

export const POST = withApi(async ({ payload, req, user }, request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const { session, client } = await startGameSession({ payload, req, user: user!, gameId: Number(id), headers: request.headers })
  return ok({ sessionId: session.sessionId, expiresAt: session.expiresAt, maxScore: session.maxScore, state: client })
})
