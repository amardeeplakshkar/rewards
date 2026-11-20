import type { Payload, PayloadRequest } from 'payload'
import { rawQuery, sql } from '@/lib/db'
import { addDays, safeTimezone, startOfDayInTz } from '@/lib/time'
import { getSettings } from './settings'

interface LevelStats { registered: number; qualified: number; rewarded: number; registeredToday: number }

const num = (v: unknown) => Number(v ?? 0) || 0

/**
 * Referral ("agency") dashboard for one user. Direct = people the user invited; team = people those invitees
 * invited (level 2). Commission = the user's REFERRAL_REWARD ledger credits. No deposit data exists or is shown.
 */
export async function getAgencyStats(payload: Payload, userId: number, req?: Partial<PayloadRequest>) {
  const settings = await getSettings(payload)
  const tz = safeTimezone(settings.site.defaultTimezone)
  const todayStart = startOfDayInTz(new Date(), tz)
  const yesterdayStart = startOfDayInTz(addDays(todayStart, -1), tz)

  const levelQuery = (whereReferrer: ReturnType<typeof sql>) => sql`
    select count(*) as registered,
           count(*) filter (where r.status in ('QUALIFIED','REWARDED')) as qualified,
           count(*) filter (where r.status = 'REWARDED') as rewarded,
           count(*) filter (where r.registered_at >= ${todayStart.toISOString()}) as registered_today
      from referrals r
     where ${whereReferrer}`

  const [direct] = await rawQuery<Record<string, unknown>>(payload, levelQuery(sql`r.referrer_id = ${userId}`), req)
  const [team] = await rawQuery<Record<string, unknown>>(
    payload,
    levelQuery(sql`r.referrer_id in (select d.referred_user_id from referrals d where d.referrer_id = ${userId})`),
    req,
  )
  const [commission] = await rawQuery<Record<string, unknown>>(
    payload,
    sql`select coalesce(sum(amount),0) as total,
               coalesce(sum(amount) filter (where created_at >= ${yesterdayStart.toISOString()} and created_at < ${todayStart.toISOString()}),0) as yesterday,
               coalesce(sum(amount) filter (where created_at >= ${todayStart.toISOString()}),0) as today
          from wallet_transactions
         where user_id = ${userId} and type = 'REFERRAL_REWARD'`,
    req,
  )

  const toLevel = (row?: Record<string, unknown>): LevelStats => ({
    registered: num(row?.registered),
    qualified: num(row?.qualified),
    rewarded: num(row?.rewarded),
    registeredToday: num(row?.registered_today),
  })

  return {
    direct: toLevel(direct),
    team: toLevel(team),
    commission: { total: num(commission?.total), yesterday: num(commission?.yesterday), today: num(commission?.today) },
  }
}
