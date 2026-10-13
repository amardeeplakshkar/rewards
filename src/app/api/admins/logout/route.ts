import { NextResponse } from 'next/server'
import { generateExpiredPayloadCookie } from 'payload/shared'
import { getPayloadClient } from '@/lib/payload'

/**
 * Clear the admin session cookie even when Payload can no longer resolve the
 * session. This keeps the admin UI's POST /api/admins/logout action reliable
 * for stale or invalid sessions too.
 */
export async function POST() {
  const payload = await getPayloadClient()
  const cookie = generateExpiredPayloadCookie({
    collectionAuthConfig: payload.collections.admins.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
  })

  const response = NextResponse.json({ message: 'Logged out successfully.' })
  response.headers.append('Set-Cookie', cookie)
  return response
}
