'use client'
import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password updated. Please sign in.')
      router.push('/login')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'This link is invalid or has expired.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-24">
      <p className="font-display text-[28px] leading-tight">Choose a new password</p>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy || !token} className="w-full">{busy ? 'Saving…' : 'Save password'}</Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
