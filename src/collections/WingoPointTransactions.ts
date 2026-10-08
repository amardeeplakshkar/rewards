import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'

export const WingoPointTransactions: CollectionConfig = {
  slug: 'wingo-point-transactions',
  labels: { singular: 'Wingo points transaction', plural: 'Wingo points transactions' },
  admin: { group: 'Games', useAsTitle: 'id', defaultColumns: ['createdAt', 'user', 'type', 'amount', 'balanceAfter', 'referenceId'] },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['user', 'createdAt'] }, { fields: ['idempotencyKey'], unique: true }, { fields: ['referenceType', 'referenceId'] }],
  hooks: { beforeChange: [({ req, data }) => {
    if (!req.context?.wingoPointLedgerWrite) throw new Error('Wingo points ledger is append-only.')
    return data
  }], beforeDelete: [() => { throw new Error('Wingo points transactions cannot be deleted.') }] },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
    { name: 'type', type: 'select', required: true, options: [{ label: 'Stake', value: 'STAKE' }, { label: 'Payout', value: 'PAYOUT' }, { label: 'Reward grant', value: 'GRANT' }, { label: 'Refund', value: 'REFUND' }], index: true, admin: { readOnly: true } },
    { name: 'amount', type: 'number', required: true, admin: { readOnly: true, description: 'Signed point movement.' } },
    { name: 'balanceBefore', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'balanceAfter', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'referenceType', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'referenceId', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'idempotencyKey', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'description', type: 'text', required: true, admin: { readOnly: true } },
  ],
}
