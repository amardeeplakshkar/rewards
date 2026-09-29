import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePayloadCookie } from 'payload/shared'
import { getPayloadClient } from '@/lib/payload'
import { isAppError } from '@/lib/errors'

const schema = z.object({ token: z.string().min(10), password: z.string().min(8) })

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const payload = await getPayloadClient()
    const result = await payload.resetPassword({ collection: 'users', data: body, overrideAccess: true })
    const cookie = generatePayloadCookie({ collectionAuthConfig: payload.collections.users.config.auth, cookiePrefix: payload.config.cookiePrefix, token: result.token! })
    const res = NextResponse.json({ ok: true, data: { user: { id: result.user.id, email: result.user.email } } })
    res.headers.append('Set-Cookie', cookie)
    return res
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid new password.' } }, { status: 422 })
    if (isAppError(err)) return NextResponse.json({ ok: false, error: { code: err.code, message: err.message } }, { status: err.status })
    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'This reset link is invalid or has expired.' } }, { status: 400 })
  }
}
