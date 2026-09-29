import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPayloadClient } from '@/lib/payload'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-meta'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ ok: true, data: null })
  const ip = getClientIp(req.headers)
  await enforceRateLimit(LIMITS.passwordResetIp, ip).catch(() => null)
  await enforceRateLimit(LIMITS.passwordResetAccount, body.data.email.toLowerCase()).catch(() => null)
  const payload = await getPayloadClient()
  await payload.forgotPassword({ collection: 'users', data: body.data, disableEmail: false }).catch(() => null)
  return NextResponse.json({ ok: true, data: null })
}
