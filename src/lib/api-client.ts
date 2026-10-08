'use client'

export class ApiError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>
  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const cleanPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`
  if (!params) return cleanPath

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    search.append(key, String(value))
  }

  const qs = search.toString()
  return qs ? `${cleanPath}${cleanPath.includes('?') ? '&' : '?'}${qs}` : cleanPath
}

async function request<T>(path: string, init?: RequestInit, params?: Record<string, string | number | boolean | null | undefined>): Promise<T> {
  const url = buildUrl(path, params)
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
    cache: 'no-store',
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) {
    const err = json?.error ?? { code: 'INTERNAL', message: 'Something went wrong. Please try again.' }
    throw new ApiError(err.code, err.message, res.status, err.details)
  }
  return json.data as T
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | null | undefined>) => request<T>(path, { method: 'GET' }, params),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
