import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { DEFAULT_CURRENCY, toOptions, WALLET_STATUSES } from '@/constants'
import { allow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

/**
 * One wallet per user. Balances are DERIVED state — they may only be changed by WalletService, which
 * always writes a matching ledger row in the same transaction. Direct edits (REST, admin UI, other code)
 * are rejected by the beforeChange guard below.
 */
export const Wallets: CollectionConfig = {
  slug: 'wallets',
  labels: { singular: 'Wallet', plural: 'Wallets' },
  admin: {
    group: 'Users & Wallets',
    useAsTitle: 'id',
    defaultColumns: ['user', 'availableBalance', 'pendingBalance', 'lifetimeEarned', 'lifetimeWithdrawn', 'status'],
    description: 'Read-only. Use Wallet adjustments to credit, debit or reverse funds — every change is ledgered and audited.',
  },
  access: {
    read: allow(...ROLES.financeRead),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['user'], unique: true }],
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (!req.context?.walletWrite) {
          throw new APIError('Wallet balances can only be changed through WalletService.', 403)
        }
        for (const k of ['availableBalance', 'pendingBalance', 'lifetimeEarned', 'lifetimeWithdrawn'] as const) {
          const v = data[k]
          if (v !== undefined && (!Number.isSafeInteger(v) || v < 0)) throw new APIError(`${k} must be a non-negative integer`, 500)
        }
        if (operation === 'create') {
          for (const k of ['availableBalance', 'pendingBalance', 'lifetimeEarned', 'lifetimeWithdrawn'] as const) {
            if (data[k]) throw new APIError('Wallets must be created empty.', 500)
          }
        }
        return data
      },
    ],
    beforeDelete: [() => { throw new APIError('Wallets cannot be deleted.', 403) }],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true, index: true, admin: { readOnly: true } },
    moneyField('availableBalance', { admin: { readOnly: true, description: 'Spendable balance in paise.' } }),
    moneyField('pendingBalance', { admin: { readOnly: true, description: 'Funds held for withdrawals that are not yet settled.' } }),
    moneyField('lifetimeEarned', { admin: { readOnly: true } }),
    moneyField('lifetimeWithdrawn', { admin: { readOnly: true } }),
    { name: 'currency', type: 'text', defaultValue: DEFAULT_CURRENCY, required: true, admin: { readOnly: true } },
    { name: 'status', type: 'select', options: toOptions(WALLET_STATUSES), defaultValue: 'ACTIVE', required: true, index: true, admin: { readOnly: true } },
  ],
}
