'use client'
import React from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

const LINKS: { label: string; collection: string; field: string }[] = [
  { label: 'Wallet', collection: 'wallets', field: 'user' },
  { label: 'Transactions', collection: 'wallet-transactions', field: 'user' },
  { label: 'Withdrawals', collection: 'withdrawals', field: 'user' },
  { label: 'Payout methods', collection: 'payout-methods', field: 'user' },
  { label: 'Task history', collection: 'task-completions', field: 'user' },
  { label: 'Game history', collection: 'game-sessions', field: 'user' },
  { label: 'Campaign claims', collection: 'campaign-claims', field: 'user' },
  { label: 'Referrals made', collection: 'referrals', field: 'referrer' },
  { label: 'Notifications', collection: 'notifications', field: 'user' },
]

/** Jump-links from a user record to everything that belongs to them. */
export const UserRelatedLinks: React.FC = () => {
  const { id } = useDocumentInfo()
  if (!id) return null
  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Related records</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LINKS.map((l) => (
          <a
            key={l.collection}
            href={`/admin/collections/${l.collection}?where[${l.field}][equals]=${id}`}
            style={{ padding: '6px 12px', border: '1px solid var(--theme-elevation-150)', borderRadius: 6, textDecoration: 'none', color: 'inherit', fontSize: 13 }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  )
}
