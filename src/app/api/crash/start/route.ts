import { withApi, ok } from '@/lib/api/handler'
import { multiplierStart } from '@/services/casino-games'

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = await request.json().catch(() => ({}))
  const betAmount = Number(body.betAmount ?? body.amount ?? body.bet ?? 0)
  const target = Number(body.target ?? 2)
  const result = await multiplierStart(payload, req, user!.id, 'CRASH', betAmount, target)
  return ok({ ...result, target }, 201)
})
