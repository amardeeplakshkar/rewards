'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ListChecks, Gamepad2, Gift, UserRound } from 'lucide-react'

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/earn', label: 'Earn', icon: ListChecks },
  null, // raised centre button
  { href: '/promotions', label: 'Promotion', icon: Gift },
  { href: '/profile', label: 'Account', icon: UserRound },
] as const

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

export function BottomNav() {
  const pathname = usePathname()
  const playActive = isActive(pathname, '/games')

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-md">
        <div className="flex items-end justify-between rounded-t-3xl border-t border-[#F5B82E]/15 bg-[#0D1320]/95 px-1 pt-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] backdrop-blur">
          {TABS.map((tab, i) => {
            if (!tab) {
              return (
                <Link key="play" href="/games" aria-label="Play games" className="flex flex-1 flex-col items-center pb-2">
                  <span
                    className={`-mt-8 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#0D1320] bg-gradient-to-b from-[#FFD978] via-[#F5B82E] to-[#C98A12] shadow-[0_0_18px_rgba(245,184,46,0.55)] transition active:scale-95 ${playActive ? 'ring-2 ring-[#F5B82E]/50' : ''}`}
                  >
                    <Gamepad2 size={28} strokeWidth={2.2} className="text-[#1A1205]" />
                  </span>
                  <span className="mt-0.5 text-[11px] font-bold text-[#F5B82E]">Play</span>
                </Link>
              )
            }
            const active = isActive(pathname, tab.href)
            const Icon = tab.icon
            return (
              <Link key={tab.href + i} href={tab.href} className="flex flex-1 flex-col items-center gap-0.5 pb-2 pt-1 text-[11px]">
                <Icon size={22} strokeWidth={active ? 2.2 : 1.7} className={active ? 'text-[#F5B82E]' : 'text-slate-500'} />
                <span className={active ? 'font-semibold text-[#F5B82E]' : 'text-slate-500'}>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
