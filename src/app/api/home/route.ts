import { withApi, ok } from '@/lib/api/handler'
import { CACHE, cached } from '@/lib/cache'
import { getSettings } from '@/services/settings'

export const GET = withApi(async ({ payload, req }) => {
  const now = new Date().toISOString()
  const [banners, announcements, settings] = await Promise.all([
    cached(`${CACHE.banners}:active`, 30, async () => {
      const res = await payload.find({ collection: 'banners', where: { isActive: { equals: true }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] }, sort: 'sortOrder', limit: 20, depth: 1, overrideAccess: true })
      return res.docs.filter((b) => !b.endsAt || new Date(b.endsAt) > new Date()).map((b) => ({ id: b.id, title: b.title, description: b.description, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, image: typeof b.image === 'object' ? b.image?.url : null }))
    }),
    cached(`${CACHE.announcements}:active`, 30, async () => {
      const res = await payload.find({ collection: 'announcements', where: { isActive: { equals: true } }, sort: '-isPinned', limit: 20, depth: 0, overrideAccess: true })
      return res.docs.map((a) => ({ id: a.id, title: a.title, body: a.body, severity: a.severity, isPinned: a.isPinned }))
    }),
    getSettings(payload),
  ])

  if (settings.features.maintenanceMode) {
    return ok({ maintenance: true, message: settings.features.maintenanceMessage, site: settings.site }, 200)
  }

  const [tasks, games, campaigns] = await Promise.all([
    payload.find({ collection: 'tasks', where: { isActive: { equals: true }, status: { equals: 'ACTIVE' }, featured: { equals: true } }, limit: 6, depth: 0, overrideAccess: true, req }),
    payload.find({ collection: 'games', where: { status: { equals: 'ACTIVE' }, featured: { equals: true } }, limit: 6, depth: 1, overrideAccess: true, req }),
    payload.find({ collection: 'campaigns', where: { status: { equals: 'ACTIVE' }, featured: { equals: true } }, limit: 6, depth: 0, overrideAccess: true, req }),
  ])

  return ok({
    maintenance: false,
    site: settings.site,
    banners,
    announcements,
    featuredTasks: tasks.docs.map((t) => ({ id: t.id, title: t.title, rewardAmount: t.rewardAmount, icon: typeof t.icon === 'object' ? t.icon?.url : null })),
    featuredGames: games.docs.map((g) => ({ id: g.id, name: g.name, type: g.type, reward: g.reward, icon: typeof g.icon === 'object' ? g.icon?.url : null, thumbnail: typeof g.thumbnail === 'object' ? g.thumbnail?.url : null, })),
    featuredCampaigns: campaigns.docs.map((c) => ({ id: c.id, name: c.name, rewardAmount: c.rewardAmount, banner: typeof c.banner === 'object' ? c.banner?.url : null })),
  })
}, { requireAuth: false })
