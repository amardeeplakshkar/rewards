import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { notify } from '@/services/notification'
import { withFlag } from '@/services/context'

/**
 * Call this endpoint once a minute (e.g. from a hosting platform's scheduler) with header
 * `Authorization: Bearer $CRON_SECRET`. It activates/expires scheduled content and sends
 * campaign start / ending-soon notifications exactly once per campaign.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid cron secret.' } }, { status: 401 })

  const payload = await getPayloadClient()
  const now = new Date()
  const results: Record<string, number> = {}

  // Activate scheduled tasks/games whose startsAt has passed.
  for (const slug of ['tasks', 'games'] as const) {
    const due = await payload.find({ collection: slug, where: { status: { equals: 'SCHEDULED' }, startsAt: { less_than_equal: now.toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
    for (const doc of due.docs) await payload.update({ collection: slug, id: doc.id, data: { status: 'ACTIVE' }, overrideAccess: true, context: { skipAudit: true } })
    results[`${slug}_activated`] = due.docs.length

    const expired = await payload.find({ collection: slug, where: { status: { equals: 'ACTIVE' }, endsAt: { less_than_equal: now.toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
    for (const doc of expired.docs) await payload.update({ collection: slug, id: doc.id, data: { status: 'EXPIRED' }, overrideAccess: true, context: { skipAudit: true } })
    results[`${slug}_expired`] = expired.docs.length
  }

  // Campaign lifecycle + notifications.
  const scheduledCampaigns = await payload.find({ collection: 'campaigns', where: { status: { equals: 'SCHEDULED' }, startsAt: { less_than_equal: now.toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
  for (const c of scheduledCampaigns.docs) await payload.update({ collection: 'campaigns', id: c.id, data: { status: 'ACTIVE' }, overrideAccess: true, context: { skipAudit: true } })
  results.campaigns_activated = scheduledCampaigns.docs.length

  const expiredCampaigns = await payload.find({ collection: 'campaigns', where: { status: { equals: 'ACTIVE' }, endsAt: { less_than_equal: now.toISOString() } }, limit: 200, depth: 0, overrideAccess: true })
  for (const c of expiredCampaigns.docs) await payload.update({ collection: 'campaigns', id: c.id, data: { status: 'EXPIRED' }, overrideAccess: true, context: { skipAudit: true } })
  results.campaigns_expired = expiredCampaigns.docs.length

  const startingCampaigns = await payload.find({ collection: 'campaigns', where: { status: { equals: 'ACTIVE' }, startNotifiedAt: { exists: false } }, limit: 200, depth: 0, overrideAccess: true })
  for (const c of startingCampaigns.docs) {
    const users = await payload.find({ collection: 'users', where: { status: { equals: 'ACTIVE' } }, limit: 1000, depth: 0, overrideAccess: true })
    for (const u of users.docs) await notify({ payload, userId: u.id, type: 'CAMPAIGN_STARTED', title: 'New campaign live', body: `"${c.name}" is now live — check it out!`, dedupeKey: `campaign:${c.id}:started:${u.id}` })
    await withFlag({}, 'skipAudit', () => payload.update({ collection: 'campaigns', id: c.id, data: { startNotifiedAt: now.toISOString() }, overrideAccess: true }))
  }
  results.campaigns_start_notified = startingCampaigns.docs.length

  const endingSoon = new Date(now.getTime() + 24 * 3_600_000).toISOString()
  const endingCampaigns = await payload.find({ collection: 'campaigns', where: { status: { equals: 'ACTIVE' }, endsAt: { less_than_equal: endingSoon, greater_than: now.toISOString() }, endingNotifiedAt: { exists: false } }, limit: 200, depth: 0, overrideAccess: true })
  for (const c of endingCampaigns.docs) {
    const users = await payload.find({ collection: 'users', where: { status: { equals: 'ACTIVE' } }, limit: 1000, depth: 0, overrideAccess: true })
    for (const u of users.docs) await notify({ payload, userId: u.id, type: 'CAMPAIGN_ENDING', title: 'Campaign ending soon', body: `"${c.name}" ends within 24 hours.`, dedupeKey: `campaign:${c.id}:ending:${u.id}` })
    await withFlag({}, 'skipAudit', () => payload.update({ collection: 'campaigns', id: c.id, data: { endingNotifiedAt: now.toISOString() }, overrideAccess: true }))
  }
  results.campaigns_ending_notified = endingCampaigns.docs.length

  // Expire game sessions that ran past their deadline without a submission.
  const staleSessions = await payload.find({ collection: 'game-sessions', where: { status: { equals: 'STARTED' }, expiresAt: { less_than: now.toISOString() } }, limit: 500, depth: 0, overrideAccess: true })
  for (const s of staleSessions.docs) await payload.update({ collection: 'game-sessions', id: s.id, data: { status: 'EXPIRED', endedAt: now.toISOString() }, overrideAccess: true })
  results.sessions_expired = staleSessions.docs.length

  return NextResponse.json({ ok: true, data: results })
}
