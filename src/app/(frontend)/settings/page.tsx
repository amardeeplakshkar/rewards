'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, Mail, Phone, Copy, LogOut, CreditCard, Plus, Globe, Trash2, Shield, X } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { api, ApiError } from '@/lib/api-client'

interface FullUser {
  id: number
  email: string
  name: string
  status: string
  referralCode?: string
  phone?: string | null
  timezone?: string
  lastLoginAt?: string | null
}

interface PayoutMethod {
  id: number
  type: string
  label: string
  maskedDetails: string
  isDefault: boolean
}

const PAYOUT_ICONS: Record<string, React.ReactNode> = {
  UPI: <Globe size={16} />,
  BANK: <CreditCard size={16} />,
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING_VERIFICATION: 'Pending verification',
  SUSPENDED: 'Suspended',
  BLOCKED: 'Blocked',
  DELETED: 'Deleted',
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [fullUser, setFullUser] = useState<FullUser | null>(null)
  const [methods, setMethods] = useState<PayoutMethod[] | null>(null)
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newMethod, setNewMethod] = useState({ type: 'UPI' as 'UPI' | 'BANK', label: '', upiId: '', accountNumber: '', ifsc: '', bankName: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!user) return
    api
      .get<{ user: FullUser }>('/auth/me')
      .then((d) => {
        setFullUser(d.user)
        if (!resetEmail) setResetEmail(d.user.email)
      })
      .catch(() => null)
    api
      .get<{ methods: PayoutMethod[] }>('/payout-methods')
      .then((d) => setMethods(d.methods))
      .catch(() => setMethods(null))
      .finally(() => setMethodsLoading(false))
  }, [user])

  const copyCode = async () => {
    if (!fullUser?.referralCode) return
    try {
      await navigator.clipboard.writeText(fullUser.referralCode)
      toast.success('Referral code copied!')
    } catch {
      toast.error('Could not copy code')
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail) return
    setResetLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: resetEmail })
      toast.success('Password reset link sent to your email')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setResetLoading(false)
    }
  }

  const handleAddMethod = async () => {
    setAdding(true)
    try {
      const body: Record<string, unknown> = {
        type: newMethod.type,
        label: newMethod.label,
        holderName: fullUser?.name,
      }
      if (newMethod.type === 'UPI') body.upiId = newMethod.upiId
      else {
        body.accountNumber = newMethod.accountNumber
        body.ifsc = newMethod.ifsc
        body.bankName = newMethod.bankName
      }
      await api.post<{ method: PayoutMethod }>('/payout-methods', body)
      toast.success('Payout method added')
      setShowAddDialog(false)
      setNewMethod({ type: 'UPI', label: '', upiId: '', accountNumber: '', ifsc: '', bankName: '' })
      api.get<{ methods: PayoutMethod[] }>('/payout-methods').then((d) => setMethods(d.methods)).catch(() => null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteMethod = async (id: number) => {
    try {
      await api.del<{ removed: boolean }>(`/payout-methods/${id}`)
      toast.success('Payout method removed')
      setMethods((prev) => prev?.filter((m) => m.id !== id) ?? null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Something went wrong')
      }
    }
  }

  if (!user) {
    return (
      <AppShell showBack>
        <EmptyState
          title="Sign in to manage settings"
          action={
            <Link href="/login">
              <button className="mt-3 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2 text-sm font-bold text-slate-900">
                Sign In
              </button>
            </Link>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell >
      <div className="space-y-5 pb-6 pt-1">
        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-600 p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Shield size={22} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-white">Settings</h2>
              <p className="mt-0.5 text-sm text-cyan-200/80">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        {/* ── Account Section ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Account</h3>
          {!fullUser ? (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-900">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-white">{fullUser.name}</h4>
                  <p className="text-sm text-slate-400">{fullUser.email}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 ${fullUser.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {STATUS_LABELS[fullUser.status] ?? fullUser.status}
                    </span>
                    {fullUser.lastLoginAt ? <span>Last login: {new Date(fullUser.lastLoginAt).toLocaleDateString('en-IN')}</span> : null}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-[#1F2E45] bg-[#0E1726] p-1.5">
            <SettingRow
              icon={<Mail size={18} className="text-slate-400" />}
              label="Email address"
              value={fullUser?.email ?? '—'}
              loading={!fullUser}
            />
            <SettingRow
              icon={<Phone size={18} className="text-slate-400" />}
              label="Phone number"
              value={fullUser?.phone ?? '—'}
              loading={!fullUser}
            />
            <SettingRow
              icon={<Shield size={18} className="text-slate-400" />}
              label="Timezone"
              value={fullUser?.timezone ?? 'Asia/Kolkata'}
              loading={!fullUser}
            />
            <SettingRow
              icon={<Globe size={18} className="text-slate-400" />}
              label="Referral code"
              value={fullUser?.referralCode ?? '—'}
              loading={!fullUser}
              action={fullUser?.referralCode ? (
                <button onClick={copyCode} className="rounded-lg border border-[#1F2E45] bg-[#080D18] p-1.5 text-slate-300 hover:bg-white/5 hover:text-amber-400">
                  <Copy size={16} />
                </button>
              ) : undefined}
            />
          </Card>
        </div>

        {/* ── Payout Methods ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-white">Payout Methods</h3>
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-1 text-[12px] font-medium text-amber-400/80 hover:text-amber-300"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {methodsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="border-[#1F2E45] bg-[#0E1726] p-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-1 h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : methods && methods.length > 0 ? (
            <Card className="border-[#1F2E45] bg-[#0E1726] p-1.5">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                      {PAYOUT_ICONS[m.type] ?? <CreditCard size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.label}</p>
                      <p className="text-[11px] text-slate-500">{m.maskedDetails}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isDefault ? (
                      <span className="text-[11px] font-semibold text-emerald-400">Default</span>
                    ) : null}
                    <button
                      onClick={() => handleDeleteMethod(m.id)}
                      className="rounded-lg border border-[#1F2E45] bg-[#080D18] p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState
              title="No payout methods"
              body="Add a payout method to receive your rewards."
              action={
                <Button size="sm" className="mt-2" onClick={() => setShowAddDialog(true)}>
                  Add Payout Method
                </Button>
              }
            />
          )}
        </div>

        {/* ── Add Payout Method Dialog ── */}
        {showAddDialog && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-t-card bg-surface px-5 pb-8 pt-5 safe-bottom">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-[19px] text-amber-500">Add Payout Method</h3>
                <button onClick={() => setShowAddDialog(false)} className="rounded-full p-1.5 hover:bg-ink/5">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewMethod({ ...newMethod, type: 'UPI' })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-center text-sm font-medium ${newMethod.type === 'UPI' ? 'border-amber-400/50 bg-amber-600/20 text-amber-400' : 'border-muted text-slate-400'}`}
                  >
                    UPI
                  </button>
                  <button
                    onClick={() => setNewMethod({ ...newMethod, type: 'BANK' })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-center text-sm font-medium ${newMethod.type === 'BANK' ? 'border-amber-400/50 bg-amber-600/20 text-amber-400' : 'border-muted text-slate-400'}`}
                  >
                    Bank
                  </button>
                </div>
                <div>
                  <Label>Label</Label>
                  <Input
                    placeholder={newMethod.type === 'UPI' ? 'e.g. Gpay' : 'e.g. SBI Savings'}
                    value={newMethod.label}
                    onChange={(e) => setNewMethod({ ...newMethod, label: e.target.value })}
                  />
                </div>
                {newMethod.type === 'UPI' ? (
                  <>
                    <div>
                      <Label>UPI ID</Label>
                      <Input
                        placeholder="name@upi"
                        value={newMethod.upiId}
                        onChange={(e) => setNewMethod({ ...newMethod, upiId: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Account Number</Label>
                      <Input
                        placeholder="1234567890"
                        value={newMethod.accountNumber}
                        onChange={(e) => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>IFSC</Label>
                      <Input
                        placeholder="SBIN0001234"
                        value={newMethod.ifsc}
                        onChange={(e) => setNewMethod({ ...newMethod, ifsc: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Bank Name</Label>
                      <Input
                        placeholder="State Bank of India"
                        value={newMethod.bankName}
                        onChange={(e) => setNewMethod({ ...newMethod, bankName: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <Button className="w-full" onClick={handleAddMethod} disabled={adding || !newMethod.label}>
                  {adding ? 'Adding…' : 'Add Payout Method'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Security Section ── */}
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-white">Security</h3>
          <Card className="border-[#1F2E45] bg-[#0E1726] p-4 space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-500 uppercase">Reset password</Label>
              <p className="mt-1 text-[13px] text-slate-400">Send a password reset link to your email</p>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="border-[#1F2E45] bg-[#080D18]"
                />
                <Button size="sm" onClick={handleResetPassword} disabled={resetLoading || !resetEmail}>
                  {resetLoading ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </div>

            <div className="border-t border-[#1F2E45] pt-3">
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-left text-red-400 hover:bg-red-500/15"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function SettingRow({
  icon,
  label,
  value,
  loading,
  action,
}: {
  icon: React.ReactNode
  label: string
  value: string
  loading?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-3 w-24" />
          ) : (
            <p className="text-[13px] font-medium text-white">{value}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}
