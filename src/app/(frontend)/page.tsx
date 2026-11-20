'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Brain, Calculator, ChevronRight, CircleQuestionMark, Dice1, Gamepad, Gamepad2, Gift,
  Grid3x3, LayoutGrid, LifeBuoy, ListChecks, Megaphone, Wallet, Zap, History,
} from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money } from '@/lib/format'

interface Banner { id: number; title: string; description?: string; ctaLabel?: string; ctaUrl?: string; image?: string | null }
interface HomeData {
  maintenance: boolean
  message?: string
  site: { appName: string; tagline: string }
  banners: Banner[]
  announcements: { id: number; title: string; body: string; severity: string; isPinned: boolean }[]
  featuredTasks: { id: number; title: string; rewardAmount: number; icon?: string | null }[]
  featuredGames: { id: number; name: string; type: string; reward?: { amount: number }; thumbnail?: string | null }[]
  featuredCampaigns: { id: number; name: string; rewardAmount: number; banner?: string | null }[]
}
interface WalletStats { availableBalance: number; pendingBalance: number; lifetimeEarned: number; lifetimeWithdrawn: number }

type Tab = 'all' | 'games' | 'tasks' | 'campaigns'
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'campaigns', label: 'Campaigns', icon: Gift },
]

function gameIcon(type: string) {
  const p = { size: 34, strokeWidth: 1.8 }
  switch (type) {
    case 'QUIZ': return <CircleQuestionMark {...p} />
    case 'SUDOKU': return <Grid3x3 {...p} />
    case 'MEMORY': return <Brain {...p} />
    case 'MATH': return <Calculator {...p} />
    case 'REACTION': return <Zap {...p} />
    case 'SPIN_WHEEL': return <LifeBuoy {...p} />
    case 'WINGO':
    case 'NUMBER_SEQUENCE': return <Dice1 {...p} />
    default: return <Gamepad {...p} />
  }
}

const card = 'rounded-2xl border border-[#F5B82E]/12 bg-[#111827]'
const goldBtn = 'rounded-full bg-gradient-to-b from-[#FFD978] via-[#F5B82E] to-[#C98A12] font-bold text-[#1A1205] shadow-[0_0_12px_rgba(245,184,46,0.35)] transition active:scale-95'

export default function HomePage() {
  const { user } = useAuth()
  const [data, setData] = useState<HomeData | null>(null)
  const [wallet, setWallet] = useState<WalletStats | null>(null)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    api.get<HomeData>('/home').then(setData).catch(() => null)
  }, [])

  useEffect(() => {
    if (!user) return setWallet(null)
    api.get<{ wallet: WalletStats }>('/wallet').then((d) => setWallet(d.wallet)).catch(() => setWallet(null))
  }, [user])

  const bannerCount = data?.banners?.length ?? 0
  useEffect(() => {
    if (bannerCount < 2) return
    const t = setInterval(() => setBannerIndex((i) => (i + 1) % bannerCount), 5000)
    return () => clearInterval(t)
  }, [bannerCount])

  const ticker = useMemo(() => data?.announcements?.[0], [data])
  const show = (t: Tab) => tab === 'all' || tab === t

  return (
    <AppShell>
      {!data ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-40 w-full rounded-2xl bg-slate-800/50" />
          <Skeleton className="h-10 w-full rounded-full bg-slate-800/50" />
          <Skeleton className="h-20 w-full rounded-2xl bg-slate-800/50" />
          <Skeleton className="h-40 w-full rounded-2xl bg-slate-800/50" />
        </div>
      ) : data.maintenance ? (
        <div className={`${card} mt-6 p-6 text-center`}>
          <p className="text-lg font-semibold text-white">We&apos;ll be right back</p>
          <p className="mt-1 text-sm text-slate-400">{data.message}</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4 pt-1">
          {/* Banner carousel */}
          {bannerCount > 0 && (
            <section className="relative overflow-hidden rounded-2xl border border-[#F5B82E]/15">
              <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${bannerIndex * 100}%)` }}>
                {data.banners.map((b) => {
                  const inner = (
                    <div className="relative aspect-[16/7] w-full bg-gradient-to-br from-[#2A1E05] via-[#141008] to-[#0B0F17]">
                      {b.image && <img src={b.image} alt={b.title} className="absolute inset-0 h-full w-full object-cover" />}
                      {!b.image && (
                        <div className="relative z-10 flex h-full flex-col justify-center p-5">
                          <h3 className="text-lg font-black uppercase tracking-wide text-[#F5B82E]">{b.title}</h3>
                          {b.description && <p className="mt-1 max-w-[80%] text-xs text-slate-300">{b.description}</p>}
                          {b.ctaLabel && <span className={`${goldBtn} mt-3 w-fit px-4 py-1.5 text-[11px]`}>{b.ctaLabel}</span>}
                        </div>
                      )}
                    </div>
                  )
                  return (
                    <div key={b.id} className="w-full shrink-0">
                      {b.ctaUrl ? <Link href={b.ctaUrl} className="block">{inner}</Link> : inner}
                    </div>
                  )
                })}
              </div>
              {bannerCount > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {data.banners.map((b, i) => (
                    <button key={b.id} type="button" aria-label={`Banner ${i + 1}`} onClick={() => setBannerIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'w-5 bg-[#F5B82E]' : 'w-1.5 bg-white/40'}`} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Announcement ticker */}
          {ticker && (
            <section className="flex items-center gap-2 rounded-full border border-[#F5B82E]/12 bg-[#111827] py-1.5 pl-3 pr-1.5">
              <Megaphone size={16} className="shrink-0 text-[#F5B82E]" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="animate-[marquee_14s_linear_infinite] whitespace-nowrap text-[12px] text-slate-300">
                  {ticker.title}: {ticker.body}
                </p>
              </div>
              <Link href="/notifications" className={`${goldBtn} shrink-0 px-4 py-1 text-[11px]`}>Detail</Link>
            </section>
          )}

          {/* Wallet / sign-in */}
          {user ? (
            <section className={`${card} flex items-center justify-between p-4`}>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-slate-500">Wallet balance</p>
                <p className="mt-0.5 text-2xl font-black text-[#F5B82E]">{wallet ? money(wallet.availableBalance) : '···'}</p>
              </div>
              <div className="flex gap-2">
                <Link href="/transactions" aria-label="History" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F5B82E]/30 text-[#F5B82E]">
                  <History size={16} />
                </Link>
                <Link href="/wallet" className={`${goldBtn} flex items-center gap-1 px-4 py-2 text-xs`}>
                  <Wallet size={14} /> Withdraw
                </Link>
              </div>
            </section>
          ) : (
            <section className={`${card} p-4`}>
              <p className="text-base font-bold text-white">Welcome to {data.site.appName || 'King 888'}</p>
              <p className="mt-0.5 text-xs text-slate-400">{data.site.tagline || 'Play, earn and redeem'}</p>
              <div className="mt-3 flex gap-2">
                <Link href="/register" className={`${goldBtn} flex-1 py-2 text-center text-sm`}>Get started</Link>
                <Link href="/login" className="flex-1 rounded-full border border-[#F5B82E]/40 py-2 text-center text-sm font-semibold text-[#F5B82E]">Sign in</Link>
              </div>
            </section>
          )}

          {/* Category tabs */}
          <section className={`${card} grid grid-cols-4 gap-1 p-1.5`}>
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button key={id} type="button" onClick={() => setTab(id)}
                  className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${active ? 'bg-gradient-to-b from-[#FFD978] to-[#C98A12] text-[#1A1205]' : 'text-slate-400'}`}>
                  <Icon size={20} />
                  {label}
                </button>
              )
            })}
          </section>

          {/* Games grid */}
          {show('games') && (
            <Section title="Games" href="/games">
              {data.featuredGames.length ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {data.featuredGames.map((g) => (
                    <Link key={g.id} href="/games" className="group">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#F5B82E]/25 bg-gradient-to-b from-[#3A2A06] via-[#1A1407] to-[#0E0B05] shadow-[0_6px_16px_rgba(0,0,0,0.45)] transition group-active:scale-95">
                        {g.thumbnail ? (
                          <img src={g.thumbnail} alt={g.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 text-[#F5B82E]">
                            {gameIcon(g.type)}
                            <span className="px-1 text-center text-[13px] font-black uppercase leading-tight text-[#FFE3A0]">{g.name}</span>
                          </div>
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-semibold text-white">
                          {g.name}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <Empty text="No featured games right now." />}
            </Section>
          )}

          {/* Tasks */}
          {show('tasks') && (
            <Section title="Daily tasks" href="/earn">
              {data.featuredTasks.length ? (
                <div className="space-y-2">
                  {data.featuredTasks.map((t) => (
                    <Link key={t.id} href="/earn" className={`${card} flex items-center gap-3 p-3`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5B82E]/15 text-[#F5B82E]"><ListChecks size={20} /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{t.title}</span>
                      <span className="text-sm font-bold text-[#F5B82E]">+{money(t.rewardAmount)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Link href="/earn" className={`${card} flex items-center justify-between p-4`}>
                  <span className="text-sm text-slate-300">Complete tasks and earn rewards</span>
                  <span className={`${goldBtn} px-4 py-1.5 text-xs`}>View</span>
                </Link>
              )}
            </Section>
          )}

          {/* Campaigns */}
          {show('campaigns') && (
            <Section title="Campaigns" href="/promotions">
              {data.featuredCampaigns.length ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {data.featuredCampaigns.map((c) => (
                    <Link key={c.id} href="/promotions" className={`${card} overflow-hidden`}>
                      <div className="aspect-[16/10] bg-gradient-to-br from-[#3A2A06] to-[#0E0B05]">
                        {c.banner ? <img src={c.banner} alt={c.name} className="h-full w-full object-cover" /> : (
                          <div className="flex h-full items-center justify-center text-[#F5B82E]"><Gift size={36} /></div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-[13px] font-bold text-white">{c.name}</p>
                        <p className="text-[11px] text-slate-400">Earn up to {money(c.rewardAmount)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <Empty text="No campaigns right now." />}
            </Section>
          )}
        </div>
      )}
    </AppShell>
  )
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
          <span className="h-4 w-1 rounded-full bg-[#F5B82E]" />
          {title}
        </h2>
        <Link href={href} className="flex items-center gap-0.5 rounded-full border border-[#F5B82E]/30 px-2.5 py-0.5 text-[11px] text-[#F5B82E]">
          All <ChevronRight size={12} />
        </Link>
      </div>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[#F5B82E]/12 bg-[#111827] p-4 text-sm text-slate-400">{text}</div>
}

