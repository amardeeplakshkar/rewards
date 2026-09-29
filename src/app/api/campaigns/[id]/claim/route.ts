import { withApi, ok } from '@/lib/api/handler'
import { claimCampaign } from '@/services/campaign'

export const POST = withApi(async ({ payload, req, user }, _request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const claim = await claimCampaign({ payload, req, user: user!, campaignId: Number(id) })
  return ok({ claim })
})
