import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const key = () => {
  const hex = process.env.DATA_ENCRYPTION_KEY
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('DATA_ENCRYPTION_KEY must be 64 hex chars')
  return Buffer.from(hex, 'hex')
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.')
}

export function decrypt(payload: string): string {
  const [v, iv, tag, data] = payload.split('.')
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported ciphertext format')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
export function randomCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}

export function maskTail(value: string, visible = 4): string {
  if (value.length <= visible) return '*'.repeat(value.length)
  return '*'.repeat(Math.max(4, value.length - visible)) + value.slice(-visible)
}

export function maskUpi(upi: string): string {
  const [name = '', handle = ''] = upi.split('@')
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${handle}`
}
