'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Coins, Gift, Gamepad2, ClipboardList, Users, Sparkles, Trophy, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  REFUND: { label: 'Refund', icon: <Trophy size={16} /> },
  ADMIN_CREDIT: { label: 'Admin credit', icon: <Trophy size={16} /> },
}

const EARNING_TYPES = new Set(Object.keys(TX_CONFIG))

export default function RewardsPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletData['wallet'] | null>(null)
  const [rewards, setRewards] = useState<WalletData['transactions'] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setWallet(null)
      setRewards(null)
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get<WalletData>('/wallet')
      .then((d) => {
        setWallet(d.wallet)
        const earnings = d.transactions.filter((t) => EARNING_TYPES.has(t.type) && t.amount > 0)
        setRewards(earnings)
      })
      .catch(() => {
        setWallet(null)
        setRewards(null)
      })
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <AppShell showBack>
        <EmptyState
          title="Sign in to see your rewards"
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

  return (
    <AppShell>
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-700 to-teal-600 p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Trophy size={22} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">My Rewards</h2>
              <p className="mt-0.5 text-sm text-purple-200/80">Your complete reward history and balance</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-2 -bottom-2 text-3xl opacity-20">
            <Coins size={32} />
          </div>
        </div>

        {/* ── Wallet Summary ── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl bg-slate-800/50" />
            ))}
          </div>
        ) : wallet ? (
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-[#1F2E45] bg-[#0D1526] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Available Balance</span>
              <div className="mt-1 text-2xl font-black text-amber-400">{money(wallet.availableBalance)}</div>
            </Card>
            <Card className="border-[#1F2E45] bg-[#0D1526] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Lifetime Earned</span>
              <div className="mt-1 text-2xl font-black text-emerald-400">{money(wallet.lifetimeEarned)}</div>
            </Card>
            <Card className="border-[#1F2E45] bg-[#0D1526] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Total Withdrawn</span>
              <div className="mt-1 text-2xl font-black text-slate-300">{money(wallet.lifetimeWithdrawn)}</div>
            </Card>
            <Card className="border-[#1F2E45] bg-[#0D1526] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Pending</span>
              <div className="mt-1 text-2xl font-black text-orange-400">{money(wallet.pendingBalance)}</div>
            </Card>
          </div>
        ) : null}

        {/* ── Rewards List ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-white">Reward History</h3>
            <Link href="/transactions" className="text-[12px] font-medium text-amber-400/80 hover:text-amber-300">
              See all transactions <ArrowRight size={12} />
            </Link>
          </div>

          {!rewards ? (
            <EmptyState title="No rewards yet" body="Complete tasks, play games, and refer friends to start earning." />
          ) : rewards.length === 0 ? (
            <EmptyState title="No rewards yet" body="Complete tasks, play games, and refer friends to start earning." />
          ) : (
            <div className="space-y-2">
              {rewards.map((tx) => {
                const cfg = TX_CONFIG[tx.type] || { label: tx.type, icon: <Coins size={16} /> }
                return (
                  <Card key={tx.id} className="border-[#1F2E45] bg-[#0E1726] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {cfg.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{tx.description || cfg.label}</p>
                        <p className="text-[11px] text-slate-500">{cfg.label} · {relativeTime(tx.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-bold text-emerald-400">+{money(tx.amount)}</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
