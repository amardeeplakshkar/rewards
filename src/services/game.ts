import { randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { advisoryXactLock, withTransaction } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import { getRequestMeta } from '@/lib/request-meta'
import { dayBounds } from '@/lib/time'
import { mulDivFloor } from '@/lib/money'
import type { Game, GameSession, User } from '@/payload-types'
import type { GameType } from '@/constants'
import { ENGINES } from '@/games/registry'
import { creditWallet } from './wallet'
import { logAudit } from './audit'
import { notify } from './notification'
import { withFlag } from './context'
import { getSettings } from './settings'

const gameLockKey = (userId: number, gameId: number) => `game:${userId}:${gameId}`

async function loadActiveGame(payload: Payload, id: number, req?: Partial<PayloadRequest>): Promise<Game> {
  const game = await payload.findByID({ collection: 'games', id, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined }).catch(() => null)
  if (!game || game.status !== 'ACTIVE') throw new AppError('NOT_AVAILABLE', 'This game is not currently available.')
  const now = new Date()
  if (game.startsAt && now < new Date(game.startsAt)) throw new AppError('NOT_AVAILABLE', 'This game has not started yet.')
  if (game.endsAt && now >= new Date(game.endsAt)) throw new AppError('NOT_AVAILABLE', 'This game has ended.')
  return game
}

export interface StartGameInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  gameId: number
  headers: Headers
}

export interface StartGameResult {
  session: GameSession
  client: unknown
}

export async function startGameSession(i: StartGameInput): Promise<StartGameResult> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.gameStart, `${user.id}`)
  const game = await loadActiveGame(payload, i.gameId, i.req)
  if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_RESTRICTED', 'Your account cannot play right now.')

  const settings = await getSettings(payload)
  const { start, end } = dayBounds(new Date(), settings.site.defaultTimezone)

  return withTransaction(payload, i.req, async (r) => {
    await advisoryXactLock(payload, r, gameLockKey(user.id, game.id))

    const inProgress = await payload.find({ collection: 'game-sessions', where: { user: { equals: user.id }, game: { equals: game.id }, status: { equals: 'STARTED' } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    if (inProgress.docs[0] && new Date(inProgress.docs[0].expiresAt) > new Date()) {
      const engine = ENGINES[game.type as GameType]
      // Resume: re-derive the client view is not stored, so we simply let the client resume with what it has;
      // safer to expire and start fresh to avoid ambiguity.
      await withFlag(r, 'serviceWrite', () => payload.update({ collection: 'game-sessions', id: inProgress.docs[0]!.id, overrideAccess: true, depth: 0, req: r, data: { status: 'EXPIRED' } }))
      void engine
    }

    if (game.maxAttemptsPerDay) {
      const today = await payload.count({ collection: 'game-sessions', where: { user: { equals: user.id }, game: { equals: game.id }, createdAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() } }, overrideAccess: true, req: r })
      if (today.totalDocs >= game.maxAttemptsPerDay) throw new AppError('LIMIT_REACHED', "You've reached today's play limit for this game.")
    }
    if (game.cooldownSeconds) {
      const last = await payload.find({ collection: 'game-sessions', where: { user: { equals: user.id }, game: { equals: game.id } }, sort: '-startedAt', limit: 1, depth: 0, overrideAccess: true, req: r })
      const lastAt = last.docs[0]?.startedAt
      if (lastAt && Date.now() - new Date(lastAt).getTime() < game.cooldownSeconds * 1000) {
        throw new AppError('COOLDOWN', 'Please wait before playing again.', { retryAfterSeconds: game.cooldownSeconds })
      }
    }

    const engine = ENGINES[game.type as GameType]
    if (!engine) throw new AppError('INTERNAL', 'This game type is not supported yet.')
    const { client, server, maxScore } = await engine.start(payload, game)

    const meta = getRequestMeta(i.headers)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (game.durationSeconds ?? 180) * 1000)
    const sessionId = randomUUID()
    const dayKey = start.toISOString().slice(0, 10)

    const session = await withFlag(r, 'serviceWrite', () =>
      payload.create({
        collection: 'game-sessions',
        overrideAccess: true,
        depth: 0,
        req: r,
        data: {
          sessionId,
          user: user.id,
          game: game.id,
          status: 'STARTED',
          startedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          dayKey,
          maxScore,
          attempts: 1,
          serverState: server as never,
          ip: meta.ip,
          userAgent: meta.userAgent,
          device: meta.device,
        },
      }),
    )
    return { session, client }
  })
}

export interface SubmitGameInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  user: User
  sessionId: string
  answer: unknown
}

export async function submitGameSession(i: SubmitGameInput): Promise<GameSession> {
  const { payload, user } = i
  await enforceRateLimit(LIMITS.gameComplete, `${user.id}`)

  return withTransaction(payload, i.req, async (r) => {
    const found = await payload.find({ collection: 'game-sessions', where: { sessionId: { equals: i.sessionId } }, limit: 1, depth: 0, overrideAccess: true, req: r })
    const session = found.docs[0]
    const owner = session && (typeof session.user === 'object' ? (session.user as { id: number }).id : session.user)
    if (!session || owner !== user.id) throw new AppError('NOT_FOUND', 'Session not found.')
    if (session.status !== 'STARTED') throw new AppError('INVALID_STATE', 'This session has already been finalised.')

    const game = await payload.findByID({ collection: 'games', id: typeof session.game === 'object' ? session.game.id : session.game, depth: 0, overrideAccess: true, req: r })
    await advisoryXactLock(payload, r, gameLockKey(user.id, game.id))

    const now = new Date()
    if (now > new Date(session.expiresAt)) {
      await withFlag(r, 'serviceWrite', () => payload.update({ collection: 'game-sessions', id: session.id, overrideAccess: true, depth: 0, req: r, data: { status: 'EXPIRED', endedAt: now.toISOString() } }))
      throw new AppError('INVALID_STATE', 'This session expired. Start a new one.')
    }

    const engine = ENGINES[game.type as GameType]
    if (!engine) throw new AppError('INTERNAL', 'This game type is not supported yet.')
    const elapsedSeconds = (now.getTime() - new Date(session.startedAt).getTime()) / 1000
    const result = await engine.submit(payload, game, { server: session.serverState as never, payload: i.answer, elapsedSeconds })

    const scorePercent = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0
    const gameResult = result.rejectionReason ? 'LOSE' : scorePercent >= 100 ? 'WIN' : scorePercent > 0 ? 'PARTIAL' : 'LOSE'

    let rewardAmount = 0
    let rewardBlockedReason: string | null = null
    if (!result.rejectionReason) {
      const settings = await getSettings(payload)
      const { start, end } = dayBounds(now, settings.site.defaultTimezone)
      if (game.dailyRewardedPlays) {
        const rewardedToday = await payload.count({
          collection: 'game-sessions',
          where: { user: { equals: user.id }, game: { equals: game.id }, rewardAmount: { greater_than: 0 }, createdAt: { greater_than_equal: start.toISOString(), less_than: end.toISOString() } },
          overrideAccess: true,
          req: r,
        })
        if (rewardedToday.totalDocs >= game.dailyRewardedPlays) rewardBlockedReason = 'Daily rewarded-play limit reached.'
      }
      if (!rewardBlockedReason && scorePercent >= (game.reward?.minScorePercent ?? 0)) {
        rewardAmount = computeReward(game, scorePercent)
      }
    }

    let transactionId: number | undefined
    if (rewardAmount > 0) {
      const posted = await creditWallet({
        payload,
        req: r,
        userId: user.id,
        type: 'GAME_REWARD',
        amount: rewardAmount,
        description: `Game reward — ${game.name}`,
        idempotencyKey: `game-session:${session.id}`,
        referenceType: 'game-session',
        referenceId: session.id,
      })
      transactionId = posted.transaction.id
    }

    const updated = await withFlag(r, 'serviceWrite', () =>
      payload.update({
        collection: 'game-sessions',
        id: session.id,
        overrideAccess: true,
        depth: 0,
        req: r,
        data: {
          status: 'COMPLETED',
          endedAt: now.toISOString(),
          score: result.score,
          scorePercent,
          result: gameResult,
          rewardAmount,
          transaction: transactionId,
          rounds: result.rounds as never,
          rejectionReason: result.rejectionReason ?? rewardBlockedReason ?? undefined,
        },
      }),
    )

    if (rewardAmount > 0) {
      await notify({ payload, req: r, userId: user.id, type: 'GAME_REWARD', title: 'Game reward credited', body: `You earned a reward playing ${game.name}.`, dedupeKey: `game-session:${session.id}:notif` })
      const { checkReferralQualification } = await import('./referral')
      await checkReferralQualification(payload, r, user.id, 'GAME_COMPLETED')
      await checkReferralQualification(payload, r, user.id, 'EARNED')
    }
    if (result.rejectionReason) {
      await logAudit({ payload, req: r, action: 'OTHER', collection: 'game-sessions', documentId: session.id, after: { rejected: result.rejectionReason } })
    }
    return updated
  })
}

function computeReward(game: Game, scorePercent: number): number {
  const reward = game.reward
  if (!reward) return 0
  if (reward.mode === 'FIXED') return reward.amount ?? 0
  if (reward.mode === 'PER_SCORE') return mulDivFloor(reward.amount ?? 0, scorePercent, 100)
  if (reward.mode === 'TIERED') {
    const tiers = [...(reward.tiers ?? [])].sort((a, b) => b.minScorePercent - a.minScorePercent)
    const hit = tiers.find((t) => scorePercent >= t.minScorePercent)
    return hit?.amount ?? 0
  }
  return 0
}
