import type { Payload, PayloadRequest } from 'payload'
import { randomUUID } from 'node:crypto'
import { OPEN_WITHDRAWAL_STATUSES, type WithdrawalStatus } from '@/constants'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { encrypt } from '@/lib/crypto'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { dayBounds } from '@/lib/time'
import type { PayoutMethod, User, Withdrawal } from '@/payload-types'
import { debitForWithdrawal, refundWithdrawal, settleWithdrawal } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'
import { getSettings } from './settings'

const walletLockKeyFor = (userId: number) => `wallet:${userId}`

const ALLOWED_TRANSITIONS: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  REJECTED: [],
  FAILED: [],
  CANCELLED: [],
}

export interface RequestWithdrawalInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  amount: number
  payoutMethodId: number
}

export async function requestWithdrawal(i: RequestWithdrawalInput): Promise<Withdrawal> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.withdrawal, `${user.id}`)
  const settings = await getSettings(payload)
  if (!settings.features.withdrawalsEnabled) throw new AppError('FEATURE_DISABLED', 'Withdrawals are temporarily disabled.')
  if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_RESTRICTED', 'Your account cannot withdraw right now.')
  if (i.amount < settings.reward.minimumWithdrawal) throw new AppError('BAD_REQUEST', `Minimum withdrawal is set by the platform.`, { details: { minimum: settings.reward.minimumWithdrawal } })
  if (i.amount > settings.reward.maximumWithdrawal) throw new AppError('BAD_REQUEST', `Amount exceeds the maximum allowed withdrawal.`, { details: { maximum: settings.reward.maximumWithdrawal } })

  const method = await payload.findByID({ collection: 'payout-methods', id: i.payoutMethodId, depth: 0, overrideAccess: true, req: i.req as PayloadRequest | undefined }).catch(() => null)
  const methodOwner = method && (typeof method.user === 'object' ? method.user.id : method.user)
  if (!method || methodOwner !== user.id || method.status !== 'ACTIVE') throw new AppError('BAD_REQUEST', 'Choose a valid payout method.')

  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, walletLockKeyFor(user.id))

    const open = await payload.count({ collection: 'withdrawals', where: { user: { equals: user.id }, status: { in: [...OPEN_WITHDRAWAL_STATUSES] } }, overrideAccess: true, req: r })
    if (open.totalDocs >= settings.reward.maxOpenWithdrawals) throw new AppError('LIMIT_REACHED', 'You already have a withdrawal in progress.')

    const { start, end } = dayBounds(new Date(), settings.site.defaultTimezone)
    const today = await payload.find({ collection: 'withdrawals', where: { user: { equals: user.id }, createdAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() }, status: { not_in: ['REJECTED', 'CANCELLED'] } }, limit: 500, depth: 0, overrideAccess: true, req: r })
    const todayTotal = today.docs.reduce((s, w) => s + w.amount, 0)
    if (todayTotal + i.amount > settings.reward.dailyWithdrawalLimit) throw new AppError('LIMIT_REACHED', 'This would exceed your daily withdrawal limit.')

    const wallet = await payload.find({ collection: 'wallets', where: { user: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    const w = wallet.docs[0]
    if (!w || (w.availableBalance ?? 0) < i.amount) throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient balance for this withdrawal.')

    const idempotencyKey = randomUUID()
    const withdrawal = await withFlag(r, 'serviceWrite', () =>
      payload.create({
        collection: 'withdrawals',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: {
          user: user.id,
          wallet: w.id,
          amount: i.amount,
          currency: w.currency ?? 'INR',
          method: method.type,
          payoutMethod: method.id,
          payoutSummary: method.maskedDetails,
          payoutDetailsEncrypted: encrypt(JSON.stringify({ method: method.type, maskedDetails: method.maskedDetails, ifsc: method.ifsc, bankName: method.bankName })),
          status: 'PENDING',
          requestedAt: new Date().toISOString(),
          idempotencyKey,
        } as never,
      }),
    )
    const debit = await debitForWithdrawal({ payload, req: r, userId: user.id, amount: i.amount, withdrawalId: withdrawal.id, idempotencyKey: `withdrawal-hold:${withdrawal.id}` })
    const updated = await withFlag(r, 'serviceWrite', () =>
      payload.update({ collection: 'withdrawals', id: withdrawal.id, overrideAccess: true, depth: 0, req: r, data: { debitTransaction: debit.transaction.id } }),
    )
    await logAudit({ payload, req: r, action: 'WITHDRAWAL_REQUESTED', collection: 'withdrawals', documentId: withdrawal.id, after: { amount: i.amount, method: method.type } })
    await notify({ payload, req: r, userId: user.id, type: 'WITHDRAWAL_REQUESTED', title: 'Withdrawal requested', body: 'Your withdrawal request has been received and is under review.', dedupeKey: `withdrawal:${withdrawal.id}:requested` })
    return updated
  })
}

/** Runs inside the Withdrawals collection beforeChange hook: validates the transition and stamps timestamps. */
export async function prepareStatusChange(i: { data: Record<string, unknown>; originalDoc: Withdrawal; adminId: number }) {
  const from = i.originalDoc.status as WithdrawalStatus
  const to = (i.data.status as WithdrawalStatus) ?? from
  if (to === from) return i.data
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) throw new AppError('INVALID_STATE', `Cannot move a withdrawal from ${from} to ${to}.`)
  if ((to === 'REJECTED' || to === 'FAILED') && !i.data.failureReason && !i.originalDoc.failureReason) throw new AppError('BAD_REQUEST', 'Add a reason before rejecting or failing a withdrawal.')
  if (to === 'COMPLETED' && !i.data.transactionReference && !i.originalDoc.transactionReference) throw new AppError('BAD_REQUEST', 'Add the payout reference (bank UTR) before marking as completed.')

  const now = new Date().toISOString()
  i.data.reviewedBy = i.adminId
  if (to === 'UNDER_REVIEW' || to === 'APPROVED') i.data.reviewedAt = now
  if (to === 'PROCESSING') i.data.processedAt = now
  if (to === 'COMPLETED') i.data.completedAt = now
  if (to === 'REJECTED') i.data.rejectedAt = now
  if (to === 'FAILED') i.data.failedAt = now
  if (to === 'CANCELLED') i.data.cancelledAt = now
  return i.data
}

/** Runs inside the Withdrawals collection afterChange hook once the status actually changed. */
export async function applyStatusEffects(i: { payload: Payload; req?: Partial<PayloadRequest>; withdrawal: Withdrawal; from: WithdrawalStatus }) {
  const { payload, withdrawal } = i
  const to = withdrawal.status as WithdrawalStatus
  const userId = typeof withdrawal.user === 'object' ? withdrawal.user.id : withdrawal.user

  if (['REJECTED', 'FAILED', 'CANCELLED'].includes(to)) {
    const refund = await refundWithdrawal({ payload, req: i.req, userId, amount: withdrawal.amount, withdrawalId: withdrawal.id, reason: withdrawal.failureReason || to.toLowerCase(), idempotencyKey: `withdrawal-refund:${withdrawal.id}` })
    await withFlag(i.req ?? {}, 'serviceWrite', () =>
      payload.update({ collection: 'withdrawals', id: withdrawal.id, overrideAccess: true, depth: 0, req: i.req as PayloadRequest | undefined, data: { refundTransaction: refund.transaction.id } }),
    )
  } else if (to === 'COMPLETED') {
    await settleWithdrawal({ payload, req: i.req, userId, amount: withdrawal.amount })
    const { getPayoutProvider } = await import('./payout')
    void getPayoutProvider() // provider hook point for real integrations; manual mode just records the reference already entered by staff
  } else if (to === 'PROCESSING') {
    const method = typeof withdrawal.payoutMethod === 'object' ? withdrawal.payoutMethod : null
    const { getPayoutProvider } = await import('./payout')
    const provider = getPayoutProvider()
    try {
      await provider.payout({
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        destination: { method: withdrawal.method as 'UPI' | 'BANK', upiId: method?.type === 'UPI' ? method.maskedDetails : undefined, accountNumber: method?.type === 'BANK' ? method.maskedDetails : undefined, ifsc: method?.ifsc ?? undefined, holderName: method?.holderName ?? undefined, bankName: method?.bankName ?? undefined },
      })
    } catch (err) {
      console.error('[withdrawal] payout provider error:', (err as Error).message)
    }
  }

  const actionMap: Record<string, string> = {
    UNDER_REVIEW: 'WITHDRAWAL_STATUS_CHANGED',
    APPROVED: 'WITHDRAWAL_APPROVED',
    PROCESSING: 'WITHDRAWAL_STATUS_CHANGED',
    COMPLETED: 'WITHDRAWAL_COMPLETED',
    REJECTED: 'WITHDRAWAL_REJECTED',
    FAILED: 'WITHDRAWAL_FAILED',
    CANCELLED: 'WITHDRAWAL_CANCELLED',
  }
  await logAudit({ payload, req: i.req, action: (actionMap[to] ?? 'WITHDRAWAL_STATUS_CHANGED') as never, collection: 'withdrawals', documentId: withdrawal.id, after: { from: i.from, to } })

  const notifTypeMap: Record<string, string> = { APPROVED: 'WITHDRAWAL_APPROVED', REJECTED: 'WITHDRAWAL_REJECTED', COMPLETED: 'WITHDRAWAL_COMPLETED' }
  const notifType = notifTypeMap[to]
  if (notifType) {
    await notify({
      payload,
      req: i.req,
      userId,
      type: notifType as never,
      title: to === 'COMPLETED' ? 'Withdrawal completed' : to === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal update',
      body:
        to === 'COMPLETED'
          ? 'Your withdrawal has been paid out.'
          : to === 'APPROVED'
            ? 'Your withdrawal was approved and is being processed.'
            : `Your withdrawal was ${to.toLowerCase()}.${withdrawal.failureReason ? ` Reason: ${withdrawal.failureReason}` : ''}`,
      dedupeKey: `withdrawal:${withdrawal.id}:${to}`,
    })
  }
}

/** Cancels a withdrawal on behalf of the user, while it is still PENDING. */
export async function cancelWithdrawal(payload: Payload, req: Partial<PayloadRequest> | undefined, user: User, withdrawalId: number) {
  const withdrawal = await payload.findByID({ collection: 'withdrawals', id: withdrawalId, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  const owner = withdrawal && (typeof withdrawal.user === 'object' ? withdrawal.user.id : withdrawal.user)
  if (!withdrawal || owner !== user.id) throw new AppError('NOT_FOUND', 'Withdrawal not found.')
  if (withdrawal.status !== 'PENDING') throw new AppError('INVALID_STATE', 'Only a pending withdrawal can be cancelled.')
  return withFlag(req ?? {}, 'serviceWrite', () =>
    payload.update({ collection: 'withdrawals', id: withdrawalId, overrideAccess: true, depth: 0, req: req as PayloadRequest | undefined, data: { status: 'CANCELLED', cancelledAt: new Date().toISOString() } }),
  )
}

export function summarizeUpi(upi: PayoutMethod) {
  return upi.maskedDetails
}
