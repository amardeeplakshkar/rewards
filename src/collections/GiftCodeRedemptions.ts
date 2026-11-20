import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const GiftCodeRedemptions: CollectionConfig = {
  slug: 'gift-code-redemptions',
  labels: { singular: 'Gift code redemption', plural: 'Gift code redemptions' },
  admin: { group: 'Campaigns & Referrals', useAsTitle: 'id', defaultColumns: ['redeemedAt', 'giftCode', 'user', 'amount'] },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['giftCode', 'user'], unique: true }],
  fields: [
    { name: 'giftCode', type: 'relationship', relationTo: 'gift-codes', required: true, index: true, admin: RO },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'code', type: 'text', required: true, admin: RO },
    moneyField('amount', { admin: RO }),
    { name: 'transaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'redeemedAt', type: 'date', required: true, index: true, admin: RO },
  ],
}
