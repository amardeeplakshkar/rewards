'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Gamepad2, Coins, Gift, User } from 'lucide-react'

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/earn', label: 'Earn', icon: Coins },
  { href: '/promotions', label: 'Promotion', icon: Gift },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1F2E45] bg-[#0A1020]/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]"
            >
              <div className={`rounded-xl p-1.5 ${active ? 'bg-amber-400/15' : ''}`}>
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  className={active ? 'text-amber-400' : 'text-slate-500'}
                />
              </div>
              <span className={active ? 'font-semibold text-amber-400' : 'text-slate-500'}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
