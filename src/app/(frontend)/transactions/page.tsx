'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Gamepad2,
  Gift,
  Users,
  Sparkles,
  Trophy,
  Clock,
  Undo,
  Wallet,
} from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'

interface WalletData {
  wallet: {
    availableBalance: number
    pendingBalance: number
    lifetimeEarned: number
    lifetimeWithdrawn: number
    currency: string
  }
  transactions: {
    id: number
    type: string
    amount: number
    description: string
    createdAt: string
  }[]
}

const TX_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  TASK_REWARD: { label: 'Task reward', icon: <ClipboardList size={16} /> },
  GAME_REWARD: { label: 'Game reward', icon: <Gamepad2 size={16} /> },
  CAMPAIGN_REWARD: { label: 'Campaign reward', icon: <Gift size={16} /> },
  REFERRAL_REWARD: { label: 'Referral bonus', icon: <Users size={16} /> },
  BONUS: { label: 'Bonus', icon: <Sparkles size={16} /> },
  WITHDRAWAL: { label: 'Withdrawal', icon: <TrendingDown size={16} /> },
  REFUND: { label: 'Refund', icon: <Undo size={16} /> },
  ADMIN_CREDIT: { label: 'Admin credit', icon: <Trophy size={16} /> },
  ADMIN_DEBIT: { label: 'Admin debit', icon: <TrendingDown size={16} /> },
  REVERSAL: { label: 'Reversal', icon: <Undo size={16} /> },
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const [txs, setTxs] = useState<WalletData['transactions'] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTxs(null)
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get<WalletData>('/wallet')
      .then((d) => setTxs(d.transactions))
      .catch(() => setTxs(null))
      .finally(() => setLoading(false))
  }, [user])

  const grouped = useMemo(() => {
    if (!txs) return null
    const now = Date.now()
    const today: typeof txs = []
    const yesterday: typeof txs = []
    const earlier: typeof txs = []
    txs.forEach((tx) => {
      const diffDays = Math.floor((now - new Date(tx.createdAt).getTime()) / 86_400_000)
      if (diffDays === 0) today.push(tx)
      else if (diffDays === 1) yesterday.push(tx)
      else earlier.push(tx)
    })
    return { today, yesterday, earlier }
  }, [txs])

  if (!user) {
    return (
      <AppShell showBack>
        <EmptyState
          title="Sign in to see your transactions"
          action={
            <Link href="/login">
              <button className="mt-3 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2 text-sm font-bold text-slate-900">
                Sign In
              </button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  const renderGroup = (label: string, items: WalletData['transactions']) => {
    if (items.length === 0) return null
    return (
      <div key={label} className="space-y-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">{label}</h3>
        {items.map((tx) => {
          const cfg = TX_CONFIG[tx.type] || { label: tx.type, icon: <Wallet size={16} /> }
          const isCredit = tx.amount >= 0
          return (
            <Card key={tx.id} className="border-[#1F2E45] bg-[#0E1726] p-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isCredit ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
                  }`}
                >
                  {cfg.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{tx.description || cfg.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">{cfg.label}</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[11px] text-slate-500">{relativeTime(tx.createdAt)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-sm font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCredit ? '+' : ''}{money(Math.abs(tx.amount))}
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <AppShell >
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-cyan-600 p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <ArrowUpDown size={22} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">Transaction History</h2>
              <p className="mt-0.5 text-sm text-cyan-200/80">All earnings and withdrawals in one place</p>
            </div>
          </div>
        </div>

        {/* ── Transaction Groups ── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-700/50" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-4 w-2/3 rounded bg-slate-700/50" />
                    <div className="h-3 w-1/2 rounded bg-slate-700/50" />
                  </div>
                  <div className="h-4 w-16 rounded bg-slate-700/50" />
                </div>
              {/* </div> */}
            </Card>
          ))}
          </div>
        ) : !grouped ? (
          <EmptyState title="No transactions yet" body="Your transaction history will appear here once you start earning." />
        ) : grouped.today.length === 0 && grouped.yesterday.length === 0 && grouped.earlier.length === 0 ? (
          <EmptyState title="No transactions yet" body="Your transaction history will appear here once you start earning." />
        ) : (
          <div className="space-y-5">
            {renderGroup('Today', grouped.today)}
            {renderGroup('Yesterday', grouped.yesterday)}
            {renderGroup('Earlier', grouped.earlier)}
          </div>
        )}
      </div>
    </AppShell>
  )
}
