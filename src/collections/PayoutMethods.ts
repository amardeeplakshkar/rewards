import type { CollectionConfig } from 'payload'
import { PAYOUT_METHOD_TYPES, toOptions } from '@/constants'
import { allow, fieldAllow, ROLES } from '@/access'

const RO = { readOnly: true } as const

/**
 * A user's saved payout destinations. Account numbers / UPI IDs are AES-256-GCM encrypted at rest; only a
 * masked form is stored in the clear.
 */
export const PayoutMethods: CollectionConfig = {
  slug: 'payout-methods',
  labels: { singular: 'Payout method', plural: 'Payout methods' },
  admin: { group: 'Finance', useAsTitle: 'label', defaultColumns: ['user', 'type', 'maskedDetails', 'isDefault', 'status'] },
  access: { read: allow(...ROLES.financeRead), create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['user', 'status'] }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'type', type: 'select', required: true, options: toOptions(PAYOUT_METHOD_TYPES), admin: RO },
    { name: 'label', type: 'text', required: true, admin: RO },
    { name: 'holderName', type: 'text', admin: RO },
    { name: 'maskedDetails', type: 'text', required: true, admin: RO },
    { name: 'ifsc', type: 'text', admin: RO },
    { name: 'bankName', type: 'text', admin: RO },
    { name: 'encryptedDetails', type: 'text', required: true, access: { read: fieldAllow('FINANCE_ADMIN') }, admin: { hidden: true } },
    { name: 'fingerprint', type: 'text', index: true, admin: { ...RO, description: 'Hash of the destination, used to detect the same account on several users.' } },
    { name: 'isDefault', type: 'checkbox', defaultValue: false, admin: RO },
    { name: 'status', type: 'select', defaultValue: 'ACTIVE', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Removed', value: 'REMOVED' }], index: true, admin: RO },
    { name: 'removedAt', type: 'date', admin: RO },
  ],
}
