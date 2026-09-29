import type { Payload, PayloadRequest } from 'payload'
import type { NotificationType } from '@/constants'

export interface NotifyInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  userId: number
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  /** Same key → at most one notification. */
  dedupeKey?: string
}

/** Delivery channels. Only in-app exists today; add email / push / Telegram adapters here later. */
export interface NotificationChannel {
  name: string
  deliver(n: { userId: number; type: NotificationType; title: string; body?: string; data?: Record<string, unknown> }): Promise<'SENT' | 'SKIPPED'>
}
const inApp: NotificationChannel = { name: 'in_app', deliver: async () => 'SENT' }
export const CHANNELS: NotificationChannel[] = [inApp]

/**
 * Creates an in-app notification. Never throws — a failed notification must not roll back a reward.
 * (Failures inside an open DB transaction are avoided by pre-checking the dedupe key instead of relying
 * on the unique constraint, which would abort the surrounding transaction.)
 */
export async function notify(input: NotifyInput): Promise<void> {
  const { payload, req } = input
  try {
    if (input.dedupeKey) {
      const existing = await payload.find({
        collection: 'notifications',
        where: { dedupeKey: { equals: input.dedupeKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req: req as PayloadRequest | undefined,
      })
      if (existing.docs.length) return
    }
    const channels: Record<string, string> = {}
    for (const ch of CHANNELS) channels[ch.name] = await ch.deliver({ userId: input.userId, type: input.type, title: input.title, body: input.body, data: input.data })
    await payload.create({
      collection: 'notifications',
      overrideAccess: true,
      req: req as PayloadRequest | undefined,
      data: {
        user: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? null) as never,
        dedupeKey: input.dedupeKey,
        channels: channels as never,
      },
    })
  } catch (err) {
    console.error('[notify] failed:', (err as Error).message)
  }
}
