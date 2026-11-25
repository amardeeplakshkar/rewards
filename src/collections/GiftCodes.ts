import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

export const GiftCodes: CollectionConfig = {
  slug: 'gift-codes',
  labels: { singular: 'Gift code', plural: 'Gift codes' },
  admin: {
    group: 'Campaigns & Referrals',
    useAsTitle: 'code',
    defaultColumns: ['code', 'amount', 'redemptionCount', 'maxRedemptions', 'isActive', 'expiresAt'],
    description: 'Codes users redeem on the Gift page. Each user can redeem a code once; the amount is credited as a bonus.',
  },
  access: { read: allow(...ROLES.operationsRead), create: allow('ADMIN', 'FINANCE_ADMIN'), update: allow('ADMIN', 'FINANCE_ADMIN'), delete: allow('ADMIN') },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && typeof data.code === 'string') data.code = data.code.trim().toUpperCase()
        return data
      },
    ],
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (v: unknown) => (typeof v === 'string' && /^[A-Z0-9-]{3,32}$/.test(v) ? true : 'Use 3-32 letters, digits or dashes.'),
    },
    moneyField('amount', { required: true, min: 1, admin: { description: 'Credited to the user on redemption (paise).' } }),
    { name: 'maxRedemptions', type: 'number', min: 0, defaultValue: 0, admin: { description: 'Total redemptions allowed across all users. 0 = unlimited.' } },
    { name: 'redemptionCount', type: 'number', defaultValue: 0, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true, admin: { position: 'sidebar' } },
    { name: 'startsAt', type: 'date', admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'expiresAt', type: 'date', admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'note', type: 'text', admin: { description: 'Internal note (not shown to users).' } },
  ],
}
