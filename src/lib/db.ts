import { sql } from 'drizzle-orm'
import { createLocalReq, commitTransaction, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'

/**
 * Returns the drizzle handle bound to the request's open transaction (or the pool when there is none).
 * This is what lets us run raw SQL (advisory locks, aggregates) inside the same transaction Payload uses.
 */
export async function getDb(payload: Payload, req?: Partial<PayloadRequest>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = payload.db as any
  const id = req?.transactionID ? await req.transactionID : undefined
  return (id && adapter.sessions?.[id]?.db) || adapter.drizzle
}

/**
 * Transaction-scoped advisory lock keyed by an arbitrary string. Released automatically at COMMIT/ROLLBACK.
 * Used to serialise all mutations of a single wallet (or a single campaign) at the database level.
 */
export async function advisoryXactLock(payload: Payload, req: Partial<PayloadRequest>, key: string) {
  const db = await getDb(payload, req)
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`)
}

/**
 * Runs `fn` inside a database transaction. If `existing` already carries a transaction (e.g. we are inside
 * a Payload hook) the work joins it, so a hook + service call commit or roll back together.
 */
export async function withTransaction<T>(
  payload: Payload,
  existing: Partial<PayloadRequest> | undefined | null,
  fn: (req: PayloadRequest) => Promise<T>,
): Promise<T> {
  if (existing?.transactionID) return fn(existing as PayloadRequest)
  const req = await createLocalReq({}, payload)
  const owns = await initTransaction(req)
  try {
    const result = await fn(req)
    if (owns) await commitTransaction(req)
    return result
  } catch (err) {
    if (owns) await killTransaction(req)
    throw err
  }
}

export async function rawQuery<T = Record<string, unknown>>(payload: Payload, query: ReturnType<typeof sql>, req?: Partial<PayloadRequest>): Promise<T[]> {
  const db = await getDb(payload, req)
  const res = await db.execute(query)
  return (res.rows ?? res) as T[]
}

export { sql }
