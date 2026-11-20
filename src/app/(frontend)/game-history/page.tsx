'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/AuthProvider'
import { goldBtn, goldCard } from '@/components/gold'
import { api } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'

type Kind = 'games' | 'wingo'
interface Item { id: number; title: string; detail: string; status: string; reward?: number; stake?: number; payout?: number; at: string }
interface Page { kind: Kind; page: number; hasNextPage: boolean; items: Item[] }

const tone = (s: string) => (s === 'WIN' || s === 'WON' ? 'text-emerald-400' : s === 'LOSE' || s === 'LOST' || s === 'REJECTED' ? 'text-red-400' : 'text-slate-400')

export default function GameHistoryPage() {
  const { user } = useAuth()
  const [kind, setKind] = useState<Kind>('games')
  const [items, setItems] = useState<Item[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (k: Kind, p: number) => {
    setLoading(true)
    try {
      const d = await api.get<Page>('/game-history', { kind: k, page: p })
      setItems((prev) => (p === 1 ? d.items : [...prev, ...d.items]))
      setHasMore(d.hasNextPage)
      setPage(p)
    } catch {
      if (p === 1) setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (user) load(kind, 1) }, [user, kind, load])

  if (!user) {
    return (
      <AppShell>
        <EmptyState title="Sign in to see your game history" action={<Link href="/login"><Button size="sm" className="mt-2">Sign in</Button></Link>} />
      </AppShell>
    )
  }

  return (
    <AppShell showBack>
      <h1 className="mb-3 text-lg font-bold text-white">Game history</h1>
      <div className={`${goldCard} mb-3 grid grid-cols-2 gap-1 p-1`}>
        {(['games', 'wingo'] as Kind[]).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`rounded-xl py-2 text-sm font-semibold ${kind === k ? 'bg-gradient-to-b from-[#FFD978] to-[#C98A12] text-[#1A1205]' : 'text-slate-400'}`}>
            {k === 'games' ? 'Games' : 'Wingo'}
          </button>
        ))}
      </div>

      {!items.length && !loading ? (
        <p className={`${goldCard} p-8 text-center text-sm text-slate-500`}>No games played yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={`${kind}-${it.id}`} className={`${goldCard} flex items-center justify-between p-3`}>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{it.title}</span>
                <span className="block truncate text-[11px] text-slate-400">{it.detail} · {relativeTime(it.at)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block text-[11px] font-semibold ${tone(it.status)}`}>{it.status}</span>
                {kind === 'wingo' ? (
                  <span className="block text-sm font-bold text-[#F5B82E]">{it.payout ? `+₹${it.payout}` : `-₹${it.stake ?? 0}`}</span>
                ) : (
                  <span className="block text-sm font-bold text-[#F5B82E]">{it.reward ? `+${money(it.reward)}` : '—'}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button type="button" disabled={loading} onClick={() => load(kind, page + 1)} className={`${goldBtn} mt-3 w-full py-2.5 text-sm`}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </AppShell>
  )
}
