'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Gift, History, ScrollText } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { useAuth } from '@/components/AuthProvider'
import { goldBtn, goldCard, goldHeader } from '@/components/gold'
import { api, ApiError } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'

interface Redemption { id: number; code: string; amount: number; redeemedAt: string }

export default function GiftPage() {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<Redemption[] | null>(null)

  const load = () => api.get<{ redemptions: Redemption[] }>('/gift-codes').then((d) => setItems(d.redemptions)).catch(() => setItems([]))
  useEffect(() => { if (user) load() }, [user])

  const redeem = async () => {
    if (!code.trim()) return toast.error('Enter a gift code')
    setBusy(true)
    try {
      const res = await api.post<{ amount: number }>('/gift-codes/redeem', { code })
      toast.success(`${money(res.amount)} added to your wallet`)
      setCode('')
      load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not redeem this code')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell hideHeader bleed>
      <section className={`${goldHeader} safe-top relative px-4 pb-16 pt-4`}>
        <button type="button" onClick={() => window.history.back()} aria-label="Go back" className="text-[#F5B82E]"><ChevronLeft size={24} /></button>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-black text-white">Hi</p>
            <p className="text-sm text-slate-300">We have a gift for you</p>
          </div>
          <Gift size={64} className="text-[#F5B82E]" strokeWidth={1.4} />
        </div>
      </section>

      <div className="-mt-10 space-y-3 px-3 pb-6">
        <section className={`${goldCard} p-4`}>
          <p className="text-sm font-bold text-white">Please enter the gift code below</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Please enter gift code"
            maxLength={32}
            className="mt-3 w-full rounded-xl border border-white/10 bg-[#0B0F17] px-4 py-3 text-sm uppercase text-white outline-none placeholder:normal-case placeholder:text-slate-500 focus:border-[#F5B82E]/50"
          />
          {user ? (
            <button type="button" disabled={busy} onClick={redeem} className={`${goldBtn} mt-3 w-full py-2.5 text-sm`}>{busy ? 'Checking…' : 'Receive'}</button>
          ) : (
            <Link href="/login" className={`${goldBtn} mt-3 block w-full py-2.5 text-center text-sm`}>Sign in to redeem</Link>
          )}
        </section>

        <section className={`${goldCard} p-4`}>
          <p className="flex items-center gap-2 text-sm font-bold text-white"><History size={18} className="text-[#F5B82E]" /> History</p>
          {!items?.length ? (
            <p className="py-8 text-center text-xs text-slate-500">{items ? 'No data' : 'Loading…'}</p>
          ) : (
            <ul className="mt-2 divide-y divide-white/5">
              {items.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5">
                  <span>
                    <span className="block text-sm font-semibold text-white">{r.code}</span>
                    <span className="block text-[11px] text-slate-500">{relativeTime(r.redeemedAt)}</span>
                  </span>
                  <span className="text-sm font-bold text-[#F5B82E]">+{money(r.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${goldCard} p-4`}>
          <p className="flex items-center gap-2 text-sm font-bold text-white"><ScrollText size={18} className="text-[#F5B82E]" /> Redemption notes</p>
          <ul className="mt-2 space-y-1.5 rounded-xl border border-white/5 p-3 text-[12px] text-slate-400">
            <li>• Each code can be redeemed once per account.</li>
            <li>• The amount is added to your wallet balance straight away.</li>
            <li>• Codes can expire or run out, so use them soon.</li>
          </ul>
        </section>
      </div>
    </AppShell>
  )
}
