import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'
import type { AuditAction } from '@/constants'
import { diffDocs, snapshot } from '@/utilities/diff'

interface AuditHookConfig {
  created?: AuditAction
  updated?: AuditAction
  deleted?: AuditAction
}

/**
 * Records admin-initiated create/update/delete of a collection document. Changes made by services
 * (end-user actions) are audited explicitly by those services, so we only act when an admin is on the request.
 */
export const auditCollectionHooks = (slug: string, cfg: AuditHookConfig) => {
  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    if ((req.user as { collection?: string } | null)?.collection !== 'admins') return doc
    if (req.context?.skipAudit) return doc
    const { logAudit } = await import('@/services/audit')
    if (operation === 'create') {
      await logAudit({ payload: req.payload, req, action: cfg.created ?? 'OTHER', collection: slug, documentId: doc.id, after: snapshot(doc) })
    } else {
      const diff = diffDocs(previousDoc, doc)
      if (Object.keys(diff.after).length === 0) return doc
      await logAudit({ payload: req.payload, req, action: cfg.updated ?? 'OTHER', collection: slug, documentId: doc.id, ...diff })
    }
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    if ((req.user as { collection?: string } | null)?.collection !== 'admins') return doc
    const { logAudit } = await import('@/services/audit')
    await logAudit({ payload: req.payload, req, action: cfg.deleted ?? 'OTHER', collection: slug, documentId: doc.id, before: snapshot(doc) })
    return doc
  }

  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}

export const auditGlobalHook = (slug: string): GlobalAfterChangeHook => async ({ doc, previousDoc, req }) => {
  const { logAudit } = await import('@/services/audit')
  const diff = diffDocs(previousDoc, doc)
  if (Object.keys(diff.after).length === 0) return doc
  await logAudit({ payload: req.payload, req, action: 'SETTINGS_UPDATED', collection: slug, documentId: slug, ...diff })
  return doc
}
