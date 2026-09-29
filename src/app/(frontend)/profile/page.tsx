'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, CircleHelp, Gift, LogOutIcon, ReceiptText, Settings, User2Icon, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money } from '@/lib/format'
import { Card } from '@/components/ui/card'

interface WalletData {
  wallet: {
    availableBalance: number
    pendingBalance: number
    lifetimeEarned: number
    lifetimeWithdrawn: number
  }
}

interface ReferralData {
  referralCode: string
  shareUrl: string
  totalReferred: number
  totalRewarded: number
  totalEarned: number
}

const menuItems: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  iconBg: string
  iconRing: string
}[] = [
  {
    icon: <Gift/>,
    title: 'My Rewards',
    description: 'View your earned rewards',
    href: '/rewards',
    iconBg: 'bg-purple-500/20',
    iconRing: 'border-purple-500/30',
  },

  {
    icon: <ReceiptText/>,
    title: 'Transaction History',
    description: 'Check your earnings & withdrawals',
    href: '/transactions',
    iconBg: 'bg-blue-500/20',
    iconRing: 'border-blue-500/30',
  },

  {
    icon: <Users/>,
    title: 'My Referrals',
    description: 'Friends you invited',
    href: '/referrals',
    iconBg: 'bg-amber-500/20',
    iconRing: 'border-amber-500/30',
  },

  {
    icon: <Settings/>,
    title: 'Settings',
    description: 'Manage your account',
    href: '/settings',
    iconBg: 'bg-emerald-500/20',
    iconRing: 'border-emerald-500/30',
  },

  {
    icon: <CircleHelp/>,
    title: 'Help & Support',
    description: 'Get help or contact us',
    href: '/support',
    iconBg: 'bg-purple-500/20',
    iconRing: 'border-purple-500/30',
  },
]

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [walletStats, setWalletStats] = useState({
    availableBalance: null as number | null,
    pendingBalance: null as number | null,
    lifetimeEarned: null as number | null,
    lifetimeWithdrawn: null as number | null,
  })
  const [referral, setReferral] = useState<ReferralData | null>(null)

  useEffect(() => {
    if (!user) return
    api
      .get<WalletData>('/wallet')
      .then((d) =>
        setWalletStats({
          availableBalance: d.wallet.availableBalance,
          pendingBalance: d.wallet.pendingBalance,
          lifetimeEarned: d.wallet.lifetimeEarned,
          lifetimeWithdrawn: d.wallet.lifetimeWithdrawn,
        }),
      )
      .catch(() => null)
    api
      .get<ReferralData>('/referrals')
      .then(setReferral)
      .catch(() => null)
  }, [user])

  if (!user) {
    return (
      <AppShell>
        <EmptyState
          title="Sign in to see your profile"
          action={
            <Link href="/login">
              <Button size="sm" className="mt-2">
                Sign in
              </Button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4 pb-8 pt-1">
        {/* ── User Info Card ── */}
        <div className="bg-[#0E1726] border border-[#1F2E45] rounded-2xl p-5">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative w-[60px] h-[60px] rounded-full ring-[3px] ring-amber-400/70 overflow-hidden flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-amber-600 via-amber-800 to-slate-900 flex items-center justify-center text-2xl">
                <User2Icon size={16}/>
              </div>
            </div>

            {/* Name & username */}
            <h2 className="mt-3 text-lg font-bold text-white">{user.name}</h2>
            {/* Bio */}
            <p className="mt-2 text-[13px] text-slate-300">
              Keep playing, keep earning! 🚀
            </p>
          </div>
        </div>

        {/* ── Wallet Balance Card ── */}
        {user && (
          <Card className="rounded-2xl bg-[#0D1526] border border-[#1A263C] p-4 shadow-xl shadow-black/40" data-purpose="wallet-overview">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                  Wallet Balance
                </span>
                <div className="text-2xl font-black text-amber-400 tracking-tight leading-tight mt-0.5">
                  {walletStats === null ? '···' : money(walletStats.availableBalance || 0)}
                </div>
              </div>
              <Link href="/withdraw">
                <button className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl glow-gold-btn transition active:scale-95 shadow-lg shadow-amber-500/20">
                  Withdraw
                </button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/70">
              {/* Total Earned */}
              <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black">
                    ↑
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium truncate">Total Earned</span>
                </div>
                <span className="text-xs font-bold text-white tracking-tight">
                  {walletStats === null ? '···' : money(walletStats.lifetimeEarned || 0)}
                </span>
              </div>

              {/* Total Withdrawn */}
              <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-[9px] font-black">
                    ↓
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium truncate">Total Withdrawn</span>
                </div>
                <span className="text-xs font-bold text-white tracking-tight">
                  {walletStats === null ? '···' : money(walletStats.lifetimeWithdrawn || 0)}
                </span>
              </div>

              {/* Pending */}
              <div className="bg-[#080D18] rounded-xl p-2.5 border border-slate-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[9px] font-black">
                    ⏳
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium truncate">Pending</span>
                </div>
                <span className="text-xs font-bold text-white tracking-tight">
                  {walletStats === null ? '···' : money(walletStats.pendingBalance || 0)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* ── Menu Items ── */}
        <div className="bg-[#0E1726] border border-[#1F2E45] rounded-2xl overflow-hidden divide-y divide-[#1F2E45]">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center px-4 py-3.5 hover:bg-white/[0.02] transition-colors active:bg-white/[0.04]"
            >
              <div
                className={`w-9 h-9 rounded-xl ${item.iconBg} border ${item.iconRing} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-base">{item.icon}</span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {item.description}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
            </Link>
          ))}

          {/* Logout row */}
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3.5 hover:bg-white/[0.02] transition-colors active:bg-white/[0.04]"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-base">
                <LogOutIcon/>
              </span>
            </div>
            <div className="ml-3 flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-red-400">Logout</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sign out from your account
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
          </button>
        </div>
      </div>
    </AppShell>
  )
}
