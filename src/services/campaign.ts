import type { Payload, PayloadRequest } from 'payload'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { Campaign, User } from '@/payload-types'
import { assertEligible } from './eligibility'
import { creditWallet } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'

const campaignLockKey = (userId: number, campaignId: number) => `campaign:${userId}:${campaignId}`

export interface ActionProgress {
  type: string
  target: number
  current: number
  met: boolean
  label?: string
}

async function loadActiveCampaign(payload: Payload, id: number, req?: Partial<PayloadRequest>): Promise<Campaign> {
  const campaign = await payload.findByID({ collection: 'campaigns', id, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  if (!campaign || campaign.status !== 'ACTIVE') throw new AppError('NOT_AVAILABLE', 'This campaign is not currently active.')
  const now = new Date()
  if (campaign.startsAt && now < new Date(campaign.startsAt)) throw new AppError('NOT_AVAILABLE', 'This campaign has not started yet.')
  if (campaign.endsAt && now >= new Date(campaign.endsAt)) throw new AppError('NOT_AVAILABLE', 'This campaign has ended.')
  return campaign
}

/** Computes progress toward each required action, counted from the campaign's start (or creation if no start set). */
export async function computeCampaignProgress(payload: Payload, req: Partial<PayloadRequest> | undefined, campaign: Campaign, userId: number): Promise<ActionProgress[]> {
  const since = campaign.startsAt ?? campaign.createdAt
  const out: ActionProgress[] = []
  for (const action of campaign.requiredActions ?? []) {
    let current = 0
    const opts = { overrideAccess: true, req: req as PayloadRequest | undefined } as const
    switch (action.type) {
      case 'TASKS_COMPLETED': {
        const r = await payload.count({ collection: 'task-completions', where: { user: { equals: userId }, status: { equals: 'COMPLETED' }, completedAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'GAMES_PLAYED': {
        const r = await payload.count({ collection: 'game-sessions', where: { user: { equals: userId }, status: { equals: 'COMPLETED' }, createdAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'GAMES_WON': {
        const r = await payload.count({ collection: 'game-sessions', where: { user: { equals: userId }, result: { equals: 'WIN' }, createdAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'REFERRALS_QUALIFIED': {
        const r = await payload.count({ collection: 'referrals', where: { referrer: { equals: userId }, status: { in: ['QUALIFIED', 'REWARDED'] }, qualifiedAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'AMOUNT_EARNED': {
        const r = await payload.find({ collection: 'wallet-transactions', where: { user: { equals: userId }, createdAt: { greater_than_equal: since }, amount: { greater_than: 0 } }, limit: 1000, depth: 0, ...opts })
        current = r.docs.reduce((s, t) => s + Math.max(0, t.amount), 0)
        break
      }
      case 'SPECIFIC_TASK': {
        const taskId = typeof action.task === 'object' ? action.task?.id : action.task
        const r = await payload.count({ collection: 'task-completions', where: { user: { equals: userId }, task: { equals: taskId }, status: { equals: 'COMPLETED' }, completedAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
      case 'SPECIFIC_GAME': {
        const gameId = typeof action.game === 'object' ? action.game?.id : action.game
        const r = await payload.count({ collection: 'game-sessions', where: { user: { equals: userId }, game: { equals: gameId }, status: { equals: 'COMPLETED' }, createdAt: { greater_than_equal: since } }, ...opts })
        current = r.totalDocs
        break
      }
    }
    out.push({ type: action.type, target: action.target, current, met: current >= action.target, label: action.label ?? undefined })
  }
  return out
}

export interface ClaimCampaignInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  campaignId: number
}

export async function claimCampaign(i: ClaimCampaignInput) {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.campaignClaim, `${user.id}`)
  const campaign = await loadActiveCampaign(payload, i.campaignId, i.req)
  await assertEligible(payload, i.req, user, campaign.eligibility)

  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, campaignLockKey(user.id, campaign.id))

    const mine = await payload.count({ collection: 'campaign-claims', where: { campaign: { equals: campaign.id }, user: { equals: user.id } }, overrideAccess: true, req: r })
    if (campaign.perUserLimit && mine.totalDocs >= campaign.perUserLimit) throw new AppError('LIMIT_REACHED', "You've already claimed this campaign.")

    if (campaign.userLimit) {
      const distinctUsers = await payload.find({ collection: 'campaign-claims', where: { campaign: { equals: campaign.id } }, limit: 0, depth: 0, overrideAccess: true, req: r })
      const uniqueUsers = new Set(distinctUsers.docs.map((c) => (typeof c.user === 'object' ? c.user.id : c.user)))
      if (!uniqueUsers.has(user.id) && uniqueUsers.size >= campaign.userLimit) throw new AppError('NOT_AVAILABLE', 'This campaign has reached its participant limit.')
    }
    if (campaign.globalLimit) {
      const total = await payload.count({ collection: 'campaign-claims', where: { campaign: { equals: campaign.id } }, overrideAccess: true, req: r })
      if (total.totalDocs >= campaign.globalLimit) throw new AppError('NOT_AVAILABLE', 'This campaign has reached its claim limit.')
    }

    const progress = await computeCampaignProgress(payload, r, campaign, user.id)
    if (progress.some((p) => !p.met)) throw new AppError('NOT_ELIGIBLE', 'Complete all the required actions before claiming.')

    const posted = await creditWallet({
      payload,
      req: r,
      userId: user.id,
      type: 'CAMPAIGN_REWARD',
      amount: campaign.rewardAmount,
      description: `Campaign reward — ${campaign.name}`,
      idempotencyKey: `campaign-claim:${campaign.id}:${user.id}:${mine.totalDocs + 1}`,
      referenceType: 'campaign',
      referenceId: campaign.id,
    })
    const claim = await withFlag(r, 'serviceWrite', () =>
      payload.create({
        collection: 'campaign-claims',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { campaign: campaign.id, user: user.id, claimNumber: mine.totalDocs + 1, rewardAmount: campaign.rewardAmount, transaction: posted.transaction.id, claimedAt: new Date().toISOString(), progress: progress as never },
      }),
    )
    await logAudit({ payload, req: r, action: 'REWARD_CREDITED', collection: 'campaign-claims', documentId: claim.id, after: { campaignId: campaign.id, amount: campaign.rewardAmount } })
    await notify({ payload, req: r, userId: user.id, type: 'REWARD_CREDITED', title: 'Campaign reward claimed', body: `You earned a reward from "${campaign.name}".`, dedupeKey: `campaign-claim:${claim.id}:notif` })
    const { checkReferralQualification } = await import('./referral')
    await checkReferralQualification(payload, r, user.id, 'EARNED')
    return claim
  })
}
