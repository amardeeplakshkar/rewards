'use client'
import React from 'react'
import Link from 'next/link'
import { Bell, ChevronLeft, User2Icon } from 'lucide-react'
import { BottomNav } from './BottomNav'

export function AppShell({
  children,
  title,
  right,
  showBack = false,
  hideHeader = false,
}: {
  children: React.ReactNode
  title?: string
  right?: React.ReactNode
  showBack?: boolean
  hideHeader?: boolean
}) {
  return (
    <div className="min-h-dvh bg-(--app-dark) pb-24">
      {!hideHeader && (
        <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-(--app-dark)/95   backdrop-blur">
          {title ? (
            <>
              <h1 className="font-display text-[22px] font-medium text-ink">{title}</h1>
              {right}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-4">
                {showBack && (
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="rounded-full p-1 hover:bg-white/5"
                    aria-label="Go back"
                  >
                    <ChevronLeft size={22} className="text-slate-300" />
                  </button>
                )}
                <Link href="/" className="flex items-center gap-1.5">
                  <div
                  style={{
                    backgroundImage: "url('/logo.jpeg')"
                  }}
                  className="flex h-8 w-8 bg-center bg-cover items-center justify-center rounded-lg">

                  </div>
                  <div className="leading-none">
                    <h1 className="text-base font-black tracking-tight text-white">
                      KING <span className="text-amber-400">888</span>
                    </h1>
                    <p className="text-[7px] font-medium tracking-[0.15em] text-slate-400">Play · Earn · Redeem</p>
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/notifications" className="relative rounded-full p-2 hover:bg-white/5">
                  <Bell size={20} className="text-slate-300" />
                </Link>
                <Link href="/profile" className="relative">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-slate-500 bg-gradient-to-br from-slate-600 to-slate-800">
                <User2Icon size={16}/>
                  </div>
                </Link>
              </div>
            </>
          )}
        </header>
      )}

      <main className="mx-auto max-w-md px-4">{children}</main>
      <BottomNav />
    </div>
  )
}
