import type { CollectionConfig, PayloadHandler } from 'payload'
import { ADMIN_ROLES, toOptions } from '@/constants'
import { fieldAllow, hasRole, isAdminUser, superAdminOnly } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'

const prod = process.env.NODE_ENV === 'production'

/** Built-in Payload auth endpoints are replaced by /api/admins/* (rate limited, status aware). */
const useAppAuthRoutes: PayloadHandler = () =>
  Response.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Use the application auth endpoints.' } }, { status: 404 })

/** Staff accounts for the Payload admin panel. End users live in the separate `users` collection. */
export const Admins: CollectionConfig = {
  slug: 'admins',
  labels: { singular: 'Admin', plural: 'Admins' },
  admin: {
    useAsTitle: 'email',
    group: 'System',
    defaultColumns: ['email', 'name', 'roles', 'isActive', 'lastLoginAt'],
    description: 'Staff who can sign in to this admin panel. Only Super admins can manage staff accounts.',
  },
  auth: {
    tokenExpiration: 60 * 60 * 12,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: { secure: prod, sameSite: 'Lax' },
  },
  endpoints: [
    { path: '/login', method: 'post', handler: useAppAuthRoutes },
    { path: '/forgot-password', method: 'post', handler: useAppAuthRoutes },
    { path: '/reset-password', method: 'post', handler: useAppAuthRoutes },
    { path: '/unlock', method: 'post', handler: useAppAuthRoutes },
  ],
  access: {
    admin: ({ req }) => isAdminUser(req.user),
    create: superAdminOnly,
    delete: superAdminOnly,
    read: ({ req }) => {
      if (!isAdminUser(req.user)) return false
      if (hasRole(req.user, [])) return true // SUPER_ADMIN
      return { id: { equals: req.user!.id } }
    },
    update: ({ req }) => {
      if (!isAdminUser(req.user)) return false
      if (hasRole(req.user, [])) return true
      return { id: { equals: req.user!.id } }
    },
  },
  hooks: {
    ...auditCollectionHooks('admins', { created: 'ADMIN_CREATED', updated: 'ADMIN_UPDATED', deleted: 'ADMIN_UPDATED' }),
    beforeLogin: [
      ({ user }) => {
        if ((user as { isActive?: boolean }).isActive === false) throw new Error('This admin account has been deactivated.')
      },
    ],
    // afterLogin: [
    //   async ({ req, user }) => {
    //     const lastLoginAt = user.lastLoginAt
    //       ? new Date(user.lastLoginAt).getTime()
    //       : 0

    //     const now = Date.now()

    //     if (lastLoginAt && now - lastLoginAt < 5 * 60 * 1000) {
    //       return
    //     }

    //     console.time('admin-last-login-update')

    //     try {
    //       await req.payload.update({
    //         collection: 'admins',
    //         id: user.id,
    //         data: {
    //           lastLoginAt: new Date().toISOString(),
    //         },
    //         overrideAccess: true,
    //         context: {
    //           skipAudit: true,
    //         },
    //       })
    //     } catch (error) {
    //       console.error('Failed to update lastLoginAt:', error)
    //     }

    //     console.timeEnd('admin-last-login-update')
    //   },
    // ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['SUPPORT_AGENT'],
      options: toOptions(ADMIN_ROLES),
      access: { create: fieldAllow(), update: fieldAllow() },
      admin: {
        description:
          'SUPER_ADMIN: everything · ADMIN: users, tasks, games, campaigns · FINANCE_ADMIN: wallets, transactions, withdrawals · CONTENT_MANAGER: banners, campaigns, media, content · SUPPORT_AGENT: read-only user support data',
      },
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true, access: { update: fieldAllow() } },
    { name: 'lastLoginAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
  ],
}
