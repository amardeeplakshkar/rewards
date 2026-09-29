import type { CollectionConfig } from 'payload'
import { toOptions, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '@/constants'
import { allow, ROLES } from '@/access'
import { immutableRecord } from '@/hooks/immutable'
import { signedMoneyField } from '@/utilities/fields'

/** Immutable double-entry-style ledger. One row per balance movement of `availableBalance`. */
export const WalletTransactions: CollectionConfig = {
  slug: 'wallet-transactions',
  labels: { singular: 'Transaction', plural: 'Transactions' },
  admin: {
    group: 'Users & Wallets',
    useAsTitle: 'description',
    defaultColumns: ['createdAt', 'user', 'type', 'amount', 'balanceAfter', 'description'],
    listSearchableFields: ['description', 'referenceId', 'idempotencyKey'],
    description: 'Append-only ledger. Rows can never be edited or deleted.',
  },
  access: {
    read: allow(...ROLES.financeRead),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [
    { fields: ['user', 'createdAt'] },
    { fields: ['type', 'createdAt'] },
    { fields: ['referenceType', 'referenceId'] },
  ],
  hooks: immutableRecord('Ledger', { requireContextFlag: 'ledgerWrite' }),
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'wallet', type: 'relationship', relationTo: 'wallets', required: true, index: true },
    { name: 'type', type: 'select', options: toOptions(TRANSACTION_TYPES), required: true, index: true },
    signedMoneyField('amount', { required: true, admin: { description: 'Signed movement of the available balance, in paise.' } }),
    signedMoneyField('balanceBefore', { required: true }),
    signedMoneyField('balanceAfter', { required: true }),
    { name: 'currency', type: 'text', required: true },
    { name: 'referenceType', type: 'text', index: true },
    { name: 'referenceId', type: 'text', index: true },
    { name: 'description', type: 'text', required: true },
    { name: 'status', type: 'select', options: toOptions(TRANSACTION_STATUSES), defaultValue: 'COMPLETED', required: true },
    { name: 'idempotencyKey', type: 'text', required: true, unique: true, index: true, admin: { description: 'Guarantees a business event is credited at most once.' } },
    { name: 'reversalOf', type: 'relationship', relationTo: 'wallet-transactions', unique: true, index: true },
    { name: 'metadata', type: 'json' },
  ],
}
