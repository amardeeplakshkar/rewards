import { NextRequest, NextResponse } from 'next/server'
import { generateExpiredPayloadCookie } from 'payload/shared'
import { getPayloadClient } from '@/lib/payload'

export async function POST(_req: NextRequest) {
  const payload = await getPayloadClient()
  const cookie = generateExpiredPayloadCookie({ collectionAuthConfig: payload.collections.users.config.auth, cookiePrefix: payload.config.cookiePrefix })
  const res = NextResponse.json({ ok: true, data: null })
  res.headers.append('Set-Cookie', cookie)
  return res
}
