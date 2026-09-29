import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { REFERRAL_QUALIFICATIONS, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { moneyField, schedule } from '@/utilities/fields'

export const ReferralRules: CollectionConfig = {
  slug: 'referral-rules',
  labels: { singular: 'Referral rule', plural: 'Referral rules' },
  admin: {
    group: 'Campaigns & Referrals',
    useAsTitle: 'name',
    defaultColumns: ['name', 'isActive', 'qualification', 'referrerReward', 'startsAt', 'endsAt', 'priority'],
    description:
      'A new sign-up with a referral code is bound to the highest-priority rule that is active at that moment. If none is active, the defaults in Reward settings apply.',
  },
  access: { read: allow(...ROLES.operationsRead), create: allow('ADMIN'), update: allow('ADMIN'), delete: allow('ADMIN') },
  hooks: {
    ...auditCollectionHooks('referral-rules', { created: 'CAMPAIGN_CREATED', updated: 'CAMPAIGN_UPDATED', deleted: 'CAMPAIGN_DELETED' }),
    beforeChange: [
      ({ data }) => {
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) throw new APIError('The end time must be after the start time.', 400)
        if (data.qualification === 'AMOUNT_EARNED' && !(data.qualificationAmount > 0)) throw new APIError('Set the amount the referred user must earn.', 400)
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'priority', type: 'number', defaultValue: 0, admin: { description: 'Higher priority wins when several rules are active.' } },
    { name: 'campaign', type: 'relationship', relationTo: 'campaigns', admin: { description: 'Optional: link this rule to a campaign for reporting.' } },
    ...schedule(),
    moneyField('referrerReward', { required: true, defaultValue: 1000, admin: { description: 'Paid to the person who referred.' } }),
    moneyField('refereeReward', { defaultValue: 0, admin: { description: 'Optional welcome bonus paid to the new user when they qualify.' } }),
    {
      name: 'qualification',
      type: 'select',
      required: true,
      defaultValue: 'FIRST_TASK',
      options: [
        { label: 'Registration (reward immediately on sign-up)', value: 'REGISTRATION' },
        { label: 'Verified account', value: 'VERIFIED_ACCOUNT' },
        { label: 'First completed task', value: 'FIRST_TASK' },
        { label: 'First completed game', value: 'FIRST_GAME' },
        { label: 'Earned at least an amount', value: 'AMOUNT_EARNED' },
      ],
    },
    moneyField('qualificationAmount', { admin: { condition: (d) => d?.qualification === 'AMOUNT_EARNED' } }),
    { name: 'perReferrerLimit', type: 'number', min: 0, defaultValue: 50, admin: { description: 'Max rewarded referrals per referrer. 0 = unlimited.' } },
    { name: 'globalLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Max rewarded referrals under this rule. 0 = unlimited.' } },
  ],
}
