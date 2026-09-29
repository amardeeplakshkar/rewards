'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'
import { WithdrawDialog } from './WithdrawDialog'

interface Wallet { availableBalance: number; pendingBalance: number; lifetimeEarned: number; lifetimeWithdrawn: number }
interface Tx { id: number; type: string; amount: number; description: string; createdAt: string }
interface Withdrawal { id: number; amount: number; method: string; status: string; requestedAt: string; failureReason?: string | null }

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
}

export default function WalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [txs, setTxs] = useState<Tx[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [tab, setTab] = useState<'activity' | 'withdrawals'>('activity')

  const load = () => {
    api.get<{ wallet: Wallet; transactions: Tx[] }>('/wallet').then((d) => {
      setWallet(d.wallet)
      setTxs(d.transactions)
    })
    api.get<{ withdrawals: Withdrawal[] }>('/withdrawals').then((d) => setWithdrawals(d.withdrawals))
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  const cancel = async (id: number) => {
    try {
      await api.post(`/withdrawals/${id}/cancel`)
      toast.success('Withdrawal cancelled')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not cancel this withdrawal.')
    }
  }

  if (!user) {
    return (
      <AppShell title="Wallet">
        <EmptyState title="Sign in to see your wallet" body="Track earnings and request withdrawals once you're signed in." />
      </AppShell>
    )
  }

  return (
    <AppShell title="Wallet">
      <div className="pb-8 pt-1">
        {!wallet ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <Card className="bg-ink px-6 py-6 text-paper">
              <p className="text-[13px] text-paper/60">Available balance</p>
              <p className="num mt-1 text-[38px] leading-none">{money(wallet.availableBalance)}</p>
              <div className="mt-4 flex gap-4 text-[13px] text-paper/70">
                <span>Held: <span className="num">{money(wallet.pendingBalance)}</span></span>
                <span>Lifetime earned: <span className="num">{money(wallet.lifetimeEarned)}</span></span>
              </div>
              <WithdrawDialog available={wallet.availableBalance} onDone={load} />
            </Card>

            <div className="mt-6 flex gap-1 rounded-control bg-(--app-dark)-dim p-1">
              <button onClick={() => setTab('activity')} className={`flex-1 rounded-chip py-2 text-[13px] font-medium ${tab === 'activity' ? 'bg-surface' : 'text-ink-faint'}`}>Activity</button>
              <button onClick={() => setTab('withdrawals')} className={`flex-1 rounded-chip py-2 text-[13px] font-medium ${tab === 'withdrawals' ? 'bg-surface' : 'text-ink-faint'}`}>Withdrawals</button>
            </div>

            <div className="mt-4 space-y-2">
              {tab === 'activity' ? (
                txs.length === 0 ? (
                  <EmptyState title="No activity yet" body="Complete a task or play a game to see it here." />
                ) : (
                  txs.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border-b border-ink/8 py-2.5">
                      <div>
                        <p className="text-[14px]">{t.description}</p>
                        <p className="text-[12px] text-ink-faint">{relativeTime(t.createdAt)}</p>
                      </div>
                      <p className={`num text-[15px] ${t.amount >= 0 ? 'text-banyan-deep' : 'text-ink-soft'}`}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</p>
                    </div>
                  ))
                )
              ) : withdrawals.length === 0 ? (
                <EmptyState title="No withdrawals yet" body="Requested withdrawals will appear here." />
              ) : (
                withdrawals.map((w) => (
                  <Card key={w.id} className="p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="num text-[16px]">{money(w.amount)}</p>
                      <span className="rounded-full bg-(--app-dark)-dim px-2.5 py-0.5 text-[12px]">{STATUS_LABEL[w.status] ?? w.status}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-faint">{w.method} · {relativeTime(w.requestedAt)}</p>
                    {w.failureReason ? <p className="mt-1 text-[12px] text-coral">{w.failureReason}</p> : null}
                    {w.status === 'PENDING' ? (
                      <button onClick={() => cancel(w.id)} className="mt-2 text-[12px] text-ink-faint underline">Cancel request</button>
                    ) : null}
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
