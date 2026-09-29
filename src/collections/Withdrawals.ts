import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { PAYOUT_METHOD_TYPES, toOptions, WITHDRAWAL_STATUSES } from '@/constants'
import { allow, fieldAllow, hasRole, ROLES } from '@/access'
import { asApiError } from '@/utilities/api-error'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const Withdrawals: CollectionConfig = {
  slug: 'withdrawals',
  labels: { singular: 'Withdrawal', plural: 'Withdrawals' },
  admin: {
    group: 'Finance',
    useAsTitle: 'id',
    defaultColumns: ['requestedAt', 'user', 'amount', 'method', 'status', 'transactionReference'],
    listSearchableFields: ['transactionReference', 'idempotencyKey'],
    description:
      'Workflow: PENDING → UNDER_REVIEW → APPROVED → PROCESSING → COMPLETED. Rejecting, failing or cancelling refunds the held funds automatically. Amounts can never be edited.',
  },
  access: {
    read: allow(...ROLES.financeRead),
    create: () => false, // created only by WithdrawalService
    update: allow('FINANCE_ADMIN'),
    delete: () => false,
  },
  indexes: [
    { fields: ['user', 'status'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['user', 'requestedAt'] },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        if (operation !== 'update' || !originalDoc) return data
        if (req.context?.serviceWrite) return data
        if (!hasRole(req.user, ['FINANCE_ADMIN'])) throw new APIError('Only finance admins can process withdrawals.', 403)
        const { prepareStatusChange } = await import('@/services/withdrawal')
        return asApiError(async () => prepareStatusChange({ data, originalDoc, adminId: req.user?.id as number }))
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !previousDoc || doc.status === previousDoc.status) return doc
        const { applyStatusEffects } = await import('@/services/withdrawal')
        await asApiError(() => applyStatusEffects({ payload: req.payload, req, withdrawal: doc, from: previousDoc.status }))
        return doc
      },
    ],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'wallet', type: 'relationship', relationTo: 'wallets', required: true, admin: RO },
    moneyField('amount', { required: true, min: 1, admin: RO }),
    { name: 'currency', type: 'text', required: true, admin: RO },
    { name: 'method', type: 'select', required: true, options: toOptions(PAYOUT_METHOD_TYPES), admin: RO },
    { name: 'payoutMethod', type: 'relationship', relationTo: 'payout-methods', admin: RO },
    { name: 'payoutSummary', type: 'text', admin: { ...RO, description: 'Masked destination for support staff.' } },
    // Encrypted snapshot of the destination at request time. Only finance roles can read it.
    { name: 'payoutDetailsEncrypted', type: 'text', access: { read: fieldAllow('FINANCE_ADMIN'), create: () => false, update: () => false }, admin: { hidden: true } },
    {
      name: 'payoutDetails',
      type: 'json',
      virtual: true,
      access: { read: fieldAllow('FINANCE_ADMIN'), create: () => false, update: () => false },
      admin: { readOnly: true, description: 'Decrypted destination — visible to finance admins only. Every view of this page should be treated as sensitive.' },
      hooks: {
        afterRead: [
          async ({ siblingData }) => {
            const enc = (siblingData as { payoutDetailsEncrypted?: string }).payoutDetailsEncrypted
            if (!enc) return undefined
            try {
              const { decrypt } = await import('@/lib/crypto')
              return JSON.parse(decrypt(enc))
            } catch {
              return { error: 'Unable to decrypt payout details' }
            }
          },
        ],
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'PENDING',
      options: toOptions(WITHDRAWAL_STATUSES),
      access: { update: fieldAllow('FINANCE_ADMIN') },
    },
    { name: 'failureReason', type: 'text', access: { update: fieldAllow('FINANCE_ADMIN') }, admin: { description: 'Required when rejecting or failing. Shown to the user.' } },
    { name: 'transactionReference', type: 'text', index: true, access: { update: fieldAllow('FINANCE_ADMIN') }, admin: { description: 'Bank UTR / payout reference. Required to mark COMPLETED.' } },
    { name: 'adminNote', type: 'textarea', access: { update: fieldAllow('FINANCE_ADMIN') }, admin: { description: 'Internal note, never shown to the user.' } },
    { name: 'requestedAt', type: 'date', required: true, index: true, admin: RO },
    { name: 'reviewedAt', type: 'date', admin: RO },
    { name: 'processedAt', type: 'date', admin: RO },
    { name: 'completedAt', type: 'date', admin: RO },
    { name: 'rejectedAt', type: 'date', admin: RO },
    { name: 'failedAt', type: 'date', admin: RO },
    { name: 'cancelledAt', type: 'date', admin: RO },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'admins', admin: RO },
    { name: 'debitTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'refundTransaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'idempotencyKey', type: 'text', required: true, unique: true, index: true, admin: RO },
    { name: 'metadata', type: 'json', admin: RO },
  ],
}
