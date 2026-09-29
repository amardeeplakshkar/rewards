import type { CollectionConfig } from 'payload'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { schedule } from '@/utilities/fields'

const audit = auditCollectionHooks('announcements', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' })
const cache = invalidateCollectionCache('announcements')

export const Announcements: CollectionConfig = {
  slug: 'announcements',
  labels: { singular: 'Announcement', plural: 'Announcements' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'severity', 'isActive', 'isPinned', 'publishedAt'] },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.isActive && !originalDoc?.publishedAt && !data.publishedAt) data.publishedAt = new Date().toISOString()
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'textarea', required: true },
    {
      name: 'severity',
      type: 'select',
      defaultValue: 'INFO',
      options: [
        { label: 'Info', value: 'INFO' },
        { label: 'Success', value: 'SUCCESS' },
        { label: 'Warning', value: 'WARNING' },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
    ...schedule(),
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'isPinned', type: 'checkbox', defaultValue: false },
    { name: 'publishedAt', type: 'date', admin: { readOnly: true } },
  ],
}
