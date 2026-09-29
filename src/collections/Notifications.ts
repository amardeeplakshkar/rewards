import type { CollectionConfig } from 'payload'
import { NOTIFICATION_TYPES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: { singular: 'Notification', plural: 'Notifications' },
  admin: { group: 'Users & Wallets', useAsTitle: 'title', defaultColumns: ['createdAt', 'user', 'type', 'title', 'readAt'] },
  access: { read: allow(...ROLES.userAdmins), create: () => false, update: () => false, delete: allow() },
  indexes: [{ fields: ['user', 'readAt', 'createdAt'] }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
    { name: 'type', type: 'select', required: true, options: toOptions(NOTIFICATION_TYPES), index: true, admin: { readOnly: true } },
    { name: 'title', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'body', type: 'textarea', admin: { readOnly: true } },
    { name: 'data', type: 'json', admin: { readOnly: true } },
    { name: 'readAt', type: 'date', index: true, admin: { readOnly: true } },
    { name: 'dedupeKey', type: 'text', unique: true, index: true, admin: { readOnly: true, description: 'Prevents duplicate notifications for the same event.' } },
    { name: 'channels', type: 'json', admin: { readOnly: true, description: 'Delivery status per channel (in-app now; email/push/Telegram later).' } },
  ],
}
