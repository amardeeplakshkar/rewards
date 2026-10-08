import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'

export const WingoBets: CollectionConfig = {
  slug: 'wingo-bets',
  labels: { singular: 'Wingo bet', plural: 'Wingo bets' },
  admin: { group: 'Games', useAsTitle: 'id', defaultColumns: ['createdAt', 'user', 'mode', 'periodKey', 'type', 'selection', 'stake', 'payout', 'status'] },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: () => false, delete: allow() },
  indexes: [{ fields: ['user', 'createdAt'] }, { fields: ['round', 'status'] }, { fields: ['user', 'periodKey'] }, { fields: ['idempotencyKey'], unique: true }],
  hooks: {
    beforeChange: [({ req, data }) => {
      if (!req.context?.wingoBetWrite) throw new Error('Wingo bets can only be written by WingoService.')
      return data
    }],
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
    { name: 'round', type: 'relationship', relationTo: 'wingo-rounds', required: true, index: true, admin: { readOnly: true } },
    { name: 'periodKey', type: 'text', required: true, index: true, admin: { readOnly: true } },
    { name: 'mode', type: 'select', required: true, options: [{ label: '30 seconds', value: '30s' }, { label: '1 minute', value: '1m' }, { label: '3 minutes', value: '3m' }, { label: '5 minutes', value: '5m' }], index: true, admin: { readOnly: true } },
    { name: 'type', type: 'select', required: true, options: [{ label: 'Number', value: 'number' }, { label: 'Color', value: 'color' }, { label: 'Big / Small', value: 'size' }], admin: { readOnly: true } },
    { name: 'selection', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'stake', type: 'number', required: true, min: 1, admin: { readOnly: true } },
    { name: 'payout', type: 'number', required: true, min: 0, defaultValue: 0, admin: { readOnly: true } },
    { name: 'status', type: 'select', required: true, defaultValue: 'PENDING', options: [{ label: 'Pending', value: 'PENDING' }, { label: 'Won', value: 'WON' }, { label: 'Lost', value: 'LOST' }], index: true, admin: { readOnly: true } },
    { name: 'winningNumber', type: 'number', min: 0, max: 9, admin: { readOnly: true } },
    { name: 'idempotencyKey', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'settledAt', type: 'date', admin: { readOnly: true } },
  ],
}
