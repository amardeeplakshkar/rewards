export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_RESTRICTED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'LIMIT_REACHED'
  | 'NOT_ELIGIBLE'
  | 'NOT_AVAILABLE'
  | 'COOLDOWN'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_STATE'
  | 'FEATURE_DISABLED'
  | 'LOCKED'
  | 'INTERNAL'

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ACCOUNT_RESTRICTED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  LIMIT_REACHED: 409,
  NOT_ELIGIBLE: 403,
  NOT_AVAILABLE: 409,
  COOLDOWN: 429,
  INSUFFICIENT_FUNDS: 409,
  INVALID_STATE: 409,
  FEATURE_DISABLED: 503,
  LOCKED: 423,
  INTERNAL: 500,
}

/** Expected, user-presentable error. Anything else is treated as an internal failure. */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>
  readonly retryAfterSeconds?: number

  constructor(code: ErrorCode, message: string, opts: { details?: Record<string, unknown>; retryAfterSeconds?: number } = {}) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS[code]
    this.details = opts.details
    this.retryAfterSeconds = opts.retryAfterSeconds
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError
