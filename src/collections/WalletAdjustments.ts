import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { allow, hasRole, ROLES } from '@/access'
import { asApiError } from '@/utilities/api-error'
import { moneyField } from '@/utilities/fields'

/**
 * The only supported way for staff to change a balance manually. Creating an adjustment applies the
 * ledger entry, wallet update and audit log atomically with the adjustment record itself.
 */
export const WalletAdjustments: CollectionConfig = {
  slug: 'wallet-adjustments',
  labels: { singular: 'Wallet adjustment', plural: 'Wallet adjustments' },
  admin: {
    group: 'Finance',
    useAsTitle: 'reason',
    defaultColumns: ['createdAt', 'type', 'user', 'amount', 'reason', 'admin'],
    description: 'Manually credit, debit or reverse a transaction. Adjustments cannot be edited or deleted once created.',
  },
  access: {
    read: allow(...ROLES.financeRead),
    create: allow('FINANCE_ADMIN'),
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data) return data
        if (!hasRole(req.user, ['FINANCE_ADMIN'])) throw new APIError('Only finance admins can adjust balances.', 403)
        data.admin = req.user!.id
        data.status = 'APPLIED'
        data.appliedAt = new Date().toISOString()
        if (data.type === 'REVERSAL') {
          if (!data.targetTransaction) throw new APIError('Choose the transaction to reverse.', 400)
        } else {
          if (!data.user) throw new APIError('Choose a user.', 400)
          if (!data.amount || data.amount <= 0) throw new APIError('Enter an amount greater than zero.', 400)
        }
        if (!data.reason || String(data.reason).trim().length < 5) throw new APIError('A clear reason is required (min 5 characters).', 400)
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const { applyAdminAdjustment } = await import('@/services/wallet')
        await asApiError(() => applyAdminAdjustment({ payload: req.payload, req, adjustment: doc }))
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Credit (add funds)', value: 'CREDIT' },
        { label: 'Debit (remove funds)', value: 'DEBIT' },
        { label: 'Reverse a transaction', value: 'REVERSAL' },
      ],
    },
    { name: 'user', type: 'relationship', relationTo: 'users', admin: { condition: (d) => d?.type !== 'REVERSAL' } },
    moneyField('amount', { admin: { condition: (d) => d?.type !== 'REVERSAL' } }),
    {
      name: 'targetTransaction',
      type: 'relationship',
      relationTo: 'wallet-transactions',
      admin: { condition: (d) => d?.type === 'REVERSAL', description: 'The ledger row to reverse. It can be reversed once.' },
    },
    { name: 'reason', type: 'textarea', required: true },
    { name: 'reference', type: 'text', admin: { description: 'Ticket number, complaint id or other reference.' } },
    { name: 'admin', type: 'relationship', relationTo: 'admins', admin: { readOnly: true } },
    { name: 'status', type: 'select', options: [{ label: 'Applied', value: 'APPLIED' }], defaultValue: 'APPLIED', admin: { readOnly: true } },
    { name: 'appliedAt', type: 'date', admin: { readOnly: true } },
    { name: 'resultingTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: { readOnly: true } },
  ],
}
