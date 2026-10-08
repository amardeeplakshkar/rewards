import { NextRequest, NextResponse } from 'next/server'
import { generateExpiredPayloadCookie } from 'payload/shared'
import { getPayloadClient, getUserPayloadClient } from '@/lib/payload'

export async function POST(_req: NextRequest) {
  const userPayload = await getUserPayloadClient()
  const adminPayload = await getPayloadClient()

  const userCookie = generateExpiredPayloadCookie({
    collectionAuthConfig: userPayload.collections.users.config.auth,
    cookiePrefix: userPayload.config.cookiePrefix,
  })
  const adminCookie = generateExpiredPayloadCookie({
    collectionAuthConfig: adminPayload.collections.admins.config.auth,
    cookiePrefix: adminPayload.config.cookiePrefix,
  })

  const res = NextResponse.json({ ok: true, data: null })
  res.headers.append('Set-Cookie', userCookie)
  res.headers.append('Set-Cookie', adminCookie)
  return res
}
