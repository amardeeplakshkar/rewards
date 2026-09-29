import Redis from 'ioredis'
import { REDIS_PREFIX } from '@/constants'
import { isProd } from './env'

/**
 * Thin key/value abstraction over Redis.
 *
 * Redis is used ONLY for ephemeral concerns: rate limiting, cooldown hints, distributed locks and caches.
 * PostgreSQL remains the single source of truth for every balance, reward and withdrawal. Correctness of
 * money operations never depends on Redis (see WalletService: advisory locks + unique idempotency keys).
 */
export interface KV {
  readonly kind: 'redis' | 'memory'
  get(key: string): Promise<string | null>
  set(key: string, value: string, opts?: { px?: number; nx?: boolean }): Promise<boolean>
  del(...keys: string[]): Promise<void>
  /** Atomically increments a counter, setting the TTL on first hit. */
  incr(key: string, windowMs: number): Promise<{ count: number; ttlMs: number }>
  releaseIfEquals(key: string, value: string): Promise<boolean>
  /** Remaining TTL in ms (-2 when missing, -1 when no expiry). */
  ttl(key: string): Promise<number>
  deleteByPrefix(prefix: string): Promise<void>
}

const INCR_LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local t = redis.call('PTTL', KEYS[1])
if t < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); t = tonumber(ARGV[1]) end
return {c, t}
`
const RELEASE_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end
`

class RedisKV implements KV {
  readonly kind = 'redis' as const
  constructor(private client: Redis) {}

  async get(key: string) {
    return this.client.get(REDIS_PREFIX + key)
  }
  async set(key: string, value: string, opts: { px?: number; nx?: boolean } = {}) {
    const k = REDIS_PREFIX + key
    let res: 'OK' | null
    if (opts.px && opts.nx) res = await this.client.set(k, value, 'PX', opts.px, 'NX')
    else if (opts.px) res = await this.client.set(k, value, 'PX', opts.px)
    else if (opts.nx) res = await this.client.set(k, value, 'NX')
    else res = await this.client.set(k, value)
    return res === 'OK'
  }
  async del(...keys: string[]) {
    if (keys.length) await this.client.del(...keys.map((k) => REDIS_PREFIX + k))
  }
  async incr(key: string, windowMs: number) {
    const [count, ttlMs] = (await this.client.eval(INCR_LUA, 1, REDIS_PREFIX + key, String(windowMs))) as [number, number]
    return { count, ttlMs }
  }
  async releaseIfEquals(key: string, value: string) {
    return (await this.client.eval(RELEASE_LUA, 1, REDIS_PREFIX + key, value)) === 1
  }
  async ttl(key: string) {
    return this.client.pttl(REDIS_PREFIX + key)
  }
  async deleteByPrefix(prefix: string) {
    const stream = this.client.scanStream({ match: `${REDIS_PREFIX}${prefix}*`, count: 200 })
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length) await this.client.del(...keys)
    }
  }
}

/** Single-process fallback for local development / tests only. Never used in production. */
class MemoryKV implements KV {
  readonly kind = 'memory' as const
  private store = new Map<string, { v: string; exp: number | null }>()

  private live(key: string) {
    const e = this.store.get(key)
    if (!e) return undefined
    if (e.exp !== null && e.exp <= Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return e
  }
  async get(key: string) {
    return this.live(key)?.v ?? null
  }
  async set(key: string, value: string, opts: { px?: number; nx?: boolean } = {}) {
    if (opts.nx && this.live(key)) return false
    this.store.set(key, { v: value, exp: opts.px ? Date.now() + opts.px : null })
    return true
  }
  async del(...keys: string[]) {
    keys.forEach((k) => this.store.delete(k))
  }
  async incr(key: string, windowMs: number) {
    const e = this.live(key)
    if (!e) {
      this.store.set(key, { v: '1', exp: Date.now() + windowMs })
      return { count: 1, ttlMs: windowMs }
    }
    e.v = String(Number(e.v) + 1)
    return { count: Number(e.v), ttlMs: (e.exp ?? Date.now()) - Date.now() }
  }
  async releaseIfEquals(key: string, value: string) {
    const e = this.live(key)
    if (e && e.v === value) {
      this.store.delete(key)
      return true
    }
    return false
  }
  async ttl(key: string) {
    const e = this.live(key)
    if (!e) return -2
    return e.exp === null ? -1 : e.exp - Date.now()
  }
  async deleteByPrefix(prefix: string) {
    for (const k of [...this.store.keys()]) if (k.startsWith(prefix)) this.store.delete(k)
  }
}

const g = globalThis as unknown as { __rwKV?: KV }

export function kv(): KV {
  if (g.__rwKV) return g.__rwKV
  const url = process.env.REDIS_URL
  if (!url) {
    if (isProd()) throw new Error('REDIS_URL is required in production')
    console.warn('[redis] REDIS_URL not set — using in-memory fallback (development only, single instance).')
    g.__rwKV = new MemoryKV()
    return g.__rwKV
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    enableReadyCheck: true,
    lazyConnect: false,
  })
  client.on('error', (err) => console.error('[redis] error:', err.message))
  g.__rwKV = new RedisKV(client)
  return g.__rwKV
}

/** Run a Redis call; on failure log and return the fallback so a Redis outage degrades instead of taking the app down. */
export async function safeKv<T>(label: string, fn: (k: KV) => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn(kv())
  } catch (err) {
    console.error(`[redis] ${label} failed:`, (err as Error).message)
    return fallback
  }
}
