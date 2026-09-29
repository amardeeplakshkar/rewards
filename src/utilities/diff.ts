const IGNORED = new Set(['updatedAt', 'createdAt', 'sessions', 'salt', 'hash', 'loginAttempts', 'lockUntil', 'resetPasswordToken', 'resetPasswordExpiration', '_verificationToken', 'password', 'serverState'])

type Json = Record<string, unknown>

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Shallow-ish diff of two documents returning only changed top-level keys (relations flattened to ids). */
export function diffDocs(before: unknown, after: unknown): { before: Json; after: Json } {
  const b = isObj(before) ? before : {}
  const a = isObj(after) ? after : {}
  const outB: Json = {}
  const outA: Json = {}
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (IGNORED.has(key)) continue
    const bv = flatten(b[key])
    const av = flatten(a[key])
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      outB[key] = bv
      outA[key] = av
    }
  }
  return { before: outB, after: outA }
}

function flatten(v: unknown): unknown {
  if (isObj(v) && 'id' in v && Object.keys(v).length > 1 && !('blocks' in v)) return v.id
  if (Array.isArray(v)) return v.map(flatten)
  return v
}

/** Strip noise from a whole doc for create/delete snapshots. */
export function snapshot(doc: unknown): Json {
  const d = isObj(doc) ? doc : {}
  const out: Json = {}
  for (const [k, v] of Object.entries(d)) if (!IGNORED.has(k)) out[k] = flatten(v)
  return out
}
