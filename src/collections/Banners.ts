import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { schedule } from '@/utilities/fields'

const audit = auditCollectionHooks('banners', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' })
const cache = invalidateCollectionCache('banners')

export const Banners: CollectionConfig = {
  slug: 'banners',
  labels: { singular: 'Banner', plural: 'Banners' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'isActive', 'startsAt', 'endsAt', 'sortOrder'] },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) throw new APIError('The end time must be after the start time.', 400)
        const url = data.ctaUrl as string | undefined
        if (url && !(url.startsWith('/') && !url.startsWith('//')) && !/^https:\/\//i.test(url)) {
          throw new APIError('The button destination must be an in-app path (e.g. /earn) or an https:// URL.', 400)
        }
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'ctaLabel', type: 'text', label: 'Button label' },
    { name: 'ctaUrl', type: 'text', label: 'Button destination', admin: { description: 'In-app path like /earn or /promotions, or a full https:// URL.' } },
    ...schedule(),
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
    { name: 'sortOrder', type: 'number', defaultValue: 0 },
  ],
}
