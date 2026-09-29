'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, Calculator, ChevronRight, CircleQuestionMark, Dice1, Grid3x3, LifeBuoy, Zap, Gamepad, User2Icon } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/AuthProvider'
import { api } from '@/lib/api-client'
import { money } from '@/lib/format'

interface HomeData {
  maintenance: boolean
  message?: string
  site: { appName: string; tagline: string }
  banners: { id: number; title: string; description?: string; ctaLabel?: string; ctaUrl?: string; image?: string | null }[]
  announcements: { id: number; title: string; body: string; severity: string; isPinned: boolean }[]
  featuredTasks: { id: number; title: string; rewardAmount: number; icon?: string | null }[]
  featuredGames: { id: number; name: string; type: string; reward?: { amount: number }; icon?: React.ReactNode | null; thumbnail?: string | null }[]
  featuredCampaigns: { id: number; name: string; rewardAmount: number; banner?: string | null }[]
}

interface WalletStats {
  availableBalance: number
  pendingBalance: number
  lifetimeEarned: number
  lifetimeWithdrawn: number
}

const getGameEmoji = (type: string) => {
  switch (type) {
    case 'QUIZ':
      return <CircleQuestionMark/>
    case 'SUDOKU':
      return <Grid3x3 />
    case 'MEMORY':
      return <Brain/>
    case 'MATH':
      return <Calculator/>
    case 'REACTION':
      return <Zap/>
    case 'SPIN_WHEEL':
      return <LifeBuoy />
    case 'NUMBER_SEQUENCE':
      return <Dice1/>
    default:
      return <Gamepad/>
  }
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<HomeData | null>(null)
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.get<HomeData>('/home').then(setData).catch(() => null)
  }, [])

  useEffect(() => {
    if (!user) {
      setWalletStats(null)
      return
    }
    api
      .get<{ wallet: WalletStats }>('/wallet')
      .then((d) => setWalletStats(d.wallet))
      .catch(() => setWalletStats(null))
    console.log(`homedata: ${JSON.stringify(data)}`)
    api.get<{ unreadCount: number }>('/notifications').then((d) => setUnread(d.unreadCount)).catch(() => null)
  }, [user])

  return (
    <AppShell>
      {!data ? (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-20 w-full rounded-2xl bg-slate-800/50" />
          <Skeleton className="h-44 w-full rounded-2xl bg-slate-800/50" />
          <Skeleton className="h-24 w-full rounded-2xl bg-slate-800/50" />
          <Skeleton className="h-32 w-full rounded-2xl bg-slate-800/50" />
        </div>
      ) : data.maintenance ? (
        <Card className="mt-6 p-6 text-center bg-(--app-card) border-[#1F2E45]">
          <p className="font-display text-lg text-white">We'll be right back</p>
          <p className="mt-1 text-sm text-slate-400">{data.message}</p>
        </Card>
      ) : (
        <div className="space-y-5 pb-4 pt-1">

          {/* ─── User Greeting / Sign-in Prompt ─── */}
          {user ? (
            <section className="flex items-center gap-3 px-1" data-purpose="user-greeting">
              <div className="relative w-12 h-12 rounded-full ring-2 ring-amber-400/70 ring-offset-2 ring-offset-[#060B14] overflow-hidden flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-amber-600 via-amber-700 to-slate-800 flex items-center justify-center text-xl">
                  <User2Icon size={16}/>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-white leading-tight">
                    Hello, {user.name.split(' ')[0]}
                  </h2>
                  <span className="text-amber-400 text-sm">🪙</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Keep playing, keep earning! 🚀
                </p>
              </div>
            </section>
          ) : (
            <Card className="bg-gradient-to-br from-[#0E1726] to-[#131D30] border-[#1F2E45] px-5 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <span className="text-xl">👑</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Welcome to King 888</h2>
                  <p className="text-xs text-slate-400">{data.site.tagline || 'Earn real money in your spare time'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/register" className="flex-1">
                  <Button variant="marigold" size="sm" className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold border-0">
                    Get Started
                  </Button>
                </Link>
                <Link href="/login" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-slate-600 text-slate-300 hover:bg-white/5">
                    Sign In
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* ─── Wallet Balance Card ─── */}
          {user && (
            <Card className="rounded-2xl bg-[#0D1526] border border-[#1A263C] p-4 shadow-xl shadow-black/40" data-purpose="wallet-overview">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                    Wallet Balance
                  </span>
                  <div className="text-2xl font-black text-amber-400 tracking-tight leading-tight mt-0.5">
                    {walletStats === null ? '···' : money(walletStats.availableBalance)}
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
                    {walletStats === null ? '···' : money(walletStats.lifetimeEarned)}
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
                    {walletStats === null ? '···' : money(walletStats.lifetimeWithdrawn)}
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
                    {walletStats === null ? '···' : money(walletStats.pendingBalance)}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Daily Tasks Banner ─── */}
          <Link href="/earn" className="block">
            <section
              className="relative rounded-2xl overflow-hidden p-4 glow-cyan-card bg-gradient-to-r from-[#072422] via-[#091C27] to-[#12112C]"
              data-purpose="daily-tasks-banner"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-start gap-3">
                  {/* Clipboard check icon */}
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0 text-emerald-400 mt-0.5">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-emerald-300 tracking-wide">DAILY TASKS</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Complete Tasks & Win Rewards</p>
                    <span className="mt-2.5 inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm">
                      View Tasks <span className="text-xs">→</span>
                    </span>
                  </div>
                </div>

                {/* Sparkle decoration */}
                <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                  <div className="text-3xl filter drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse">💎</div>
                  <div className="absolute -top-1 right-0 text-lg filter drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]">✨</div>
                  <div className="absolute bottom-0 left-0 text-xs filter drop-shadow-[0_0_4px_rgba(234,179,8,0.4)]">✦</div>
                </div>
              </div>

              {/* Subtle gradient overlay on right edge */}
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-purple-900/20 to-transparent pointer-events-none" />
            </section>
          </Link>

          {/* ─── Top Games Section ─── */}
          <Section title="Top Games" href="/games">
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {data.featuredGames.length > 0 ? (
                data.featuredGames.map((g) => ({
                  id: g.id,
                  name: g.name,
                  image: g.thumbnail ?? null,
                  emoji: getGameEmoji(g.type),
                })).map((game) => (
                  <Link
                    key={game.id}
                    href={`/games`}
                    className="group block w-[76px] shrink-0"
                  >
                    <div className="flex flex-col items-center">
                      {/* Game image / emoji */}
                      <div
                        className={`
                                  relative
                    w-[72px]
                    h-[72px]
                    overflow-hidden
                    rounded-[16px]
                    border
                    border-white/10
                    bg-gradient-to-br
                    shadow-[0_8px_20px_rgba(5,7,12,0.35)]
                    transition-all
                    duration-200
                    group-hover:border-[#F5B82E]/40
                    group-active:scale-95
                                `}
                      >
                        {game.image ? (
                          <img
                            src={game.image}
                            alt={game.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <>
                            <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-white/10" />
                            <div className="absolute -bottom-3 -left-3 h-7 w-7 rounded-full bg-black/10" />

                            <div className="relative flex h-full w-full items-center justify-center">
                              <span className="text-[32px] leading-none drop-shadow-md">
                                {game.emoji}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Game name */}
                      <span className="mt-1.5 w-full truncate text-center text-[10px] font-semibold leading-tight text-white">
                        {game.name}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="w-full py-2 text-sm text-slate-400">No featured games right now.</div>
              )}
            </div>
          </Section>

          {/* ─── Active Campaigns Section ─── */}
          <Section title="Active Campaigns" href="/promotions">
            <div className="space-y-3">
              {data.featuredCampaigns.length > 0 ? (
                data.featuredCampaigns.map((c) => (
                  <Link key={c.id} href="/promotions">
                    <Card className="bg-gradient-to-r from-[#0E1726] to-[#121A2B] border-[#1F2E45] p-4 flex items-center gap-3 hover:border-amber-500/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🎁</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{c.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Earn up to {money(c.rewardAmount)}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-[#1F2E45] bg-[#0E1726] p-4 text-sm text-slate-400">
                  No featured campaigns right now.
                </div>
              )}
            </div>
          </Section>

          {/* ─── Announcements ─── */}
          {data.announcements.length > 0 && (
            <section className="space-y-2">
              {data.announcements.slice(0, 3).map((a) => (
                <Card
                  key={a.id}
                  className={`px-4 py-3 border-[#1F2E45] ${a.severity === 'WARNING'
                    ? 'bg-red-950/30 border-red-500/20'
                    : a.severity === 'SUCCESS'
                      ? 'bg-emerald-950/30 border-emerald-500/20'
                      : 'bg-(--app-card)'
                    }`}
                >
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  <p className="mt-0.5 text-[13px] text-slate-400">{a.body}</p>
                </Card>
              ))}
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-white">{title}</h2>
        <Link href={href} className="flex items-center gap-0.5 text-[12px] text-amber-400/80 font-medium hover:text-amber-300 transition-colors">
          View All <ChevronRight size={14} />
        </Link>
      </div>
      {children}
    </section>
  )
}
