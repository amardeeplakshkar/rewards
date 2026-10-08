import { withApi, ok } from '@/lib/api/handler'
import { getWingoHistory } from '@/services/wingo'

export const GET = withApi(async ({ payload, req, user }, request) => {
  const mode = new URL(request.url).searchParams.get('mode') ?? '30s'
  return ok(await getWingoHistory(payload, req, user!.id, mode))
})
