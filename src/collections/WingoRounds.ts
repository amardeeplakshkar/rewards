import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'

const readOnly = { readOnly: true } as const

export const WingoRounds: CollectionConfig = {
  slug: 'wingo-rounds',
  labels: { singular: 'Wingo round', plural: 'Wingo rounds' },
  admin: { group: 'Games', useAsTitle: 'periodKey', defaultColumns: ['periodKey', 'mode', 'status', 'startAt', 'endsAt', 'winningNumber'] },
  access: { read: allow(...ROLES.operationsRead), create: () => false, update: () => false, delete: allow() },
  indexes: [{ fields: ['periodKey'], unique: true }, { fields: ['mode', 'status', 'endsAt'] }],
  fields: [
    { name: 'periodKey', type: 'text', required: true, unique: true, index: true, admin: readOnly },
    { name: 'mode', type: 'select', required: true, options: [{ label: '30 seconds', value: '30s' }, { label: '1 minute', value: '1m' }, { label: '3 minutes', value: '3m' }, { label: '5 minutes', value: '5m' }], index: true, admin: readOnly },
    { name: 'status', type: 'select', required: true, defaultValue: 'OPEN', options: [{ label: 'Open', value: 'OPEN' }, { label: 'Settled', value: 'SETTLED' }], index: true, admin: readOnly },
    { name: 'startAt', type: 'date', required: true, index: true, admin: readOnly },
    { name: 'bettingClosesAt', type: 'date', required: true, index: true, admin: readOnly },
    { name: 'endsAt', type: 'date', required: true, index: true, admin: readOnly },
    { name: 'winningNumber', type: 'number', min: 0, max: 9, admin: readOnly },
    { name: 'settledAt', type: 'date', admin: readOnly },
    { name: 'settlementVersion', type: 'number', defaultValue: 1, admin: readOnly },
  ],
}
