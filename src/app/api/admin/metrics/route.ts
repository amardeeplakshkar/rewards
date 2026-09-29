import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { isAdminUser } from '@/access'
import { dayBounds, addDays } from '@/lib/time'
import { getSettings } from '@/services/settings'

const RANGES: Record<string, number> = { today: 0, yesterday: 1, '7d': 7, '30d': 30 }

export async function GET(req: NextRequest) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: req.headers })
  if (!isAdminUser(user)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admins only.' } }, { status: 403 })

  const range = req.nextUrl.searchParams.get('range') ?? 'today'
  const settings = await getSettings(payload)
  const tz = settings.site.defaultTimezone
  const now = new Date()

  let start: Date
  let end: Date
  if (range === 'yesterday') {
    const y = dayBounds(addDays(now, -1), tz)
    start = y.start
    end = y.end
  } else {
    const days = RANGES[range] ?? 0
    end = dayBounds(now, tz).end
    start = days > 0 ? dayBounds(addDays(now, -days), tz).start : dayBounds(now, tz).start
  }

  const between = { greater_than_equal: start.toISOString(), less_than: end.toISOString() }

  const [totalUsers, newUsers, activeUsers, rewardsRange, withdrawalsTotal, withdrawalsPending, withdrawalsCompleted, withdrawalsFailed, taskCompletions, gamesPlayed, campaignClaims, referralConversions] = await Promise.all([
    payload.count({ collection: 'users', overrideAccess: true }),
    payload.count({ collection: 'users', where: { createdAt: between }, overrideAccess: true }),
    payload.count({ collection: 'users', where: { lastLoginAt: between }, overrideAccess: true }),
    payload.find({ collection: 'wallet-transactions', where: { amount: { greater_than: 0 }, createdAt: between }, limit: 5000, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'withdrawals', where: { status: { equals: 'COMPLETED' } }, limit: 5000, depth: 0, overrideAccess: true }),
    payload.count({ collection: 'withdrawals', where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'] } }, overrideAccess: true }),
    payload.count({ collection: 'withdrawals', where: { status: { equals: 'COMPLETED' }, completedAt: between }, overrideAccess: true }),
    payload.count({ collection: 'withdrawals', where: { status: { equals: 'FAILED' }, failedAt: between }, overrideAccess: true }),
    payload.count({ collection: 'task-completions', where: { status: { equals: 'COMPLETED' }, completedAt: between }, overrideAccess: true }),
    payload.count({ collection: 'game-sessions', where: { status: { equals: 'COMPLETED' }, createdAt: between }, overrideAccess: true }),
    payload.count({ collection: 'campaign-claims', where: { claimedAt: between }, overrideAccess: true }),
    payload.count({ collection: 'referrals', where: { status: { in: ['QUALIFIED', 'REWARDED'] }, qualifiedAt: between }, overrideAccess: true }),
  ])

  const rewardsTodaySum = rewardsRange.docs.reduce((s, t) => s + t.amount, 0)

  let allTimeSum = 0
  let page = 1
  for (;;) {
    const res = await payload.find({ collection: 'wallet-transactions', where: { amount: { greater_than: 0 } }, limit: 1000, page, depth: 0, overrideAccess: true, sort: 'id' })
    allTimeSum += res.docs.reduce((s, t) => s + t.amount, 0)
    if (!res.hasNextPage) break
    page++
    if (page > 50) break
  }

  return NextResponse.json({
    ok: true,
    data: {
      range,
      totalUsers: totalUsers.totalDocs,
      newUsers: newUsers.totalDocs,
      activeUsers: activeUsers.totalDocs,
      rewardsIssuedAllTime: allTimeSum,
      rewardsIssuedRange: rewardsTodaySum,
      totalWithdrawalsCompleted: withdrawalsTotal.docs.reduce((s, w) => s + w.amount, 0),
      withdrawalsPending: withdrawalsPending.totalDocs,
      withdrawalsCompleted: withdrawalsCompleted.totalDocs,
      withdrawalsFailed: withdrawalsFailed.totalDocs,
      taskCompletions: taskCompletions.totalDocs,
      gamesPlayed: gamesPlayed.totalDocs,
      campaignClaims: campaignClaims.totalDocs,
      referralConversions: referralConversions.totalDocs,
    },
  })
}
