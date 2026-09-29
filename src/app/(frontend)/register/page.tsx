'use client'
import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { ApiError } from '@/lib/api-client'

function RegisterForm() {
  const { register } = useAuth()
  const params = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const ref = params.get('ref')
    if (ref) setReferralCode(ref)
  }, [params])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await register({ name, email, password, referralCode: referralCode || undefined })
      toast.success('Account created')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-6 pb-24 text-text">
      <div className="brand-gradient mb-5 flex h-11 w-11 items-center justify-center rounded-xl font-display text-[19px] font-semibold text-white">N</div>
      <p className="font-display text-[28px] leading-tight">Start earning</p>
      <p className="mt-1 text-[14px] text-text-faint">Complete tasks and play games for real rewards.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1 text-[12px] text-text-faint">At least 8 characters.</p>
        </div>
        <div>
          <Label htmlFor="ref">Referral code (optional)</Label>
          <Input id="ref" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="e.g. AB12CD3" />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-text-faint">
        Already have an account? <Link href="/login" className="font-medium text-text">Sign in</Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}
