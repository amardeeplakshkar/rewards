import type { Payload, PayloadRequest } from 'payload'
import type { AuditAction } from '@/constants'
import { getRequestMeta } from '@/lib/request-meta'

export interface AuditInput {
  payload: Payload
  /** Passing the current request joins its transaction and captures admin identity + ip/user-agent. */
  req?: Partial<PayloadRequest>
  action: AuditAction
  collection?: string
  documentId?: string | number | null
  before?: unknown
  after?: unknown
  /** Override the actor when there is no admin on the request (system / end-user initiated). */
  actorLabel?: string
  metadata?: Record<string, unknown>
}

/**
 * Append-only audit trail. The row is written on the same transaction as the operation it describes, so an
 * operation can never commit without its audit entry (or vice-versa).
 */
export async function logAudit(input: AuditInput) {
  const { payload, req } = input
  const user = req?.user as { id: number | string; collection?: string; email?: string } | null | undefined
  const admin = user?.collection === 'admins' ? user : null
  const meta = req?.headers ? getRequestMeta(req.headers) : undefined

  await payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    req: req as PayloadRequest | undefined,
    context: { auditWrite: true },
    data: {
      admin: admin ? (admin.id as number) : undefined,
      actorLabel: input.actorLabel ?? admin?.email ?? (user?.email ? `user:${user.email}` : 'system'),
      action: input.action,
      collectionSlug: input.collection,
      documentId: input.documentId != null ? String(input.documentId) : undefined,
      before: (input.before ?? null) as never,
      after: (input.after ?? null) as never,
      metadata: (input.metadata ?? null) as never,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  })
}
