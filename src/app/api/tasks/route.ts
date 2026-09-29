import { z } from 'zod'
import { withApi, ok } from '@/lib/api/handler'
import { getSettings } from '@/services/settings'
import { AppError } from '@/lib/errors'

export const GET = withApi(async ({ payload, req, user }) => {
  const settings = await getSettings(payload)
  if (!settings.features.tasksEnabled) throw new AppError('FEATURE_DISABLED', 'Tasks are temporarily unavailable.')
  const now = new Date().toISOString()
  const res = await payload.find({
    collection: 'tasks',
    where: { isActive: { equals: true }, status: { equals: 'ACTIVE' }, or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] },
    sort: '-priority',
    limit: 100,
    depth: 1,
    overrideAccess: true,
    req,
  })
  const tasks = res.docs.filter((t) => !t.endsAt || new Date(t.endsAt) > new Date())
  const myCompletions = user
    ? await payload.find({ collection: 'task-completions', where: { user: { equals: user.id }, task: { in: tasks.map((t) => t.id) } }, limit: 500, depth: 0, overrideAccess: true, req })
    : { docs: [] as { task: number | { id: number }; status: string }[] }
  const countsByTask = new Map<number, number>()
  for (const c of myCompletions.docs) {
    const id = typeof c.task === 'object' ? c.task.id : c.task
    if (c.status !== 'REJECTED') countsByTask.set(id, (countsByTask.get(id) ?? 0) + 1)
  }
  return ok({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      description: t.description,
      instructions: t.instructions,
      rewardAmount: t.rewardAmount,
      verificationType: t.verification?.type,
      timerSeconds: t.verification?.timerSeconds ?? null,
      featured: t.featured,
      myCompletions: countsByTask.get(t.id) ?? 0,
      perUserLimit: t.perUserLimit,
      icon: typeof t.icon === 'object' ? t.icon?.url : null,
    })),
  })
}, { requireAuth: false })
