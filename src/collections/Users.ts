import type { CollectionConfig, PayloadHandler } from 'payload'
import { APIError } from 'payload'
import { toOptions, USER_STATUSES, DEFAULT_TIMEZONE, type UserStatus } from '@/constants'
import { allow, fieldAllow, hasRole, isAdminUser } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { isValidTimezone } from '@/lib/time'
import { diffDocs } from '@/utilities/diff'

const prod = process.env.NODE_ENV === 'production'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/** Built-in Payload auth endpoints are replaced by /api/auth/* (rate limited, status aware). */
const useAppAuthRoutes: PayloadHandler = () =>
  Response.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Use the application auth endpoints.' } }, { status: 404 })

const auditBase = auditCollectionHooks('users', { created: 'OTHER', updated: 'USER_STATUS_CHANGED', deleted: 'OTHER' })

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  admin: {
    useAsTitle: 'email',
    group: 'Users & Wallets',
    defaultColumns: ['email', 'name', 'status', 'referralCode', 'lastLoginAt', 'createdAt'],
    listSearchableFields: ['email', 'name', 'phone', 'referralCode'],
    description: 'Registered platform users. Use the status field to suspend, block or reactivate an account.',
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    useSessions: true,
    cookies: { secure: prod, sameSite: 'Lax' },
    verify:
      process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
        ? {
            generateEmailSubject: () => 'Verify your email',
            generateEmailHTML: ({ token }) =>
              `<p>Welcome! Confirm your email to start earning.</p><p><a href="${appUrl}/verify?token=${token}">Verify email</a></p>`,
          }
        : false,
    forgotPassword: {
      generateEmailSubject: () => 'Reset your password',
      generateEmailHTML: (args) =>
        `<p>We received a request to reset your password.</p><p><a href="${appUrl}/reset-password?token=${args?.token}">Choose a new password</a></p><p>If this wasn't you, you can ignore this email.</p>`,
    },
  },
  endpoints: [
    { path: '/login', method: 'post', handler: useAppAuthRoutes },
    { path: '/forgot-password', method: 'post', handler: useAppAuthRoutes },
    { path: '/reset-password', method: 'post', handler: useAppAuthRoutes },
    { path: '/first-register', method: 'post', handler: useAppAuthRoutes },
    { path: '/unlock', method: 'post', handler: useAppAuthRoutes },
  ],
  access: {
    admin: () => false, // end users can never open the admin panel
    create: () => false, // registration goes through UserService.register
    read: ({ req }) => {
      if (hasRole(req.user, ['ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN'])) return true
      if (req.user?.collection === 'users') return { id: { equals: req.user.id } }
      return false
    },
    update: allow('ADMIN'),
    delete: allow(), // SUPER_ADMIN only — prefer status = DELETED
  },
  hooks: {
    afterDelete: auditBase.afterDelete,
    beforeLogin: [
      ({ user }) => {
        const status = (user as { status?: UserStatus }).status
        if (status === 'BLOCKED' || status === 'DELETED') throw new APIError('This account is not allowed to sign in.', 403)
      },
    ],
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (!data) return data
        if (operation === 'create' && !data.referralCode) {
          const { generateUniqueReferralCode } = await import('@/services/user')
          data.referralCode = await generateUniqueReferralCode(req.payload, req)
        }
        if (typeof data.email === 'string') data.email = data.email.trim().toLowerCase()
        if (typeof data.phone === 'string') {
          const digits = data.phone.replace(/[^\d+]/g, '')
          data.phone = digits.length ? digits : undefined
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        // Email verified (Payload flips _verified) → activate.
        if (operation === 'update' && data._verified === true && originalDoc?.status === 'PENDING_VERIFICATION' && !data.status) {
          data.status = 'ACTIVE'
        }
        if (data.status && originalDoc && data.status !== originalDoc.status) {
          data.statusChangedAt = new Date().toISOString()
        }
        if (data.status === 'DELETED' && !data.deletedAt) data.deletedAt = new Date().toISOString()
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'create') {
          const { ensureWallet } = await import('@/services/wallet')
          await ensureWallet(req.payload, doc.id, req)
          return doc
        }
        // Admin status changes are audited with a specific action.
        if (isAdminUser(req.user) && previousDoc && doc.status !== previousDoc.status) {
          const { logAudit } = await import('@/services/audit')
          const action =
            doc.status === 'SUSPENDED' ? 'USER_SUSPENDED'
            : doc.status === 'BLOCKED' ? 'USER_BLOCKED'
            : previousDoc.status === 'SUSPENDED' && doc.status === 'ACTIVE' ? 'USER_UNSUSPENDED'
            : 'USER_STATUS_CHANGED'
          await logAudit({
            payload: req.payload,
            req,
            action,
            collection: 'users',
            documentId: doc.id,
            ...diffDocs({ status: previousDoc.status, statusReason: previousDoc.statusReason }, { status: doc.status, statusReason: doc.statusReason }),
          })
        } else if (isAdminUser(req.user)) {
          const diff = diffDocs(previousDoc, doc)
          if (Object.keys(diff.after).length) {
            const { logAudit } = await import('@/services/audit')
            await logAudit({ payload: req.payload, req, action: 'OTHER', collection: 'users', documentId: doc.id, ...diff })
          }
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text', unique: true, index: true, admin: { description: 'Digits with optional country code, e.g. +919876543210' } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'ACTIVE',
      index: true,
      options: toOptions(USER_STATUSES),
      access: { create: fieldAllow('ADMIN'), update: fieldAllow('ADMIN') },
      admin: { position: 'sidebar', description: 'SUSPENDED users can sign in but cannot earn or withdraw. BLOCKED users cannot sign in.' },
    },
    { name: 'statusReason', type: 'text', access: { update: fieldAllow('ADMIN') }, admin: { position: 'sidebar', description: 'Internal note about why the status changed.' } },
    { name: 'statusChangedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'referralCode', type: 'text', unique: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'timezone',
      type: 'text',
      defaultValue: DEFAULT_TIMEZONE,
      validate: (v: unknown) => (typeof v === 'string' && isValidTimezone(v)) || 'Use a valid IANA timezone, e.g. Asia/Kolkata',
      admin: { description: 'IANA timezone used to display dates to this user.' },
    },
    { name: 'phoneVerified', type: 'checkbox', defaultValue: false, access: { update: fieldAllow('ADMIN') } },
    { name: 'termsAcceptedAt', type: 'date', admin: { readOnly: true } },
    { name: 'registrationIp', type: 'text', admin: { readOnly: true } },
    { name: 'lastLoginAt', type: 'date', admin: { readOnly: true } },
    { name: 'lastLoginIp', type: 'text', admin: { readOnly: true } },
    { name: 'deletedAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'relatedRecords',
      type: 'ui',
      admin: { components: { Field: '/components/admin/UserRelatedLinks#UserRelatedLinks' } },
    },
  ],
}
