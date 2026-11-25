import type { Payload, PayloadRequest } from 'payload'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { safeTimezone } from '@/lib/time'
import { computeStreak, dayKeyInTz, rewardForDay } from '@/lib/streak'
import { getSettings } from './settings'
import { creditWallet } from './wallet'

async function lastClaim(payload: Payload, userId: number, req?: Partial<PayloadRequest>) {
  const res = await payload.find({ collection: 'attendance-claims', where: { user: { equals: userId } }, sort: '-dayKey', limit: 1, depth: 0, overrideAccess: true, req })
  return res.docs[0] ?? null
}

export async function getAttendanceStatus(payload: Payload, userId: number, req?: Partial<PayloadRequest>) {
  const settings = await getSettings(payload)
  const { attendanceEnabled, attendanceRewards } = settings.reward
  const today = dayKeyInTz(new Date(), safeTimezone(settings.site.defaultTimezone))
  const state = computeStreak(await lastClaim(payload, userId, req), today)
  const claimDay = state.claimedToday ? state.currentStreak : state.nextDay
  return {
    enabled: attendanceEnabled && attendanceRewards.length > 0,
    today,
    ...state,
    todayReward: rewardForDay(attendanceRewards, claimDay),
    rewards: attendanceRewards,
  }
}

/** Claims today's check-in. Locked per user; the unique (user, dayKey) index and the ledger key stop double claims. */
export async function claimAttendance(payload: Payload, req: Partial<PayloadRequest> | undefined, userId: number) {
  const settings = await getSettings(payload)
  const { attendanceEnabled, attendanceRewards } = settings.reward
  if (!attendanceEnabled || !attendanceRewards.length) throw new AppError('FEATURE_DISABLED', 'Daily check-in is not available right now.')
  const today = dayKeyInTz(new Date(), safeTimezone(settings.site.defaultTimezone))

  return withTransaction(payload, req, async (r) => {
    await advisoryXactLock(payload, r, `attendance:${userId}`)
    const state = computeStreak(await lastClaim(payload, userId, r), today)
    if (state.claimedToday) throw new AppError('CONFLICT', 'You have already checked in today. Come back tomorrow.')
    const day = state.nextDay
    const amount = rewardForDay(attendanceRewards, day)

    const { transaction, wallet } = await creditWallet({
      payload,
      req: r,
      userId,
      type: 'BONUS',
      amount,
      description: `Daily check-in, day ${day}`,
      idempotencyKey: `attendance:${userId}:${today}`,
      referenceType: 'attendance-claims',
      referenceId: today,
    })
    await payload.create({
      collection: 'attendance-claims',
      overrideAccess: true,
      depth: 0,
      req: r,
      data: { user: userId, dayKey: today, streakDay: day, amount, transaction: transaction.id, claimedAt: new Date().toISOString() },
    })
    return { day, amount, balance: wallet.availableBalance }
  })
}
