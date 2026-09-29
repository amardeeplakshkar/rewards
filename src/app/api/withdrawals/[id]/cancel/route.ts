import { withApi, ok } from '@/lib/api/handler'
import { cancelWithdrawal } from '@/services/withdrawal'

export const POST = withApi(async ({ payload, req, user }, _request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const withdrawal = await cancelWithdrawal(payload, req, user!, Number(id))
  return ok({ withdrawal: { id: withdrawal.id, status: withdrawal.status } })
})
