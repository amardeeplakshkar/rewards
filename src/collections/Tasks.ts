import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { TASK_STATUSES, TASK_VERIFICATION_TYPES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { moneyField, schedule, slugify } from '@/utilities/fields'

const audit = auditCollectionHooks('tasks', { created: 'TASK_CREATED', updated: 'TASK_UPDATED', deleted: 'TASK_DELETED' })
const cache = invalidateCollectionCache('tasks')

export const Tasks: CollectionConfig = {
  slug: 'tasks',
  labels: { singular: 'Task', plural: 'Tasks' },
  admin: {
    group: 'Earning',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'rewardAmount', 'startsAt', 'endsAt', 'featured', 'priority'],
    listSearchableFields: ['title', 'slug'],
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow('ADMIN'),
    update: allow('ADMIN'),
    delete: allow('ADMIN'),
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data) return data
        if (!data.slug && data.title) data.slug = slugify(data.title)
        if (typeof data.slug === 'string') data.slug = slugify(data.slug)
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
          throw new APIError('The end time must be after the start time.', 400)
        }
        const v = data.verification ?? originalDoc?.verification
        if (v?.type === 'TIMER' && !(v.timerSeconds > 0)) throw new APIError('Set how many seconds the user must wait (timer verification).', 400)
        if (v?.type === 'ANSWER_CODE' && !v.answerCode) throw new APIError('Set the secret answer/code users must enter.', 400)
        if (data.status === 'ACTIVE' && !originalDoc?.publishedAt && !data.publishedAt) data.publishedAt = new Date().toISOString()
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
            { name: 'title', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { description: 'Auto-generated from the title.' } },
            { name: 'description', type: 'textarea', required: true, admin: { description: 'Short summary shown on the task card.' } },
            { name: 'instructions', type: 'textarea', admin: { description: 'Step-by-step instructions shown on the task page. Line breaks are preserved.' } },
            { name: 'icon', type: 'upload', relationTo: 'media', label: 'Icon / image' },
          ],
        },
        {
          label: 'Reward',
          fields: [
            moneyField('rewardAmount', { required: true, min: 1, defaultValue: 100 }),
            {
              name: 'rewardType',
              type: 'select',
              defaultValue: 'CASH',
              options: [
                { label: 'Cash reward (ledger: Task reward)', value: 'CASH' },
                { label: 'Bonus (ledger: Bonus)', value: 'BONUS' },
              ],
            },
          ],
        },
        {
          label: 'Limits',
          fields: [
            { name: 'perUserLimit', type: 'number', min: 1, defaultValue: 1, required: true, admin: { description: 'How many times each user can complete this task in total.' } },
            { name: 'perUserDailyLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: '0 = no daily cap per user.' } },
            { name: 'cooldownMinutes', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Minimum minutes between two completions by the same user.' } },
            { name: 'dailyLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Max completions per day across all users. 0 = unlimited.' } },
            { name: 'totalLimit', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Max completions across all users. 0 = unlimited.' } },
          ],
        },
        {
          label: 'Schedule & status',
          fields: [
            { name: 'status', type: 'select', options: toOptions(TASK_STATUSES), defaultValue: 'DRAFT', required: true, index: true },
            { name: 'isActive', type: 'checkbox', defaultValue: true, admin: { description: 'Master switch. Untick to hide immediately regardless of status.' } },
            ...schedule(),
            { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
          ],
        },
        {
          label: 'Eligibility',
          fields: [
            {
              name: 'eligibility',
              type: 'group',
              fields: [
                { name: 'minAccountAgeDays', type: 'number', min: 0, defaultValue: 0 },
                { name: 'requireVerifiedAccount', type: 'checkbox', defaultValue: false },
                { name: 'requirePayoutMethod', type: 'checkbox', defaultValue: false },
                moneyField('minLifetimeEarned', { admin: { description: 'Users must have earned at least this much.' } }),
              ],
            },
          ],
        },
        {
          label: 'Verification',
          fields: [
            {
              name: 'verification',
              type: 'group',
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  defaultValue: 'NONE',
                  options: [
                    { label: 'None — reward when the user taps Complete', value: 'NONE' },
                    { label: 'Timer — user must wait before completing', value: 'TIMER' },
                    { label: 'Answer / code — user enters a secret code', value: 'ANSWER_CODE' },
                    { label: 'Text submission — user submits text, auto-accepted', value: 'TEXT_SUBMISSION' },
                    { label: 'Manual review — staff approve before payout', value: 'MANUAL_REVIEW' },
                  ],
                },
                { name: 'timerSeconds', type: 'number', min: 1, admin: { condition: (_, s) => s?.type === 'TIMER' } },
                { name: 'answerCode', type: 'text', admin: { condition: (_, s) => s?.type === 'ANSWER_CODE', description: 'Case-insensitive. Never shown to users.' } },
                { name: 'submissionPrompt', type: 'text', admin: { condition: (_, s) => ['TEXT_SUBMISSION', 'MANUAL_REVIEW'].includes(s?.type), description: 'What the user should submit, e.g. "Paste your username".' } },
              ],
            },
          ],
        },
        {
          label: 'Display',
          fields: [
            { name: 'featured', type: 'checkbox', defaultValue: false, index: true },
            { name: 'priority', type: 'number', defaultValue: 0, admin: { description: 'Higher priority is listed first.' } },
            { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { description: 'Tie-breaker. Lower comes first.' } },
          ],
        },
      ],
    },
  ],
}
