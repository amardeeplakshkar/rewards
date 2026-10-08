import { withApi, ok } from '@/lib/api/handler'
import { placeWingoBet } from '@/services/wingo'

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = await request.json().catch(() => ({}))
  const result = await placeWingoBet({
    payload, req, user: user!, mode: body.mode, type: body.type, selection: body.selection,
    amount: body.amount, idempotencyKey: body.idempotencyKey,
  })
  return ok({ bet: result.bet, balance: result.balance, duplicate: result.duplicate }, result.duplicate ? 200 : 201)
})
