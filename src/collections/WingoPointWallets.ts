import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { allow, ROLES } from '@/access'

export const WingoPointWallets: CollectionConfig = {
  slug: 'wingo-point-wallets',
  labels: { singular: 'Wingo points wallet', plural: 'Wingo points wallets' },
  admin: { group: 'Games', useAsTitle: 'id', defaultColumns: ['user', 'balance', 'updatedAt'], description: 'Virtual game points only. Not withdrawable and not convertible to currency.' },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['user'], unique: true }],
  hooks: { beforeChange: [({ req, data }) => {
    if (!req.context?.wingoPointsWrite) throw new APIError('Wingo points can only be changed by WingoPointService.', 403)
    if (data.balance !== undefined && (!Number.isSafeInteger(data.balance) || data.balance < 0)) throw new APIError('Points balance must be a non-negative integer.', 400)
    return data
  }] },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'balance', type: 'number', required: true, min: 0, defaultValue: 0, admin: { readOnly: true } },
  ],
}
