import { withApi, ok } from '@/lib/api/handler'
import { getWingoState } from '@/services/wingo'

export const GET = withApi(async ({ payload, req, user }, request) => {
  const mode = new URL(request.url).searchParams.get('mode') ?? '30s'
  const data = await getWingoState(payload, req, user!.id, mode)
  return ok(data)
})
