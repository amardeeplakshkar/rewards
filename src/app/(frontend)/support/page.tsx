'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, Globe, HelpCircle, ChevronRight, FileText, Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'

interface SiteData {
  site: {
    appName: string
    tagline: string
    supportEmail?: string | null
    supportPhone?: string | null
    supportUrl?: string | null
  }
}

interface LegalData {
  terms: string
  privacyPolicy: string
  refundPolicy: string
  responsibleUse: string
}

const FAQ_ITEMS = [
  {
    question: 'How do I earn rewards?',
    answer: 'Complete daily tasks, play games, claim campaign rewards, and earn referral bonuses. Your balance updates in real-time as you play.',
  },
  {
    question: 'When can I withdraw my earnings?',
    answer: 'You can request a withdrawal once your available balance meets the minimum threshold (₹100). Withdrawals are processed within 24–48 hours during business days.',
  },
  {
    question: 'What payout methods are supported?',
    answer: 'We support UPI transfers and bank transfers (NEFT/RTGS). Add your preferred payout method in Settings > Payout Methods.',
  },
  {
    question: 'How does the referral program work?',
    answer: 'Share your unique referral code with friends. When they sign up and complete a qualifying activity, you both earn rewards automatically.',
  },
]

export default function SupportPage() {
  const [site, setSite] = useState<SiteData['site'] | null>(null)
  const [legal, setLegal] = useState<LegalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const homeData = await api.get<SiteData>('/home')
        setSite(homeData.site)
      } catch {
        setSite(null)
      }
      try {
        const legalData = await api.get<LegalData>('/legal')
        setLegal(legalData)
      } catch {
        setLegal(null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const copyEmail = async () => {
    if (!site?.supportEmail) return
    try {
      await navigator.clipboard.writeText(site.supportEmail)
      toast.success('Email copied!')
    } catch {
      toast.error('Could not copy email')
    }
  }

  return (
    <AppShell >
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <HelpCircle size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">Help &amp; Support</h2>
              <p className="mt-0.5 text-sm text-white/80">We're here to help you</p>
            </div>
          </div>
        </div>

        {/* ── Contact Info ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Contact Us</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Card className="border-[#1F2E45] bg-[#0E1726] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-white break-all">{site?.supportEmail ?? 'support@king888.com'}</p>
                  </div>
                  <button
                    onClick={copyEmail}
                    className="rounded-lg border border-[#1F2E45] bg-[#080D18] p-1.5 text-slate-300 hover:bg-white/5 hover:text-amber-400"
                    title="Copy email"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </Card>

              {site?.supportPhone ? (
                <Card className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                      <Phone size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="font-medium text-white">{site.supportPhone}</p>
                    </div>
                  </div>
                </Card>
              ) : null}

              {site?.supportUrl ? (
                <Card className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                      <Globe size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">Website</p>
                      <p className="font-medium text-white truncate">{site.supportUrl}</p>
                    </div>
                    <a
                      href={site.supportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[#1F2E45] bg-[#080D18] p-1.5 text-slate-300 hover:bg-white/5 hover:text-amber-400"
                      title="Visit website"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </div>

        {/* ── FAQ ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <Card key={item.question} className="border-[#1F2E45] bg-[#0E1726] p-3">
                <p className="text-sm font-medium text-white">{item.question}</p>
                <p className="mt-1 text-[13px] text-slate-400 leading-relaxed">{item.answer}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Legal Links ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Legal</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <Skeleton className="h-5 w-24" />
                </Card>
              ))}
            </div>
          ) : legal ? (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-1.5">
              {legal.terms ? (
                <LegalLink href="/legal/terms" icon={<FileText size={16} />} label="Terms & Conditions" />
              ) : null}
              {legal.privacyPolicy ? (
                <LegalLink href="/legal/privacy" icon={<FileText size={16} />} label="Privacy Policy" />
              ) : null}
              {legal.refundPolicy ? (
                <LegalLink href="/legal/refund" icon={<FileText size={16} />} label="Refund Policy" />
              ) : null}
              {legal.responsibleUse ? (
                <LegalLink href="/legal/responsible-use" icon={<FileText size={16} />} label="Responsible Use Policy" />
              ) : null}
            </Card>
          ) : (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-3">
              <p className="text-sm text-slate-400">Legal documents are not available right now.</p>
            </Card>
          )}
        </div>

        {/* ── Contact Form Quick Action ── */}
        <Card className="border-[#1F2E45] bg-[#0E1726] p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <MessageCircle size={20} />
            </div>
            <p className="text-sm text-slate-400">
              Can&apos;t find what you&apos;re looking for? Reach out to our support team via email anytime.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}

function LegalLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-white/[0.02] hover:text-white transition-colors"
    >
      {icon}
      <span className="text-[13px]">{label}</span>
      <ChevronRight size={14} className="ml-auto text-slate-600" />
    </Link>
  )
}
