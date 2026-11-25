'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, Check, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/components/AuthProvider'
import { goldBtn, goldCard, goldHeader } from '@/components/gold'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'

interface Status { enabled: boolean; claimedToday: boolean; currentStreak: number; nextDay: number; todayReward: number; rewards: number[] }

export default function CheckinPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) api.get<Status>('/attendance').then(setStatus).catch(() => null)
  }, [user])

  const claim = async () => {
    setBusy(true)
    try {
      const res = await api.post<{ day: number; amount: number; status: Status }>('/attendance', {})
      toast.success(`Day ${res.day}: ${money(res.amount)} added to your wallet`)
      setStatus(res.status)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not check in')
    } finally {
      setBusy(false)
    }
  }

  // Days shown: the configured schedule (last day repeats after that).
  const days = status?.rewards ?? []
  const done = status ? (status.claimedToday ? status.currentStreak : status.currentStreak) : 0

  return (
    <AppShell hideHeader bleed>
      <section className={`${goldHeader} safe-top px-4 pb-16 pt-4`}>
        <button type="button" onClick={() => window.history.back()} aria-label="Go back" className="text-[#F5B82E]"><ChevronLeft size={24} /></button>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-xl font-black text-white">Attendance bonus</p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-300">The more consecutive days you check in, the bigger the reward. Missing a day starts over at day 1.</p>
          </div>
          <CalendarCheck size={58} strokeWidth={1.4} className="text-[#F5B82E]" />
        </div>
        <p className="mt-4 text-sm text-slate-300">Current streak <span className="text-2xl font-black text-[#F5B82E]">{status?.currentStreak ?? 0}</span> days</p>
      </section>

      <div className="-mt-10 space-y-3 px-3 pb-6">
        {!user ? (
          <section className={`${goldCard} p-4 text-center`}>
            <Link href="/login" className={`${goldBtn} inline-block px-6 py-2 text-sm`}>Sign in to check in</Link>
          </section>
        ) : !status ? (
          <section className={`${goldCard} p-6 text-center text-sm text-slate-400`}>Loading…</section>
        ) : !status.enabled ? (
          <section className={`${goldCard} p-6 text-center text-sm text-slate-400`}>Daily check-in isn&apos;t available right now.</section>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-2.5">
              {days.map((amt, i) => {
                const day = i + 1
                const claimed = day <= done && done <= days.length
                const isNext = !status.claimedToday && day === Math.min(status.nextDay, days.length)
                return (
                  <div key={day} className={`${goldCard} flex flex-col items-center gap-1 p-3 ${isNext ? 'border-[#F5B82E]/60 shadow-[0_0_14px_rgba(245,184,46,0.25)]' : ''}`}>
                    <span className="text-sm font-bold text-[#F5B82E]">{money(amt)}</span>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${claimed ? 'bg-[#F5B82E] text-[#1A1205]' : 'bg-white/5 text-slate-500'}`}>
                      {claimed ? <Check size={16} /> : <CalendarCheck size={16} />}
                    </span>
                    <span className="text-[11px] text-slate-400">{day === days.length ? `Day ${day}+` : `Day ${day}`}</span>
                  </div>
                )
              })}
            </section>
            <button type="button" onClick={claim} disabled={busy || status.claimedToday} className={`${goldBtn} w-full py-3 text-sm`}>
              {status.claimedToday ? 'Checked in today. Come back tomorrow' : busy ? 'Claiming…' : `Check in for ${money(status.todayReward)}`}
            </button>
          </>
        )}
      </div>
    </AppShell>
  )
}
