import { describe, expect, it } from 'vitest'
import { AppError, isAppError } from '../errors'

describe('AppError', () => {
  it('maps codes to the right HTTP status', () => {
    expect(new AppError('NOT_FOUND', 'x').status).toBe(404)
    expect(new AppError('INSUFFICIENT_FUNDS', 'x').status).toBe(409)
    expect(new AppError('RATE_LIMITED', 'x').status).toBe(429)
    expect(new AppError('UNAUTHENTICATED', 'x').status).toBe(401)
    expect(new AppError('FORBIDDEN', 'x').status).toBe(403)
  })
  it('carries details and retryAfterSeconds', () => {
    const err = new AppError('RATE_LIMITED', 'slow down', { retryAfterSeconds: 30, details: { limit: 5 } })
    expect(err.retryAfterSeconds).toBe(30)
    expect(err.details).toEqual({ limit: 5 })
  })
  it('is recognised by isAppError, unlike a plain Error', () => {
    expect(isAppError(new AppError('BAD_REQUEST', 'x'))).toBe(true)
    expect(isAppError(new Error('x'))).toBe(false)
    expect(isAppError('x')).toBe(false)
  })
})
