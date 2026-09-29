import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { completeTask } from '@/services/task'

const schema = z.object({ completionId: z.number(), submission: z.string().max(2000).optional(), answerCode: z.string().max(200).optional() })

export const POST = withApi(async ({ payload, req, user }, request) => {
  const body = schema.parse(await request.json())
  const completion = await completeTask({ payload, req, user: user!, completionId: body.completionId, submission: body.submission, answerCode: body.answerCode })
  return ok({ completion })
})
