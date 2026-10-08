import { withApi, ok } from '@/lib/api/handler'
import { pokerState } from '@/services/casino-games'

export const POST = withApi(async ({ payload, req, user }) => {
  const round = await pokerState(payload, req, user!.id)
  return ok({
    id: round?.id ?? null,
    hand: round?.hand ?? [],
  })
})
