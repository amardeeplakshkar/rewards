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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
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
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
