import { safeKv } from './redis'

const CACHE_PREFIX = 'cache:'

/**
 * Read-through JSON cache backed by Redis. On a Redis failure the loader result is returned uncached.
 * Only ever cache derived/public data — never balances.
 */
export async function cached<T>(name: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const key = `${CACHE_PREFIX}${name}`
  const hit = await safeKv('cache.get', (k) => k.get(key), null)
  if (hit !== null) {
    try {
      return JSON.parse(hit) as T
    } catch {
      /* fall through to reload */
    }
  }
  const value = await loader()
  await safeKv('cache.set', (k) => k.set(key, JSON.stringify(value), { px: ttlSeconds * 1000 }), false)
  return value
}

export async function invalidateCache(...prefixes: string[]) {
  for (const p of prefixes) {
    await safeKv('cache.invalidate', (k) => k.deleteByPrefix(`${CACHE_PREFIX}${p}`), undefined)
  }
}

export const CACHE = {
  settings: 'settings',
  banners: 'banners',
  campaigns: 'campaigns',
  games: 'games',
  announcements: 'announcements',
  tasks: 'tasks',
} as const
