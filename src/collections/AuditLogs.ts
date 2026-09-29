import type { CollectionConfig } from 'payload'
import { AUDIT_ACTIONS, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { immutableRecord } from '@/hooks/immutable'

const RO = { readOnly: true } as const

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit log', plural: 'Audit logs' },
  admin: {
    group: 'System',
    useAsTitle: 'action',
    defaultColumns: ['createdAt', 'action', 'actorLabel', 'collectionSlug', 'documentId', 'ip'],
    listSearchableFields: ['actorLabel', 'documentId', 'collectionSlug'],
    description: 'Append-only record of sensitive operations.',
  },
  access: { read: allow(...ROLES.audit), create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['collectionSlug', 'documentId'] }, { fields: ['action', 'createdAt'] }],
  hooks: immutableRecord('Audit log', { requireContextFlag: 'auditWrite' }),
  fields: [
    { name: 'admin', type: 'relationship', relationTo: 'admins', index: true, admin: RO },
    { name: 'actorLabel', type: 'text', admin: RO },
    { name: 'action', type: 'select', required: true, index: true, options: toOptions(AUDIT_ACTIONS), admin: RO },
    { name: 'collectionSlug', type: 'text', index: true, admin: RO },
    { name: 'documentId', type: 'text', index: true, admin: RO },
    { name: 'before', type: 'json', admin: RO },
    { name: 'after', type: 'json', admin: RO },
    { name: 'metadata', type: 'json', admin: RO },
    { name: 'ip', type: 'text', admin: RO },
    { name: 'userAgent', type: 'text', admin: RO },
  ],
}
