import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const CampaignClaims: CollectionConfig = {
  slug: 'campaign-claims',
  labels: { singular: 'Campaign claim', plural: 'Campaign claims' },
  admin: { group: 'Campaigns & Referrals', useAsTitle: 'id', defaultColumns: ['claimedAt', 'campaign', 'user', 'rewardAmount'] },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: () => false, delete: () => false },
  indexes: [
    { fields: ['campaign', 'user', 'claimNumber'], unique: true },
    { fields: ['user', 'claimedAt'] },
  ],
  fields: [
    { name: 'campaign', type: 'relationship', relationTo: 'campaigns', required: true, index: true, admin: RO },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'claimNumber', type: 'number', required: true, admin: RO },
    moneyField('rewardAmount', { admin: RO }),
    { name: 'transaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'claimedAt', type: 'date', required: true, index: true, admin: RO },
    { name: 'progress', type: 'json', admin: RO },
  ],
}
