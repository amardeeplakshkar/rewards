import type { CollectionConfig } from 'payload'
import { toOptions, GAME_SESSION_STATUSES, GAME_RESULTS } from '@/constants'
import { allow, fieldAllow, ROLES } from '@/access'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const GameSessions: CollectionConfig = {
  slug: 'game-sessions',
  labels: { singular: 'Game session', plural: 'Game sessions' },
  admin: {
    group: 'Games',
    useAsTitle: 'sessionId',
    defaultColumns: ['startedAt', 'user', 'game', 'status', 'score', 'result', 'rewardAmount'],
    listSearchableFields: ['sessionId'],
    description: 'Every play is persisted. Results are computed and validated on the server.',
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: () => false,
    update: () => false,
    delete: allow(), // SUPER_ADMIN housekeeping only
  },
  indexes: [
    { fields: ['user', 'game', 'createdAt'] },
    { fields: ['user', 'dayKey'] },
    { fields: ['game', 'createdAt'] },
  ],
  fields: [
    { name: 'sessionId', type: 'text', required: true, unique: true, index: true, admin: RO },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'game', type: 'relationship', relationTo: 'games', required: true, index: true, admin: RO },
    { name: 'status', type: 'select', required: true, index: true, options: toOptions(GAME_SESSION_STATUSES), defaultValue: 'STARTED', admin: RO },
    { name: 'startedAt', type: 'date', required: true, admin: RO },
    { name: 'endedAt', type: 'date', admin: RO },
    { name: 'expiresAt', type: 'date', required: true, admin: RO },
    { name: 'dayKey', type: 'text', index: true, admin: { ...RO, description: 'Calendar day (in the site timezone) used for daily limits.' } },
    { name: 'score', type: 'number', admin: RO },
    { name: 'maxScore', type: 'number', admin: RO },
    { name: 'scorePercent', type: 'number', admin: RO },
    { name: 'result', type: 'select', options: toOptions(GAME_RESULTS), admin: RO },
    { name: 'attempts', type: 'number', defaultValue: 0, admin: RO },
    moneyField('rewardAmount', { admin: RO }),
    { name: 'transaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'rounds', type: 'json', admin: { ...RO, description: 'Client-safe breakdown of questions / rounds.' } },
    { name: 'rejectionReason', type: 'text', admin: RO },
    // Contains answers — visible to super admins only, never returned to end users.
    { name: 'serverState', type: 'json', access: { read: fieldAllow() }, admin: { ...RO, description: 'Server-side state (answers). Super admin only.' } },
    { name: 'ip', type: 'text', admin: RO },
    { name: 'userAgent', type: 'text', admin: RO },
    { name: 'device', type: 'text', admin: RO },
  ],
}
