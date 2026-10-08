import { withApi, ok } from '@/lib/api/handler'
import { multiplierCashout } from '@/services/casino-games'

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = await request.json().catch(() => ({}))
  const roundId = Number(body.roundId ?? body.id ?? 0)
  return ok(await multiplierCashout(payload, req, user!.id, roundId))
})
