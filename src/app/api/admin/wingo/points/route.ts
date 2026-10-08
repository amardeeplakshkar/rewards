import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { isAdminUser } from '@/access'
import { grantWingoPoints } from '@/services/wingo'

export async function POST(request: NextRequest) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })
  if (!isAdminUser(user)) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admins only.' } }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const userId = Number(body.userId)
  const amount = Number(body.amount)
  if (!Number.isSafeInteger(userId) || userId < 1) return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'A valid userId is required.' } }, { status: 400 })
  try {
    const tx = await grantWingoPoints({ payload, userId, amount, reason: String(body.reason ?? 'Admin Wingo wallet grant'), idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined })
    const data: { transactionId: number; balanceAfter?: number } = { transactionId: tx.transaction.id }
    if (typeof tx.wallet.availableBalance === 'number') {
      data.balanceAfter = tx.wallet.availableBalance
    }
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not grant points.'
    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message } }, { status: 400 })
  }
}
