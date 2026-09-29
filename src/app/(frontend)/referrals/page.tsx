'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Share2, Users, Gift, Clock, CheckCircle, XCircle, Coins, ChevronRight, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'
import { money, relativeTime } from '@/lib/format'

interface ReferralData {
  referralCode: string
  shareUrl: string
  totalReferred: number
  totalRewarded: number
  totalEarned: number
  referrals: {
    id: number
    status: string
    registeredAt: string | null
    rewardedAt: string | null
    referrerReward: number | null
  }[]
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING: { label: 'Pending', icon: <Clock size={14} />, color: 'text-amber-400' },
  QUALIFIED: { label: 'Qualified', icon: <CheckCircle size={14} />, color: 'text-blue-400' },
  REWARDED: { label: 'Rewarded', icon: <Gift size={14} />, color: 'text-emerald-400' },
  REJECTED: { label: 'Rejected', icon: <XCircle size={14} />, color: 'text-slate-500' },
}

export default function ReferralsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!user) return
    setLoading(true)
    api
      .get<ReferralData>('/referrals')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [user])

  const copyCode = async () => {
    if (!data?.referralCode) return
    try {
      await navigator.clipboard.writeText(data.referralCode)
      toast.success('Referral code copied!')
    } catch {
      toast.error('Could not copy code')
    }
  }

  const shareCode = async () => {
    if (!data) return
    const shareData = {
      title: 'Join King 888!',
      text: `Use my referral code ${data.referralCode} to join King 888 and earn rewards!`,
      url: data.shareUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
        toast.success('Share link copied to clipboard!')
      }
    } catch {
      // User cancelled or unsupported
    }
  }

  if (!user) {
    return (
      <AppShell showBack>
        <EmptyState
          title="Sign in to see your referrals"
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
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 p-5">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Users size={22} className="text-purple-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">Refer &amp; Earn</h2>
              <p className="mt-0.5 text-sm text-purple-200/80">Invite friends and earn rewards for every successful referral</p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-1 -bottom-1 text-4xl opacity-20">
            <UserPlus size={32} />
          </div>
        </div>

        {/* ── Stats Row ── */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="mt-2 h-5 w-14" />
                <Skeleton className="mt-1 h-3 w-16" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
              <Users size={20} className="text-purple-400" />
              <span className="mt-1.5 text-lg font-bold text-white">{data.totalReferred}</span>
              <span className="mt-0.5 text-[11px] text-slate-400">Friends Referred</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
              <Coins size={20} className="text-amber-400" />
              <span className="mt-1.5 text-lg font-bold text-white">{money(data.totalEarned)}</span>
              <span className="mt-0.5 text-[11px] text-slate-400">Total Earned</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-[#1F2E45] bg-[#0E1726] px-2 py-3.5 text-center">
              <Gift size={20} className="text-emerald-400" />
              <span className="mt-1.5 text-lg font-bold text-white">{data.totalRewarded}</span>
              <span className="mt-0.5 text-[11px] text-slate-400">Rewarded</span>
            </div>
          </div>
        ) : null}

        {/* ── Referral Code Card ── */}
        <div className="space-y-4">
          <h3 className="text-center text-sm font-semibold text-slate-300">
            Your Referral Code
          </h3>

          {loading ? (
            <Skeleton className="h-16 w-full rounded-2xl bg-slate-800/50" />
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-400/40 bg-[#0E1726] px-4 py-4">
              <span className="font-mono text-2xl font-extrabold tracking-[0.15em] text-amber-400">
                {data?.referralCode ?? '—'}
              </span>

              <button
                onClick={copyCode}
                aria-label="Copy referral code"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1F2E45] bg-[#080D18] text-slate-300 transition hover:bg-white/5 hover:text-amber-400 active:scale-95"
              >
                <Copy size={18} />
              </button>
            </div>
          )}

          <button
            onClick={shareCode}
            disabled={loading || !data?.shareUrl}
            className="glow-gold-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-3 text-base font-bold text-slate-900 transition hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50"
          >
            <Share2 size={18} />
            Share Now
          </button>
        </div>

        {/* ── Referral List ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-white">Referred Friends</h3>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                </Card>
              ))}
            </div>
          ) : !data || data.referrals.length === 0 ? (
            <EmptyState
              title="No referrals yet"
              body="Share your code with friends and earn rewards when they sign up and complete activities."
            />
          ) : (
            <div className="space-y-2">
              {data.referrals.map((ref) => {
                const cfg = STATUS_CONFIG[ref.status] || { label: ref.status, icon: <Clock size={14} />, color: 'text-slate-400' }
                return (
                  <Card key={ref.id} className="border-[#1F2E45] bg-[#0E1726] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                        <UserPlus size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                          {ref.referrerReward ? (
                            <span className="text-xs font-bold text-emerald-400">+{money(ref.referrerReward)}</span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {ref.registeredAt ? relativeTime(ref.registeredAt) : '—'}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-600" />
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
