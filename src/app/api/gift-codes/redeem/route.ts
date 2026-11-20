import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { AppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { redeemGiftCode } from '@/services/gift-code'

const schema = z.object({ code: z.string().min(1).max(64) })

export const POST = withApi(async ({ payload, user }, request) => {
  await enforceRateLimit(LIMITS.giftRedeem, String(user!.id), 'Too many attempts. Please try again later.')
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Enter a gift code.')
  const result = await redeemGiftCode(payload, undefined, user!.id, parsed.data.code)
  return ok({ amount: result.amount, balance: result.balance })
})
