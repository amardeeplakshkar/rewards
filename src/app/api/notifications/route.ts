import { withApi, ok } from '@/lib/api/handler'

export const GET = withApi(async ({ payload, req, user }) => {
  const res = await payload.find({ collection: 'notifications', where: { user: { equals: user!.id } }, sort: '-createdAt', limit: 50, depth: 0, overrideAccess: true, req })
  const unread = await payload.count({ collection: 'notifications', where: { user: { equals: user!.id }, readAt: { exists: false } }, overrideAccess: true, req })
  return ok({
    unreadCount: unread.totalDocs,
    notifications: res.docs.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, data: n.data, readAt: n.readAt, createdAt: n.createdAt })),
  })
})
