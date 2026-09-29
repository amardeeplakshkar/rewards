import { withApi, ok } from '@/lib/api/handler'
import { computeCampaignProgress } from '@/services/campaign'
import { getSettings } from '@/services/settings'
import { AppError } from '@/lib/errors'

export const GET = withApi(async ({ payload, req, user }) => {
  const settings = await getSettings(payload)
  if (!settings.features.campaignsEnabled) throw new AppError('FEATURE_DISABLED', 'Campaigns are temporarily unavailable.')
  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'campaigns',
    where: { status: { equals: 'ACTIVE' }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] },
    sort: '-featured',
    limit: 100,
    depth: 1,
    overrideAccess: true,
    req,
  })
  const campaigns = res.docs.filter((c) => !c.endsAt || new Date(c.endsAt) > new Date())
  const claimedDocs = user
    ? await payload.find({ collection: 'campaign-claims', where: { user: { equals: user.id } }, limit: 500, depth: 0, overrideAccess: true, req })
    : { docs: [] as { campaign: number | { id: number } }[] }
  const claimedCampaignIds = new Set(
    claimedDocs.docs.map((c) => (typeof c.campaign === 'object' ? c.campaign.id : c.campaign)),
  )
  const withProgress = await Promise.all(
    campaigns.map(async (c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      rewardAmount: c.rewardAmount,
      banner: typeof c.banner === 'object' ? c.banner?.url : null,
      requiredActions: c.requiredActions,
      progress: user ? await computeCampaignProgress(payload, req, c, user.id) : null,
      claimed: claimedCampaignIds.has(c.id),
    })),
  )
  return ok({ campaigns: withProgress })
}, { requireAuth: false })
