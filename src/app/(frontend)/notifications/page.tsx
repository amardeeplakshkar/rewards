'use client'
import React, { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { api } from '@/lib/api-client'
import { relativeTime } from '@/lib/format'

interface Notification {
  id: number
  type: string
  title: string
  body?: string
  readAt?: string | null
  createdAt: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null)

  const load = () => api.get<{ notifications: Notification[] }>('/notifications').then((d) => setItems(d.notifications))

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id: number) => {
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ?? null)
    await api.post(`/notifications/${id}/read`).catch(() => null)
  }

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2">
          <ChevronLeft size={20} className="text-text-soft" />
        </Link>
        <h1 className="text-[18px] font-semibold">Notifications</h1>
      </div>
      <div className="space-y-2 pb-6">
        {!items ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : items.length === 0 ? (
          <EmptyState title="No notifications yet" body="We'll let you know when there's a reward, update or campaign for you." />
        ) : (
          items.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.readAt && markRead(n.id)}
              className={`px-4 py-3 ${n.readAt ? '' : 'border-brand-to/40 bg-badge-tint'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-medium">{n.title}</p>
                <span className="shrink-0 text-[11px] text-text-faint">{relativeTime(n.createdAt)}</span>
              </div>
              {n.body ? <p className="mt-0.5 text-[13px] text-text-soft">{n.body}</p> : null}
            </Card>
          ))
        )}
      </div>
    </AppShell>
  )
}