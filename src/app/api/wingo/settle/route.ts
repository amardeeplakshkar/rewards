
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { runWingoTick } from '@/services/wingo'

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.error('[wingo-settle] CRON_SECRET is not configured')

    return NextResponse.json(
      { ok: false, error: 'Cron secret is not configured' },
      { status: 503 },
    )
  }

  if (
    request.headers.get('authorization') !== `Bearer ${secret}`
  ) {
    console.warn('[wingo-settle] Unauthorized request')

    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  try {
    const payload = await getPayloadClient()
    const result = await runWingoTick(payload, undefined)

    console.info('[wingo-settle] Tick completed', { result })

    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    console.error('[wingo-settle] Tick failed', error)

    return NextResponse.json(
      { ok: false, error: 'Settlement tick failed' },
      { status: 500 },
    )
  }
}
