import type { CollectionConfig } from 'payload'
import { allow } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: { group: 'Content', useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'isActive', 'createdAt'] },
  access: {
    read: () => true, // images are shown to end users; nothing sensitive lives here
    create: allow('CONTENT_MANAGER', 'ADMIN'),
    update: allow('CONTENT_MANAGER', 'ADMIN'),
    delete: allow('CONTENT_MANAGER', 'ADMIN'),
  },
  hooks: auditCollectionHooks('media', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' }),
  upload: {
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'],
    imageSizes: [
      { name: 'thumbnail', width: 320, height: 320, position: 'centre' },
      { name: 'card', width: 720, height: undefined },
      { name: 'banner', width: 1440, height: undefined },
    ],
    adminThumbnail: 'thumbnail',
    formatOptions: { format: 'webp', options: { quality: 82 } },
    resizeOptions: { width: 2000, withoutEnlargement: true, fit: 'inside' },
    focalPoint: true,
  },
  fields: [
    { name: 'alt', type: 'text', required: true, admin: { description: 'Describe the image for screen readers.' } },
    { name: 'caption', type: 'text' },
    { name: 'isActive', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
