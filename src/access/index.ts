import type { Access, FieldAccess, Where } from 'payload'
import type { AdminRole } from '@/constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = any

/** True for staff accounts (the `admins` collection) that are active. End users are never "admin users". */
export const isAdminUser = (user: AnyUser): boolean => Boolean(user && user.collection === 'admins' && user.isActive !== false)

/** SUPER_ADMIN implicitly satisfies every role check. */
export const hasRole = (user: AnyUser, roles: readonly AdminRole[]): boolean => {
  if (!isAdminUser(user)) return false
  const owned: AdminRole[] = user.roles ?? []
  if (owned.includes('SUPER_ADMIN')) return true
  return roles.some((r) => owned.includes(r))
}

/** Collection-level access: allow the listed roles (plus SUPER_ADMIN). */
export const allow =
  (...roles: AdminRole[]): Access =>
  ({ req }) =>
    hasRole(req.user, roles)

/** Field-level access: allow the listed roles (plus SUPER_ADMIN). */
export const fieldAllow =
  (...roles: AdminRole[]): FieldAccess =>
  ({ req }) =>
    hasRole(req.user, roles)

export const denyAll: Access = () => false
export const denyField: FieldAccess = () => false

/** Everyone in the admin panel may sign in; per-collection access restricts what they see. */
export const anyAdmin: Access = ({ req }) => isAdminUser(req.user)

export const superAdminOnly = allow()

/** Role groups reused across collections so the permission matrix lives in one place. */
export const ROLES = {
  userAdmins: ['ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN'] as AdminRole[],
  financeRead: ['FINANCE_ADMIN', 'SUPPORT_AGENT', 'ADMIN'] as AdminRole[],
  finance: ['FINANCE_ADMIN'] as AdminRole[],
  operations: ['ADMIN'] as AdminRole[],
  operationsRead: ['ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN', 'CONTENT_MANAGER'] as AdminRole[],
  content: ['CONTENT_MANAGER', 'ADMIN'] as AdminRole[],
  support: ['SUPPORT_AGENT'] as AdminRole[],
  audit: ['ADMIN', 'FINANCE_ADMIN'] as AdminRole[],
}

