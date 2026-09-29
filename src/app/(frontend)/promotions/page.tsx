'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Copy, Share2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'
import Link from 'next/link'

interface ActionProgress { type: string; target: number; current: number; met: boolean; label?: string }
interface Campaign {
  id: number
  name: string
  description: string
  rewardAmount: number
  progress: ActionProgress[] | null
  claimed?: boolean
}

interface ReferralData {
  referralCode: string
  shareUrl: string
  totalReferred: number
  totalRewarded: number
  totalEarned: number
}

const ACTION_LABELS: Record<string, string> = {
  TASKS_COMPLETED: 'Complete tasks',
  GAMES_PLAYED: 'Play games',
  GAMES_WON: 'Win games',
  REFERRALS_QUALIFIED: 'Referrals',
  AMOUNT_EARNED: 'Earn',
  SPECIFIC_TASK: 'Complete the task',
  SPECIFIC_GAME: 'Play the game',
}

export default function PromotionsPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [claiming, setClaiming] = useState<number | null>(null)
  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [isReferralLoading, setIsReferralLoading] = useState(true)
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(true)

  const loadCampaigns = useCallback(
    () =>
      api
        .get<{ campaigns: Campaign[] }>('/campaigns')
        .then((d) => setCampaigns(d.campaigns))
        .finally(() => setIsCampaignsLoading(false)),
    [],
  )

  const loadReferral = useCallback(() => {
    if (!user) {
      setReferral(null)
      setIsReferralLoading(false)
      return
    }
    setIsReferralLoading(true)
    api
      .get<ReferralData>('/referrals')
      .then(setReferral)
      .catch(() => setReferral(null))
      .finally(() => setIsReferralLoading(false))
  }, [user])

  useEffect(() => {
    loadCampaigns()
    loadReferral()
  }, [user, loadCampaigns, loadReferral])

  const claim = async (id: number) => {
    setClaiming(id)
    try {
      await api.post(`/campaigns/${id}/claim`)
      toast.success('Reward claimed!')
      loadCampaigns()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not claim this reward.')
    } finally {
      setClaiming(null)
    }
  }

  const copyCode = async () => {
    const code = referral?.referralCode ?? 'RAJ123'
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Referral code copied!')
    } catch {
      toast.error('Could not copy code')
    }
  }

  const shareCode = async () => {
    const code = referral?.referralCode ?? 'RAJ123'
    const url = referral?.shareUrl ?? ''
    const shareData = {
      title: 'Join King 888!',
      text: `Use my referral code ${code} to join King 888 and earn rewards!`,
      url,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${url}`)
        toast.success('Share link copied to clipboard!')
      }
    } catch {
      // User cancelled share
    }
  }

  const stats = [
    { label: 'Total Referrals', value: isReferralLoading ? null : referral?.totalReferred ?? 0, icon: '👥' },
    { label: 'Total Earned', value: isReferralLoading ? null : money(referral?.totalEarned ?? 0), icon: '🪙' },
    { label: 'Rewards Claimed', value: isReferralLoading ? null : referral?.totalRewarded ?? 0, icon: '🎁' },
  ]

  const steps = [
    { num: 1, icon: '📤', title: 'Share Your Code' },
    { num: 2, icon: '🎮', title: 'Friends Join & Play' },
    { num: 3, icon: '🎉', title: 'You Both Get Rewards' },
  ]

  const rewards = [
    { amount: '₹50', desc: 'When your friend registers', gradient: 'from-purple-600/80 to-purple-900/80' },
    { amount: '₹100', desc: 'When they add ₹100 or more', gradient: 'from-blue-600/80 to-blue-900/80' },
    { amount: '10%', desc: 'Lifetime commission on their earnings', gradient: 'from-purple-600/80 to-fuchsia-900/80' },
  ]

  return (
    <AppShell>
      <div className="space-y-5 pb-6 pt-1">

        {/* ── Hero Banner ───────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 px-5 py-8 text-center">
          {/* Decorative blurs */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />

          {/* Floating emojis */}
          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-center gap-3 text-3xl">
              <span>👥</span>
              <span className="text-4xl">🎁</span>
              <span>🪙</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Refer &amp; Earn</h2>
            <p className="mt-1 text-base font-semibold text-amber-300">Invite Friends &amp; Get Rewards!</p>
            <p className="mt-1.5 text-sm text-purple-200/80">
              The more your friends play, the more you earn.
            </p>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {isReferralLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="mt-2 h-5 w-14" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
              ))
            : stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center"
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="mt-1.5 text-lg font-bold text-white">{s.value}</span>
                  <span className="mt-0.5 text-[11px] leading-tight text-slate-400">{s.label}</span>
                </div>
              ))}
        </div>

        {/* ── Your Referral Code ─────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Your Referral Code</h3>
          <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-amber-400/50 bg-[#0E1726] px-5 py-4">
            {isReferralLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <span className="font-mono text-2xl font-extrabold tracking-[0.15em] text-amber-400">
                {referral?.referralCode ?? '—'}
              </span>
            )}
            <button
              onClick={copyCode}
              disabled={isReferralLoading || !referral?.referralCode}
              className="rounded-lg border border-[#1F2E45] bg-[#0E1726] p-2.5 text-slate-300 transition hover:bg-white/5 hover:text-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={20} />
            </button>
          </div>
          <Button
            onClick={shareCode}
            className="glow-gold-btn w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-base font-bold text-slate-900 hover:from-amber-400 hover:to-amber-500"
            size="lg"
          >
            <Share2 size={18} />
            Share Now
          </Button>
        </div>

        {/* ── How It Works ──────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">How It Works?</h3>
            <button className="text-xs font-medium text-amber-400 hover:underline">View Details &gt;</button>
          </div>
          <div className="rounded-xl border border-[#1F2E45] bg-[#0E1726] px-3 py-5">
            <div className="flex items-start justify-between">
              {steps.map((step, i) => (
                <React.Fragment key={step.num}>
                  <div className="flex flex-1 flex-col items-center text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/30">
                      {step.num}
                    </div>
                    <span className="mt-2 text-lg">{step.icon}</span>
                    <span className="mt-1.5 text-[11px] font-medium leading-tight text-slate-300">
                      {step.title}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <span className="mt-3 text-lg text-amber-400/60">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── Referral Rewards ──────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Referral Rewards</h3>
            <Link href={'/referrals'} className="text-xs font-medium text-amber-400 hover:underline">View All &gt;</Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {rewards.map((r) => (
              <div
                key={r.amount}
                className={`flex flex-col items-center rounded-xl bg-gradient-to-br ${r.gradient} border border-white/10 px-2 py-4 text-center`}
              >
                <span className="text-xl font-extrabold text-white">{r.amount}</span>
                <span className="mt-1.5 text-[10px] leading-tight text-white/70">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Invite More CTA Banner ────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-800/90 via-indigo-800/80 to-amber-700/70 px-5 py-5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-500/20 blur-2xl" />
          <div className="relative z-10 flex items-center gap-4">
            <span className="text-4xl">🏆</span>
            <div>
              <h4 className="text-base font-bold text-white">Invite More, Earn More</h4>
              <p className="mt-0.5 text-[12px] leading-snug text-purple-200/80">
                Top referrers get exclusive rewards and special bonuses!
              </p>
            </div>
          </div>
        </div>

        {/* ── Campaigns Section ─────────────────────────────────── */}
        {isCampaignsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Active Campaigns</h3>
            {campaigns.map((c) => {
              const allMet = c.progress?.every((p) => p.met) ?? false
              const claimed = Boolean(c.claimed)
              return (
                <Card key={c.id} className="p-4 rounded-xl border border-[#1F2E45] bg-[#0E1726]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium leading-snug">{c.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{c.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="num shrink-0 text-[19px] text-marigold-deep">{money(c.rewardAmount)}</p>
                      {claimed ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          Claimed
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {c.progress && c.progress.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {c.progress.map((p, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-[12px] text-ink-faint">
                            <span>{p.label || ACTION_LABELS[p.type] || p.type}</span>
                            <span>{Math.min(p.current, p.target)} / {p.target}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-(--app-dark)-dim">
                            <div className="h-full bg-banyan" style={{ width: `${Math.min(100, (p.current / p.target) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3">
                    {!user ? (
                      <Button size="sm" variant="outline" disabled>Sign in to track progress</Button>
                    ) : claimed ? (
                      <Button size="sm" disabled>
                        Claimed
                      </Button>
                    ) : (
                      <Button size="sm" disabled={!allMet || claiming === c.id} onClick={() => claim(c.id)}>
                        {claiming === c.id ? 'Claiming…' : allMet ? 'Claim reward' : 'In progress'}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No campaigns right now" body="Limited-time promotions will show up here." />
        )}
      </div>
    </AppShell>
  )
}
