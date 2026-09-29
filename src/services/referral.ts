import type { Payload, PayloadRequest } from 'payload'
import { AppError } from '@/lib/errors'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import type { Referral, ReferralRule, User } from '@/payload-types'
import { creditWallet } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'

const referralLockKey = (userId: number) => `referral:${userId}`

/** Picks the highest-priority active Referral rule at `now`, or null (defaults from Reward settings apply). */
async function resolveActiveRule(payload: Payload, now: Date, req?: Partial<PayloadRequest>): Promise<ReferralRule | null> {
  const res = await payload.find({
    collection: 'referral-rules',
    where: { isActive: { equals: true }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now.toISOString() } }] },
    sort: '-priority',
    limit: 50,
    depth: 0,
    overrideAccess: true,
    req: req as PayloadRequest | undefined,
  })
  const usable = res.docs.filter((r) => !r.endsAt || new Date(r.endsAt) > now)
  return usable[0] ?? null
}

export interface BindReferralInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  newUser: User
  code: string
}

/** Called during registration. Creates a PENDING Referral row bound to whichever rule is active right now. */
export async function bindReferral(i: BindReferralInput): Promise<Referral | null> {
  const { payload, newUser } = i
  const code = i.code.trim().toUpperCase()
  const referrer = await payload.find({ collection: 'users', where: { referralCode: { equals: code } }, limit: 1, depth: 0, overrideAccess: true })
  const referrerUser = referrer.docs[0]
  if (!referrerUser) return null
  if (referrerUser.id === newUser.id) return null

  const now = new Date()
  const rule = await resolveActiveRule(payload, now, i.req)
  const { getSettings } = await import('./settings')
  const settings = await getSettings(payload)

  const referrerReward = rule?.referrerReward ?? settings.reward.defaultReferralReward
  const refereeReward = rule?.refereeReward ?? 0
  const qualification = rule?.qualification ?? settings.reward.defaultReferralQualification
  const qualificationAmount = rule?.qualificationAmount ?? settings.reward.defaultReferralQualificationAmount
  const perReferrerLimit = rule?.perReferrerLimit ?? settings.reward.defaultReferralPerReferrerLimit

  if (perReferrerLimit && perReferrerLimit > 0) {
    const count = await payload.count({ collection: 'referrals', where: { referrer: { equals: referrerUser.id }, status: { not_equals: 'REJECTED' } }, overrideAccess: true })
    if (count.totalDocs >= perReferrerLimit) throw new AppError('LIMIT_REACHED', 'This referral code has reached its limit.')
  }
  if (rule?.globalLimit && rule.globalLimit > 0) {
    const count = await payload.count({ collection: 'referrals', where: { rule: { equals: rule.id }, status: { not_equals: 'REJECTED' } }, overrideAccess: true })
    if (count.totalDocs >= rule.globalLimit) throw new AppError('LIMIT_REACHED', 'This referral promotion has reached its limit.')
  }

  return withFlag(i.req ?? {}, 'serviceWrite', () =>
    payload.create({
      collection: 'referrals',
      overrideAccess: true,
      depth: 0,
      req: i.req as PayloadRequest | undefined,
      data: {
        referrer: referrerUser.id,
        referredUser: newUser.id,
        code,
        status: 'PENDING',
        rule: rule?.id,
        terms: { referrerReward, refereeReward, qualification, qualificationAmount } as never,
        registeredAt: now.toISOString(),
        referrerReward,
        refereeReward,
      },
    }),
  )
}

async function payOutReferral(payload: Payload, req: Partial<PayloadRequest> | undefined, referral: Referral) {
  const referrerId = typeof referral.referrer === 'object' ? referral.referrer.id : referral.referrer
  const referredId = typeof referral.referredUser === 'object' ? referral.referredUser.id : referral.referredUser
  const terms = (referral.terms ?? {}) as { referrerReward?: number; refereeReward?: number }
  const referrerReward = referral.referrerReward ?? terms.referrerReward ?? 0
  const refereeReward = referral.refereeReward ?? terms.refereeReward ?? 0

  return withTransaction(payload, req, async (r) => {
    await advisoryXactLock(payload, r, referralLockKey(referral.id))
    const fresh = await payload.findByID({ collection: 'referrals', id: referral.id, depth: 0, overrideAccess: true, req: r })
    if (fresh.status === 'REWARDED') return fresh
    if (fresh.status === 'REJECTED') return fresh

    let referrerTx: number | undefined
    let refereeTx: number | undefined
    if (referrerReward > 0) {
      const posted = await creditWallet({ payload, req: r, userId: referrerId, type: 'REFERRAL_REWARD', amount: referrerReward, description: 'Referral reward', idempotencyKey: `referral:${referral.id}:referrer` })
      referrerTx = posted.transaction.id
    }
    if (refereeReward > 0) {
      const posted = await creditWallet({ payload, req: r, userId: referredId, type: 'REFERRAL_REWARD', amount: refereeReward, description: 'Welcome bonus', idempotencyKey: `referral:${referral.id}:referee` })
      refereeTx = posted.transaction.id
    }

    const updated = await withFlag(r, 'serviceWrite', () =>
      payload.update({
        collection: 'referrals',
        id: referral.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { status: 'REWARDED', rewardedAt: new Date().toISOString(), referrerTransaction: referrerTx, refereeTransaction: refereeTx },
      }),
    )
    await logAudit({ payload, req: r, action: 'REWARD_CREDITED', collection: 'referrals', documentId: referral.id, after: { referrerReward, refereeReward } })
    await notify({ payload, req: r, userId: referrerId, type: 'REFERRAL_REWARDED', title: 'Referral reward credited', body: `You earned a referral reward.`, dedupeKey: `referral:${referral.id}:referrer:notif` })
    return updated
  })
}

/**
 * Call whenever a referred user's status might newly satisfy their bound referral's qualification rule:
 * after registration (REGISTRATION), after email verification (VERIFIED_ACCOUNT), after their first
 * completed task/game (FIRST_TASK/FIRST_GAME), or after any wallet credit (AMOUNT_EARNED).
 */
export async function checkReferralQualification(payload: Payload, req: Partial<PayloadRequest> | undefined, referredUserId: number, event: 'REGISTRATION' | 'VERIFIED_ACCOUNT' | 'TASK_COMPLETED' | 'GAME_COMPLETED' | 'EARNED') {
  const found = await payload.find({ collection: 'referrals', where: { referredUser: { equals: referredUserId }, status: { equals: 'PENDING' } }, limit: 1, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined })
  const referral = found.docs[0]
  if (!referral) return
  const terms = (referral.terms ?? {}) as { qualification?: string; qualificationAmount?: number }
  const qualification = terms.qualification ?? 'FIRST_TASK'

  const satisfied =
    (qualification === 'REGISTRATION' && event === 'REGISTRATION') ||
    (qualification === 'VERIFIED_ACCOUNT' && event === 'VERIFIED_ACCOUNT') ||
    (qualification === 'FIRST_TASK' && event === 'TASK_COMPLETED') ||
    (qualification === 'FIRST_GAME' && event === 'GAME_COMPLETED') ||
    (qualification === 'AMOUNT_EARNED' && event === 'EARNED' && (await lifetimeEarnedAtLeast(payload, referredUserId, terms.qualificationAmount ?? 0)))
  if (!satisfied) return

  await withFlag(req ?? {}, 'serviceWrite', () =>
    payload.update({ collection: 'referrals', id: referral.id, overrideAccess: true, depth: 0, req: req as PayloadRequest | undefined, data: { status: 'QUALIFIED', qualifiedAt: new Date().toISOString() } }),
  )
  await payOutReferral(payload, req, referral)
}

async function lifetimeEarnedAtLeast(payload: Payload, userId: number, amount: number): Promise<boolean> {
  if (amount <= 0) return true
  const wallet = await payload.find({ collection: 'wallets', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true })
  return (wallet.docs[0]?.lifetimeEarned ?? 0) >= amount
}
