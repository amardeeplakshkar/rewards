import { withApi, ok } from '@/lib/api/handler'
import { pokerDraw } from '@/services/casino-games'

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = await request.json().catch(() => ({}))
  const roundId = Number(body.roundId ?? body.id ?? 0)
  const holds = Array.isArray(body.holdIndexes)
    ? body.holdIndexes
    : Array.isArray(body.holds)
      ? body.holds
      : []

  const result = await pokerDraw(payload, req, user!.id, roundId, holds)

  return ok({
    ...result,
    privateSeed: `legacy:${roundId}`,
    publicSeed: `legacy:${roundId}`,
  })
})
