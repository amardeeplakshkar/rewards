import { withApi, ok } from '@/lib/api/handler'
import { startTask } from '@/services/task'

export const POST = withApi(async ({ payload, req, user }, request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const completion = await startTask({ payload, req, user: user!, taskId: Number(id), headers: request.headers })
  return ok({ completion })
})
