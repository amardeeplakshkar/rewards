'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ApiError } from '@/lib/api-client'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-6 pb-24 text-text">
      <div className="brand-gradient mb-5 flex h-11 w-11 items-center justify-center rounded-xl font-display text-[19px] font-semibold text-white">N</div>
      <p className="font-display text-[28px] leading-tight">Welcome back</p>
      <p className="mt-1 text-[14px] text-text-faint">Sign in to keep earning.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 text-[13px] text-text-faint">Forgot password?</Link>
          </div>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-text-faint">
        New here? <Link href="/register" className="font-medium text-text">Create an account</Link>
      </p>
      <button onClick={() => router.push('/')} className="mt-8 text-center text-[13px] text-text-faint">Continue browsing without signing in</button>
    </div>
  )
}