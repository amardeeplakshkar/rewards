import { randomInt, randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { MINOR_UNITS_PER_MAJOR } from '@/constants'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { withFlag } from '@/services/context'
import { creditWallet, debitWallet, getWallet } from '@/services/wallet'
import { getNumberTraits, getRoundWindow, parseMode, payoutForBet, validateBet, WINGO_MODES, type WingoMode } from '@/wingo/logic'
import { toMinorWingoAmount } from '@/wingo/money'

type Req = Partial<PayloadRequest> | undefined
const roundLock = (periodKey: string) => `wingo-round:${periodKey}`

function modeOrError(value: unknown): WingoMode {
  try { return parseMode(value) } catch (error) { throw new AppError('VALIDATION_ERROR', error instanceof Error ? error.message : 'Invalid Wingo mode.') }
}

function betOrError(input: { type: unknown; selection: unknown; amount: unknown }) {
  try { return validateBet(input) } catch (error) { throw new AppError('VALIDATION_ERROR', error instanceof Error ? error.message : 'Invalid Wingo bet.') }
}

function relationId(value: unknown): number {
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: unknown }).id) : Number(value)
}

export async function getOrCreateCurrentRound(payload: Payload, req: Req, modeInput: unknown, nowMs = Date.now()) {
  const mode = modeOrError(modeInput)
  const window = getRoundWindow(nowMs, mode)
  return withTransaction(payload, req, async (r) => {
    await advisoryXactLock(payload, r, roundLock(window.periodKey))
    const existing = await payload.find({ collection: 'wingo-rounds', where: { periodKey: { equals: window.periodKey } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (existing.docs[0]) return existing.docs[0]
    return payload.create({
      collection: 'wingo-rounds', overrideAccess: true, depth: 0, req: r,
      data: { periodKey: window.periodKey, mode, status: 'OPEN', startAt: window.startAt, bettingClosesAt: window.bettingClosesAt, endsAt: window.endsAt, settlementVersion: 1 } as never,
    })
  })
}

export async function placeWingoBet(input: {
  payload: Payload; req?: Req; user: { id: number; status?: string }; mode: unknown; type: unknown; selection: unknown; amount: unknown; idempotencyKey?: unknown
}) {
  const { payload, user } = input
  await enforceRateLimit(LIMITS.gameStart, `wingo:${user.id}`)
  if (user.status && user.status !== 'ACTIVE') throw new AppError('ACCOUNT_RESTRICTED', 'Your account cannot place Wingo bets right now.')
  const mode = modeOrError(input.mode)
  const bet = betOrError({ type: input.type, selection: input.selection, amount: input.amount })
  if (typeof input.idempotencyKey !== 'string' || !/^[a-zA-Z0-9:_-]{12,120}$/.test(input.idempotencyKey)) throw new AppError('VALIDATION_ERROR', 'A valid idempotencyKey is required.')
  const idempotencyKey = input.idempotencyKey
  const now = new Date()
  const window = getRoundWindow(now.getTime(), mode)

  return withTransaction(payload, input.req, async (r) => {
    await advisoryXactLock(payload, r, roundLock(window.periodKey))
    const prior = await payload.find({ collection: 'wingo-bets', where: { idempotencyKey: { equals: idempotencyKey } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (prior.docs[0]) {
      const previous = prior.docs[0]
      if (relationId(previous.user) !== user.id || previous.mode !== mode || previous.type !== bet.type || previous.selection !== bet.selection || previous.stake !== bet.amount) throw new AppError('CONFLICT', 'This request key was already used for a different bet.')
      const wallet = await getWallet(payload, user.id)
      return { bet: previous, balance: wallet.availableBalance ?? 0, duplicate: true }
    }
    if (Date.now() >= new Date(window.bettingClosesAt).getTime() - 1500) throw new AppError('INVALID_STATE', 'Betting is closed for this round. Wait for the next round.')
    const roundResult = await payload.find({ collection: 'wingo-rounds', where: { periodKey: { equals: window.periodKey } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    const round = roundResult.docs[0] ?? await payload.create({
      collection: 'wingo-rounds', overrideAccess: true, depth: 0, req: r,
      data: { periodKey: window.periodKey, mode, status: 'OPEN', startAt: window.startAt, bettingClosesAt: window.bettingClosesAt, endsAt: window.endsAt, settlementVersion: 1 } as never,
    })
    if (round.status !== 'OPEN' || Date.now() >= new Date(round.bettingClosesAt).getTime() - 1500) throw new AppError('INVALID_STATE', 'Betting is closed for this round.')

    const betId = randomUUID()
    const minorStake = toMinorWingoAmount(bet.amount)
    await debitWallet({ payload, req: r, userId: user.id, amount: minorStake, idempotencyKey: `wingo-stake:${idempotencyKey}`, description: `Wingo ${mode} stake`, referenceType: 'wingo-bet', referenceId: betId })
    const created = await withFlag(r, 'wingoBetWrite', () => payload.create({
      collection: 'wingo-bets', overrideAccess: true, depth: 0, req: r,
      data: { user: user.id, round: round.id, periodKey: round.periodKey, mode, type: bet.type, selection: bet.selection, stake: bet.amount, payout: 0, status: 'PENDING', idempotencyKey, createdAt: now.toISOString() } as never,
    }))
    const wallet = await getWallet(payload, user.id)
    return { bet: created, balance: wallet.availableBalance ?? 0, duplicate: false }
  })
}

/** Settle ended rounds exactly once. Called from the cron route and opportunistically by state/history reads. */
export async function settleDueWingoRounds(payload: Payload, req?: Req, now = new Date()) {
  const due = await payload.find({ collection: 'wingo-rounds', where: { status: { equals: 'OPEN' }, endsAt: { less_than_equal: now.toISOString() } }, sort: 'endsAt', limit: 100, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined })
  let settled = 0
  for (const candidate of due.docs) {
    await withTransaction(payload, req, async (r) => {
      await advisoryXactLock(payload, r, roundLock(candidate.periodKey))
      const fresh = await payload.findByID({ collection: 'wingo-rounds', id: candidate.id, depth: 0, overrideAccess: true, req: r })
      if (fresh.status !== 'OPEN' || new Date(fresh.endsAt) > now) return
      const winningNumber = randomInt(0, 10)
      const bets = await payload.find({ collection: 'wingo-bets', where: { round: { equals: fresh.id }, status: { equals: 'PENDING' } }, limit: 1000, depth: 0, overrideAccess: true, req: r })
      for (const item of bets.docs) {
        const userId = relationId(item.user)
        const payout = payoutForBet({ type: item.type as 'number' | 'color' | 'size', selection: item.selection, amount: item.stake }, winningNumber)
        const payoutMinor = toMinorWingoAmount(payout)
        if (payout > 0) await creditWallet({
          payload, req: r, userId, type: 'GAME_REWARD', amount: payoutMinor, idempotencyKey: `wingo-payout:${item.idempotencyKey}`,
          description: `Wingo ${fresh.mode} payout`, referenceType: 'wingo-bet', referenceId: item.id,
        })
        await withFlag(r, 'wingoBetWrite', () => payload.update({
          collection: 'wingo-bets', id: item.id, overrideAccess: true, depth: 0, req: r,
          data: { status: payout > 0 ? 'WON' : 'LOST', payout, winningNumber, settledAt: now.toISOString() } as never,
        }))
      }
      await payload.update({ collection: 'wingo-rounds', id: fresh.id, overrideAccess: true, depth: 0, req: r, data: { status: 'SETTLED', winningNumber, settledAt: now.toISOString() } as never })
      settled += 1
    })
  }
  return { settled }
}

export async function ensureAllCurrentWingoRounds(payload: Payload, req?: Req, nowMs = Date.now()) {
  const modes = Object.keys(WINGO_MODES) as WingoMode[]
  for (const mode of modes) await getOrCreateCurrentRound(payload, req, mode, nowMs)
}

export async function runWingoTick(payload: Payload, req?: Req) {
  const settlement = await settleDueWingoRounds(payload, req)
  await ensureAllCurrentWingoRounds(payload, req)
  return settlement
}

export async function getWingoState(payload: Payload, req: Req, userId: number, modeInput: unknown) {
  const mode: WingoMode = modeOrError(modeInput)
  await settleDueWingoRounds(payload, req)
  const now = Date.now()
  await ensureAllCurrentWingoRounds(payload, req, now)
  const current = await getOrCreateCurrentRound(payload, req, mode, now)
  const wallet = await getWallet(payload, userId)
  const [results, mine] = await Promise.all([
    payload.find({ collection: 'wingo-rounds', where: { mode: { equals: mode }, status: { equals: 'SETTLED' } }, sort: '-endsAt', limit: 40, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }),
    payload.find({ collection: 'wingo-bets', where: { user: { equals: userId }, mode: { equals: mode } }, sort: '-createdAt', limit: 60, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }),
  ])
  const window = getRoundWindow(now, mode)
  return {
    mode, balance: wallet.availableBalance ?? 0,
    currentRound: { periodKey: current.periodKey, startAt: current.startAt, endsAt: current.endsAt, bettingClosesAt: current.bettingClosesAt, status: current.status, remainingSeconds: window.remainingSeconds },
    results: results.docs.map((r) => ({ period: r.periodKey, mode: r.mode, number: r.winningNumber, ...getNumberTraits(Number(r.winningNumber)), createdAt: r.settledAt ?? r.endsAt })),
    bets: mine.docs.map((b) => ({ id: b.id, period: b.periodKey, mode: b.mode, type: b.type, selection: b.selection, amount: b.stake, payout: b.payout, status: b.status, number: b.winningNumber ?? null, placedAt: b.createdAt, settledAt: b.settledAt ?? null })),
  }
}

export async function getWingoHistory(payload: Payload, req: Req, userId: number, modeInput: unknown) {
  const state = await getWingoState(payload, req, userId, modeInput)
  return { results: state.results, bets: state.bets, balance: state.balance }
}

export async function grantWingoPoints(input: { payload: Payload; req?: Req; userId: number; amount: number; reason: string; idempotencyKey?: string }) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 1_000_000_000) throw new AppError('BAD_REQUEST', 'Grant must be a positive whole number of rupees.')
  const key = input.idempotencyKey ?? `wingo-grant:${randomUUID()}`
  return withTransaction(input.payload, input.req, async (r) => creditWallet({
    payload: input.payload,
    req: r,
    userId: input.userId,
    type: 'ADMIN_CREDIT',
    amount: toMinorWingoAmount(input.amount),
    idempotencyKey: key,
    description: input.reason.trim().slice(0, 180) || 'Wingo wallet credit',
    referenceType: 'admin-grant',
    referenceId: key,
  }))
}
