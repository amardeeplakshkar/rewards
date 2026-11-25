import { withApi, ok } from '@/lib/api/handler'
import { listGiftRedemptions } from '@/services/gift-code'

export const GET = withApi(async ({ payload, req, user }) => ok({ redemptions: await listGiftRedemptions(payload, user!.id, req) }))
