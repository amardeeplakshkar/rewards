import { withApi, ok } from '@/lib/api/handler'
import { pokerInit } from '@/services/casino-games'

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = await request.json().catch(() => ({}))
  const betAmount = Number(body.betAmount ?? body.amount ?? body.bet ?? 0)
  const result = await pokerInit(payload, req, user!.id, betAmount)

  return ok({
    ...result,
    privateSeedHash: `legacy:${result.id}`,
    publicSeed: `legacy:${result.id}`,
    hand: result.hand ?? [],
  }, 201)
})
