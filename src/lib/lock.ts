import { randomUUID } from 'node:crypto'
import { AppError } from './errors'
import { kv } from './redis'

/**
 * Distributed mutex (SET NX PX + compare-and-delete release).
 *
 * This is a *fast-fail guard* that stops duplicate concurrent requests (double-click, replay) before they
 * hit the database. Correctness does NOT rely on it: money paths additionally take a PostgreSQL advisory
 * transaction lock and rely on unique idempotency keys. If Redis is unreachable we log and continue,
 * because the database guarantees remain intact.
 */
export async function withLock<T>(
  name: string,
  fn: () => Promise<T>,
  opts: { ttlMs?: number; waitMs?: number; message?: string } = {},
): Promise<T> {
  const ttlMs = opts.ttlMs ?? 15_000
  const waitMs = opts.waitMs ?? 0
  const key = `lock:${name}`
  const token = randomUUID()
  const deadline = Date.now() + waitMs
  let held = false
  let redisDown = false

  for (;;) {
    try {
      held = await kv().set(key, token, { px: ttlMs, nx: true })
    } catch (err) {
      console.error('[lock] Redis unavailable, continuing on DB guarantees:', (err as Error).message)
      redisDown = true
      break
    }
    if (held) break
    if (Date.now() >= deadline) {
      throw new AppError('LOCKED', opts.message ?? 'Another request for this action is already in progress. Please wait a moment.', {
        retryAfterSeconds: 2,
      })
    }
    await new Promise((r) => setTimeout(r, 75))
  }

  try {
    return await fn()
  } finally {
    if (held && !redisDown) {
      try {
        await kv().releaseIfEquals(key, token)
      } catch {
        /* lock expires by TTL */
      }
    }
  }
}
