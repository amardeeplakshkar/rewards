import { NextRequest, NextResponse } from 'next/server'
import type { PayloadRequest } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { AppError, isAppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { User } from '@/payload-types'

export interface ApiContext {
  payload: Awaited<ReturnType<typeof getPayloadClient>>
  req: PayloadRequest
  user: User | null
  headers: Headers
}

function fail(err: unknown) {
  if (isAppError(err)) {
    return NextResponse.json({ ok: false, error: { code: err.code, message: err.message, details: err.details } }, { status: err.status, headers: err.retryAfterSeconds ? { 'Retry-After': String(err.retryAfterSeconds) } : undefined })
  }
  console.error('[api] unhandled error:', err)
  return NextResponse.json({ ok: false, error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } }, { status: 500 })
}

/** Wraps a route handler with a Payload req/user, global rate limiting, and consistent error shaping. */
export function withApi<Ctx = unknown>(
  fn: (ctx: ApiContext, req: NextRequest, routeCtx: Ctx) => Promise<NextResponse>,
  opts: { requireAuth?: boolean } = { requireAuth: true },
) {
  return async (req: NextRequest, routeCtx: Ctx): Promise<NextResponse> => {
    try {
      const payload = await getPayloadClient()
      const { user } = await payload.auth({ headers: req.headers })
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0'
      await enforceRateLimit(LIMITS.api, ip)

      if (opts.requireAuth) {
        if (!user || (user as { collection?: string }).collection !== 'users') throw new AppError('UNAUTHENTICATED', 'Please sign in to continue.')
        const status = (user as unknown as User).status
        if (status === 'BLOCKED' || status === 'DELETED') throw new AppError('ACCOUNT_RESTRICTED', 'This account cannot sign in.')
      }

      const payloadReq = { user, headers: req.headers, payload } as unknown as PayloadRequest
      return await fn({ payload, req: payloadReq, user: (user as unknown as User) ?? null, headers: req.headers }, req, routeCtx)
    } catch (err) {
      return fail(err)
    }
  }
}

export const ok = (data: unknown, init?: number) => NextResponse.json({ ok: true, data }, { status: init ?? 200 })
