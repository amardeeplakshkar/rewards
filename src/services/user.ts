import type { Payload, PayloadRequest } from 'payload'
import { randomUUID } from 'node:crypto'
import { AppError } from '@/lib/errors'
import { randomCode } from '@/lib/crypto'
import { getClientIp } from '@/lib/request-meta'
import { enforceRateLimit, LIMITS } from '@/lib/rate-limit'
import type { User } from '@/payload-types'
import { logAudit } from './audit'
import { withFlag } from './context'

/** Generates a unique, human-friendly referral code (retries on the rare collision). */
export async function generateUniqueReferralCode(payload: Payload, req?: Partial<PayloadRequest>): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomCode(7)
    const existing = await payload.find({ collection: 'users', where: { referralCode: { equals: code } }, limit: 1, depth: 0, overrideAccess: true, req: req as PayloadRequest | undefined })
    if (existing.docs.length === 0) return code
  }
  throw new AppError('INTERNAL', 'Could not generate a unique referral code, please retry.')
}

export interface RegisterInput {
  payload: Payload
  req?: Partial<PayloadRequest>
  headers: Headers
  email: string
  password: string
  name: string
  phone?: string
  referralCode?: string
  timezone?: string
}

/** Registers a user, optionally binding a referral, and returns the created record (no session yet). */
export async function registerUser(i: RegisterInput): Promise<User> {
  const { payload } = i
  const ip = getClientIp(i.headers)
  await enforceRateLimit(LIMITS.registerIp, ip, 'Too many sign-up attempts from this network. Please try again later.')

  const { getSettings } = await import('./settings')
  const settings = await getSettings(payload)
  if (!settings.features.registrationEnabled) throw new AppError('FEATURE_DISABLED', 'Registration is temporarily closed.')

  const email = i.email.trim().toLowerCase()
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })
  if (existing.docs.length) throw new AppError('CONFLICT', 'An account with this email already exists.')

  const requireVerify = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'
  const user = await payload.create({
    collection: 'users',
    overrideAccess: true,
    depth: 0,
    data: {
      email,
      password: i.password,
      name: i.name,
      phone: i.phone,
      timezone: i.timezone,
      status: requireVerify ? 'PENDING_VERIFICATION' : 'ACTIVE',
      _verified: !requireVerify,
      termsAcceptedAt: new Date().toISOString(),
      registrationIp: ip,
    } as never,
  })

  if (i.referralCode) {
    try {
      const { bindReferral } = await import('./referral')
      await bindReferral({ payload, req: i.req, newUser: user, code: i.referralCode })
    } catch (err) {
      // Registration must still succeed even if the referral code is invalid/expired.
      console.warn('[register] referral bind failed:', (err as Error).message)
    }
  }

  await logAudit({ payload, req: i.req, action: 'OTHER', collection: 'users', documentId: user.id, actorLabel: `user:${email}`, after: { event: 'REGISTERED' }, metadata: { ip } })
  return user
}

export async function recordLogin(payload: Payload, req: Partial<PayloadRequest>, userId: number, ip: string) {
  await withFlag(req, 'skipAudit', () =>
    payload.update({ collection: 'users', id: userId, overrideAccess: true, depth: 0, req: req as PayloadRequest, data: { lastLoginAt: new Date().toISOString(), lastLoginIp: ip } }),
  )
}

export const newIdempotencyKey = () => randomUUID()
