import { withApi, ok } from '@/lib/api/handler'
import { getSettings } from '@/services/settings'
import { AppError } from '@/lib/errors'

export const GET = withApi(async ({ payload, req }) => {
  const settings = await getSettings(payload)
  if (!settings.features.gamesEnabled) throw new AppError('FEATURE_DISABLED', 'Games are temporarily unavailable.')
  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'games',
    where: { status: { equals: 'ACTIVE' }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] },
    sort: '-featured',
    limit: 100,
    depth: 1,
    overrideAccess: true,
    req,
  })
  const games = res.docs.filter((g) => !g.endsAt || new Date(g.endsAt) > new Date())
  return ok({
    games: games.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      type: g.type,
      difficulty: g.difficulty,
      featured: g.featured,
      reward: g.reward,
      durationSeconds: g.durationSeconds,
      icon: typeof g.icon === 'object' ? g.icon?.url : null,
      thumbnail: typeof g.thumbnail === 'object' ? g.thumbnail?.url : null,
    })),
  })
}, { requireAuth: false })
