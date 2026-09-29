import type { GlobalConfig } from 'payload'
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE, REFERRAL_QUALIFICATIONS, toOptions } from '@/constants'
import { allow } from '@/access'
import { auditGlobalHook } from '@/hooks/audit'
import { invalidateGlobalCache } from '@/hooks/cache'
import { isValidTimezone } from '@/lib/time'
import { moneyField } from '@/utilities/fields'

const hooks = (slug: string) => ({ afterChange: [auditGlobalHook(slug), invalidateGlobalCache('settings')] })

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'Settings' },
  access: { read: allow('ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT', 'FINANCE_ADMIN'), update: allow('ADMIN') },
  hooks: hooks('site-settings'),
  fields: [
    { name: 'appName', type: 'text', required: true, defaultValue: 'Rewards' },
    { name: 'tagline', type: 'text', defaultValue: 'Play, complete tasks and earn.' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'favicon', type: 'upload', relationTo: 'media' },
    { name: 'supportEmail', type: 'email' },
    { name: 'supportPhone', type: 'text' },
    { name: 'supportUrl', type: 'text' },
    {
      name: 'defaultTimezone',
      type: 'text',
      required: true,
      defaultValue: DEFAULT_TIMEZONE,
      validate: (v: unknown) => (typeof v === 'string' && isValidTimezone(v)) || 'Use a valid IANA timezone, e.g. Asia/Kolkata',
      admin: { description: 'Used for daily limits/resets and for users who have not chosen a timezone.' },
    },
    { name: 'currency', type: 'select', required: true, defaultValue: DEFAULT_CURRENCY, options: [{ label: 'Indian Rupee (INR)', value: 'INR' }], admin: { description: 'Amounts are stored in minor units (paise).' } },
  ],
}

export const RewardSettings: GlobalConfig = {
  slug: 'reward-settings',
  label: 'Reward settings',
  admin: { group: 'Settings' },
  access: { read: allow('ADMIN', 'FINANCE_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT'), update: allow('FINANCE_ADMIN', 'ADMIN') },
  hooks: hooks('reward-settings'),
  fields: [
    {
      type: 'collapsible',
      label: 'Withdrawals',
      fields: [
        moneyField('minimumWithdrawal', { required: true, min: 1, defaultValue: 10000 }),
        moneyField('maximumWithdrawal', { required: true, min: 1, defaultValue: 1000000 }),
        moneyField('dailyWithdrawalLimit', { required: true, min: 1, defaultValue: 2500000, admin: { description: 'Total a user may request per day (site timezone).' } }),
        { name: 'maxOpenWithdrawals', type: 'number', min: 1, defaultValue: 1, required: true, admin: { description: 'Requests a user may have in progress at once.' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Referral defaults',
      fields: [
        moneyField('defaultReferralReward', { defaultValue: 1000, admin: { description: 'Used when no active Referral rule exists.' } }),
        { name: 'defaultReferralQualification', type: 'select', defaultValue: 'FIRST_TASK', options: toOptions(REFERRAL_QUALIFICATIONS) },
        moneyField('defaultReferralQualificationAmount', { admin: { description: 'Only used with "Amount earned".' } }),
        { name: 'defaultReferralPerReferrerLimit', type: 'number', min: 0, defaultValue: 50 },
      ],
    },
    {
      type: 'collapsible',
      label: 'Game defaults',
      fields: [moneyField('defaultGameReward', { defaultValue: 50, admin: { description: 'Suggested reward when creating a new game.' } })],
    },
  ],
}

export const FeatureSettings: GlobalConfig = {
  slug: 'feature-settings',
  label: 'Feature settings',
  admin: { group: 'Settings', description: 'Turn platform features on or off instantly.' },
  access: { read: allow('ADMIN', 'FINANCE_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT'), update: allow('ADMIN') },
  hooks: hooks('feature-settings'),
  fields: [
    { name: 'gamesEnabled', type: 'checkbox', defaultValue: true },
    { name: 'tasksEnabled', type: 'checkbox', defaultValue: true },
    { name: 'campaignsEnabled', type: 'checkbox', defaultValue: true },
    { name: 'referralsEnabled', type: 'checkbox', defaultValue: true },
    { name: 'withdrawalsEnabled', type: 'checkbox', defaultValue: true },
    { name: 'registrationEnabled', type: 'checkbox', defaultValue: true },
    { name: 'maintenanceMode', type: 'checkbox', defaultValue: false, admin: { description: 'Shows a maintenance page to users. Admin panel stays available.' } },
    { name: 'maintenanceMessage', type: 'textarea', defaultValue: 'We are making improvements and will be back shortly.' },
  ],
}

export const LegalSettings: GlobalConfig = {
  slug: 'legal-settings',
  label: 'Legal',
  admin: { group: 'Settings' },
  access: { read: allow('ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT', 'FINANCE_ADMIN'), update: allow('ADMIN', 'CONTENT_MANAGER') },
  hooks: hooks('legal-settings'),
  fields: [
    { name: 'terms', type: 'richText', label: 'Terms & conditions' },
    { name: 'privacyPolicy', type: 'richText' },
    { name: 'refundPolicy', type: 'richText' },
    { name: 'responsibleUse', type: 'richText', label: 'Responsible use policy' },
  ],
}
