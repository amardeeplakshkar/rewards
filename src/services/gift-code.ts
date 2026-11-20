import type { Payload, PayloadRequest } from 'payload'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { creditWallet } from './wallet'

export function normalizeGiftCode(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * Redeems a gift code for a user. In one transaction it locks the code, checks it is active, inside its
 * window and under its limit, checks the user hasn't used it, credits the wallet (idempotent key), records the
 * redemption and bumps the counter. The unique (giftCode, user) index is the final guard against doubles.
 */
export async function redeemGiftCode(payload: Payload, req: Partial<PayloadRequest> | undefined, userId: number, rawCode: string) {
  const code = normalizeGiftCode(rawCode)
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) throw new AppError('VALIDATION_ERROR', 'Enter a valid gift code.')

  return withTransaction(payload, req, async (r) => {
    await advisoryXactLock(payload, r, `gift-code:${code}`)
    const found = await payload.find({ collection: 'gift-codes', where: { code: { equals: code } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    const gift = found.docs[0]
    const now = Date.now()
    if (!gift || !gift.isActive) throw new AppError('NOT_FOUND', 'This gift code is not valid.')
    if (gift.startsAt && new Date(gift.startsAt).getTime() > now) throw new AppError('NOT_AVAILABLE', 'This gift code is not active yet.')
    if (gift.expiresAt && new Date(gift.expiresAt).getTime() <= now) throw new AppError('NOT_AVAILABLE', 'This gift code has expired.')
    const used = gift.redemptionCount ?? 0
    if (gift.maxRedemptions && used >= gift.maxRedemptions) throw new AppError('LIMIT_REACHED', 'This gift code has been fully claimed.')

    const already = await payload.count({ collection: 'gift-code-redemptions', where: { and: [{ giftCode: { equals: gift.id } }, { user: { equals: userId } }] }, overrideAccess: true, req: r })
    if (already.totalDocs > 0) throw new AppError('CONFLICT', 'You have already redeemed this code.')

    const { transaction, wallet } = await creditWallet({
      payload,
      req: r,
      userId,
      type: 'BONUS',
      amount: gift.amount,
      description: `Gift code ${code}`,
      idempotencyKey: `gift-code:${gift.id}:${userId}`,
      referenceType: 'gift-codes',
      referenceId: gift.id,
    })

    const redemption = await payload.create({
      collection: 'gift-code-redemptions',
      overrideAccess: true,
      depth: 0,
      req: r,
      data: { giftCode: gift.id, user: userId, code, amount: gift.amount, transaction: transaction.id, redeemedAt: new Date().toISOString() },
    })
    await payload.update({ collection: 'gift-codes', id: gift.id, overrideAccess: true, depth: 0, req: r, data: { redemptionCount: used + 1 } })

    return { redemption, amount: gift.amount, balance: wallet.availableBalance }
  })
}

export async function listGiftRedemptions(payload: Payload, userId: number, req?: Partial<PayloadRequest>) {
  const res = await payload.find({ collection: 'gift-code-redemptions', where: { user: { equals: userId } }, sort: '-redeemedAt', limit: 50, depth: 0, overrideAccess: true, req })
  return res.docs.map((d) => ({ id: d.id, code: d.code, amount: d.amount ?? 0, redeemedAt: d.redeemedAt }))
}
