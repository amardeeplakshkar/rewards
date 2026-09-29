import type { PayloadRequest } from 'payload'

/**
 * Temporarily sets a request-context flag (e.g. `walletWrite`) while `fn` runs, then clears it. The flags are
 * the collection-level guards that stop anything other than the owning service from writing protected data.
 */
export async function withFlag<T>(req: Partial<PayloadRequest>, flag: string, fn: () => Promise<T>): Promise<T> {
  req.context = { ...(req.context ?? {}), [flag]: true }
  try {
    return await fn()
  } finally {
    if (req.context) delete req.context[flag]
  }
}
