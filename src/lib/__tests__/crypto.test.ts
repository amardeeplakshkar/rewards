import { beforeAll, describe, expect, it } from 'vitest'
import { decrypt, encrypt, maskTail, maskUpi, randomCode, safeEqual, sha256 } from '../crypto'

beforeAll(() => {
  process.env.DATA_ENCRYPTION_KEY = '0'.repeat(63) + '1' // 64 hex chars, deterministic for tests
})

describe('encrypt / decrypt', () => {
  it('round-trips a plaintext value', () => {
    const plain = JSON.stringify({ upiId: 'someone@bank' })
    const cipher = encrypt(plain)
    expect(cipher.startsWith('v1.')).toBe(true)
    expect(decrypt(cipher)).toBe(plain)
  })
  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = encrypt('hello')
    const b = encrypt('hello')
    expect(a).not.toBe(b)
  })
  it('rejects a tampered ciphertext', () => {
    const cipher = encrypt('secret value')
    const parts = cipher.split('.')
    parts[3] = parts[3]!.slice(0, -2) + (parts[3]!.slice(-2) === 'AA' ? 'BB' : 'AA')
    expect(() => decrypt(parts.join('.'))).toThrow()
  })
})

describe('sha256 / safeEqual', () => {
  it('is deterministic', () => {
    expect(sha256('abc')).toBe(sha256('abc'))
    expect(sha256('abc')).not.toBe(sha256('abd'))
  })
  it('safeEqual compares strings correctly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'ab')).toBe(false)
  })
})

describe('randomCode', () => {
  it('avoids ambiguous characters and respects length', () => {
    for (let i = 0; i < 50; i++) {
      const code = randomCode(8)
      expect(code).toHaveLength(8)
      expect(code).not.toMatch(/[0O1I]/)
    }
  })
})

describe('masking helpers', () => {
  it('maskTail keeps only the last few characters', () => {
    expect(maskTail('123456789012', 4)).toBe('********9012')
  })
  it('maskUpi partially hides the handle name', () => {
    const masked = maskUpi('johndoe@okbank')
    expect(masked.endsWith('@okbank')).toBe(true)
    expect(masked.startsWith('jo')).toBe(true)
    expect(masked).not.toContain('hndoe')
  })
})
