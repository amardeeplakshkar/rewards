import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePayloadCookie } from 'payload/shared'
import { getUserPayloadClient } from '@/lib/payload'
import { AppError, isAppError } from '@/lib/errors'
import { registerUser } from '@/services/user'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(120),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
  timezone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const payload = await getUserPayloadClient()
    const user = await registerUser({ payload, headers: req.headers, ...body })

    const requireVerify = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
    if (requireVerify) {
      return NextResponse.json({ ok: true, data: { user: { id: user.id, email: user.email, status: user.status }, requiresVerification: true } })
    }

    const { token } = await payload.login({ collection: 'users', data: { email: body.email, password: body.password }, req: { headers: req.headers } as never })
    const cookie = generatePayloadCookie({ collectionAuthConfig: payload.collections.users.config.auth, cookiePrefix: payload.config.cookiePrefix, token: token! })
    const res = NextResponse.json({ ok: true, data: { user: { id: user.id, email: user.email, name: user.name, status: user.status, referralCode: user.referralCode } } })
    res.headers.append('Set-Cookie', cookie)
    return res
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message ?? 'Invalid input' } }, { status: 422 })
    if (isAppError(err)) return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.status })
    console.error('[auth/register]', err)
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL', message: 'Registration failed. Please try again.' } }, { status: 500 })
  }
}
