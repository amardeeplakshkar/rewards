import { withApi, ok } from '@/lib/api/handler'
import { getSettings } from '@/services/settings'
import { AppError } from '@/lib/errors'

export const GET = withApi(async ({ payload, req, user }) => {
  const settings = await getSettings(payload)
  if (!settings.features.referralsEnabled) throw new AppError('FEATURE_DISABLED', 'Referrals are temporarily unavailable.')
  const res = await payload.find({ collection: 'referrals', where: { referrer: { equals: user!.id } }, sort: '-createdAt', limit: 100, depth: 0, overrideAccess: true, req })
  const rewarded = res.docs.filter((r) => r.status === 'REWARDED')
  return ok({
    referralCode: user!.referralCode,
    shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${user!.referralCode}`,
    totalReferred: res.totalDocs,
    totalRewarded: rewarded.length,
    totalEarned: rewarded.reduce((s, r) => s + (r.referrerReward ?? 0), 0),
    referrals: res.docs.map((r) => ({ id: r.id, status: r.status, registeredAt: r.registeredAt, rewardedAt: r.rewardedAt, referrerReward: r.referrerReward })),
  })
})
