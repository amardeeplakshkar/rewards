'use client'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api-client'

export interface SessionUser {
  id: number
  email: string
  name: string
  status: string
  referralCode?: string
}

interface AuthState {
  user: SessionUser | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (input: { email: string; password: string; name: string; referralCode?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: SessionUser | null }>('/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<{ user: SessionUser }>('/auth/login', { email, password })
      setUser(data.user)
      router.push('/')
    },
    [router],
  )

  const register = useCallback(
    async (input: { email: string; password: string; name: string; referralCode?: string }) => {
      const data = await api.post<{ user: SessionUser }>('/auth/register', input)
      setUser(data.user)
      router.push('/')
    },
    [router],
  )

  const logout = useCallback(async () => {
    await api.post('/auth/logout')
    setUser(null)
    router.push('/login')
  }, [router])

  return <AuthContext.Provider value={{ user, loading, refresh, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }
