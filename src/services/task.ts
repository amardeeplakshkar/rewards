import type { Payload, PayloadRequest } from 'payload'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getClientIp, getRequestMeta } from '@/lib/request-meta'
import { dayBounds } from '@/lib/time'
import type { Task, TaskCompletion, User } from '@/payload-types'
import { safeEqual } from '@/lib/crypto'
import { assertEligible } from './eligibility'
import { creditWallet } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'
import { getSettings } from './settings'

const taskLockKey = (userId: number, taskId: number) => `task:${userId}:${taskId}`

async function loadActiveTask(payload: Payload, taskId: number, req?: Partial<PayloadRequest>): Promise<Task> {
  const task = await payload.findByID({ collection: 'tasks', id: taskId, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  if (!task || !task.isActive || task.status !== 'ACTIVE') throw new AppError('NOT_AVAILABLE', 'This task is not currently available.')
  const now = new Date()
  if (task.startsAt && now < new Date(task.startsAt)) throw new AppError('NOT_AVAILABLE', 'This task has not started yet.')
  if (task.endsAt && now >= new Date(task.endsAt)) throw new AppError('NOT_AVAILABLE', 'This task has ended.')
  return task
}

async function enforceLimits(payload: Payload, task: Task, user: User, req?: Partial<PayloadRequest>) {
  if (task.perUserLimit) {
    const mine = await payload.count({ collection: 'task-completions', where: { task: { equals: task.id }, user: { equals: user.id }, status: { not_equals: 'REJECTED' } }, overrideAccess: true, req: req as PayloadRequest | undefined })
    if (mine.totalDocs >= task.perUserLimit) throw new AppError('LIMIT_REACHED', "You've reached the limit for this task.")
  }
  const settings = await getSettings(payload)
  const { start, end } = dayBounds(new Date(), settings.site.defaultTimezone)
  if (task.perUserDailyLimit) {
    const today = await payload.count({
      collection: 'task-completions',
      where: { task: { equals: task.id }, user: { equals: user.id }, status: { not_equals: 'REJECTED' }, startedAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() } },
      overrideAccess: true,
      req: req as PayloadRequest | undefined,
    })
    if (today.totalDocs >= task.perUserDailyLimit) throw new AppError('LIMIT_REACHED', "You've reached today's limit for this task.")
  }
  if (task.dailyLimit) {
    const today = await payload.count({
      collection: 'task-completions',
      where: { task: { equals: task.id }, status: { not_equals: 'REJECTED' }, startedAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() } },
      overrideAccess: true,
      req: req as PayloadRequest | undefined,
    })
    if (today.totalDocs >= task.dailyLimit) throw new AppError('NOT_AVAILABLE', 'This task has reached its daily capacity. Try again tomorrow.')
  }
  if (task.totalLimit) {
    const total = await payload.count({ collection: 'task-completions', where: { task: { equals: task.id }, status: { not_equals: 'REJECTED' } }, overrideAccess: true, req: req as PayloadRequest | undefined })
    if (total.totalDocs >= task.totalLimit) throw new AppError('NOT_AVAILABLE', 'This task is no longer available.')
  }
  if (task.cooldownMinutes) {
    const last = await payload.find({
      collection: 'task-completions',
      where: { task: { equals: task.id }, user: { equals: user.id } },
      sort: '-startedAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req: req as PayloadRequest | undefined,
    })
    const lastAt = last.docs[0]?.startedAt
    if (lastAt && Date.now() - new Date(lastAt).getTime() < task.cooldownMinutes * 60_000) {
      throw new AppError('COOLDOWN', 'Please wait before attempting this task again.', { retryAfterSeconds: task.cooldownMinutes * 60 })
    }
  }
}

export interface StartTaskInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  taskId: number
  headers: Headers
}

/** Starts (or resumes) an attempt. Server decides pass/fail — never trust a client-reported "done". */
export async function startTask(i: StartTaskInput): Promise<TaskCompletion> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.taskAction, `${user.id}`)
  const task = await loadActiveTask(payload, i.taskId, i.req)
  await assertEligible(payload, i.req, user, task.eligibility)

  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, taskLockKey(user.id, task.id))
    const existingStarted = await payload.find({ collection: 'task-completions', where: { task: { equals: task.id }, user: { equals: user.id }, status: { equals: 'STARTED' } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (existingStarted.docs[0]) return existingStarted.docs[0]

    await enforceLimits(payload, task, user, r)
    const meta = getRequestMeta(i.headers)
    const attemptCount = await payload.count({ collection: 'task-completions', where: { task: { equals: task.id }, user: { equals: user.id } }, overrideAccess: true, req: r })
    return withFlag(r, 'serviceWrite', () =>
      payload.create({
        collection: 'task-completions',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { task: task.id, user: user.id, attemptNumber: attemptCount.totalDocs + 1, status: 'STARTED', startedAt: new Date().toISOString(), ip: meta.ip, device: meta.device },
      }),
    )
  })
}

export interface CompleteTaskInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  completionId: number
  submission?: string
  answerCode?: string
}

/** Finalises an attempt per the task's verification type; MANUAL_REVIEW is left SUBMITTED for staff. */
export async function completeTask(i: CompleteTaskInput): Promise<TaskCompletion> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.taskAction, `${user.id}`)

  return withTransaction(payload, i.req, async (r) => {
    const completion = await payload.findByID({ collection: 'task-completions', id: i.completionId, depth: 0, overrideAccess: true, req: r }).catch(() => null)
    const completionUserId = completion && (typeof completion.user === 'object' ? completion.user.id : completion.user)
    if (!completion || completionUserId !== user.id) throw new AppError('NOT_FOUND', 'Attempt not found.')
    if (completion.status !== 'STARTED') throw new AppError('INVALID_STATE', 'This attempt has already been finalised.')

    const task = await payload.findByID({ collection: 'tasks', id: typeof completion.task === 'object' ? completion.task.id : completion.task, depth: 0, overrideAccess: true, req: r })
    await advisoryXactLock(payload, r, taskLockKey(user.id, task.id))

    const v = task.verification
    if (v?.type === 'TIMER') {
      const elapsed = (Date.now() - new Date(completion.startedAt).getTime()) / 1000
      if (elapsed < (v.timerSeconds ?? 0)) throw new AppError('INVALID_STATE', 'Please wait for the timer to finish before completing.')
    }
    if (v?.type === 'ANSWER_CODE') {
      if (!i.answerCode || !safeEqual(i.answerCode.trim().toLowerCase(), String(v.answerCode ?? '').trim().toLowerCase())) {
        throw new AppError('BAD_REQUEST', 'That code is not correct.')
      }
    }
    if ((v?.type === 'TEXT_SUBMISSION' || v?.type === 'MANUAL_REVIEW') && !i.submission?.trim()) {
      throw new AppError('BAD_REQUEST', 'Please provide the requested submission.')
    }

    const now = new Date().toISOString()
    if (v?.type === 'MANUAL_REVIEW') {
      return withFlag(r, 'serviceWrite', () =>
        payload.update({ collection: 'task-completions', id: completion.id, overrideAccess: true, depth: 0, req: r, data: { status: 'SUBMITTED', submittedAt: now, submission: i.submission } }),
      )
    }

    const posted = await creditWallet({
      payload,
      req: r,
      userId: user.id,
      type: 'TASK_REWARD',
      amount: task.rewardAmount,
      description: `Task reward — ${task.title}`,
      idempotencyKey: `task-completion:${completion.id}`,
      referenceType: 'task-completion',
      referenceId: completion.id,
    })
    const updated = await withFlag(r, 'serviceWrite', () =>
      payload.update({
        collection: 'task-completions',
        id: completion.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: { status: 'COMPLETED', submittedAt: now, completedAt: now, submission: i.submission, rewardAmount: task.rewardAmount, transaction: posted.transaction.id },
      }),
    )
    await afterTaskRewarded(payload, r, user.id, task, completion.id)
    return updated
  })
}

/** Called by the TaskCompletions collection hook once staff mark a manual-review submission COMPLETED. */
export async function approveSubmittedCompletion(i: { payload: Payload; req: Partial<PayloadRequest>; completionId: number }) {
  const { payload } = i
  return withTransaction(payload, i.req, async (r) => {
    const completion = await payload.findByID({ collection: 'task-completions', id: i.completionId, depth: 0, overrideAccess: true, req: r })
    const userId = typeof completion.user === 'object' ? completion.user.id : completion.user
    const task = await payload.findByID({ collection: 'tasks', id: typeof completion.task === 'object' ? completion.task.id : completion.task, depth: 0, overrideAccess: true, req: r })
    await advisoryXactLock(payload, r, taskLockKey(userId, task.id))

    const posted = await creditWallet({
      payload,
      req: r,
      userId,
      type: 'TASK_REWARD',
      amount: task.rewardAmount,
      description: `Task reward — ${task.title}`,
      idempotencyKey: `task-completion:${completion.id}`,
      referenceType: 'task-completion',
      referenceId: completion.id,
    })
    await withFlag(r, 'serviceWrite', () =>
      payload.update({ collection: 'task-completions', id: completion.id, overrideAccess: true, depth: 0, req: r, data: { completedAt: new Date().toISOString(), rewardAmount: task.rewardAmount, transaction: posted.transaction.id } }),
    )
    await logAudit({ payload, req: r, action: 'TASK_COMPLETION_REVIEWED', collection: 'task-completions', documentId: completion.id, after: { status: 'COMPLETED' } })
    await afterTaskRewarded(payload, r, userId, task, completion.id)
  })
}

async function afterTaskRewarded(payload: Payload, req: Partial<PayloadRequest>, userId: number, task: { title: string; rewardAmount: number }, completionId: number) {
  await notify({ payload, req, userId, type: 'TASK_COMPLETED', title: 'Task completed', body: `You earned a reward for "${task.title}".`, dedupeKey: `task-completion:${completionId}:notif` })
  const { checkReferralQualification } = await import('./referral')
  await checkReferralQualification(payload, req, userId, 'TASK_COMPLETED')
  await checkReferralQualification(payload, req, userId, 'EARNED')
}
