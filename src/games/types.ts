import type { Payload } from 'payload'
import type { Game } from '@/payload-types'

/** Data sent to the client when a session starts. Must never leak answers/solutions. */
export interface ClientSessionState {
  kind: string
  [key: string]: unknown
}

/** Server-only state persisted in GameSessions.serverState. Holds answers/solutions. */
export interface ServerSessionState {
  kind: string
  [key: string]: unknown
}

export interface StartResult {
  client: ClientSessionState
  server: ServerSessionState
  maxScore: number
}

export interface SubmitInput {
  server: ServerSessionState
  /** Client-provided answers/actions. Never trusted for scoring directly — engines re-derive correctness from `server`. */
  payload: unknown
  elapsedSeconds: number
}

export interface SubmitResult {
  score: number
  maxScore: number
  rounds: unknown
  rejectionReason?: string
  /**
   * For games where the reward isn't a function of score (e.g. a prize wheel), the engine can supply the
   * exact minor-unit amount to credit directly. When set, GameService credits this instead of computing a
   * reward from the game's generic reward group. Daily rewarded-play caps still apply.
   */
  rewardOverride?: number
}

export interface GameEngine {
  type: string
  start(payload: Payload, game: Game): Promise<StartResult>
  submit(payload: Payload, game: Game, input: SubmitInput): Promise<SubmitResult>
}