import type { Payload, PayloadRequest } from 'payload'
import { CREDIT_EARNING_TYPES, DEFAULT_CURRENCY, type TransactionType } from '@/constants'
import type { Wallet, WalletAdjustment, WalletTransaction } from '@/payload-types'
import { advisoryXactLock, rawQuery, sql, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { assertPositiveMinor } from '@/lib/money'
import { logAudit } from './audit'
import { withFlag } from './context'
import { notify } from './notification'

export type Req = Partial<PayloadRequest> | undefined

const walletLockKey = (userId: number | string) => `wallet:${userId}`

/** Finds or creates the user's wallet. Serialised with an advisory lock, so concurrent callers can't double-create. */
export async function ensureWallet(payload: Payload, userId: number, req?: Req): Promise<Wallet> {
  return withTransaction(payload, req, async (r) => {
    await advisoryXactLock(payload, r, walletLockKey(userId))
    const found = await payload.find({ collection: 'wallets', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (found.docs[0]) return found.docs[0]
    return withFlag(r, 'walletWrite', () =>
      payload.create({
        collection: 'wallets',
        data: { user: userId, currency: DEFAULT_CURRENCY, availableBalance: 0, pendingBalance: 0, lifetimeEarned: 0, lifetimeWithdrawn: 0, status: 'ACTIVE' },
        depth: 0,
        overrideAccess: true,
        req: r,
      }),
    )
  })
}

export async function getWallet(payload: Payload, userId: number): Promise<Wallet> {
  const found = await payload.find({ collection: 'wallets', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true })
  return found.docs[0] ?? (await ensureWallet(payload, userId))
}

interface PostEntry {
  payload: Payload
  req?: Req
  userId: number
  type: TransactionType
  /** Signed movement of availableBalance (never 0). */
  signedAmount: number
  earnedDelta?: number
  pendingDelta?: number
  description: string
  idempotencyKey: string
  referenceType?: string
  referenceId?: string | number
  metadata?: Record<string, unknown>
  reversalOf?: number
  /** Allow the entry even when the wallet is frozen (refunds, staff corrections). */
  ignoreFrozen?: boolean
}

export interface PostedEntry {
  transaction: WalletTransaction
  wallet: Wallet
  duplicate: boolean
}

/**
 * The single place where balances change. In ONE database transaction it:
 *   1. takes a per-wallet advisory lock (serialises concurrent balance changes),
 *   2. returns the existing row when the idempotency key was already used (safe retries),
 *   3. validates the new balances (never negative),
 *   4. appends an immutable ledger row and updates the wallet.
 */
export async function postEntry(e: PostEntry): Promise<PostedEntry> {
  const { payload } = e
  if (!Number.isSafeInteger(e.signedAmount) || e.signedAmount === 0) throw new AppError('BAD_REQUEST', 'Invalid ledger amount')

  return withTransaction(payload, e.req, async (r) => {
    await advisoryXactLock(payload, r, walletLockKey(e.userId))

    const existing = await payload.find({ collection: 'wallet-transactions', where: { idempotencyKey: { equals: e.idempotencyKey } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (existing.docs[0]) {
      const tx = existing.docs[0]
      const owner = typeof tx.user === 'object' ? tx.user.id : tx.user
      if (owner !== e.userId || tx.type !== e.type || tx.amount !== e.signedAmount) {
        throw new AppError('CONFLICT', 'This request key was already used for a different operation.')
      }
      const wallet = await getWalletTx(payload, e.userId, r)
      return { transaction: tx, wallet, duplicate: true }
    }

    const wallet = await getWalletTx(payload, e.userId, r)
    if (wallet.status === 'FROZEN' && !e.ignoreFrozen) throw new AppError('ACCOUNT_RESTRICTED', 'This wallet is temporarily frozen. Please contact support.')

    const before = wallet.availableBalance ?? 0
    const after = before + e.signedAmount
    if (after < 0) throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient balance.')
    const pending = (wallet.pendingBalance ?? 0) + (e.pendingDelta ?? 0)
    const earned = (wallet.lifetimeEarned ?? 0) + (e.earnedDelta ?? 0)
    if (pending < 0 || earned < 0) throw new AppError('INVALID_STATE', 'Wallet counters would become negative.')

    const transaction = await withFlag(r, 'ledgerWrite', () =>
      payload.create({
        collection: 'wallet-transactions',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: {
          user: e.userId,
          wallet: wallet.id,
          type: e.type,
          amount: e.signedAmount,
          balanceBefore: before,
          balanceAfter: after,
          currency: wallet.currency ?? DEFAULT_CURRENCY,
          referenceType: e.referenceType,
          referenceId: e.referenceId != null ? String(e.referenceId) : undefined,
          description: e.description,
          status: 'COMPLETED',
          idempotencyKey: e.idempotencyKey,
          reversalOf: e.reversalOf,
          metadata: (e.metadata ?? null) as never,
        },
      }),
    )

    const updated = await withFlag(r, 'walletWrite', () =>
      payload.update({
        collection: 'wallets',
        id: wallet.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { availableBalance: after, pendingBalance: pending, lifetimeEarned: earned },
      }),
    )
    return { transaction, wallet: updated, duplicate: false }
  })
}

async function getWalletTx(payload: Payload, userId: number, r: PayloadRequest): Promise<Wallet> {
  const found = await payload.find({ collection: 'wallets', where: { user: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true, req: r })
  if (found.docs[0]) return found.docs[0]
  return ensureWallet(payload, userId, r)
}

type CreditType = Extract<TransactionType, 'TASK_REWARD' | 'GAME_REWARD' | 'CAMPAIGN_REWARD' | 'REFERRAL_REWARD' | 'BONUS' | 'ADMIN_CREDIT'>

export interface CreditInput {
  payload: Payload
  req?: Req
  userId: number
  type: CreditType
  amount: number
  description: string
  idempotencyKey: string
  referenceType?: string
  referenceId?: string | number
  metadata?: Record<string, unknown>
}

export function creditWallet(i: CreditInput): Promise<PostedEntry> {
  assertPositiveMinor(i.amount)
  return postEntry({ ...i, signedAmount: i.amount, earnedDelta: i.amount })
}

export function debitWallet(i: {
  payload: Payload
  req?: Req
  userId: number
  amount: number
  description: string
  idempotencyKey: string
  referenceType?: string
  referenceId?: string | number
  metadata?: Record<string, unknown>
  ignoreFrozen?: boolean
}): Promise<PostedEntry> {
  assertPositiveMinor(i.amount)
  return postEntry({
    payload: i.payload,
    req: i.req,
    userId: i.userId,
    type: 'ADMIN_DEBIT',
    signedAmount: -i.amount,
    description: i.description,
    idempotencyKey: i.idempotencyKey,
    referenceType: i.referenceType,
    referenceId: i.referenceId,
    metadata: i.metadata,
    ignoreFrozen: i.ignoreFrozen,
  })
}

export function debitForWithdrawal(i: { payload: Payload; req?: Req; userId: number; amount: number; withdrawalId: number; idempotencyKey: string }) {
  assertPositiveMinor(i.amount)
  return postEntry({
    payload: i.payload,
    req: i.req,
    userId: i.userId,
    type: 'WITHDRAWAL',
    signedAmount: -i.amount,
    pendingDelta: i.amount,
    description: 'Withdrawal request',
    idempotencyKey: i.idempotencyKey,
    referenceType: 'withdrawal',
    referenceId: i.withdrawalId,
  })
}

export function refundWithdrawal(i: { payload: Payload; req?: Req; userId: number; amount: number; withdrawalId: number; reason: string; idempotencyKey: string }) {
  assertPositiveMinor(i.amount)
  return postEntry({
    payload: i.payload,
    req: i.req,
    userId: i.userId,
    type: 'REFUND',
    signedAmount: i.amount,
    pendingDelta: -i.amount,
    description: `Withdrawal refunded — ${i.reason}`,
    idempotencyKey: i.idempotencyKey,
    referenceType: 'withdrawal',
    referenceId: i.withdrawalId,
    ignoreFrozen: true,
  })
}

/** Settles a completed payout: the held funds leave the wallet for good. No available-balance movement, so no ledger row. */
export async function settleWithdrawal(i: { payload: Payload; req?: Req; userId: number; amount: number }): Promise<Wallet> {
  const { payload } = i
  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, walletLockKey(i.userId))
    const wallet = await getWalletTx(payload, i.userId, r)
    const pending = (wallet.pendingBalance ?? 0) - i.amount
    if (pending < 0) throw new AppError('INVALID_STATE', 'Held balance is lower than the withdrawal amount.')
    return withFlag(r, 'walletWrite', () =>
      payload.update({
        collection: 'wallets',
        id: wallet.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { pendingBalance: pending, lifetimeWithdrawn: (wallet.lifetimeWithdrawn ?? 0) + i.amount },
      }),
    )
  })
}

export async function reverseTransaction(i: {
  payload: Payload
  req?: Req
  transactionId: number
  reason: string
}): Promise<PostedEntry & { original: WalletTransaction }> {
  const { payload } = i
  return withTransaction(payload, i.req, async (r) => {
    const original = await payload.findByID({ collection: 'wallet-transactions', id: i.transactionId, depth: 0, overrideAccess: true, req: r }).catch(() => null)
    if (!original) throw new AppError('NOT_FOUND', 'Transaction not found.')
    const userId = typeof original.user === 'object' ? original.user.id : original.user
    const type = original.type as TransactionType
    let earnedDelta = 0
    if (CREDIT_EARNING_TYPES.includes(type)) earnedDelta = -original.amount
    else if (type !== 'ADMIN_DEBIT') throw new AppError('INVALID_STATE', 'Only reward credits and admin debits can be reversed.')
    const posted = await postEntry({
      payload,
      req: r,
      userId,
      type: 'REVERSAL',
      signedAmount: -original.amount,
      earnedDelta,
      description: `Reversal of #${original.id} — ${i.reason}`,
      idempotencyKey: `reversal:${original.id}`,
      referenceType: 'wallet-transaction',
      referenceId: original.id,
      reversalOf: original.id,
      ignoreFrozen: true,
    })
    return { ...posted, original }
  })
}

/** Applies a staff wallet adjustment inside the same transaction as the adjustment record. */
export async function applyAdminAdjustment(i: { payload: Payload; req: Partial<PayloadRequest>; adjustment: WalletAdjustment }) {
  const { payload, req, adjustment } = i
  const reason = adjustment.reason
  let posted: PostedEntry
  let userId: number
  let amount: number
  let action: 'REWARD_CREDITED' | 'REWARD_DEBITED' | 'TRANSACTION_REVERSED'

  if (adjustment.type === 'REVERSAL') {
    const targetId = typeof adjustment.targetTransaction === 'object' ? adjustment.targetTransaction!.id : adjustment.targetTransaction!
    const res = await reverseTransaction({ payload, req, transactionId: targetId, reason })
    posted = res
    userId = typeof res.original.user === 'object' ? res.original.user.id : res.original.user
    amount = Math.abs(res.original.amount)
    action = 'TRANSACTION_REVERSED'
  } else {
    userId = typeof adjustment.user === 'object' ? adjustment.user!.id : (adjustment.user as number)
    amount = adjustment.amount as number
    assertPositiveMinor(amount)
    if (adjustment.type === 'CREDIT') {
      posted = await creditWallet({ payload, req, userId, type: 'ADMIN_CREDIT', amount, description: `Adjustment — ${reason}`, idempotencyKey: `adjustment:${adjustment.id}`, referenceType: 'wallet-adjustment', referenceId: adjustment.id })
      action = 'REWARD_CREDITED'
    } else {
      posted = await postEntry({ payload, req, userId, type: 'ADMIN_DEBIT', signedAmount: -amount, description: `Adjustment — ${reason}`, idempotencyKey: `adjustment:${adjustment.id}`, referenceType: 'wallet-adjustment', referenceId: adjustment.id, ignoreFrozen: true })
      action = 'REWARD_DEBITED'
    }
  }

  await withFlag(req, 'serviceWrite', () =>
    payload.update({
      collection: 'wallet-adjustments',
      id: adjustment.id,
      overrideAccess: true,
      depth: 0,
      req: req as PayloadRequest,
      data: { user: userId, amount, resultingTransaction: posted.transaction.id },
    }),
  )
  await logAudit({
    payload,
    req,
    action,
    collection: 'wallet-adjustments',
    documentId: adjustment.id,
    after: { userId, amount, type: adjustment.type, reason, reference: adjustment.reference, transactionId: posted.transaction.id },
  })
  await notify({
    payload,
    req,
    userId,
    type: 'SYSTEM',
    title: adjustment.type === 'CREDIT' ? 'Balance adjusted' : 'Wallet updated',
    body: adjustment.type === 'CREDIT' ? 'Support added funds to your wallet.' : 'A correction was applied to your wallet. Contact support if you have questions.',
    dedupeKey: `adjustment:${adjustment.id}`,
  })
}

export interface WalletMismatch {
  walletId: number
  userId: number
  field: 'availableBalance' | 'pendingBalance' | 'lifetimeWithdrawn'
  stored: number
  expected: number
}

/**
 * Integrity check: recomputes every balance from its source of truth and reports differences.
 *  available = SUM(ledger.amount) · pending = SUM(open withdrawals) · lifetimeWithdrawn = SUM(completed withdrawals)
 */
export async function reconcileWallets(payload: Payload, opts: { userId?: number } = {}): Promise<{ checked: number; mismatches: WalletMismatch[] }> {
  const filter = opts.userId ? sql`where w.user_id = ${opts.userId}` : sql``
  const rows = await rawQuery<{ id: number; user_id: number; available: string; pending: string; withdrawn: string; ledger_sum: string; open_sum: string; done_sum: string }>(
    payload,
    sql`
      select w.id, w.user_id,
             w.available_balance as available, w.pending_balance as pending, w.lifetime_withdrawn as withdrawn,
             coalesce((select sum(t.amount) from wallet_transactions t where t.user_id = w.user_id), 0) as ledger_sum,
             coalesce((select sum(x.amount) from withdrawals x where x.user_id = w.user_id and x.status in ('PENDING','UNDER_REVIEW','APPROVED','PROCESSING')), 0) as open_sum,
             coalesce((select sum(x.amount) from withdrawals x where x.user_id = w.user_id and x.status = 'COMPLETED'), 0) as done_sum
      from wallets w ${filter}`,
  )
  const mismatches: WalletMismatch[] = []
  for (const r of rows) {
    const check = (field: WalletMismatch['field'], stored: string, expected: string) => {
      if (Number(stored) !== Number(expected)) mismatches.push({ walletId: r.id, userId: r.user_id, field, stored: Number(stored), expected: Number(expected) })
    }
    check('availableBalance', r.available, r.ledger_sum)
    check('pendingBalance', r.pending, r.open_sum)
    check('lifetimeWithdrawn', r.withdrawn, r.done_sum)
  }
  return { checked: rows.length, mismatches }
}
