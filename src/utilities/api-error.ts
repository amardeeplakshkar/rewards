import { APIError } from 'payload'
import { isAppError } from '@/lib/errors'

/** Run a service call inside a Payload hook and surface AppErrors as admin-friendly APIErrors. */
export async function asApiError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (isAppError(err)) throw new APIError(err.message, err.status)
    throw err
  }
}
