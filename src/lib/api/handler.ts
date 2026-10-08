import { NextRequest, NextResponse } from 'next/server'
import type { PayloadRequest } from 'payload'
import { getUserPayloadClient } from '@/lib/payload'
import { AppError, isAppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { User } from '@/payload-types'

export interface ApiContext {
  payload: Awaited<ReturnType<typeof getUserPayloadClient>>
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
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const startedTimers: string[] = []
    const startTimer = (label: string) => {
      const timerLabel = `[withApi] ${requestId} ${label}`
      startedTimers.push(timerLabel)
      console.time(timerLabel)
    }
    const finishTimer = () => {
      const label = startedTimers.pop()
      if (label) console.timeEnd(label)
    }

    try {
      startTimer('TOTAL')

      startTimer('getPayloadClient')
      const payload = await getUserPayloadClient()
      finishTimer()

      startTimer('payload.auth')
      const { user } = await payload.auth({ headers: req.headers })
      finishTimer()

      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        '0.0.0.0'

      startTimer('rateLimit')
      await enforceRateLimit(LIMITS.api, ip)
      finishTimer()

      startTimer('auth checks')

      if (opts.requireAuth) {
        if (
          !user ||
          (user as { collection?: string }).collection !== 'users'
        ) {
          throw new AppError(
            'UNAUTHENTICATED',
            'Please sign in to continue.',
          )
        }

        const status = (user as unknown as User).status

        if (status === 'BLOCKED' || status === 'DELETED') {
          throw new AppError(
            'ACCOUNT_RESTRICTED',
            'This account cannot sign in.',
          )
        }
      }

      finishTimer()

      const payloadReq = {
        user,
        headers: req.headers,
        payload,
      } as unknown as PayloadRequest

      startTimer('handler')
      const response = await fn(
        {
          payload,
          req: payloadReq,
          user: (user as unknown as User) ?? null,
          headers: req.headers,
        },
        req,
        routeCtx,
      )
      finishTimer()
      finishTimer()

      return response
    } catch (err) {
      while (startedTimers.length > 0) {
        finishTimer()
      }
      return fail(err)
    }
  }
}

export const ok = (data: unknown, init?: number) => NextResponse.json({ ok: true, data }, { status: init ?? 200 })
