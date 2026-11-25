import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const AttendanceClaims: CollectionConfig = {
  slug: 'attendance-claims',
  labels: { singular: 'Check-in', plural: 'Daily check-ins' },
  admin: { group: 'Campaigns & Referrals', useAsTitle: 'id', defaultColumns: ['claimedAt', 'user', 'streakDay', 'amount'] },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['user', 'dayKey'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'dayKey', type: 'text', required: true, index: true, admin: { ...RO, description: 'Calendar day (YYYY-MM-DD) in the site timezone.' } },
    { name: 'streakDay', type: 'number', required: true, admin: RO },
    moneyField('amount', { admin: RO }),
    { name: 'transaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'claimedAt', type: 'date', required: true, index: true, admin: RO },
  ],
}
