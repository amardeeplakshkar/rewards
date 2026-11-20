'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Copy, Share2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/AuthProvider'
import { goldBtn, goldCard, goldHeader } from '@/components/gold'
import { api, ApiError } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'

interface Level { registered: number; qualified: number; rewarded: number; registeredToday: number }
interface Agency {
  referralCode: string
  shareUrl: string
  direct: Level
  team: Level
  commission: { total: number; yesterday: number; today: number }
  recent: { id: number; status: string; registeredAt: string | null; referrerReward: number }[]
}

const STATUS: Record<string, string> = { PENDING: 'text-slate-400', QUALIFIED: 'text-sky-400', REWARDED: 'text-[#F5B82E]', REJECTED: 'text-red-400' }

export default function AgencyPage() {
  const { user } = useAuth()
  const [data, setData] = useState<Agency | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    api.get<Agency>('/referrals/agency').then(setData).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load referrals'))
  }, [user])

  const copy = (text: string, label: string) =>
    navigator.clipboard?.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => toast.error('Copy failed'))

  const share = async () => {
    if (!data) return
    if (navigator.share) await navigator.share({ title: 'Join me', url: data.shareUrl }).catch(() => null)
    else copy(data.shareUrl, 'Invitation link')
  }

  if (!user) {
    return (
      <AppShell>
        <EmptyState title="Sign in to see your referrals" action={<Link href="/login"><Button size="sm" className="mt-2">Sign in</Button></Link>} />
      </AppShell>
    )
  }

  return (
    <AppShell hideHeader bleed>
      <section className={`${goldHeader} safe-top px-4 pb-24 pt-3 text-center`}>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => window.history.back()} aria-label="Go back" className="text-[#F5B82E]"><ChevronLeft size={24} /></button>
          <h1 className="text-lg font-semibold text-white">Agency</h1>
          <span className="w-6" />
        </div>
        <p className="mt-5 text-4xl font-black text-[#F5B82E]">{data ? money(data.commission.yesterday) : '···'}</p>
        <span className="mt-2 inline-block rounded-full bg-[#F5B82E]/20 px-4 py-1 text-xs text-[#FFD978]">Yesterday&apos;s total commission</span>
        <p className="mt-2 text-[11px] text-slate-400">
          Today {data ? money(data.commission.today) : '···'} · All time {data ? money(data.commission.total) : '···'}
        </p>
      </section>

      <div className="-mt-20 space-y-3 px-3 pb-6">
        {error && <p className={`${goldCard} p-4 text-center text-sm text-slate-400`}>{error}</p>}

        <section className={`${goldCard} overflow-hidden`}>
          <div className="grid grid-cols-2 bg-gradient-to-b from-[#FFD978] to-[#C98A12] text-center text-sm font-semibold text-[#1A1205]">
            <span className="py-2">Direct referrals</span>
            <span className="py-2">Team referrals</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/5">
            {[data?.direct, data?.team].map((lvl, i) => (
              <div key={i} className="space-y-2 p-3 text-center">
                <Stat value={lvl?.registered} label="Registered" />
                <Stat value={lvl?.registeredToday} label="Joined today" className="text-emerald-400" />
                <Stat value={lvl?.qualified} label="Qualified" className="text-sky-400" />
                <Stat value={lvl?.rewarded} label="Rewarded" className="text-[#F5B82E]" />
              </div>
            ))}
          </div>
        </section>

        <button type="button" onClick={share} disabled={!data} className={`${goldBtn} flex w-full items-center justify-center gap-2 py-3 text-sm uppercase tracking-wide`}>
          <Share2 size={16} /> Invitation link
        </button>

        <section className={`${goldCard} divide-y divide-white/5`}>
          <button type="button" disabled={!data} onClick={() => data && copy(data.referralCode, 'Invitation code')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            <UserPlus size={20} className="text-[#F5B82E]" />
            <span className="flex-1 text-sm text-white">Copy invitation code</span>
            <span className="text-sm text-slate-400">{data?.referralCode ?? '···'}</span>
            <Copy size={16} className="text-slate-500" />
          </button>
          <button type="button" disabled={!data} onClick={() => data && copy(data.shareUrl, 'Invitation link')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            <Copy size={20} className="text-[#F5B82E]" />
            <span className="flex-1 truncate text-sm text-white">{data?.shareUrl ?? 'Invitation link'}</span>
          </button>
        </section>

        <section className={`${goldCard} p-4`}>
          <p className="text-sm font-bold text-white">Recent invites</p>
          {!data?.recent.length ? (
            <p className="py-6 text-center text-xs text-slate-500">No invites yet. Share your link to get started.</p>
          ) : (
            <ul className="mt-2 divide-y divide-white/5">
              {data.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    <span className={`block font-semibold ${STATUS[r.status] ?? 'text-white'}`}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</span>
                    <span className="block text-[11px] text-slate-500">{r.registeredAt ? relativeTime(r.registeredAt) : ''}</span>
                  </span>
                  <span className="font-bold text-[#F5B82E]">{r.referrerReward ? `+${money(r.referrerReward)}` : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function Stat({ value, label, className = 'text-white' }: { value?: number; label: string; className?: string }) {
  return (
    <div>
      <p className={`text-lg font-bold ${className}`}>{value ?? '···'}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  )
}
