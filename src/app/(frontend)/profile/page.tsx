'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell, CalendarCheck, ChevronRight, CircleHelp, Copy, Gamepad2, Gift, History, LogOut, ReceiptText,
  RefreshCw, Settings, User2Icon, Users, Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money } from '@/lib/format'

interface WalletStats { availableBalance: number; pendingBalance: number; lifetimeEarned: number; lifetimeWithdrawn: number }

const card = 'rounded-2xl border border-[#F5B82E]/12 bg-[#111827]'
const goldBtn = 'rounded-full bg-gradient-to-b from-[#FFD978] via-[#F5B82E] to-[#C98A12] font-bold text-[#1A1205] shadow-[0_0_12px_rgba(245,184,46,0.35)] transition active:scale-95'

const QUICK = [
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/wallet', label: 'Withdraw', icon: RefreshCw },
  { href: '/rewards', label: 'Rewards', icon: Gift },
  { href: '/referrals', label: 'Invite', icon: Users },
]

const HISTORY = [
  { href: '/game-history', title: 'Game history', sub: 'My game history', icon: Gamepad2 },
  { href: '/transactions', title: 'Transactions', sub: 'My transaction history', icon: ReceiptText },
  { href: '/checkin', title: 'Check-in', sub: 'Daily attendance bonus', icon: CalendarCheck },
  { href: '/wallet', title: 'Withdraw', sub: 'My withdraw history', icon: History },
]

const MENU = [
  { href: '/notifications', title: 'Notifications', icon: Bell },
  { href: '/gift', title: 'Gifts', icon: Gift },
  { href: '/referrals', title: 'Agency', icon: Users },
  { href: '/settings', title: 'Settings', icon: Settings },
  { href: '/support', title: 'Help & support', icon: CircleHelp },
]

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [wallet, setWallet] = useState<WalletStats | null>(null)

  const load = () => {
    api.get<{ wallet: WalletStats }>('/wallet').then((d) => setWallet(d.wallet)).catch(() => null)
  }
  useEffect(() => { if (user) load() }, [user])

  if (!user) {
    return (
      <AppShell>
        <EmptyState title="Sign in to see your account" action={<Link href="/login"><Button size="sm" className="mt-2">Sign in</Button></Link>} />
      </AppShell>
    )
  }

  const copyUid = () => {
    navigator.clipboard?.writeText(String(user.id)).then(() => toast.success('UID copied')).catch(() => null)
  }

  return (
    <AppShell hideHeader bleed>
      {/* Gold header block */}
      <section className="safe-top relative rounded-b-[2rem] bg-gradient-to-br from-[#3A2A06] via-[#1E1606] to-[#0B0F17] px-4 pb-24 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD978] to-[#C98A12] p-[3px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#111827] text-[#F5B82E]">
              <User2Icon size={28} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold uppercase text-white">{user.name}</p>
            <button type="button" onClick={copyUid} className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#F5B82E]/20 px-2.5 py-0.5 text-[11px] text-[#FFD978]">
              UID <span className="opacity-50">|</span> {user.id} <Copy size={11} />
            </button>
            <p className="mt-1 truncate text-[11px] text-slate-400">{user.email}</p>
            {user.lastLoginAt && (
              <p className="truncate text-[11px] text-slate-500">Last login: {new Date(user.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            )}
          </div>
        </div>
      </section>

      <div className="-mt-20 space-y-3 px-3 pb-6">
        {/* Balance card */}
        <section className={`${card} p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total balance</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-2xl font-black text-[#F5B82E]">{wallet ? money(wallet.availableBalance) : '···'}</span>
                <button type="button" onClick={load} aria-label="Refresh balance" className="text-slate-500"><RefreshCw size={15} /></button>
              </div>
            </div>
            <Link href="/wallet" className={`${goldBtn} px-4 py-2 text-xs`}>Enter wallet</Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center">
            <Stat label="Earned" value={wallet?.lifetimeEarned} />
            <Stat label="Withdrawn" value={wallet?.lifetimeWithdrawn} />
            <Stat label="Pending" value={wallet?.pendingBalance} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/5 pt-3">
            {QUICK.map(({ href, label, icon: Icon }) => (
              <Link key={label} href={href} className="flex flex-col items-center gap-1.5 text-[12px] text-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5B82E]/15 text-[#F5B82E]"><Icon size={20} /></span>
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* History tiles */}
        <section className="grid grid-cols-2 gap-2.5">
          {HISTORY.map(({ href, title, sub, icon: Icon }) => (
            <Link key={title} href={href} className={`${card} flex items-center gap-3 p-3`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#FFD978] to-[#C98A12] text-[#1A1205]"><Icon size={20} /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-white">{title}</span>
                <span className="block truncate text-[11px] text-slate-400">{sub}</span>
              </span>
            </Link>
          ))}
        </section>

        {/* Menu */}
        <section className={`${card} divide-y divide-white/5 overflow-hidden`}>
          {MENU.map(({ href, title, icon: Icon }) => (
            <Link key={title} href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-white/5">
              <Icon size={20} className="text-[#F5B82E]" />
              <span className="flex-1 text-[14px] text-white">{title}</span>
              <ChevronRight size={18} className="text-slate-500" />
            </Link>
          ))}
        </section>

        <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-full border border-[#F5B82E]/40 py-3 text-sm font-semibold text-[#F5B82E] active:bg-white/5">
          <LogOut size={18} /> Log out
        </button>
      </div>
    </AppShell>
  )
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <p className="text-[13px] font-bold text-white">{value === undefined ? '···' : money(value)}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  )
}
