import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { addPayoutMethod } from '@/services/payout-method'

export const GET = withApi(async ({ payload, req, user }) => {
  const res = await payload.find({ collection: 'payout-methods', where: { user: { equals: user!.id }, status: { equals: 'ACTIVE' } }, sort: '-isDefault', limit: 20, depth: 0, overrideAccess: true, req })
  return ok({ methods: res.docs.map((m) => ({ id: m.id, type: m.type, label: m.label, maskedDetails: m.maskedDetails, isDefault: m.isDefault })) })
})

const schema = z.object({
  type: z.enum(['UPI', 'BANK']),
  label: z.string().min(1).max(60),
  holderName: z.string().max(120).optional(),
  upiId: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  bankName: z.string().max(120).optional(),
  makeDefault: z.boolean().optional(),
})

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = schema.parse(await request.json())
  const method = await addPayoutMethod({ payload, req, user: user!, ...body })
  return ok({ method: { id: method.id, type: method.type, label: method.label, maskedDetails: method.maskedDetails, isDefault: method.isDefault } }, 201)
})
