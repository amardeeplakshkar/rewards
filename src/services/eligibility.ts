import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { AppError } from '@/lib/errors'

export interface EligibilityRule {
  minAccountAgeDays?: number | null
  requireVerifiedAccount?: boolean | null
  requirePayoutMethod?: boolean | null
  minLifetimeEarned?: number | null
}

/** Shared eligibility checks used by Tasks and Campaigns. Throws AppError with a user-facing reason. */
export async function assertEligible(payload: Payload, req: Partial<PayloadRequest> | undefined, user: User, rule?: EligibilityRule | null) {
  const wasPendingVerification: boolean = user.status === 'PENDING_VERIFICATION'
  if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_RESTRICTED', 'Your account is not able to earn right now.')
  if (!rule) return
  if (rule.minAccountAgeDays) {
    const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000
    if (ageDays < rule.minAccountAgeDays) throw new AppError('NOT_ELIGIBLE', `Available once your account is ${rule.minAccountAgeDays} days old.`)
  }
  if (rule.requireVerifiedAccount && wasPendingVerification) throw new AppError('NOT_ELIGIBLE', 'Verify your email to unlock this.')
  if (rule.requirePayoutMethod) {
    const pm = await payload.count({ collection: 'payout-methods', where: { user: { equals: user.id }, status: { equals: 'ACTIVE' } }, overrideAccess: true, req: req as PayloadRequest | undefined })
    if (pm.totalDocs === 0) throw new AppError('NOT_ELIGIBLE', 'Add a payout method first.')
  }
  if (rule.minLifetimeEarned) {
    const wallet = await payload.find({ collection: 'wallets', where: { user: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined })
    if ((wallet.docs[0]?.lifetimeEarned ?? 0) < rule.minLifetimeEarned) throw new AppError('NOT_ELIGIBLE', 'You have not earned enough to unlock this yet.')
  }
}
