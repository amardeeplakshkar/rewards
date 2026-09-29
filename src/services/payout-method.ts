import type { Payload, PayloadRequest } from 'payload'
import { AppError } from '@/lib/errors'
import { encrypt, maskTail, maskUpi, sha256 } from '@/lib/crypto'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { PayoutMethodType } from '@/constants'
import type { PayoutMethod, User } from '@/payload-types'
import { withFlag } from './context'
import { logAudit } from './audit'

export interface AddPayoutMethodInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  type: PayoutMethodType
  label: string
  holderName?: string
  upiId?: string
  accountNumber?: string
  ifsc?: string
  bankName?: string
  makeDefault?: boolean
}

export async function addPayoutMethod(i: AddPayoutMethodInput): Promise<PayoutMethod> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.payoutMethod, `${user.id}`)

  let maskedDetails: string
  let fingerprintSource: string
  if (i.type === 'UPI') {
    if (!i.upiId || !/^[\w.+-]{2,}@[a-zA-Z]{2,}$/.test(i.upiId)) throw new AppError('VALIDATION_ERROR', 'Enter a valid UPI ID, e.g. name@bank.')
    maskedDetails = maskUpi(i.upiId)
    fingerprintSource = `UPI:${i.upiId.toLowerCase()}`
  } else {
    if (!i.accountNumber || !/^\d{6,20}$/.test(i.accountNumber)) throw new AppError('VALIDATION_ERROR', 'Enter a valid bank account number.')
    if (!i.ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(i.ifsc.toUpperCase())) throw new AppError('VALIDATION_ERROR', 'Enter a valid IFSC code.')
    maskedDetails = maskTail(i.accountNumber)
    fingerprintSource = `BANK:${i.accountNumber}:${i.ifsc.toUpperCase()}`
  }
  const fingerprint = sha256(fingerprintSource)

  const existingCount = await payload.count({ collection: 'payout-methods', where: { user: { equals: user.id }, status: { equals: 'ACTIVE' } }, overrideAccess: true, req: i.req as PayloadRequest | undefined })

  const encryptedDetails = encrypt(JSON.stringify({ upiId: i.upiId, accountNumber: i.accountNumber, ifsc: i.ifsc?.toUpperCase(), bankName: i.bankName, holderName: i.holderName }))

  const created = await withFlag(i.req ?? {}, 'serviceWrite', () =>
    payload.create({
      collection: 'payout-methods',
      overrideAccess: true,
      depth: 0,
      req: i.req as PayloadRequest | undefined,
      data: {
        user: user.id,
        type: i.type,
        label: i.label,
        holderName: i.holderName,
        maskedDetails,
        ifsc: i.ifsc?.toUpperCase(),
        bankName: i.bankName,
        encryptedDetails,
        fingerprint,
        isDefault: i.makeDefault ?? existingCount.totalDocs === 0,
        status: 'ACTIVE',
      },
    }),
  )

  if (created.isDefault) {
    await withFlag(i.req ?? {}, 'serviceWrite', async () => {
      const others = await payload.find({ collection: 'payout-methods', where: { user: { equals: user.id }, id: { not_equals: created.id }, isDefault: { equals: true } }, limit: 100, depth: 0, overrideAccess: true, req: i.req as PayloadRequest | undefined })
      for (const m of others.docs) await payload.update({ collection: 'payout-methods', id: m.id, overrideAccess: true, depth: 0, req: i.req as PayloadRequest | undefined, data: { isDefault: false } })
    })
  }

  await logAudit({ payload, req: i.req, action: 'OTHER', collection: 'payout-methods', documentId: created.id, actorLabel: `user:${user.email}`, after: { type: i.type, maskedDetails } })
  return created
}

export async function removePayoutMethod(payload: Payload, req: Partial<PayloadRequest> | undefined, user: User, id: number) {
  const method = await payload.findByID({ collection: 'payout-methods', id, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  const owner = method && (typeof method.user === 'object' ? method.user.id : method.user)
  if (!method || owner !== user.id) throw new AppError('NOT_FOUND', 'Payout method not found.')
  return withFlag(req ?? {}, 'serviceWrite', () =>
    payload.update({ collection: 'payout-methods', id, overrideAccess: true, depth: 0, req: req as PayloadRequest | undefined, data: { status: 'REMOVED', removedAt: new Date().toISOString(), isDefault: false } }),
  )
}
