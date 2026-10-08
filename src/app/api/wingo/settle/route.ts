import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { runWingoTick } from '@/services/wingo'

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: 'CRON_SECRET is not configured.' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 })
  const payload = await getPayloadClient()
  const result = await runWingoTick(payload, undefined)
  return NextResponse.json({ ok: true, data: result })
}
