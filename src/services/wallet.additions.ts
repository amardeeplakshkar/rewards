import type { Payload } from 'payload'
import { assertPositiveMinor } from '@/lib/money'
import { postEntry, type Req } from '@/services/wallet'

export function debitGameWallet(i: { payload: Payload; req?: Req; userId: number; amount: number; description: string; idempotencyKey: string; referenceId?: string | number }) {
  assertPositiveMinor(i.amount)
  return postEntry({
    payload: i.payload,
    req: i.req,
    userId: i.userId,
    type: 'GAME_BET',
    signedAmount: -i.amount,
    description: i.description,
    idempotencyKey: i.idempotencyKey,
    referenceType: 'casino-round',
    referenceId: i.referenceId,
  })
}
