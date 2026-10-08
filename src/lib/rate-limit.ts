// import 'server-only'
import { AppError } from './errors'
import { kv } from './redis'

export interface RateLimitRule {
  /** Logical bucket, e.g. "login:ip" */
  name: string
  limit: number
  windowSec: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/** Fixed-window limiter (atomic INCR + PEXPIRE). Fails open when Redis is unavailable. */
export async function rateLimit(rule: RateLimitRule, identity: string): Promise<RateLimitResult> {
  try {
    const { count, ttlMs } = await kv().incr(`rl:${rule.name}:${identity}`, rule.windowSec * 1000)
    return {
      allowed: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    }
  } catch (err) {
    console.error('[rate-limit] Redis unavailable, failing open:', (err as Error).message)
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 }
  }
}

export async function enforceRateLimit(rule: RateLimitRule, identity: string, message?: string) {
  const res = await rateLimit(rule, identity)
  if (!res.allowed) {
    throw new AppError('RATE_LIMITED', message ?? 'Too many requests. Please slow down and try again shortly.', {
      retryAfterSeconds: res.retryAfterSeconds,
    })
  }
  return res
}

/** Central catalogue so limits are easy to audit and tune. */
export const LIMITS = {
  api: { name: 'api', limit: 240, windowSec: 60 },
  loginIp: { name: 'login:ip', limit: 20, windowSec: 15 * 60 },
  loginAccount: { name: 'login:acct', limit: 8, windowSec: 15 * 60 },
  registerIp: { name: 'register:ip', limit: 10, windowSec: 60 * 60 },
  passwordResetIp: { name: 'pwreset:ip', limit: 10, windowSec: 60 * 60 },
  passwordResetAccount: { name: 'pwreset:acct', limit: 3, windowSec: 60 * 60 },
  gameStart: { name: 'game:start', limit: 30, windowSec: 60 * 60 },
  gameAction: { name: 'game:action', limit: 240, windowSec: 60 },
  gameComplete: { name: 'game:complete', limit: 30, windowSec: 60 * 60 },
  taskAction: { name: 'task:action', limit: 60, windowSec: 60 * 60 },
  campaignClaim: { name: 'campaign:claim', limit: 20, windowSec: 60 * 60 },
  withdrawal: { name: 'withdrawal:create', limit: 5, windowSec: 60 * 60 },
  payoutMethod: { name: 'payout:write', limit: 20, windowSec: 60 * 60 },
  referralQualify: { name: 'referral:qualify', limit: 20, windowSec: 60 * 60 },
} satisfies Record<string, RateLimitRule>
