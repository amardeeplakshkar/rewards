import { withApi, ok } from '@/lib/api/handler'
import { removePayoutMethod } from '@/services/payout-method'

export const DELETE = withApi(async ({ payload, req, user }, _request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  await removePayoutMethod(payload, req, user!, Number(id))
  return ok({ removed: true })
})
