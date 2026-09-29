import { withApi, ok } from '@/lib/api/handler'
import { AppError } from '@/lib/errors'
import { withFlag } from '@/services/context'

export const POST = withApi(async ({ payload, req, user }, _request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const n = await payload.findByID({ collection: 'notifications', id: Number(id), depth: 0, overrideAccess: true, req }).catch(() => null)
  const owner = n && (typeof n.user === 'object' ? n.user.id : n.user)
  if (!n || owner !== user!.id) throw new AppError('NOT_FOUND', 'Notification not found.')
  const updated = await withFlag(req, 'serviceWrite', () => payload.update({ collection: 'notifications', id: n.id, overrideAccess: true, depth: 0, req, data: { readAt: n.readAt ?? new Date().toISOString() } }))
  return ok({ notification: { id: updated.id, readAt: updated.readAt } })
})
