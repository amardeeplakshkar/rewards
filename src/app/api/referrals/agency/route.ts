import { withApi, ok } from '@/lib/api/handler'
import { AppError } from '@/lib/errors'
import { getSettings } from '@/services/settings'
import { getAgencyStats } from '@/services/agency'

export const GET = withApi(async ({ payload, req, user }) => {
  const settings = await getSettings(payload)
  if (!settings.features.referralsEnabled) throw new AppError('FEATURE_DISABLED', 'Referrals are temporarily unavailable.')
  const stats = await getAgencyStats(payload, user!.id, req)
  const recent = await payload.find({ collection: 'referrals', where: { referrer: { equals: user!.id } }, sort: '-registeredAt', limit: 20, depth: 0, overrideAccess: true, req })
  return ok({
    referralCode: user!.referralCode,
    shareUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/register?ref=${user!.referralCode}`,
    ...stats,
    recent: recent.docs.map((r) => ({ id: r.id, status: r.status, registeredAt: r.registeredAt, referrerReward: r.referrerReward ?? 0 })),
  })
})
