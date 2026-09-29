import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { CAMPAIGN_ACTION_TYPES, CAMPAIGN_STATUSES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { moneyField, schedule, slugify } from '@/utilities/fields'

const audit = auditCollectionHooks('campaigns', { created: 'CAMPAIGN_CREATED', updated: 'CAMPAIGN_UPDATED', deleted: 'CAMPAIGN_DELETED' })
const cache = invalidateCollectionCache('campaigns')

export const Campaigns: CollectionConfig = {
  slug: 'campaigns',
  labels: { singular: 'Campaign', plural: 'Campaigns' },
  admin: {
    group: 'Campaigns & Referrals',
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'rewardAmount', 'startsAt', 'endsAt', 'featured'],
    listSearchableFields: ['name', 'slug'],
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.slug && data.name) data.slug = slugify(data.name)
        if (typeof data.slug === 'string') data.slug = slugify(data.slug)
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) throw new APIError('The end time must be after the start time.', 400)
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true, unique: true, index: true },
            { name: 'description', type: 'textarea', required: true },
            { name: 'banner', type: 'upload', relationTo: 'media' },
            { name: 'terms', type: 'richText', label: 'Terms & conditions' },
          ],
        },
        {
          label: 'Reward',
          fields: [
            moneyField('rewardAmount', { required: true, min: 1, defaultValue: 500 }),
            { name: 'rewardType', type: 'select', defaultValue: 'CASH', options: [{ label: 'Cash reward', value: 'CASH' }, { label: 'Bonus', value: 'BONUS' }] },
          ],
        },
        {
          label: 'Required actions',
          fields: [
            {
              name: 'requiredActions',
              type: 'array',
              admin: { description: 'All actions must be met (counted from the campaign start) before a user can claim.' },
              fields: [
                { name: 'type', type: 'select', required: true, options: toOptions(CAMPAIGN_ACTION_TYPES) },
                { name: 'target', type: 'number', required: true, min: 1, defaultValue: 1, admin: { description: 'Count required. For "Amount earned" enter the amount in paise.' } },
                { name: 'task', type: 'relationship', relationTo: 'tasks', admin: { condition: (_, s) => s?.type === 'SPECIFIC_TASK' } },
                { name: 'game', type: 'relationship', relationTo: 'games', admin: { condition: (_, s) => s?.type === 'SPECIFIC_GAME' } },
                { name: 'label', type: 'text', admin: { description: 'Optional friendly label shown to users.' } },
              ],
            },
          ],
        },
        {
          label: 'Eligibility & limits',
          fields: [
            {
              name: 'eligibility',
              type: 'group',
              fields: [
                { name: 'minAccountAgeDays', type: 'number', min: 0, defaultValue: 0 },
                { name: 'requireVerifiedAccount', type: 'checkbox', defaultValue: false },
                { name: 'requirePayoutMethod', type: 'checkbox', defaultValue: false },
                moneyField('minLifetimeEarned'),
              ],
            },
            { name: 'perUserLimit', type: 'number', min: 1, defaultValue: 1, required: true, admin: { description: 'Times one user can claim.' } },
            { name: 'userLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Maximum number of different users who can claim. 0 = unlimited.' } },
            { name: 'globalLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Maximum total claims across all users. 0 = unlimited.' } },
          ],
        },
        {
          label: 'Schedule & status',
          fields: [
            { name: 'status', type: 'select', required: true, index: true, defaultValue: 'DRAFT', options: toOptions(CAMPAIGN_STATUSES) },
            ...schedule({ requiredStart: false }),
            { name: 'featured', type: 'checkbox', defaultValue: false, index: true },
            { name: 'sortOrder', type: 'number', defaultValue: 0 },
            { name: 'startNotifiedAt', type: 'date', admin: { readOnly: true, description: 'Set once the "campaign started" notifications were sent.' } },
            { name: 'endingNotifiedAt', type: 'date', admin: { readOnly: true, description: 'Set once the "ending soon" notifications were sent.' } },
          ],
        },
      ],
    },
  ],
}
