'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await api.post('/auth/forgot-password', { email }).catch(() => null)
    setBusy(false)
    setSent(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-6 pb-24 text-text">
      <div className="brand-gradient mb-5 flex h-11 w-11 items-center justify-center rounded-xl font-display text-[19px] font-semibold text-white">N</div>
      <p className="font-display text-[28px] leading-tight">Reset your password</p>
      {sent ? (
        <p className="mt-3 text-[14px] text-text-soft">If an account exists for {email}, we've sent a link to reset the password.</p>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-text-faint">We'll email you a link to choose a new one.</p>
          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Sending…' : 'Send reset link'}</Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-[14px] text-text-faint">
        <Link href="/login" className="font-medium text-text">Back to sign in</Link>
      </p>
    </div>
  )
}
