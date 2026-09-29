import type { CollectionConfig } from 'payload'
import { REFERRAL_STATUSES, toOptions } from '@/constants'
import { allow, fieldAllow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const Referrals: CollectionConfig = {
  slug: 'referrals',
  labels: { singular: 'Referral', plural: 'Referrals' },
  admin: {
    group: 'Campaigns & Referrals',
    useAsTitle: 'id',
    defaultColumns: ['registeredAt', 'referrer', 'referredUser', 'status', 'qualifiedAt', 'rewardedAt'],
    description: 'Set a PENDING referral to REJECTED to block a suspected fake referral. Payouts are made automatically by the platform.',
  },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: allow('ADMIN'), delete: () => false },
  indexes: [{ fields: ['referrer', 'status'] }],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        if (req.context?.serviceWrite) return data
        if (data.status && data.status !== originalDoc?.status) {
          if (originalDoc?.status !== 'PENDING' || data.status !== 'REJECTED') throw new Error('Staff can only reject PENDING referrals.')
          data.rejectedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'referrer', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'referredUser', type: 'relationship', relationTo: 'users', required: true, unique: true, index: true, admin: RO },
    { name: 'code', type: 'text', required: true, admin: RO },
    { name: 'status', type: 'select', required: true, defaultValue: 'PENDING', index: true, options: toOptions(REFERRAL_STATUSES), access: { update: fieldAllow('ADMIN') } },
    { name: 'rule', type: 'relationship', relationTo: 'referral-rules', admin: RO },
    { name: 'terms', type: 'json', admin: { ...RO, description: 'Snapshot of the reward terms at registration.' } },
    { name: 'registeredAt', type: 'date', required: true, admin: RO },
    { name: 'qualifiedAt', type: 'date', admin: RO },
    { name: 'rewardedAt', type: 'date', admin: RO },
    { name: 'rejectedAt', type: 'date', admin: RO },
    { name: 'rejectionReason', type: 'text', access: { update: fieldAllow('ADMIN') } },
    moneyField('referrerReward', { admin: RO }),
    moneyField('refereeReward', { admin: RO }),
    { name: 'referrerTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'refereeTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
  ],
}
