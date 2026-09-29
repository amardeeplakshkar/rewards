import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { requestWithdrawal } from '@/services/withdrawal'
import { parseMajorToMinor } from '@/lib/money'

export const GET = withApi(async ({ payload, req, user }) => {
  const res = await payload.find({ collection: 'withdrawals', where: { user: { equals: user!.id } }, sort: '-createdAt', limit: 30, depth: 0, overrideAccess: true, req })
  return ok({
    withdrawals: res.docs.map((w) => ({ id: w.id, amount: w.amount, method: w.method, status: w.status, requestedAt: w.requestedAt, completedAt: w.completedAt, failureReason: w.failureReason, payoutSummary: w.payoutSummary })),
  })
})

const schema = z.object({ amount: z.string().or(z.number()), payoutMethodId: z.number() })

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = schema.parse(await request.json())
  const amount = typeof body.amount === 'number' ? body.amount : parseMajorToMinor(body.amount)
  const withdrawal = await requestWithdrawal({ payload, req, user: user!, amount, payoutMethodId: body.payoutMethodId })
  return ok({ withdrawal: { id: withdrawal.id, amount: withdrawal.amount, status: withdrawal.status } }, 201)
})
