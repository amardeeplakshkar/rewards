import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'

/**
 * Append-only guard used by the ledger and audit log. Works even with `overrideAccess: true`, so no code path
 * (other than raw SQL, which the DB triggers in scripts/apply-db-guards.ts also block) can rewrite history.
 */
export const immutableRecord = (label: string, opts: { requireContextFlag?: string } = {}) => {
  const beforeChange: CollectionBeforeChangeHook = ({ operation, data, req }) => {
    if (operation === 'update') throw new APIError(`${label} records are immutable and cannot be modified.`, 403)
    if (opts.requireContextFlag && !req.context?.[opts.requireContextFlag]) {
      throw new APIError(`${label} records can only be created by the platform services.`, 403)
    }
    return data
  }
  const beforeDelete: CollectionBeforeDeleteHook = () => {
    throw new APIError(`${label} records are immutable and cannot be deleted.`, 403)
  }
  return { beforeChange: [beforeChange], beforeDelete: [beforeDelete] }
}
