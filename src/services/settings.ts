import type { Payload } from 'payload'
import { CACHE, cached } from '@/lib/cache'
import { getPayloadClient } from '@/lib/payload'
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from '@/constants'

export interface AppSettings {
  site: { appName: string; tagline: string; supportEmail?: string | null; supportPhone?: string | null; supportUrl?: string | null; defaultTimezone: string; currency: string; logoUrl?: string | null }
  reward: {
    minimumWithdrawal: number
    maximumWithdrawal: number
    dailyWithdrawalLimit: number
    maxOpenWithdrawals: number
    defaultReferralReward: number
    defaultReferralQualification: string
    defaultReferralQualificationAmount: number
    defaultReferralPerReferrerLimit: number
  }
  features: {
    gamesEnabled: boolean
    tasksEnabled: boolean
    campaignsEnabled: boolean
    referralsEnabled: boolean
    withdrawalsEnabled: boolean
    registrationEnabled: boolean
    maintenanceMode: boolean
    maintenanceMessage: string
  }
}

async function load(payload: Payload): Promise<AppSettings> {
  const opts = { overrideAccess: true, depth: 1 } as const
  const [site, reward, features] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings', ...opts }),
    payload.findGlobal({ slug: 'reward-settings', ...opts }),
    payload.findGlobal({ slug: 'feature-settings', ...opts }),
  ])
  const logo = typeof site.logo === 'object' && site.logo ? site.logo.url : null
  return {
    site: {
      appName: site.appName || 'Rewards',
      tagline: site.tagline || '',
      supportEmail: site.supportEmail,
      supportPhone: site.supportPhone,
      supportUrl: site.supportUrl,
      defaultTimezone: site.defaultTimezone || DEFAULT_TIMEZONE,
      currency: site.currency || DEFAULT_CURRENCY,
      logoUrl: logo,
    },
    reward: {
      minimumWithdrawal: reward.minimumWithdrawal ?? 10000,
      maximumWithdrawal: reward.maximumWithdrawal ?? 1000000,
      dailyWithdrawalLimit: reward.dailyWithdrawalLimit ?? 2500000,
      maxOpenWithdrawals: reward.maxOpenWithdrawals ?? 1,
      defaultReferralReward: reward.defaultReferralReward ?? 1000,
      defaultReferralQualification: reward.defaultReferralQualification ?? 'FIRST_TASK',
      defaultReferralQualificationAmount: reward.defaultReferralQualificationAmount ?? 0,
      defaultReferralPerReferrerLimit: reward.defaultReferralPerReferrerLimit ?? 50,
    },
    features: {
      gamesEnabled: features.gamesEnabled ?? true,
      tasksEnabled: features.tasksEnabled ?? true,
      campaignsEnabled: features.campaignsEnabled ?? true,
      referralsEnabled: features.referralsEnabled ?? true,
      withdrawalsEnabled: features.withdrawalsEnabled ?? true,
      registrationEnabled: features.registrationEnabled ?? true,
      maintenanceMode: features.maintenanceMode ?? false,
      maintenanceMessage: features.maintenanceMessage || 'We are making improvements and will be back shortly.',
    },
  }
}

/** Settings are cached briefly in Redis and invalidated by the global's afterChange hook. */
export async function getSettings(payload?: Payload): Promise<AppSettings> {
  const p = payload ?? (await getPayloadClient())
  return cached(`${CACHE.settings}:app`, 60, () => load(p))
}
