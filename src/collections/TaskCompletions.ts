import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { TASK_COMPLETION_STATUSES, toOptions } from '@/constants'
import { allow, fieldAllow, ROLES } from '@/access'
import { asApiError } from '@/utilities/api-error'
import { moneyField } from '@/utilities/fields'

const RO = { readOnly: true } as const

export const TaskCompletions: CollectionConfig = {
  slug: 'task-completions',
  labels: { singular: 'Task completion', plural: 'Task completions' },
  admin: {
    group: 'Earning',
    useAsTitle: 'id',
    defaultColumns: ['task', 'user', 'status', 'rewardAmount', 'startedAt', 'completedAt'],
    description: 'Submissions awaiting review appear with status SUBMITTED. Set the status to COMPLETED to pay out or REJECTED to decline.',
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: () => false,
    update: allow('ADMIN'),
    delete: () => false,
  },
  indexes: [
    { fields: ['user', 'task'] },
    { fields: ['task', 'completedAt'] },
    { fields: ['task', 'user', 'attemptNumber'], unique: true },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        if (operation !== 'update' || !originalDoc || req.context?.serviceWrite) return data
        // Manual review transitions only.
        if (data.status && data.status !== originalDoc.status) {
          if (originalDoc.status !== 'SUBMITTED') throw new APIError('Only SUBMITTED completions can be reviewed.', 400)
          if (!['COMPLETED', 'REJECTED'].includes(data.status)) throw new APIError('Review result must be COMPLETED or REJECTED.', 400)
          if (data.status === 'REJECTED' && !data.rejectionReason) throw new APIError('Add a rejection reason.', 400)
          data.reviewedAt = new Date().toISOString()
          data.reviewedBy = req.user?.id
          if (data.status === 'REJECTED') data.rejectedAt = data.reviewedAt
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || req.context?.serviceWrite) return doc
        if (previousDoc?.status === 'SUBMITTED' && doc.status === 'COMPLETED') {
          const { approveSubmittedCompletion } = await import('@/services/task')
          await asApiError(() => approveSubmittedCompletion({ payload: req.payload, req, completionId: doc.id }))
        } else if (previousDoc?.status === 'SUBMITTED' && doc.status === 'REJECTED') {
          const { logAudit } = await import('@/services/audit')
          await logAudit({ payload: req.payload, req, action: 'TASK_COMPLETION_REVIEWED', collection: 'task-completions', documentId: doc.id, after: { status: 'REJECTED', reason: doc.rejectionReason } })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'task', type: 'relationship', relationTo: 'tasks', required: true, index: true, admin: RO },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: RO },
    { name: 'attemptNumber', type: 'number', required: true, defaultValue: 1, admin: RO },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'STARTED',
      options: toOptions(TASK_COMPLETION_STATUSES),
      access: { update: fieldAllow('ADMIN') },
    },
    { name: 'startedAt', type: 'date', required: true, admin: RO },
    { name: 'submittedAt', type: 'date', admin: RO },
    { name: 'completedAt', type: 'date', index: true, admin: RO },
    { name: 'rejectedAt', type: 'date', admin: RO },
    { name: 'submission', type: 'textarea', admin: RO },
    moneyField('rewardAmount', { admin: RO }),
    { name: 'transaction', type: 'relationship', relationTo: 'wallet-transactions', admin: RO },
    { name: 'rejectionReason', type: 'text', access: { update: fieldAllow('ADMIN') } },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'admins', admin: RO },
    { name: 'reviewedAt', type: 'date', admin: RO },
    { name: 'ip', type: 'text', admin: RO },
    { name: 'device', type: 'text', admin: RO },
  ],
}
