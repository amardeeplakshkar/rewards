import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePayloadCookie } from 'payload/shared'
import { getPayloadClient } from '@/lib/payload'
import { AppError, isAppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-meta'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const ip = getClientIp(req.headers)
    await enforceRateLimit(LIMITS.loginIp, ip, 'Too many login attempts from this network. Please try again later.')
    await enforceRateLimit(LIMITS.loginAccount, body.email.toLowerCase(), 'Too many login attempts for this account. Please try again later.')

    const payload = await getPayloadClient()
    const result = await payload.login({ collection: 'admins', data: body, req: { headers: req.headers } as never }).catch(() => null)
    if (!result?.user || !result.token) throw new AppError('UNAUTHENTICATED', 'Incorrect email or password.')
    if ((result.user as { isActive?: boolean }).isActive === false) throw new AppError('ACCOUNT_RESTRICTED', 'This admin account has been deactivated.')

    const cookie = generatePayloadCookie({
      collectionAuthConfig: payload.collections.admins.config.auth,
      cookiePrefix: payload.config.cookiePrefix,
      token: result.token,
    })
    const res = NextResponse.json({
      ok: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          roles: (result.user as { roles?: string[] }).roles,
          isActive: (result.user as { isActive?: boolean }).isActive,
        },
      },
    })
    res.headers.append('Set-Cookie', cookie)
    return res
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email and password.' } }, { status: 422 })
    if (isAppError(err)) return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.status })
    console.error('[admins/login]', err)
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL', message: 'Sign in failed. Please try again.' } }, { status: 500 })
  }
}