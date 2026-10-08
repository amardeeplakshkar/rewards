import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePayloadCookie } from 'payload/shared'
import { getUserPayloadClient } from '@/lib/payload'
import { AppError, isAppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-meta'
import { recordLogin } from '@/services/user'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const ip = getClientIp(req.headers)
    await enforceRateLimit(LIMITS.loginIp, ip, 'Too many login attempts from this network. Please try again later.')
    await enforceRateLimit(LIMITS.loginAccount, body.email.toLowerCase(), 'Too many login attempts for this account. Please try again later.')

    const payload = await getUserPayloadClient()
    const result = await payload.login({ collection: 'users', data: body, req: { headers: req.headers } as never }).catch(() => null)
    if (!result?.user || !result.token) throw new AppError('UNAUTHENTICATED', 'Incorrect email or password.')
    if (result.user.status === 'BLOCKED' || result.user.status === 'DELETED') throw new AppError('ACCOUNT_RESTRICTED', 'This account is not able to sign in.')

    await recordLogin(payload, {}, result.user.id, ip)
    const cookie = generatePayloadCookie({ collectionAuthConfig: payload.collections.users.config.auth, cookiePrefix: payload.config.cookiePrefix, token: result.token })
    const res = NextResponse.json({ ok: true, data: { user: { id: result.user.id, email: result.user.email, name: result.user.name, status: result.user.status } } })
    res.headers.append('Set-Cookie', cookie)
    return res
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email and password.' } }, { status: 422 })
    if (isAppError(err)) return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.status })
    console.error('[auth/login]', err)
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL', message: 'Sign in failed. Please try again.' } }, { status: 500 })
  }
}
