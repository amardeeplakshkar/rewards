import { withApi, ok } from '@/lib/api/handler'

const PAGE_SIZE = 20

/** GET /api/game-history?kind=games|wingo&page=1 — the signed-in user's played games, newest first. */
export const GET = withApi(async ({ payload, req, user }, request) => {
  const url = new URL(request.url)
  const kind = url.searchParams.get('kind') === 'wingo' ? 'wingo' : 'games'
  const page = Math.max(1, Math.min(500, Number(url.searchParams.get('page')) || 1))

  if (kind === 'wingo') {
    const res = await payload.find({ collection: 'wingo-bets', where: { user: { equals: user!.id } }, sort: '-createdAt', limit: PAGE_SIZE, page, depth: 0, overrideAccess: true, req })
    return ok({
      kind,
      page: res.page,
      hasNextPage: res.hasNextPage,
      items: res.docs.map((b) => ({
        id: b.id,
        title: `Wingo ${b.mode} · ${b.periodKey}`,
        detail: `${b.type}: ${b.selection}${b.winningNumber != null ? ` · result ${b.winningNumber}` : ''}`,
        status: b.status,
        stake: b.stake,
        payout: b.payout ?? 0,
        at: b.createdAt,
      })),
    })
  }

  const res = await payload.find({ collection: 'game-sessions', where: { user: { equals: user!.id } }, sort: '-startedAt', limit: PAGE_SIZE, page, depth: 0, overrideAccess: true, req })
  const gameIds = [...new Set(res.docs.map((s) => (typeof s.game === 'object' ? s.game.id : s.game)))]
  const games = gameIds.length
    ? await payload.find({ collection: 'games', where: { id: { in: gameIds } }, limit: gameIds.length, depth: 0, overrideAccess: true, req, select: { name: true, type: true } })
    : { docs: [] as { id: number; name: string; type: string }[] }
  const nameById = new Map(games.docs.map((g) => [g.id, g.name]))

  return ok({
    kind,
    page: res.page,
    hasNextPage: res.hasNextPage,
    items: res.docs.map((s) => {
      const gid = typeof s.game === 'object' ? s.game.id : s.game
      return {
        id: s.id,
        title: nameById.get(gid) ?? 'Game',
        detail: s.scorePercent != null ? `Score ${Math.round(s.scorePercent)}%` : s.status,
        status: s.result ?? s.status,
        reward: s.rewardAmount ?? 0,
        at: s.startedAt,
      }
    }),
  })
})
